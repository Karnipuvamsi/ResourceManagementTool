// ============================================
// RESOURCE ALLOCATION SYSTEM - REPORT VIEWS
// ============================================
// Version: 2.0 - Updated based on actual schema
// Date: November 2025

namespace com.company.resourceallocation.reports;

using {db} from '../schema';

// ============================================
// MANDATORY REPORT VIEWS
// ============================================

// Employee Bench Report View
define view EmployeeBenchReportView as
select from db.Employee as e {
    key e.ohrId,
        e.fullName as employeeName,
        e.band,

        /* --- Days on bench --- */     

        cast(
          case
            /* If there is a latest past allocation end date (<= today), use it */
            when (
              select max(cast(epa.endDate as Date))
              from db.EmployeeNewAllocation as epa
              where epa.employeeId = e.ohrId
                and epa.endDate is not null
                and cast(epa.endDate as Date) <= current_date
            ) is not null
            then days_between(
              /* days_between(date1, date2) = date1 - date2 */
              (
                select max(cast(epa.endDate as Date))
                from db.EmployeeNewAllocation as epa
                where epa.employeeId = e.ohrId
                  and epa.endDate is not null
                  and cast(epa.endDate as Date) <= current_date
              ),
              current_date              
            )

            /* Else: use DOJ if present */
            when e.doj is not null
            then days_between(cast(e.doj as Date),current_date)

            /* Fallback: missing dates -> 0 */
            else 0
          end
          as Integer
        ) as daysOnBench,

        /* --- other fields --- */
        e.unit,
        e.employeeType,
        e.location,
        e.skills,
        e.supervisorOHR,
        e.mailid as email,
        e.status
}
where e.status in ('Unproductive Bench', 'Inactive Bench');




// Employee Probable Release Report View
define view EmployeeProbableReleaseView as
select from db.Employee as e
    inner join db.EmployeeNewAllocation as epa on e.ohrId = epa.employeeId
    inner join db.Project as p on epa.projectId = p.sapPId
    inner join db.Opportunity as opp on p.oppId = opp.sapOpportunityId
    inner join db.Customer as c on opp.customerId = c.SAPcustId {
    key e.ohrId,
    
        e.fullName as employeeName,
        e.band,
        p.projectName as currentProject,
        c.customerName as customer,
        epa.endDate as releaseDate,
        cast(days_between(current_date,epa.endDate) as Integer) as daysToRelease,
        e.skills,
        e.location,
        
}
where epa.endDate >= current_date;

// Revenue Forecast Report View
define view RevenueForecastView as
select from db.Project as p
    join db.Opportunity as opp on p.oppId = opp.sapOpportunityId
    join db.Customer as c on opp.customerId = c.SAPcustId {
    key p.sapPId,
        p.projectName,
        p.projectType,
        p.startDate,
        p.endDate,
        p.status,
  opp.tcv as totalRevenue,
        opp.probability,
        // Calculate weighted revenue based on probability
  cast(
            case opp.probability
                when '0%-ProposalStage' then opp.tcv * 0.0
                when '33%-SoWSent' then opp.tcv * 0.33
                when '85%-SoWSigned' then opp.tcv * 0.85
                when '100%-PurchaseOrderReceived' then opp.tcv * 1.0
                else opp.tcv * 0.5
    end
    as Decimal(15,2)
  ) as weightedRevenue,
        c.customerName as customer,
        c.vertical,
        cast(year(p.startDate) as String) as startYear,
        cast(month(p.startDate) as String) as startMonth
}
where p.status in ('Active', 'Planned');

// Employee Allocation Report View
define view EmployeeAllocationReportView as
select from db.Employee as e
inner join db.EmployeeNewAllocation as epa
  on e.ohrId = epa.employeeId
  
inner join db.Project as p
  on epa.projectId = p.sapPId
inner join db.Opportunity as opp
  on p.oppId = opp.sapOpportunityId
inner join db.Customer as c
  on opp.customerId = c.SAPcustId
{
  key e.ohrId as employeeId,
  
  
  e.fullName as employeeName,
  e.band,
  e.employeeType,
  e.status,
  p.projectName as currentProject,
  c.customerName as customer,
  epa.startDate as allocationStartDate,
  epa.endDate as allocationEndDate,
  cast(days_between(current_date, epa.endDate) as Integer) as daysRemaining,
  epa.allocationPercentage as utilizationPercentage
}
where
  e.lwd is null
  and e.status not in ('Resigned', 'Productive Bench', 'Unproductive Bench');

// Employee Skill Report View
define view EmployeeSkillReportView as
select from db.Skills as s {
    key id,
        name as skillName,
        category,
        // Count employees with this skill
        cast(
            (select count(distinct employeeId) from db.EmployeeSkill as es
             where es.skillId = s.id)
            as Integer
        ) as totalEmployees,
        // Count available employees (on bench)
        cast(
            (select count(distinct es2.employeeId) from db.EmployeeSkill as es2
             join db.Employee as e2 on es2.employeeId = e2.ohrId
             where es2.skillId = s.id 
               and e2.status in ('Unproductive Bench', 'Productive Bench'))
            as Integer
  ) as availableEmployees,
        // Count allocated employees
        cast(
            (select count(distinct es3.employeeId) from db.EmployeeSkill as es3
             join db.Employee as e3 on es3.employeeId = e3.ohrId
             join db.EmployeeNewAllocation as epa3 on e3.ohrId = epa3.employeeId
             where es3.skillId = s.id 
               )
            as Integer
        ) as allocatedEmployees
};

// Projects Nearing Completion Report View
define view ProjectsNearingCompletionView as
select from db.Project as p
    join db.Opportunity as opp on p.oppId = opp.sapOpportunityId
    join db.Customer as c on opp.customerId = c.SAPcustId
    left outer join db.Employee as e on p.gpm = e.ohrId {
    key p.sapPId,
        p.sapPId as projectReference,
        p.projectName,
        p.projectType,
        p.endDate as completionDate,
       
cast(
  case
    when p.endDate < current_date then 0
    else days_between(current_date,p.endDate)
  end
  as Integer
) as daysToCompletion,

        p.status,
        // Calculate completion risk
        cast(
            case 
                when days_between(current_date,p.endDate) <= 30 then 'Critical'
                when days_between(current_date,p.endDate) <= 60 then 'High'
                when days_between(current_date,p.endDate) <= 90 then 'Medium'
                else 'Low'
            end
            as String
        ) as completionRisk,
        // Count employees on project
        cast(
            (select count(*) from db.EmployeeNewAllocation as epa
             where epa.projectId = p.sapPId )
            as Integer
        ) as employeeCount,
        e.fullName as projectManager,
        e.mailid as projectManagerEmail,
        c.customerName as customer
}
where p.endDate >= current_date
and p.status = 'Active';
//   and p.endDate >= current_date;
  // and days_between(current_date,p.endDate) <= 90;

// ============================================
// ADDITIONAL REPORT VIEWS
// ============================================

// Supervisor Team Allocation Report View
view SupervisorTeamAllocationView as select from db.Employee as e
    left outer join db.EmployeeNewAllocation as epa on e.ohrId = epa.employeeId 
        
    left outer join db.Project as p on epa.projectId = p.sapPId {
    key e.ohrId,
        e.fullName as employeeName,
        e.band,
        e.employeeType,
        e.status,
        e.supervisorOHR,
        p.projectName as currentProject,
        epa.allocationPercentage as allocationPercentage,
        cast(days_between(epa.endDate, current_date) as Integer) as daysRemainingOnProject
}
where e.supervisorOHR is not null;

// Customer Project Portfolio Report View
view CustomerProjectPortfolioView as select from db.Customer as c {
    key c.SAPcustId,
        c.customerName,
        c.status as customerStatus,
        c.vertical,
        // Count projects
        (select count(*) as cnt from db.Project as p
         join db.Opportunity as opp on p.oppId = opp.sapOpportunityId
         where opp.customerId = c.SAPcustId) as totalProjects,
        // Count active projects
        (select count(*) as cnt from db.Project as p2
         join db.Opportunity as opp2 on p2.oppId = opp2.sapOpportunityId
         where opp2.customerId = c.SAPcustId 
           and p2.status = 'Active') as activeProjects,
        // Count planned projects
        (select count(*) as cnt from db.Project as p3
         join db.Opportunity as opp3 on p3.oppId = opp3.sapOpportunityId
         where opp3.customerId = c.SAPcustId 
           and p3.status = 'Planned') as plannedProjects,
        // Total revenue
        (select sum(opp4.tcv) as totalRev from db.Opportunity as opp4
         where opp4.customerId = c.SAPcustId) as totalRevenue,
        // Engaged employees
        (select count(distinct epa.employeeId) as empCount from db.EmployeeNewAllocation as epa
         join db.Project as p4 on epa.projectId = p4.sapPId
         join db.Opportunity as opp5 on p4.oppId = opp5.sapOpportunityId
         where opp5.customerId = c.SAPcustId
           ) as engagedEmployees
};

// Utilization Trend Report View (simplified - would need date aggregation in service)
view UtilizationTrendView as select from db.Employee as e {
    key e.ohrId,
        e.fullName as employeeName,
        e.band,
        e.status,
        e.doj,
        // Allocation info
        (select count(*) as cnt from db.EmployeeNewAllocation as epa
         where epa.employeeId = e.ohrId ) as activeAllocations,
        (select sum(epa2.allocationPercentage) as totalPct from db.EmployeeNewAllocation as epa2
         where epa2.employeeId = e.ohrId  ) as totalAllocationPercentage
};

// Skills Gap Analysis Report View
view SkillsGapAnalysisView as select from db.Skills as s {
    key s.id,
        s.name as skillName,
        s.category,
        // Demand count (from Demands)
        (select count(*) as cnt from db.Demand as d
         where d.skill = s.name) as totalDemand,
        // Supply count (employees with skill)
        (select count(distinct es.employeeId) as cnt from db.EmployeeSkill as es
         where es.skillId = s.id) as currentSupply,
        // Calculate gap
        (select count(*) as cnt from db.Demand as d2 where d2.skill = s.name) - 
        (select count(distinct es2.employeeId) as cnt from db.EmployeeSkill as es2 where es2.skillId = s.id) as gap,
        // Impacted projects
        (select count(distinct d3.sapPId) as cnt from db.Demand as d3
         where d3.skill = s.name) as impactedProjects
};

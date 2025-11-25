// RESOURCE MANAGEMENT TOOL - REPORT SERVICE IMPLEMENTATION
// Service implementation for all report generation functions

const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
    const { EmployeeBenchReport, EmployeeProbableReleaseReport, 
            RevenueForecastReport, EmployeeAllocationReport,
            EmployeeSkillReport, ProjectsNearingCompletionReport,
            SupervisorTeamAllocationReport, CustomerProjectPortfolioReport,
            UtilizationTrendReport, SkillsGapAnalysisReport } = this.entities;

    // ============================================
    // EMPLOYEE BENCH REPORT
    // ============================================
    this.on('generateEmployeeBenchReport', async (req) => {
        const { bandFilter, employeeTypeFilter, skillFilter, minDaysOnBench } = req.data;
        
        let query = SELECT.from(EmployeeBenchReport);
        
        // Apply filters
        if (bandFilter && bandFilter.length > 0) {
            query.where({ band: { in: bandFilter } });
        }
        if (employeeTypeFilter && employeeTypeFilter.length > 0) {
            query.where({ employeeType: { in: employeeTypeFilter } });
        }
        if (minDaysOnBench !== undefined && minDaysOnBench > 0) {
            query.where({ daysOnBench: { '>=': minDaysOnBench } });
        }
        
        const results = await query;
        
        // Filter by skills if provided
        let filteredResults = results;
        if (skillFilter && skillFilter.length > 0) {
            filteredResults = results.filter(emp => {
                const empSkills = emp.skills ? emp.skills.split(',').map(s => s.trim()) : [];
                return skillFilter.some(skill => empSkills.includes(skill));
            });
        }
        
        // Calculate summary
        const benchByBand = {};
        const benchByEmployeeType = {};
        let totalDays = 0;
        
        filteredResults.forEach(emp => {
            benchByBand[emp.band] = (benchByBand[emp.band] || 0) + 1;
            benchByEmployeeType[emp.employeeType] = (benchByEmployeeType[emp.employeeType] || 0) + 1;
            totalDays += emp.daysOnBench || 0;
        });
        
        return {
            totalBenchCount: filteredResults.length,
            reportData: filteredResults.map(emp => ({
                employeeName: emp.employeeName,
                band: emp.band,
                employeeType: emp.employeeType,
                location: emp.location,
                skills: emp.skills,
                daysOnBench: emp.daysOnBench,
                supervisor: emp.supervisorOHR,
                email: emp.email,
                unit:emp.unit
            })),
            summary: {
                benchByBand: Object.keys(benchByBand).map(band => ({
                    band,
                    count: benchByBand[band]
                })),
                benchByEmployeeType: Object.keys(benchByEmployeeType).map(type => ({
                    employeeType: type,
                    count: benchByEmployeeType[type]
                })),
                avgDaysOnBench: filteredResults.length > 0 ? totalDays / filteredResults.length : 0
            }
        };
    });

    // ============================================
    // PROBABLE RELEASE REPORT
    // ============================================
    this.on('generateProbableReleaseReport', async (req) => {
        const { releaseWindow, bandFilter, skillFilter } = req.data;
        
        let query = SELECT.from(EmployeeProbableReleaseReport);
        
        // Apply window filter
        if (releaseWindow && releaseWindow !== 'All') {
            const days = parseInt(releaseWindow);
            query.where({ daysToRelease: { '<=': days } });
        }
        
        if (bandFilter && bandFilter.length > 0) {
            query.where({ band: { in: bandFilter } });
        }
        
        const results = await query;
        
        // Filter by skills if provided
        let filteredResults = results;
        if (skillFilter && skillFilter.length > 0) {
            filteredResults = results.filter(emp => {
                const empSkills = emp.skills ? emp.skills.split(',').map(s => s.trim()) : [];
                return skillFilter.some(skill => empSkills.includes(skill));
            });
        }
        
        // Calculate summary
        const releasesByWindow = {
            '30 Days': 0,
            '60 Days': 0,
            '90 Days': 0,
            'Beyond 90 Days': 0
        };
        const releasesByBand = {};
        let totalDays = 0;
        
        filteredResults.forEach(emp => {
            if (emp.daysToRelease <= 30) releasesByWindow['30 Days']++;
            else if (emp.daysToRelease <= 60) releasesByWindow['60 Days']++;
            else if (emp.daysToRelease <= 90) releasesByWindow['90 Days']++;
            else releasesByWindow['Beyond 90 Days']++;
            
            releasesByBand[emp.band] = (releasesByBand[emp.band] || 0) + 1;
            totalDays += emp.daysToRelease || 0;
        });
        
        return {
            totalEmployeesReleasing: filteredResults.length,
            reportData: filteredResults.map(emp => ({
                employeeName: emp.employeeName,
                band: emp.band,
                currentProject: emp.currentProject,
                customer: emp.customer,
                releaseDate: emp.releaseDate ? emp.releaseDate.toISOString().split('T')[0] : '',
                daysToRelease: emp.daysToRelease,
                skills: emp.skills,
                location: emp.location
            })),
            summary: {
                releasesByWindow: Object.keys(releasesByWindow).map(window => ({
                    window,
                    count: releasesByWindow[window]
                })),
                releasesByBand: Object.keys(releasesByBand).map(band => ({
                    band,
                    count: releasesByBand[band]
                })),
                avgDaysToRelease: filteredResults.length > 0 ? totalDays / filteredResults.length : 0
            }
        };
    });

    // ============================================
    // REVENUE FORECAST REPORT
    // ============================================
    this.on('generateRevenueForecastReport', async (req) => {
        const { startMonth, endMonth, customerFilter, projectTypeFilter } = req.data;
        
        let query = SELECT.from(RevenueForecastReport);
        
        if (customerFilter && customerFilter.length > 0) {
            query.where({ customer: { in: customerFilter } });
        }
        if (projectTypeFilter && projectTypeFilter.length > 0) {
            query.where({ projectType: { in: projectTypeFilter } });
        }
        
        const results = await query;
        
        // Group by month
        const monthlyData = {};
        results.forEach(proj => {
            const monthKey = `${proj.startYear}-${String(proj.startMonth).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: monthKey,
                    projectCount: 0,
                    totalRevenue: 0,
                    weightedRevenue: 0,
                    byProjectType: {},
                    byCustomer: {}
                };
            }
            monthlyData[monthKey].projectCount++;
            monthlyData[monthKey].totalRevenue += parseFloat(proj.totalRevenue || 0);
            monthlyData[monthKey].weightedRevenue += parseFloat(proj.weightedRevenue || 0);
            
            // By project type
            monthlyData[monthKey].byProjectType[proj.projectType] = 
                (monthlyData[monthKey].byProjectType[proj.projectType] || 0) + parseFloat(proj.weightedRevenue || 0);
            
            // By customer
            monthlyData[monthKey].byCustomer[proj.customer] = 
                (monthlyData[monthKey].byCustomer[proj.customer] || 0) + parseFloat(proj.weightedRevenue || 0);
        });
        
        // Filter by date range
        let filteredMonths = Object.keys(monthlyData);
        if (startMonth) {
            filteredMonths = filteredMonths.filter(m => m >= startMonth);
        }
        if (endMonth) {
            filteredMonths = filteredMonths.filter(m => m <= endMonth);
        }
        
        const reportData = filteredMonths.map(month => ({
            month,
            projectCount: monthlyData[month].projectCount,
            totalRevenue: monthlyData[month].totalRevenue,
            weightedRevenue: monthlyData[month].weightedRevenue,
            byProjectType: Object.keys(monthlyData[month].byProjectType).map(type => ({
                projectType: type,
                revenue: monthlyData[month].byProjectType[type],
                count: results.filter(p => p.projectType === type && 
                    `${p.startYear}-${String(p.startMonth).padStart(2, '0')}` === month).length
            })),
            byCustomer: Object.keys(monthlyData[month].byCustomer).map(cust => ({
                customer: cust,
                revenue: monthlyData[month].byCustomer[cust],
                projectCount: results.filter(p => p.customer === cust && 
                    `${p.startYear}-${String(p.startMonth).padStart(2, '0')}` === month).length
            }))
        }));
        
        const totalRevenue = reportData.reduce((sum, m) => sum + m.totalRevenue, 0);
        const weightedRevenue = reportData.reduce((sum, m) => sum + m.weightedRevenue, 0);
        const highestMonth = reportData.reduce((max, m) => 
            m.weightedRevenue > (max.weightedRevenue || 0) ? m : max, {});
        
        return {
            totalRevenue,
            weightedRevenue,
            reportData,
            summary: {
                highestRevenueMonth: highestMonth.month || '',
                highestRevenueAmount: highestMonth.weightedRevenue || 0,
                avgMonthlyRevenue: reportData.length > 0 ? weightedRevenue / reportData.length : 0
            }
        };
    });

    // ============================================
    // EMPLOYEE ALLOCATION REPORT
    // ============================================
    this.on('generateEmployeeAllocationReport', async (req) => {
        const { includeResigned, bandFilter } = req.data;
        
        let query = SELECT.from(EmployeeAllocationReport);
        
        if (!includeResigned) {
            query.where({ status: { '<>': 'Resigned' } });
        }
        if (bandFilter && bandFilter.length > 0) {
            query.where({ band: { in: bandFilter } });
        }
        
        const results = await query;
        
        const totalEmployees = results.length;
        const allocated = results.filter(e => e.status === 'Allocated' || e.status === 'PreAllocated').length;
        const bench = results.filter(e => e.status === 'UnproductiveBench' || e.status === 'InactiveBench').length;
        const utilizationPercentage = totalEmployees > 0 ? (allocated / totalEmployees) * 100 : 0;
        
        // Summary by band
        const utilizationByBand = {};
        results.forEach(emp => {
            if (!utilizationByBand[emp.band]) {
                utilizationByBand[emp.band] = { total: 0, allocated: 0 };
            }
            utilizationByBand[emp.band].total++;
            if (emp.status === 'Allocated' || emp.status === 'PreAllocated') {
                utilizationByBand[emp.band].allocated++;
            }
        });
        
        // Summary by employee type
        const utilizationByEmployeeType = {};
        results.forEach(emp => {
            if (!utilizationByEmployeeType[emp.employeeType]) {
                utilizationByEmployeeType[emp.employeeType] = { total: 0, allocated: 0 };
            }
            utilizationByEmployeeType[emp.employeeType].total++;
            if (emp.status === 'Allocated' || emp.status === 'PreAllocated') {
                utilizationByEmployeeType[emp.employeeType].allocated++;
            }
        });
        
        return {
            totalEmployees,
            allocated,
            bench,
            utilizationPercentage,
            reportData: results.map(emp => ({
                employeeName: emp.employeeName,
                band: emp.band,
                employeeType: emp.employeeType,
                status: emp.status,
                currentProject: emp.currentProject || '',
                customer: emp.customer || '',
                allocationStartDate: emp.allocationStartDate ? emp.allocationStartDate.toISOString().split('T')[0] : '',
                allocationEndDate: emp.allocationEndDate ? emp.allocationEndDate.toISOString().split('T')[0] : '',
                daysRemaining: emp.daysRemaining || 0,
                utilizationPercentage: emp.utilizationPercentage || 0
            })),
            summary: {
                utilizationByBand: Object.keys(utilizationByBand).map(band => ({
                    band,
                    allocated: utilizationByBand[band].allocated,
                    total: utilizationByBand[band].total,
                    percentage: utilizationByBand[band].total > 0 ? 
                        (utilizationByBand[band].allocated / utilizationByBand[band].total) * 100 : 0
                })),
                utilizationByEmployeeType: Object.keys(utilizationByEmployeeType).map(type => ({
                    employeeType: type,
                    allocated: utilizationByEmployeeType[type].allocated,
                    total: utilizationByEmployeeType[type].total,
                    percentage: utilizationByEmployeeType[type].total > 0 ? 
                        (utilizationByEmployeeType[type].allocated / utilizationByEmployeeType[type].total) * 100 : 0
                })),
                utilizationByProjectType: [] // Would need additional query
            }
        };
    });

    // ============================================
    // EMPLOYEE SKILL REPORT
    // ============================================
    this.on('generateEmployeeSkillReport', async (req) => {
        const { skillCategoryFilter, availabilityFilter } = req.data;
        
        let query = SELECT.from(EmployeeSkillReport);
        
        if (skillCategoryFilter && skillCategoryFilter.length > 0) {
            query.where({ category: { in: skillCategoryFilter } });
        }
        
        const results = await query;
        
        // Filter by availability
        let filteredResults = results;
        if (availabilityFilter === 'Available') {
            filteredResults = results.filter(s => s.availableEmployees > 0);
        } else if (availabilityFilter === 'Allocated') {
            filteredResults = results.filter(s => s.allocatedEmployees > 0);
        }
        
        // Calculate summary
        const skillsByCategory = {};
        filteredResults.forEach(skill => {
            if (!skillsByCategory[skill.category]) {
                skillsByCategory[skill.category] = { count: 0, totalAvailability: 0 };
            }
            skillsByCategory[skill.category].count++;
            const availability = skill.totalEmployees > 0 ? 
                (skill.availableEmployees / skill.totalEmployees) * 100 : 0;
            skillsByCategory[skill.category].totalAvailability += availability;
        });
        
        // Critical skills shortage
        const criticalSkillsShortage = filteredResults
            .filter(s => s.totalDemand > s.currentSupply)
            .map(s => ({
                skillName: s.skillName,
                demand: s.totalDemand,
                supply: s.currentSupply,
                gap: s.totalDemand - s.currentSupply
            }))
            .sort((a, b) => b.gap - a.gap)
            .slice(0, 10);
        
        return {
            totalSkills: filteredResults.length,
            totalEmployeesWithSkills: new Set(
                filteredResults.flatMap(s => {
                    // Would need to query EmployeeSkill to get actual employee IDs
                    return [];
                })
            ).size,
            reportData: filteredResults.map(skill => ({
                skillName: skill.skillName,
                category: skill.category,
                totalEmployees: skill.totalEmployees,
                availableEmployees: skill.availableEmployees,
                allocatedEmployees: skill.allocatedEmployees,
                availabilityPercentage: skill.totalEmployees > 0 ? 
                    (skill.availableEmployees / skill.totalEmployees) * 100 : 0
            })),
            summary: {
                skillsByCategory: Object.keys(skillsByCategory).map(cat => ({
                    category: cat,
                    count: skillsByCategory[cat].count,
                    avgAvailability: skillsByCategory[cat].count > 0 ? 
                        skillsByCategory[cat].totalAvailability / skillsByCategory[cat].count : 0
                })),
                criticalSkillsShortage
            }
        };
    });

    // ============================================
    // PROJECTS NEARING COMPLETION REPORT
    // ============================================
    this.on('generateProjectsNearingCompletionReport', async (req) => {
        const { completionWindow, projectTypeFilter } = req.data;
        
        let query = SELECT.from(ProjectsNearingCompletionReport);
        
        if (completionWindow && completionWindow !== 'All') {
            const days = parseInt(completionWindow);
            query.where({ daysToCompletion: { '<=': days } });
        }
        if (projectTypeFilter && projectTypeFilter.length > 0) {
            query.where({ projectType: { in: projectTypeFilter } });
        }
        
        const results = await query;
        
        // Calculate summary
        const byCriticality = {
            'Critical': 0,
            'High': 0,
            'Medium': 0,
            'Low': 0
        };
        const byProjectType = {};
        let totalEmployees = 0;
        
        results.forEach(proj => {
            byCriticality[proj.completionRisk] = (byCriticality[proj.completionRisk] || 0) + 1;
            byProjectType[proj.projectType] = (byProjectType[proj.projectType] || 0) + 1;
            totalEmployees += proj.employeeCount || 0;
        });
        
        return {
            totalProjectsNearing: results.length,
            reportData: results.map(proj => ({
                projectReference: proj.projectReference,
                projectName: proj.projectName,
                projectType: proj.projectType,
                customer: proj.customer,
                completionDate: proj.completionDate ? proj.completionDate.toISOString().split('T')[0] : '',
                daysToCompletion: proj.daysToCompletion,
                completionRisk: proj.completionRisk,
                employeeCount: proj.employeeCount,
                projectManager: proj.projectManager || '',
                projectManagerEmail: proj.projectManagerEmail || ''
            })),
            summary: {
                byCriticality: Object.keys(byCriticality).map(risk => ({
                    riskLevel: risk,
                    count: byCriticality[risk],
                    totalEmployees: results
                        .filter(p => p.completionRisk === risk)
                        .reduce((sum, p) => sum + (p.employeeCount || 0), 0)
                })),
                byProjectType: Object.keys(byProjectType).map(type => ({
                    projectType: type,
                    count: byProjectType[type]
                })),
                totalEmployeesToBeReleased: totalEmployees
            }
        };
    });

    // ============================================
    // SUPERVISOR TEAM ALLOCATION REPORT
    // ============================================
    this.on('generateSupervisorTeamAllocationReport', async (req) => {
        const { supervisorId } = req.data;
        
        let query = SELECT.from(SupervisorTeamAllocationReport)
            .where({ supervisorOHR: supervisorId });
        
        const results = await query;
        
        // Get supervisor info
        const supervisor = await SELECT.one.from('db.Employee').where({ ohrId: supervisorId });
        
        const totalTeamMembers = results.length;
        const allocatedCount = results.filter(e => e.status === 'Allocated' || e.status === 'PreAllocated').length;
        const benchCount = results.filter(e => e.status === 'UnproductiveBench' || e.status === 'InactiveBench').length;
        const teamUtilization = totalTeamMembers > 0 ? (allocatedCount / totalTeamMembers) * 100 : 0;
        
        // Summary by status
        const byStatus = {};
        results.forEach(emp => {
            byStatus[emp.status] = (byStatus[emp.status] || 0) + 1;
        });
        
        return {
            supervisorName: supervisor ? supervisor.fullName : '',
            supervisorEmail: supervisor ? supervisor.mailid : '',
            totalTeamMembers,
            allocatedCount,
            benchCount,
            teamUtilization,
            reportData: results.map(emp => ({
                employeeName: emp.employeeName,
                band: emp.band,
                employeeType: emp.employeeType,
                status: emp.status,
                currentProject: emp.currentProject || '',
                allocationPercentage: emp.allocationPercentage || 0,
                daysRemainingOnProject: emp.daysRemainingOnProject || 0
            })),
            summary: {
                byStatus: Object.keys(byStatus).map(status => ({
                    status,
                    count: byStatus[status]
                })),
                byProjectType: [] // Would need additional query
            }
        };
    });

    // ============================================
    // CUSTOMER PROJECT PORTFOLIO REPORT
    // ============================================
    this.on('generateCustomerProjectPortfolioReport', async (req) => {
        const { customerFilter, verticalFilter } = req.data;
        
        let query = SELECT.from(CustomerProjectPortfolioReport);
        
        if (customerFilter && customerFilter.length > 0) {
            query.where({ SAPcustId: { in: customerFilter } });
        }
        if (verticalFilter && verticalFilter.length > 0) {
            query.where({ vertical: { in: verticalFilter } });
        }
        
        const results = await query;
        
        // Get projects for each customer
        const reportData = await Promise.all(results.map(async (cust) => {
            const projects = await SELECT.from('db.Project')
                .join('db.Opportunity').on('db.Project.oppId = db.Opportunity.sapOpportunityId')
                .where({ 'db.Opportunity.customerId': cust.SAPcustId });
            
            return {
                customerName: cust.customerName,
                customerStatus: cust.customerStatus,
                vertical: cust.vertical,
                totalProjects: cust.totalProjects,
                activeProjects: cust.activeProjects,
                plannedProjects: cust.plannedProjects,
                totalRevenue: cust.totalRevenue,
                engagedEmployees: cust.engagedEmployees,
                projects: projects.map(proj => ({
                    projectReference: proj.sapPId,
                    projectName: proj.projectName,
                    projectType: proj.projectType,
                    status: proj.status,
                    startDate: proj.startDate ? proj.startDate.toISOString().split('T')[0] : '',
                    endDate: proj.endDate ? proj.endDate.toISOString().split('T')[0] : ''
                }))
            };
        }));
        
        return {
            totalCustomers: results.length,
            totalActiveProjects: results.reduce((sum, c) => sum + (c.activeProjects || 0), 0),
            totalEngagedEmployees: results.reduce((sum, c) => sum + (c.engagedEmployees || 0), 0),
            reportData
        };
    });

    // ============================================
    // UTILIZATION TREND REPORT
    // ============================================
    this.on('generateUtilizationTrendReport', async (req) => {
        const { startDate, endDate, bandFilter, granularity } = req.data;
        
        // Simplified implementation - would need date aggregation
        let query = SELECT.from(UtilizationTrendView);
        
        if (bandFilter && bandFilter.length > 0) {
            query.where({ band: { in: bandFilter } });
        }
        
        const results = await query;
        
        // Group by period based on granularity
        const periodData = {};
        results.forEach(emp => {
            let periodKey = '';
            if (granularity === 'Monthly') {
                periodKey = `${emp.doj.getFullYear()}-${String(emp.doj.getMonth() + 1).padStart(2, '0')}`;
            } else if (granularity === 'Weekly') {
                // Calculate week number
                const week = Math.ceil((emp.doj - new Date(emp.doj.getFullYear(), 0, 1)) / 7);
                periodKey = `${emp.doj.getFullYear()}-W${String(week).padStart(2, '0')}`;
            } else {
                periodKey = emp.doj.toISOString().split('T')[0];
            }
            
            if (!periodData[periodKey]) {
                periodData[periodKey] = {
                    period: periodKey,
                    totalEmployees: 0,
                    allocatedEmployees: 0,
                    benchEmployees: 0,
                    byBand: {}
                };
            }
            
            periodData[periodKey].totalEmployees++;
            if (emp.activeAllocations > 0) {
                periodData[periodKey].allocatedEmployees++;
            } else {
                periodData[periodKey].benchEmployees++;
            }
            
            if (!periodData[periodKey].byBand[emp.band]) {
                periodData[periodKey].byBand[emp.band] = { total: 0, allocated: 0 };
            }
            periodData[periodKey].byBand[emp.band].total++;
            if (emp.activeAllocations > 0) {
                periodData[periodKey].byBand[emp.band].allocated++;
            }
        });
        
        const reportData = Object.keys(periodData).map(period => ({
            period,
            totalEmployees: periodData[period].totalEmployees,
            allocatedEmployees: periodData[period].allocatedEmployees,
            benchEmployees: periodData[period].benchEmployees,
            utilizationPercentage: periodData[period].totalEmployees > 0 ? 
                (periodData[period].allocatedEmployees / periodData[period].totalEmployees) * 100 : 0,
            byBand: Object.keys(periodData[period].byBand).map(band => ({
                band,
                total: periodData[period].byBand[band].total,
                allocated: periodData[period].byBand[band].allocated,
                percentage: periodData[period].byBand[band].total > 0 ? 
                    (periodData[period].byBand[band].allocated / periodData[period].byBand[band].total) * 100 : 0
            }))
        }));
        
        const avgUtilization = reportData.length > 0 ? 
            reportData.reduce((sum, p) => sum + p.utilizationPercentage, 0) / reportData.length : 0;
        const peakPeriod = reportData.reduce((max, p) => 
            p.utilizationPercentage > (max.utilizationPercentage || 0) ? p : max, {});
        const lowestPeriod = reportData.reduce((min, p) => 
            p.utilizationPercentage < (min.utilizationPercentage || 100) ? p : min, {});
        
        return {
            reportData,
            summary: {
                avgUtilization,
                peakUtilizationPeriod: peakPeriod.period || '',
                lowestUtilizationPeriod: lowestPeriod.period || '',
                trend: 'Stable' // Would need historical comparison
            }
        };
    });

    // ============================================
    // SKILLS GAP ANALYSIS REPORT
    // ============================================
    this.on('generateSkillsGapAnalysisReport', async (req) => {
        const { projectTypeFilter, priorityThreshold } = req.data;
        
        let query = SELECT.from(SkillsGapAnalysisReport);
        
        const results = await query;
        
        // Filter by threshold
        const criticalGaps = results
            .filter(s => s.gap >= (priorityThreshold || 0))
            .map(skill => ({
                skillName: skill.skillName,
                skillCategory: skill.category,
                requiredForBand: '', // Would need additional logic
                totalDemand: skill.totalDemand,
                currentSupply: skill.currentSupply,
                gap: skill.gap,
                impactedProjects: skill.impactedProjects,
                recommendations: skill.gap > 0 ? 
                    `Hire ${skill.gap} employees with ${skill.skillName} skill or provide training to existing employees` : 
                    'No action needed'
            }))
            .sort((a, b) => b.gap - a.gap);
        
        const topMissingSkills = criticalGaps
            .filter(s => s.gap > 0)
            .slice(0, 10)
            .map(s => ({
                skillName: s.skillName,
                gap: s.gap
            }));
        
        const topSurplusSkills = results
            .filter(s => s.gap < 0)
            .map(s => ({
                skillName: s.skillName,
                surplus: Math.abs(s.gap)
            }))
            .sort((a, b) => b.surplus - a.surplus)
            .slice(0, 10);
        
        return {
            criticalGaps,
            summary: {
                totalCriticalSkillGaps: criticalGaps.length,
                topMissingSkills,
                topSurplusSkills,
                trainingPriority: criticalGaps
                    .filter(s => s.gap > 0 && s.gap <= 5)
                    .map(s => ({
                        skillName: s.skillName,
                        investmentLevel: s.gap <= 2 ? 'Low' : s.gap <= 5 ? 'Medium' : 'High'
                    }))
            }
        };
    });

    // ============================================
    // EMPLOYEE ASSIGNMENT HISTORY REPORT
    // ============================================
    this.on('generateEmployeeAssignmentHistoryReport', async (req) => {
        const { employeeId, limit } = req.data;
        
        const employee = await SELECT.one.from('db.Employee').where({ ohrId: employeeId });
        if (!employee) {
            throw new Error(`Employee with ID ${employeeId} not found`);
        }
        
        const allocations = await SELECT.from('db.EmployeeProjectAllocation')
            .where({ employeeId: employeeId })
            .orderBy({ allocationDate: 'desc' })
            .limit(limit || 50);
        
        const reportData = await Promise.all(allocations.map(async (alloc) => {
            const project = await SELECT.one.from('db.Project')
                .join('db.Opportunity').on('db.Project.oppId = db.Opportunity.sapOpportunityId')
                .join('db.Customer').on('db.Opportunity.customerId = db.Customer.SAPcustId')
                .where({ 'db.Project.sapPId': alloc.projectId });
            
            const durationMonths = project ? 
                Math.ceil((alloc.endDate - alloc.startDate) / (1000 * 60 * 60 * 24 * 30)) : 0;
            
            return {
                projectReference: project ? project.sapPId : '',
                projectName: project ? project.projectName : '',
                customer: project ? project.customerName : '',
                projectType: project ? project.projectType : '',
                startDate: alloc.startDate ? alloc.startDate.toISOString().split('T')[0] : '',
                endDate: alloc.endDate ? alloc.endDate.toISOString().split('T')[0] : '',
                durationMonths,
                allocationPercentage: alloc.allocationPercentage || 100,
                status: alloc.status
            };
        }));
        
        const totalAssignments = allocations.length;
        const totalProjectsWorked = new Set(allocations.map(a => a.projectId)).size;
        const avgDuration = reportData.length > 0 ? 
            reportData.reduce((sum, p) => sum + p.durationMonths, 0) / reportData.length : 0;
        const avgAllocation = reportData.length > 0 ? 
            reportData.reduce((sum, p) => sum + p.allocationPercentage, 0) / reportData.length : 0;
        
        // Get skills and industries
        const skills = employee.skills ? employee.skills.split(',').map(s => s.trim()) : [];
        const industries = new Set(
            (await Promise.all(allocations.map(async (alloc) => {
                const project = await SELECT.one.from('db.Project')
                    .join('db.Opportunity').on('db.Project.oppId = db.Opportunity.sapOpportunityId')
                    .join('db.Customer').on('db.Opportunity.customerId = db.Customer.SAPcustId')
                    .where({ 'db.Project.sapPId': alloc.projectId });
                return project ? project.vertical : null;
            }))).filter(v => v)
        );
        
        // Project type distribution
        const projectTypeDist = {};
        reportData.forEach(proj => {
            projectTypeDist[proj.projectType] = (projectTypeDist[proj.projectType] || 0) + 1;
        });
        
        return {
            employeeName: employee.fullName,
            totalAssignments,
            totalProjectsWorked,
            avgProjectDuration: avgDuration,
            reportData,
            summary: {
                skillsDeveloped: skills,
                industriesExperienced: Array.from(industries),
                averageAllocationPercentage: avgAllocation,
                projectTypeDistribution: Object.keys(projectTypeDist).map(type => ({
                    projectType: type,
                    count: projectTypeDist[type],
                    percentage: (projectTypeDist[type] / totalAssignments) * 100
                }))
            }
        };
    });

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    this.on('exportReportToCSV', async (req) => {
        const { reportType, filters } = req.data;
        // Implementation would generate CSV and return as string
        return `CSV export for ${reportType} with filters: ${filters}`;
    });

    this.on('scheduleReportGeneration', async (req) => {
        const { reportType, frequency, recipients, filters } = req.data;
        // Implementation would schedule report generation
        return {
            scheduleId: `SCHED-${Date.now()}`,
            status: 'Scheduled',
            nextGenerationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
    });
});


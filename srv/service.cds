using db from '../db/schema';
using {com.company.resourceallocation.reports as reports} from '../db/reports/reportViews';

service MyService {
  // Master Data Entities - MDC Responsive Tables
  entity Customers     as projection on db.Customer;
  entity Opportunities as projection on db.Opportunity;
  entity Projects      as projection on db.Project;
  
  @cds.redirection.target: true
  entity Employees     as projection on db.Employee;
  
  entity Demands       as projection on db.Demand;
  
  // Skills Master Data
  @cds.redirection.target: true
  entity Skills        as projection on db.Skills;
  
  // Employee-Skills Junction Table (Many-to-Many)
  entity EmployeeSkills as projection on db.EmployeeSkill;
  
  // Employee-Project Allocations
  entity Allocations   as projection on db.EmployeeProjectAllocation;
  
  // ============================================
  // REPORT ENTITIES (from ReportService)
  // ============================================
  @readonly
  entity EmployeeBenchReport as projection on reports.EmployeeBenchReportView;
  
  @readonly
  entity EmployeeProbableReleaseReport as projection on reports.EmployeeProbableReleaseView;
  
  @readonly
  entity RevenueForecastReport as projection on reports.RevenueForecastView;
  
  @readonly
  entity EmployeeAllocationReport as projection on reports.EmployeeAllocationReportView;
  
  @readonly
  entity EmployeeSkillReport as projection on reports.EmployeeSkillReportView;
  
  @readonly
  entity ProjectsNearingCompletionReport as projection on reports.ProjectsNearingCompletionView;
}

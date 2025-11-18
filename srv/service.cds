using db from '../db/schema';
using {com.company.resourceallocation.reports as reports} from '../db/reports/reportViews';

service MyService {
  // Master Data Entities - MDC Responsive Tables

  @restrict: [{
    grant: '*',
    to   : ['customers_admin_master']
  }]
  entity Customers                       as projection on db.Customer;

  @restrict: [{
    grant: '*',
    to   : ['opportunities_admin_master']
  }]
  entity Opportunities                   as projection on db.Opportunity;

  @restrict: [{
    grant: '*',
    to   : ['projects_admin_master']
  }]

  entity Projects                        as projection on db.Project;

  @cds.redirection.target: true
  @restrict              : [{
    grant: '*',
    to   : ['employees_admin_master']
  }]
  entity Employees                       as projection on db.Employee;

  entity Demands                         as projection on db.Demand;

  // Skills Master Data
  @cds.redirection.target: true
  entity Skills                          as projection on db.Skills;

  // Employee-Skills Junction Table (Many-to-Many)
  entity EmployeeSkills                  as projection on db.EmployeeSkill;

  // Employee-Project Allocations
  @restrict: [{
    grant: '*',
    to   : ['projects_admin_allocation']
  }]
  entity Allocations                     as projection on db.EmployeeProjectAllocation;

  // ============================================
  // REPORT ENTITIES (from ReportService)
  // ============================================

  @readonly
  @restrict: [{
    grant: 'READ',
    to   : ['employee_bench_admin_report']
  }]
  entity EmployeeBenchReport             as projection on reports.EmployeeBenchReportView;

  @readonly
    @restrict: [{
    grant: 'READ',
    to   : ['employee_probable_release_report']
  }]
  entity EmployeeProbableReleaseReport   as projection on reports.EmployeeProbableReleaseView;

  @readonly
    @restrict: [{
    grant: 'READ',
    to   : ['revenue_forecast_report']
  }]
  entity RevenueForecastReport           as projection on reports.RevenueForecastView;

  @readonly
    @restrict: [{
    grant: 'READ',
    to   : ['employee_allocation_admin_report']
  }]
  entity EmployeeAllocationReport        as projection on reports.EmployeeAllocationReportView;

  @readonly
    @restrict: [{
    grant: 'READ',
    to   : ['employee_skill_admin_report']
  }]
  entity EmployeeSkillReport             as projection on reports.EmployeeSkillReportView;

  @readonly
    @restrict: [{
    grant: 'READ',
    to   : ['project_status_admin_report']
  }]
  entity ProjectsNearingCompletionReport as projection on reports.ProjectsNearingCompletionView;

  // ============================================
  // METADATA & CONFIGURATION ENDPOINTS
  // ============================================

  // Enum metadata endpoint - provides enum values and labels from schema
  type EnumMetadata {
    entity   : String;
    property : String;
    values   : array of String;
    labels   : array of String;
  }

  // Country-City mapping endpoint
  type CountryCityMapping {
    country : String;
    cities  : array of String;
  }

  // Band-Designation mapping endpoint
  type BandDesignationMapping {
    band         : String;
    designations : array of String;
  }


  function getUserRoles()               returns {
    roles : array of String;
  }

  // Metadata service actions
  function getEnumMetadata()            returns array of EnumMetadata;
  function getCountryCityMappings()     returns array of CountryCityMapping;
  function getBandDesignationMappings() returns array of BandDesignationMapping;

}

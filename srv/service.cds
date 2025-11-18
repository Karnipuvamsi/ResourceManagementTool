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
  
  // Customer Country-State-City Master Data
  entity CustomerCountries as projection on db.CustomerCountries;
  entity CustomerStates    as projection on db.CustomerStates;
  entity CustomerCities    as projection on db.CustomerCities;
  
  // Code Lists for Enum Dropdowns
  entity CustomerStatuses    as projection on db.CustomerStatuses;
  entity Verticals           as projection on db.Verticals;
  entity Probabilities       as projection on db.Probabilities;
  entity OpportunityStages   as projection on db.OpportunityStages;
  entity Currencies          as projection on db.Currencies;
  entity ProjectTypes        as projection on db.ProjectTypes;
  entity ProjectStatuses    as projection on db.ProjectStatuses;
  entity SowOptions          as projection on db.SowOptions;
  entity PoOptions           as projection on db.PoOptions;
  entity EmployeeStatuses    as projection on db.EmployeeStatuses;
  entity EmployeeTypes       as projection on db.EmployeeTypes;
  entity Genders             as projection on db.Genders;
  entity EmployeeBands       as projection on db.EmployeeBands;
  entity BandDesignations    as projection on db.BandDesignations;
  entity AllocationStatuses  as projection on db.AllocationStatuses;
  
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
  
  // ============================================
  // METADATA & CONFIGURATION ENDPOINTS
  // ============================================
  
  // Enum metadata endpoint - provides enum values and labels from schema
  type EnumMetadata {
    entity: String;
    property: String;
    values: array of String;
    labels: array of String;
  }
  
  // Country-City mapping endpoint
  type CountryCityMapping {
    country: String;
    cities: array of String;
  }
  
  // Band-Designation mapping endpoint
  type BandDesignationMapping {
    band: String;
    designations: array of String;
  }
  
  // Metadata service actions
  function getEnumMetadata() returns array of EnumMetadata;
  function getCountryCityMappings() returns array of CountryCityMapping;
  function getBandDesignationMappings() returns array of BandDesignationMapping;
}

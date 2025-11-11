using db from '../db/schema';

service MyService {
  // Master Data Entities - MDC Responsive Tables
  entity Customers     as projection on db.Customer;
  entity Opportunities as projection on db.Opportunity;
  entity Projects      as projection on db.Project;
  
  entity Employees     as projection on db.Employee;
  
  entity Demands       as projection on db.Demand;
  
  // Skills Master Data
  entity Skills        as projection on db.Skills;
  
  // Employee-Skills Junction Table (Many-to-Many)
  entity EmployeeSkills as projection on db.EmployeeSkill;
  
  // Employee-Project Allocations
  entity Allocations   as projection on db.EmployeeProjectAllocation;
}

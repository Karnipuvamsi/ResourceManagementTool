// RESOURCE MANAGEMENT TOOL - DATA SCHEMA
// 
// Key Design Decisions:
// 1. Employee Skills: Use EmployeeSkill junction table (many-to-many) - NO string field
// 2. Skills are managed via Skills master data entity
// 3. Employee skills link to Skills via EmployeeSkill (enables skill matching with demands)
// 4. Vertical converted to enum (no longer an entity)
// 5. Date fields (doj, lwd) are Date type (not String)

namespace db;

using {managed} from '@sap/cds/common';


type CustomerStatusEnum   : String enum {
    Active = 'Active';
    Inactive = 'Inactive';
    Prospect = 'Prospect'
}

// ✅ CONVERTED: Vertical entity to enum (fixed values)
type VerticalEnum : String enum {
    BFS = 'BFS';
    CapitalMarkets = 'Capital Markets';
    CPG = 'CPG';
    Healthcare = 'Healthcare';
    HighTech = 'High Tech';
    Insurance = 'Insurance';
    LifeSciences = 'Life Sciences';
    Manufacturing = 'Manufacturing';
    Retail = 'Retail';
    Services = 'Services';
}

entity Customer {
    key SAPcustId        : String;
        customerName     : String(100);
        state            : String;
        country          : String;
        status           : CustomerStatusEnum;
        vertical         : VerticalEnum;  // ✅ CHANGED: Now using enum instead of entity
        startDate        : Date;          // ✅ NEW: Customer start date
        endDate          : Date;          // ✅ NEW: Customer end date
        
        to_Opportunities : Association to many Opportunity
                               on to_Opportunities.customerId = $self.SAPcustId;
}

// -------------------- Opportunity --------------------

type ProbabilityEnum      : String enum {
    ProposalStage = '0%-ProposalStage'; // Proposal Stage
    SoWSent = '33%-SoWSent'; // SoW is Sent
    SoWSigned = '85%-SoWSigned'; // SoW is Signed
    PurchaseOrderReceived = '100%-PurchaseOrderReceived'; // Purchase Order is received
}

type OpportunityStageEnum : String enum {
    Discover = 'Discover';
    Define = 'Define';
    OnBid = 'On Bid';
    DownSelect = 'Down Select';
    SignedDeal = 'Signed Deal';
}

entity Opportunity {
    key sapOpportunityId  : String;
        sfdcOpportunityId : String;
        opportunityName   : String;
        businessUnit      : String;
        probability       : ProbabilityEnum;
        salesSPOC         : String;
        deliverySPOC      : String;
        expectedStart     : Date;
        expectedEnd       : Date;
        tcv  : Decimal(15, 2);
        Stage             : OpportunityStageEnum;
        customerId        : String;
        
        to_Customer       : Association to one Customer
                                on to_Customer.SAPcustId = $self.customerId;
        to_Project        : Association to many Project
                                on to_Project.oppId = $self.sapOpportunityId;
}

// -------------------- Project --------------------

type ProjectTypeEnum      : String enum {
    FixedPrice = 'Fixed Price';
    TransactionBased = 'Transaction Based';
    FixedMonthly = 'Fixed Monthly';
    PassThru = 'Pass Thru';
    Divine = 'Divine';
    TimeAndMaterial = 'Time & Material';
}

type ProjectStatusEnum    : String enum {
    Active = 'Active';
    Closed = 'Closed';
    ToBeCreated = 'To Be Created';
}

type SowEnum : String enum {
    Yes = 'Yes';
    No = 'No';
}

type PoEnum : String enum {
    Yes = 'Yes';
    No = 'No';
}

type Segment : String enum {
    Data = 'Data';
    TechAndAI = 'Tech And AI';
}

type Vertical : String enum {
    HMS = 'HMS';
    CNH = 'CNH';
    FS = 'FS';
}

type SubVertical : String enum {
    SAP = 'SAP';
    Digital = 'Digital';
}

type Unit : String enum {
    GEV = 'GEV';
    HMS = 'HMS';
    CNH = 'CNH';
    FS = 'FS';
}




entity Project {
    key sapPId            : String;
        sfdcPId           : String;
        projectName       : String(256);
        startDate         : Date;
        endDate           : Date;
        gpm               : String;
        projectType       : ProjectTypeEnum;
        oppId             : String;
        segment           : Segment;
        vertical          : Vertical;
        subVertical       : SubVertical;
        unit              : Unit;
        
        status            : ProjectStatusEnum;
        requiredResources : Integer;
        allocatedResources: Integer;
        toBeAllocated     : Integer;
        SOWReceived       : SowEnum;
        POReceived        : PoEnum;
    
        to_Opportunity    : Association to one Opportunity
                             on to_Opportunity.sapOpportunityId = $self.oppId;
        to_GPM            : Association to one Employee
                             on to_GPM.ohrId = $self.gpm;
        to_Demand         : Association to many Demand
                             on to_Demand.sapPId = $self.sapPId;
        to_Allocations    : Association to many EmployeeProjectAllocation  // ✅ NEW
                             on to_Allocations.projectId = $self.sapPId;
}

// ----------------------- Demand -------------------------------------

entity Demand {
    key demandId          : Integer;       // ✅ Changed from UUID to Integer for simplicity
        skill             : String;        // Skill name (simple string field)
        band              : String;
        sapPId            : String;
        quantity          : Integer;
        allocatedCount    : Integer;      // ✅ NEW: Calculated - count of allocations matching this demand's skill
        remaining         : Integer;      // ✅ NEW: Calculated - quantity - allocatedCount
    
        to_Project        : Association to one Project
                           on to_Project.sapPId = $self.sapPId;
}

// -------------------- Employee --------------------

type EmployeeTypeEnum     : String enum {
    FullTime = 'Full Time';
    SubCon = 'Subcon';
    Intern = 'Intern';
    YTJ = 'Yet To Join';
}

type EmployeeStatusEnum   : String enum {
    PreAllocated = 'Pre Allocated';
    Allocated = 'Allocated';
    Resigned = 'Resigned';
    UnproductiveBench = 'Unproductive Bench';
    ProductiveBench = 'Inactive Bench';
}

type GenderEnum           : String enum {
    Male = 'Male';
    Female = 'Female';
    Others = 'Others';
}

type EmployeeBandEnum     : String enum {
    Band1 = '1';
    Band2 = '2';
    Band3 = '3';
    Band4A = '4A';
    Band4BC = '4B-C';
    Band4BLC = '4B-LC';
    Band4C = '4C';
    Band4D = '4D';
    Band5A = '5A';
    Band5B = '5B';
    BandSubcon = 'Subcon';
}

// ✅ Employee-Skills Junction Table (Many-to-Many)
// This is the PRIMARY way to track employee skills - links Employee to Skills master data
entity EmployeeSkill {
    key employeeId        : String;
    key skillId           : Integer;  // Foreign key to Skills (Integer)
    
    to_Employee           : Association to one Employee
                              on to_Employee.ohrId = $self.employeeId;
    to_Skill              : Association to one Skills
                              on to_Skill.id = $self.skillId;
}

// ✅ NEW: Allocation Status Enum
type AllocationStatusEnum : String enum {
    Active = 'Active';
    Completed = 'Completed';
    Cancelled = 'Cancelled';
}

// ✅ NEW: Allocation entity for Employee-Project relationship
entity EmployeeProjectAllocation {
    key allocationId      : UUID;
    employeeId            : String;
    projectId             : String;
    demandId              : Integer;    // ✅ NEW: Link to Demand (employee can only be allocated to one demand per project)
                                          // Note: For existing allocations without demandId, will be set to first demand of project
    startDate             : Date;        // ✅ Allocation start date (defaults to project start, but can be modified for employees joining mid-project)
    endDate               : Date;        // ✅ Allocation end date (defaults to project end, but cannot exceed project end)
    allocationDate        : Date;       // ✅ Date when allocation was created
    allocationPercentage  : Integer;    // ✅ NEW: Percentage of employee time allocated (0-100), default 100
    status                : AllocationStatusEnum;
    
    to_Employee           : Association to one Employee
                              on to_Employee.ohrId = $self.employeeId;
    to_Project            : Association to one Project
                              on to_Project.sapPId = $self.projectId;
    to_Demand             : Association to one Demand
                              on to_Demand.demandId = $self.demandId;
}

entity Employee {
    key ohrId             : String;
        fullName          : String;
        mailid            : String;
        gender            : GenderEnum;
        employeeType      : EmployeeTypeEnum;
        doj               : Date;
        band              : EmployeeBandEnum;
        role              : String;
        location          : String;
        supervisorOHR     : String;
        skills            : String;  // Simple string field - stores comma-separated skill names
        country           : String;  // ✅ NEW: Employee country with value help
        city              : String;
        lwd               : Date;
        status            : EmployeeStatusEnum;
        empallocpercentage:Integer64;
    
    // Self-referential associations (Supervisor-Subordinate hierarchy)
    to_Supervisor         : Association to one Employee
                          on to_Supervisor.ohrId = $self.supervisorOHR;
    to_Subordinates       : Association to many Employee
                          on to_Subordinates.supervisorOHR = $self.ohrId;
    
    // Project allocations
    to_Allocations        : Association to many EmployeeProjectAllocation
                          on to_Allocations.employeeId = $self.ohrId;
}

//-------------Skills--------------------

entity Skills {
    key id                : Integer;  // Changed from UUID to Integer for simplicity
        name              : String;
        category          : String;
    
    // Note: Demand now uses simple skill string field (no association)
    // EmployeeSkill junction table still uses skillId for many-to-many relationship
    to_EmployeeSkills     : Association to many EmployeeSkill
                          on to_EmployeeSkills.skillId = $self.id;
}

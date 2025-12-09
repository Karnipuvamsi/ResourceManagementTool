# Architecture Guide

## 📖 Overview

This document explains the **technical architecture** of the Resource Management Tool - how the frontend and backend communicate, how data flows, and how the system is structured.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │         SAP UI5 Frontend (app/webapp/)           │   │
│  │  - Controllers (Home.controller.js)              │   │
│  │  - Views (XML fragments)                         │   │
│  │  - Utilities (CRUDHelper, FormHandler, etc.)     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          │ OData v4 (HTTP REST)
                          │
┌─────────────────────────────────────────────────────────┐
│              SAP CAP Backend (srv/)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Service Layer (service.js)                │   │
│  │  - Business Logic                                 │   │
│  │  - Validations                                    │   │
│  │  - Calculations                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │      Service Definition (service.cds)              │   │
│  │  - Exposes entities                               │   │
│  │  - Defines OData endpoints                        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          │ SQL Queries
                          │
┌─────────────────────────────────────────────────────────┐
│              Database Layer (db/)                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │      Schema Definition (schema.cds)               │   │
│  │  - Entities                                       │   │
│  │  - Enums                                          │   │
│  │  - Associations                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Database (SQLite / HANA)                  │   │
│  │  - Tables                                         │   │
│  │  - Data                                           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Layer Breakdown

### 1. Frontend Layer (UI5)

**Location**: `app/webapp/`

**Purpose**: User interface and client-side logic

**Components**:

#### Controllers
- **`Home.controller.js`**: Main controller handling navigation, table initialization, and user interactions
- **`App.controller.js`**: Root application controller

#### Views
- **`Home.view.xml`**: Main application view with navigation
- **`fragments/*.fragment.xml`**: Reusable UI fragments for each entity
- **`dialogs/*.fragment.xml`**: Dialog fragments for value help, forms, etc.

#### Utilities
- **`CRUDHelper.js`**: Delete operations
- **`FormHandler.js`**: Create/Update form handling
- **`FileUploadHelper.js`**: CSV file upload
- **`TableInitializer.js`**: Table setup and initialization
- **`CustomUtility.js`**: Common utilities shared across controllers

#### Delegates
- **`*TableDelegate.js`**: MDC table configuration
- **`*FilterBarDelegate.js`**: MDC filter bar configuration

**Technology**: SAP UI5, OData v4 Model

---

### 2. Service Layer (Backend)

**Location**: `srv/`

**Purpose**: Business logic, validations, and data processing

#### Service Definition (`service.cds`)
- Defines which entities are exposed via OData
- Maps database entities to service entities
- Defines custom functions and actions

**Example**:
```cds
service MyService {
  entity Customers as projection on db.Customer;
  entity Employees as projection on db.Employee;
  function getEnumMetadata() returns array of EnumMetadata;
}
```

#### Service Implementation (`service.js`)
- **Business Logic**: Validations, calculations, status updates
- **Hooks**: `before` and `after` hooks for CRUD operations
- **Helper Functions**: Reusable functions for calculations

**Key Hooks**:
- `before('CREATE', Entity)` - Validate before creating
- `after('CREATE', Entity)` - Calculate after creating
- `before('UPDATE', Entity)` - Validate before updating
- `after('UPDATE', Entity)` - Recalculate after updating
- `before('DELETE', Entity)` - Store data before deleting
- `after('DELETE', Entity)` - Recalculate after deleting
- `on('READ', Entity)` - Modify data when reading

**Technology**: Node.js, SAP CAP Framework

---

### 3. Database Layer

**Location**: `db/`

**Purpose**: Data model and database structure

#### Schema Definition (`schema.cds`)
- **Entities**: Tables (Customer, Employee, Project, etc.)
- **Enums**: Fixed value lists (Status, Band, etc.)
- **Associations**: Relationships between entities
- **Types**: Custom data types

**Example**:
```cds
entity Employee {
  key ohrId: String;
  fullName: String;
  status: EmployeeStatusEnum;
  to_Allocations: Association to many EmployeeProjectAllocation;
}
```

#### Report Views (`reports/reportViews.cds`)
- Calculated views for reports
- Joins multiple entities
- Aggregations and calculations

**Technology**: SAP CDS (Core Data Services), SQLite (dev) / HANA (prod)

---

## 🔄 Data Flow

### Example: Creating a Customer

```
1. USER ACTION
   User fills form and clicks "Save"
   ↓
2. FRONTEND (Home.controller.js)
   FormHandler._onCustomerDialogSave()
   - Validates form data
   - Creates OData context
   - Sends POST request
   ↓
3. NETWORK (HTTP)
   POST /odata/v4/my/Customers
   Body: { customerName: "Acme Corp", ... }
   ↓
4. BACKEND (service.js)
   before('CREATE', Customers)
   - Auto-generates SAPcustId: "C-0001"
   - Validates data
   ↓
5. DATABASE
   INSERT INTO Customer (SAPcustId, customerName, ...)
   VALUES ('C-0001', 'Acme Corp', ...)
   ↓
6. BACKEND (service.js)
   after('CREATE', Customers) [if needed]
   - No calculations needed for Customers
   ↓
7. NETWORK (HTTP Response)
   201 Created
   Body: { SAPcustId: "C-0001", customerName: "Acme Corp", ... }
   ↓
8. FRONTEND (Home.controller.js)
   - Receives response
   - Closes dialog
   - Refreshes table
   ↓
9. USER SEES
   New customer "C-0001" appears in table
```

---

## 🔌 OData Communication

### OData v4 Endpoints

The service exposes these endpoints:

| Entity | Endpoint | Operations |
|--------|----------|------------|
| Customers | `/Customers` | GET, POST, PATCH, DELETE |
| Employees | `/Employees` | GET, POST, PATCH, DELETE |
| Projects | `/Projects` | GET, POST, PATCH, DELETE |
| Opportunities | `/Opportunities` | GET, POST, PATCH, DELETE |
| Demands | `/Demands` | GET, POST, PATCH, DELETE |
| Allocations | `/Allocations` | GET, POST, PATCH, DELETE |
| Reports | `/EmployeeBenchReport`<br>`/RevenueForecastReport`<br>etc. | GET (read-only) |

### OData Operations

#### GET (Read)
```
GET /Customers
GET /Customers('C-0001')
GET /Customers?$filter=status eq 'Active'
GET /Customers?$expand=to_Opportunities
```

#### POST (Create)
```
POST /Customers
Body: { customerName: "Acme Corp", ... }
```

#### PATCH (Update)
```
PATCH /Customers('C-0001')
Body: { customerName: "Acme Corp Updated" }
```

#### DELETE
```
DELETE /Customers('C-0001')
```

---

## 🗄️ Database Schema

### Entity Relationships

```
Customer (1) ──< (many) Opportunity (1) ──< (many) Project (1) ──< (many) Demand
                                                                    │
                                                                    │
Employee (1) ──< (many) EmployeeProjectAllocation (many) ──> (1) Project
                │
                │
                └──> (1) Demand

Employee (many) ──< EmployeeSkill >── (many) Skills
```

### Key Entities

#### Customer
- **Key**: `SAPcustId` (String, e.g., "C-0001")
- **Fields**: customerName, state, country, status, vertical
- **Relations**: Has many Opportunities

#### Opportunity
- **Key**: `sapOpportunityId` (String, e.g., "O-0001")
- **Fields**: opportunityName, probability, Stage, tcv, customerId
- **Relations**: Belongs to Customer, has many Projects

#### Project
- **Key**: `sapPId` (String, e.g., "P-0001")
- **Fields**: projectName, startDate, endDate, projectType, status, requiredResources, allocatedResources
- **Relations**: Belongs to Opportunity, has many Demands and Allocations

#### Employee
- **Key**: `ohrId` (String, e.g., "EMP001")
- **Fields**: fullName, band, employeeType, status, empallocpercentage
- **Relations**: Has many Allocations, many EmployeeSkills

#### Allocation
- **Key**: `allocationId` (UUID)
- **Fields**: employeeId, projectId, demandId, startDate, endDate, allocationPercentage, status
- **Relations**: Belongs to Employee, Project, and Demand

#### Demand
- **Key**: `demandId` (Integer, e.g., 1, 2, 3)
- **Fields**: skill, band, sapPId, quantity, allocatedCount, remaining
- **Relations**: Belongs to Project

---

## 🔐 Security & Authentication

### Development
- **Authentication**: Mocked (no real authentication)
- **Authorization**: No restrictions

### Production
- **Authentication**: SAP XSUAA (configured in `xs-security.json`)
- **Authorization**: Role-based access control

**Configuration**: `xs-security.json`

---

## 📊 Report Architecture

### Report Views
- **Location**: `db/reports/reportViews.cds`
- **Purpose**: Pre-calculated views for reports
- **Technology**: CDS Views with SQL calculations

### Report Service
- **Location**: `srv/reportService.js`
- **Purpose**: Additional report processing and filtering
- **Functions**: Custom actions for report generation

### Report Flow
```
1. User selects report in UI
   ↓
2. Frontend calls OData endpoint
   GET /EmployeeBenchReport
   ↓
3. Backend executes CDS view
   SELECT from EmployeeBenchReportView
   ↓
4. View joins and calculates data
   - Joins Employee, Allocation, Project
   - Calculates daysOnBench
   ↓
5. Data returned to frontend
   ↓
6. Frontend displays in table
```

---

## 🔧 Configuration Files

### package.json
- **Dependencies**: Node.js packages
- **Scripts**: npm commands (start, build, deploy)
- **CDS Configuration**: Database and OData settings

### mta.yaml
- **Purpose**: Multi-Target Application descriptor
- **Modules**: Backend service, database deployer
- **Resources**: HANA database service

### .cdsrc.json
- **Purpose**: CAP development server configuration
- **Settings**: Port, database, etc.

---

## 🚀 Deployment Architecture

### Development
```
Local Machine
  ├── Node.js Server (port 4004)
  ├── SQLite Database (db.sqlite)
  └── UI5 App (served by CAP)
```

### Production (Cloud Foundry)
```
Cloud Foundry
  ├── Backend-srv (Node.js module)
  │   └── Runs service.js
  ├── Backend-db-deployer (HDB module)
  │   └── Deploys schema to HANA
  └── Backend-db (HDI Container)
      └── SAP HANA Database
```

---

## 🔍 Key Design Patterns

### 1. Service Layer Pattern
- Business logic separated from data access
- All validations in service layer
- Database layer only handles data storage

### 2. Hook Pattern
- `before` hooks for validation
- `after` hooks for calculations
- Ensures data consistency

### 3. Delegate Pattern (Frontend)
- MDC tables use delegates for configuration
- Separates table logic from controller
- Reusable across entities

### 4. Utility Pattern
- Common functionality in utility files
- Reusable across controllers
- Easy to maintain

---

## 📝 Code Organization Principles

1. **Separation of Concerns**
   - Frontend: UI and user interaction
   - Backend: Business logic and validation
   - Database: Data storage

2. **Single Responsibility**
   - Each file has one clear purpose
   - Utilities are focused on specific tasks

3. **DRY (Don't Repeat Yourself)**
   - Common code in utilities
   - Reusable functions

4. **Consistency**
   - Same patterns across entities
   - Consistent naming conventions

---

## 🎯 Key Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | SAP UI5 | User interface framework |
| **Frontend** | OData v4 Model | Data binding and communication |
| **Backend** | Node.js | Runtime environment |
| **Backend** | SAP CAP | Application framework |
| **Database** | CDS (Core Data Services) | Data modeling |
| **Database** | SQLite / HANA | Data storage |
| **Deployment** | Cloud Foundry | Cloud platform |

---

## 🔄 Request/Response Cycle

### Complete Cycle Example

```
1. User Action
   User clicks "Save" button
   ↓
2. Frontend Event
   onSavePress() in controller
   ↓
3. Frontend Processing
   FormHandler validates and prepares data
   ↓
4. OData Request
   POST /Customers
   Headers: Content-Type: application/json
   Body: { customerName: "Acme", ... }
   ↓
5. Backend Receives
   CAP framework routes to service.js
   ↓
6. Before Hook
   before('CREATE', Customers)
   - Validates data
   - Auto-generates ID
   ↓
7. Database Operation
   INSERT INTO Customer ...
   ↓
8. After Hook
   after('CREATE', Customers)
   - Calculates related fields (if needed)
   ↓
9. Response
   201 Created
   Body: { SAPcustId: "C-0001", ... }
   ↓
10. Frontend Receives
    Success callback
    - Closes dialog
    - Refreshes table
   ↓
11. User Sees
    New record in table
```

---

## 🛠️ Development Workflow

### Making Changes

1. **Frontend Changes**
   - Edit files in `app/webapp/`
   - Refresh browser (auto-reload if using `cds watch`)

2. **Backend Changes**
   - Edit files in `srv/`
   - Restart server (or auto-reload with `cds watch`)

3. **Database Changes**
   - Edit `db/schema.cds`
   - Run `cds deploy` to update database

4. **Testing**
   - Test in browser
   - Check console for errors
   - Verify database changes

---

**Next Steps**: Read [FILE_STRUCTURE.md](FILE_STRUCTURE.md) to understand where everything is located.


# File Structure Guide

## 📖 Overview

This document explains **where everything is located** in the Resource Management Tool codebase. Use this as a reference to find specific functionality.

---

## 📁 Root Directory Structure

```
ResourceManagementTool/
├── app/                    # Frontend (UI5 Application)
├── db/                     # Database Layer
├── srv/                    # Service Layer (Backend)
├── .vscode/                # VS Code settings
├── package.json            # Dependencies and scripts
├── mta.yaml               # Cloud Foundry deployment config
├── xs-security.json       # Security configuration
└── README.md              # This file
```

---

## 🎨 Frontend (app/webapp/)

### Controllers
**Location**: `app/webapp/controller/`

| File | Purpose |
|------|---------|
| `Home.controller.js` | **Main controller** - Navigation, table initialization, user interactions |
| `App.controller.js` | Root application controller (minimal) |

**Key Functions in Home.controller.js**:
- `onInit()` - Initialization
- `onItemSelect()` - Navigation between pages
- `onAddPress()` - Create new record
- `onEditPress()` - Edit existing record
- `onUpload()` - File upload
- `initializeTable()` - Setup MDC tables

---

### Views
**Location**: `app/webapp/view/`

| File | Purpose |
|------|---------|
| `Home.view.xml` | **Main application view** - Navigation structure, pages |
| `App.view.xml` | Root application view |

#### Fragments (Reusable UI Components)
**Location**: `app/webapp/view/fragments/`

| File | Entity | Purpose |
|------|--------|---------|
| `Customers.fragment.xml` | Customers | Customer table and toolbar |
| `Employees.fragment.xml` | Employees | Employee table and toolbar |
| `Projects.fragment.xml` | Projects | Project table and toolbar |
| `Opportunities.fragment.xml` | Opportunities | Opportunity table and toolbar |
| `Demands.fragment.xml` | Demands | Demand table and toolbar |
| `Allocations.fragment.xml` | Allocations | Allocation table and toolbar |
| `Resources.fragment.xml` | Resources | Resource search/find |
| `Reports.fragment.xml` | Reports | Report container |
| `EmployeeBenchReport.fragment.xml` | Report | Employee bench report |
| `EmployeeAllocationReport.fragment.xml` | Report | Employee allocation report |
| `RevenueForecastReport.fragment.xml` | Report | Revenue forecast report |
| `UploadDialog.fragment.xml` | Common | CSV upload dialog |
| `AllocateDialog.fragment.xml` | Allocations | Create allocation dialog |
| `MessagePopover.fragment.xml` | Common | Message display |

#### Dialogs (Value Help)
**Location**: `app/webapp/view/dialogs/`

| File | Purpose |
|------|---------|
| `CustomerValueHelp.fragment.xml` | Select customer |
| `EmployeeValueHelp.fragment.xml` | Select employee |
| `ProjectValueHelp.fragment.xml` | Select project |
| `OpportunityValueHelp.fragment.xml` | Select opportunity |
| `DemandValueHelp.fragment.xml` | Select demand |
| `FindResourcesDialog.fragment.xml` | Find available resources |

---

### Utilities
**Location**: `app/webapp/utility/`

| File | Purpose | Key Functions |
|------|---------|---------------|
| `CRUDHelper.js` | **Delete operations** | `onDeletePress()` - Delete selected rows |
| `FormHandler.js` | **Create/Update forms** | `_onCustomerDialogSave()`, `_onEmpDialogSave()`, etc. |
| `FileUploadHelper.js` | **CSV file upload** | `_onUploadPress()`, `_onFileUploadSubmit()` |
| `TableInitializer.js` | **Table setup** | `initializeTable()` - Setup MDC tables |
| `CustomUtility.js` | **Common utilities** | Shared functions across controllers |
| `SelectionManager.js` | **Row selection** | `onSelectionChange()` - Handle table selection |
| `AssociationConfig.js` | **Entity associations** | Configuration for related entities |
| `EnumConfig.js` | **Enum values** | Enum definitions and mappings |

---

### Delegates (MDC Configuration)
**Location**: `app/webapp/delegate/`

MDC (Multi-Dimensional Controls) delegates configure tables and filter bars.

#### Table Delegates
| File | Entity | Purpose |
|------|--------|---------|
| `CustomersTableDelegate.js` | Customers | Table column configuration |
| `EmployeesTableDelegate.js` | Employees | Table column configuration |
| `ProjectsTableDelegate.js` | Projects | Table column configuration |
| `OpportunitiesTableDelegate.js` | Opportunities | Table column configuration |
| `DemandsTableDelegate.js` | Demands | Table column configuration |
| `AllocationsTableDelegate.js` | Allocations | Table column configuration |
| `ResourcesTableDelegate.js` | Resources | Table column configuration |
| `*ReportTableDelegate.js` | Reports | Report table configuration |

#### Filter Bar Delegates
| File | Entity | Purpose |
|------|--------|---------|
| `CustomersFilterBarDelegate.js` | Customers | Filter configuration |
| `EmployeesFilterBarDelegate.js` | Employees | Filter configuration |
| `ProjectsFilterBarDelegate.js` | Projects | Filter configuration |
| `OpportunitiesFilterBarDelegate.js` | Opportunities | Filter configuration |
| `DemandsFilterBarDelegate.js` | Demands | Filter configuration |
| `*ReportFilterBarDelegate.js` | Reports | Report filter configuration |

#### Base Delegates
| File | Purpose |
|------|---------|
| `BaseTableDelegate.js` | Base class for table delegates |
| `BaseFilterBarDelegate.js` | Base class for filter bar delegates |

---

### Models
**Location**: `app/webapp/model/`

| File | Purpose |
|------|---------|
| `models.js` | Model definitions (if any) |

---

### Other Frontend Files
**Location**: `app/webapp/`

| File | Purpose |
|------|---------|
| `manifest.json` | **UI5 app manifest** - App configuration, routing, models |
| `Component.js` | UI5 component definition |
| `index.html` | Entry HTML file |
| `i18n/i18n.properties` | Internationalization strings |
| `css/style.css` | Custom styles |

---

## 🗄️ Database Layer (db/)

### Schema
**Location**: `db/`

| File | Purpose |
|------|---------|
| `schema.cds` | **Main data model** - Entities, enums, associations, types |

**Key Sections in schema.cds**:
- Enums (CustomerStatusEnum, EmployeeStatusEnum, etc.)
- Entities (Customer, Employee, Project, etc.)
- Associations (relationships between entities)

### Reports
**Location**: `db/reports/`

| File | Purpose |
|------|---------|
| `reportViews.cds` | **Report view definitions** - Calculated views for reports |

**Report Views**:
- `EmployeeBenchReportView`
- `EmployeeProbableReleaseView`
- `RevenueForecastView`
- `EmployeeAllocationReportView`
- `EmployeeSkillReportView`
- `ProjectsNearingCompletionView`

### Data (Seed Data)
**Location**: `db/data/`

CSV files for initial data (optional, for development):

| File | Entity |
|------|--------|
| `db-Customer.csv` | Customers |
| `db-Employee.csv` | Employees |
| `db-Project.csv` | Projects |
| `db-Opportunity.csv` | Opportunities |
| `db-Demand.csv` | Demands |
| `db-Skills.csv` | Skills |
| `db.EmployeeStatuses.csv` | Employee status master data |
| `db.Bands.csv` | Band master data |
| etc. |

### Other Database Files
**Location**: `db/`

| File | Purpose |
|------|---------|
| `annotations.cds` | UI annotations (if any) |
| `undeploy.json` | Undeployment configuration |

---

## ⚙️ Service Layer (srv/)

### Service Definition
**Location**: `srv/`

| File | Purpose |
|------|---------|
| `service.cds` | **Service definition** - Exposes entities, defines endpoints |

**Key Sections**:
- Entity projections (expose db entities as service entities)
- Report entities (read-only)
- Custom functions (getEnumMetadata, etc.)

### Service Implementation
**Location**: `srv/`

| File | Purpose | Key Sections |
|------|---------|--------------|
| `service.js` | **Main business logic** | - CRUD hooks (before/after)<br>- Validations<br>- Calculations<br>- Status updates |
| `reportService.js` | **Report generation** | - Report generation functions<br>- Data aggregation<br>- Summary calculations |

**Key Functions in service.js**:
- `before('CREATE', Entity)` - Validation before create
- `after('CREATE', Entity)` - Calculations after create
- `before('UPDATE', Entity)` - Validation before update
- `after('UPDATE', Entity)` - Recalculations after update
- `before('DELETE', Entity)` - Store data before delete
- `after('DELETE', Entity)` - Recalculations after delete
- `on('READ', Entity)` - Modify data when reading
- `_updateProjectResourceCounts()` - Calculate project resources
- `_updateDemandResourceCounts()` - Calculate demand resources
- `_updateEmployeeStatus()` - Update employee status

---

## 📦 Configuration Files

### Root Level

| File | Purpose |
|------|---------|
| `package.json` | **Dependencies and scripts** - npm packages, build scripts |
| `mta.yaml` | **Cloud Foundry deployment** - MTA descriptor |
| `xs-security.json` | **Security configuration** - Authentication/authorization |
| `.cdsrc.json` | **CAP server config** - Development server settings |
| `.gitignore` | Git ignore rules |
| `eslint.config.mjs` | ESLint configuration |

---

## 🔍 Finding Specific Functionality

### "Where is the create customer function?"

1. **UI Button**: `app/webapp/view/fragments/Customers.fragment.xml`
2. **Button Handler**: `app/webapp/controller/Home.controller.js` → `onAddPress()`
3. **Form Handler**: `app/webapp/utility/FormHandler.js` → `_onCustomerDialogSave()`
4. **Backend Validation**: `srv/service.js` → `before('CREATE', Customers)`
5. **Database**: `db/schema.cds` → `entity Customer`

### "Where is the employee status calculation?"

1. **Calculation Function**: `srv/service.js` → `_updateEmployeeStatus()`
2. **Called From**: 
   - `after('CREATE', Allocations)`
   - `after('UPDATE', Allocations)`
   - `after('DELETE', Allocations)`
   - `after('UPDATE', Projects)`
   - `before('READ', Employees)`

### "Where is the CSV upload handled?"

1. **Upload Button**: `app/webapp/view/fragments/*.fragment.xml` (upload button)
2. **Button Handler**: `app/webapp/controller/Home.controller.js` → `onUpload()`
3. **Upload Dialog**: `app/webapp/view/fragments/UploadDialog.fragment.xml`
4. **Upload Logic**: `app/webapp/utility/FileUploadHelper.js`
   - `_onUploadPress()` - Opens dialog
   - `_onFileUploadChange()` - Parses CSV
   - `_onFileUploadSubmit()` - Submits data

### "Where are the table columns defined?"

1. **Table Delegate**: `app/webapp/delegate/*TableDelegate.js`
2. **Columns Property**: In the delegate's `getColumns()` function

### "Where is the allocation percentage validation?"

1. **Backend Validation**: `srv/service.js` → `before('CREATE', Allocations)`
2. **Validation Logic**: Checks `empallocpercentage` field
3. **Error Message**: "Total allocation percentage would exceed 100%"

---

## 📋 File Naming Conventions

### Frontend
- **Controllers**: `*.controller.js`
- **Views**: `*.view.xml`
- **Fragments**: `*.fragment.xml`
- **Delegates**: `*TableDelegate.js`, `*FilterBarDelegate.js`
- **Utilities**: `*Helper.js`, `*Utility.js`, `*Manager.js`

### Backend
- **Service Definition**: `service.cds`
- **Service Implementation**: `service.js`, `*Service.js`
- **Schema**: `schema.cds`
- **Views**: `*Views.cds`, `reportViews.cds`

### Database
- **Schema**: `schema.cds`
- **Data**: `db-*.csv`, `db.*.csv`
- **Reports**: `reportViews.cds`

---

## 🗺️ Navigation Map

### To Add a New Entity:

1. **Database**: Add entity in `db/schema.cds`
2. **Service**: Add projection in `srv/service.cds`
3. **Backend Logic**: Add hooks in `srv/service.js` (if needed)
4. **Frontend Fragment**: Create `app/webapp/view/fragments/EntityName.fragment.xml`
5. **Form Handler**: Add save function in `app/webapp/utility/FormHandler.js`
6. **Table Delegate**: Create `app/webapp/delegate/EntityNameTableDelegate.js`
7. **Filter Delegate**: Create `app/webapp/delegate/EntityNameFilterBarDelegate.js`
8. **Navigation**: Add to `app/webapp/view/Home.view.xml`

### To Add a New Report:

1. **Report View**: Add view in `db/reports/reportViews.cds`
2. **Service**: Add projection in `srv/service.cds`
3. **Report Service**: Add function in `srv/reportService.js` (if needed)
4. **Frontend Fragment**: Create `app/webapp/view/fragments/ReportName.fragment.xml`
5. **Table Delegate**: Create `app/webapp/delegate/ReportNameTableDelegate.js`
6. **Navigation**: Add to `app/webapp/view/Home.view.xml`

---

## 🎯 Quick Reference

| What You Need | Where to Look |
|---------------|---------------|
| **Entity Definition** | `db/schema.cds` |
| **Business Logic** | `srv/service.js` |
| **UI Components** | `app/webapp/view/fragments/` |
| **Table Configuration** | `app/webapp/delegate/*TableDelegate.js` |
| **Form Handling** | `app/webapp/utility/FormHandler.js` |
| **Delete Operations** | `app/webapp/utility/CRUDHelper.js` |
| **File Upload** | `app/webapp/utility/FileUploadHelper.js` |
| **Navigation** | `app/webapp/view/Home.view.xml` |
| **Main Controller** | `app/webapp/controller/Home.controller.js` |
| **Report Views** | `db/reports/reportViews.cds` |
| **Report Functions** | `srv/reportService.js` |

---

**This guide helps you navigate the codebase quickly. Use it as a reference when making changes or debugging issues.**


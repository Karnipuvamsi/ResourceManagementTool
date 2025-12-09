# CRUD Operations Guide

## 📖 Overview

This document explains how **Create, Read, Update, Delete** operations work in the Resource Management Tool.

---

## 🗂️ Where CRUD Operations Are Handled

### Backend (Server-Side)
- **File**: `srv/service.js`
- **Purpose**: Business logic, validations, automatic calculations
- **When**: Runs on server before/after database operations

### Frontend (Client-Side)
- **File**: `app/webapp/controller/Home.controller.js`
- **Helper Files**:
  - `app/webapp/utility/CRUDHelper.js` - Delete operations
  - `app/webapp/utility/FormHandler.js` - Create/Update forms
  - `app/webapp/utility/CustomUtility.js` - Common utilities

---

## 📝 CREATE Operations

### How It Works

1. **User clicks "Create" button** in the table toolbar
2. **Form dialog opens** (defined in `app/webapp/view/fragments/`)
3. **User fills form** and clicks "Save"
4. **Frontend validates** and sends data to backend
5. **Backend validates** in `srv/service.js` (before CREATE hook)
6. **Data saved** to database
7. **Backend calculates** related fields (after CREATE hook)
8. **Table refreshes** to show new record

### Example: Creating a Customer

**Frontend Flow:**
```
User clicks "Create" 
  → Home.controller.js: onAddPress()
  → Opens Customer dialog fragment
  → User fills form
  → Clicks "Save"
  → FormHandler.js: _onCustomerDialogSave()
  → Sends POST request to /Customers
```

**Backend Flow:**
```
POST /Customers received
  → service.js: before('CREATE', Customers)
    → Auto-generates SAPcustId (C-0001, C-0002, etc.)
  → Data saved to database
  → after('CREATE', Customers) [if needed]
  → Response sent back
```

### Key Files for CREATE

| Entity | Form Fragment | Handler Function |
|--------|--------------|------------------|
| Customer | `Customers.fragment.xml` | `FormHandler._onCustomerDialogSave()` |
| Employee | `Employees.fragment.xml` | `FormHandler._onEmpDialogSave()` |
| Project | `Projects.fragment.xml` | `FormHandler._onProjectDialogSave()` |
| Opportunity | `Opportunities.fragment.xml` | `FormHandler._onOppDialogSave()` |
| Demand | `Demands.fragment.xml` | `FormHandler._onDemandDialogSave()` |
| Allocation | `AllocateDialog.fragment.xml` | `FormHandler._onAllocationDialogSave()` |

### Auto-Generated Fields (Backend)

These are automatically set in `srv/service.js`:

- **Customers**: `SAPcustId` → `C-0001`, `C-0002`, etc.
- **Opportunities**: `sapOpportunityId` → `O-0001`, `O-0002`, etc.
- **Projects**: `sapPId` → `P-0001`, `P-0002`, etc.
- **Demands**: `demandId` → `1`, `2`, `3`, etc. (Integer)
- **Allocations**: `allocationId` → UUID (auto-generated)

---

## 📖 READ Operations

### How It Works

1. **Table loads** when page opens
2. **OData service** fetches data from backend
3. **Backend processes** data (before READ hook)
4. **Calculated fields** added (e.g., `allocatedCount`, `remaining`)
5. **Data displayed** in MDC table

### Example: Reading Employees

**Frontend Flow:**
```
Page loads
  → Home.controller.js: initializeTable("Employees")
  → MDC Table binds to /Employees
  → OData request sent
```

**Backend Flow:**
```
GET /Employees received
  → service.js: before('READ', Employees)
    → Checks for expired allocations
    → Updates employee statuses if needed
  → Data fetched from database
  → Calculated fields added
  → Response sent back
```

### Special READ Operations

#### Employee Status Updates on Read
When reading employees, the system automatically:
- Checks if any allocations have expired
- Updates employee statuses if needed
- Marks expired allocations as "Completed"

**Location**: `srv/service.js` → `before('READ', Employees)`

#### Demand Count Calculation
When reading demands, the system calculates:
- `allocatedCount` - Number of active allocations for this demand
- `remaining` - Quantity minus allocatedCount

**Location**: `srv/service.js` → `on('READ', Demands)`

---

## ✏️ UPDATE Operations

### How It Works

1. **User clicks "Edit" button** on a table row
2. **Form dialog opens** with existing data
3. **User modifies fields** and clicks "Save"
4. **Frontend validates** and sends PATCH request
5. **Backend validates** in `srv/service.js` (before UPDATE hook)
6. **Data updated** in database
7. **Backend recalculates** related fields (after UPDATE hook)
8. **Table refreshes** to show updated record

### Example: Updating a Project

**Frontend Flow:**
```
User clicks "Edit" on project row
  → Home.controller.js: onEditPress()
  → Opens Project dialog with existing data
  → User modifies fields
  → Clicks "Save"
  → FormHandler.js: _onProjectDialogSave()
  → Sends PATCH request to /Projects('P-0001')
```

**Backend Flow:**
```
PATCH /Projects('P-0001') received
  → service.js: before('UPDATE', Projects)
    → Validates changes
  → Data updated in database
  → after('UPDATE', Projects)
    → Recalculates resource counts
    → Updates employee statuses if project closed
  → Response sent back
```

### Important Update Validations

#### Allocation Updates
- **Allocation Percentage**: Can't exceed 100% total for employee
- **Project Change**: Validates new project has capacity
- **Employee Change**: Validates new employee has capacity
- **Date Changes**: Must be within project date range

**Location**: `srv/service.js` → `before('UPDATE', Allocations)`

#### Project Updates
- **Status to "Closed"**: Automatically marks all allocations as "Completed"
- **Resource Counts**: Automatically recalculated

**Location**: `srv/service.js` → `after('UPDATE', Projects)`

---

## 🗑️ DELETE Operations

### How It Works

1. **User selects rows** in table
2. **User clicks "Delete" button**
3. **Confirmation dialog** appears
4. **User confirms** deletion
5. **Frontend sends DELETE** requests (batch)
6. **Backend validates** in `srv/service.js` (before DELETE hook)
7. **Data deleted** from database
8. **Backend recalculates** related fields (after DELETE hook)
9. **Table refreshes**

### Example: Deleting Allocations

**Frontend Flow:**
```
User selects allocation rows
  → Clicks "Delete"
  → Confirmation dialog
  → User confirms
  → CRUDHelper.js: onDeletePress()
  → Sends batch DELETE requests
```

**Backend Flow:**
```
DELETE /Allocations('uuid') received
  → service.js: before('DELETE', Allocations)
    → Stores allocation data for calculations
  → Data deleted from database
  → after('DELETE', Allocations)
    → Updates employee allocation percentage
    → Updates project resource counts
    → Updates demand resource counts
    → Updates employee status
  → Response sent back
```

### Cascade Deletions

When deleting certain entities, related data is automatically handled:

- **Delete Project**: Allocations remain but project reference is removed
- **Delete Employee**: Allocations remain but employee reference is removed
- **Delete Demand**: Allocations linked to demand need to be updated

**Note**: The system prevents deletion if it would cause data integrity issues.

---

## 🔄 Automatic Calculations

### After CREATE/UPDATE/DELETE

The system automatically recalculates:

#### 1. Project Resource Counts
- `allocatedResources` - Count of active allocations
- `toBeAllocated` - Required minus allocated

**Location**: `srv/service.js` → `_updateProjectResourceCounts()`

#### 2. Demand Resource Counts
- `allocatedCount` - Count of active allocations for this demand
- `remaining` - Quantity minus allocatedCount

**Location**: `srv/service.js` → `_updateDemandResourceCounts()`

#### 3. Employee Allocation Percentage
- `empallocpercentage` - Sum of all active allocation percentages

**Location**: `srv/service.js` → Updated in allocation hooks

#### 4. Employee Status
- Automatically updated based on allocations and project dates

**Location**: `srv/service.js` → `_updateEmployeeStatus()`

---

## 📋 CRUD Operation Summary Table

| Operation | Frontend File | Backend File | Key Functions |
|-----------|--------------|--------------|---------------|
| **Create** | `Home.controller.js`<br>`FormHandler.js` | `srv/service.js` | `before('CREATE', Entity)`<br>`after('CREATE', Entity)` |
| **Read** | `Home.controller.js`<br>`TableInitializer.js` | `srv/service.js` | `before('READ', Entity)`<br>`on('READ', Entity)` |
| **Update** | `Home.controller.js`<br>`FormHandler.js` | `srv/service.js` | `before('UPDATE', Entity)`<br>`after('UPDATE', Entity)` |
| **Delete** | `CRUDHelper.js` | `srv/service.js` | `before('DELETE', Entity)`<br>`after('DELETE', Entity)` |

---

## 🎯 Common Patterns

### Pattern 1: Inline Editing
Some tables support inline editing (click cell to edit):
- **Location**: `app/webapp/controller/Home.controller.js`
- **Model**: `edit` model tracks which row is being edited
- **Save**: Press Enter or click outside to save

### Pattern 2: Dialog Forms
Most entities use dialog forms for Create/Update:
- **Location**: `app/webapp/view/fragments/*.fragment.xml`
- **Handler**: `FormHandler.js` contains save functions
- **Validation**: Both frontend and backend validation

### Pattern 3: Batch Operations
Delete operations use batch requests:
- **Location**: `CRUDHelper.js` → `onDeletePress()`
- **Method**: Uses OData batch (`submitBatch`)
- **Group ID**: `changesGroup`

---

## ⚠️ Important Notes

1. **Always validate on backend** - Frontend validation can be bypassed
2. **Check related data** - Deleting may affect other entities
3. **Automatic calculations** - Some fields are calculated, not stored
4. **Status updates** - Employee status updates automatically
5. **Resource counts** - Always recalculated after changes

---

## 🔍 Debugging Tips

### Check Backend Logs
- Backend validations and calculations log to console
- Check `srv/service.js` for console.log statements

### Check Frontend Console
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for OData requests

### Common Issues
- **Validation errors**: Check `before` hooks in `srv/service.js`
- **Calculation errors**: Check `after` hooks in `srv/service.js`
- **UI not updating**: Check table refresh in `TableInitializer.js`

---

**Next Steps**: Read [DATA_UPLOAD.md](DATA_UPLOAD.md) to understand file uploads.


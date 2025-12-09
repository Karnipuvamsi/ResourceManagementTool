# Business Logic Guide

## 📖 Overview

This document explains the **business rules and automatic calculations** in the Resource Management Tool - how employee status is determined, how resource counts are calculated, and how the system automatically maintains data consistency.

---

## 🎯 Key Business Rules

### 1. Employee Status Management

Employee status is **automatically calculated** based on allocations and project information.

#### Status Values
- `Allocated` - Employee is actively working on a project
- `Pre Allocated` - Employee is assigned but project not fully confirmed
- `Unproductive Bench` - Employee is available (no active allocations)
- `Inactive Bench` - Employee is on leave or inactive
- `Resigned` - Employee has resigned (never auto-changed)

#### Status Calculation Rules

**Location**: `srv/service.js` → `_updateEmployeeStatus()`

**Rules**:
1. **If employee has NO active allocations** → `Unproductive Bench`
2. **If employee has active allocations**:
   - Check if **allocation start date** has passed
   - Check if **project start date** has passed
   - If **BOTH dates passed**:
     - If project has **SFDC PID** → `Allocated`
     - If project has **NO SFDC PID** → `Pre Allocated`
   - If **dates not passed yet** → Keep current status

**Example**:
```
Employee: John Doe
Allocation: Project Alpha (start: 2024-01-01)
Project: Project Alpha (start: 2024-01-01, sfdcPId: "SFDC123")
Today: 2024-01-15

Result: Status = "Allocated" ✅
(Both dates passed, project has SFDC PID)
```

#### When Status Updates

Status is automatically updated when:
- **Allocation created** → `after('CREATE', Allocations)`
- **Allocation updated** → `after('UPDATE', Allocations)`
- **Allocation deleted** → `after('DELETE', Allocations)`
- **Project updated** → `after('UPDATE', Projects)`
- **Employee read** → `before('READ', Employees)` (checks expired allocations)

---

### 2. Allocation Percentage Management

Employees can be allocated to multiple projects, but total allocation percentage cannot exceed 100%.

#### Percentage Tracking

**Location**: `srv/service.js` → Employee `empallocpercentage` field

**How It Works**:
- Each allocation has `allocationPercentage` (0-100%)
- Employee's `empallocpercentage` = Sum of all active allocation percentages
- System validates: `empallocpercentage + newAllocation ≤ 100%`

#### Validation Rules

**Location**: `srv/service.js` → `before('CREATE', Allocations)`

**Rules**:
1. **New allocation**: Check if `currentPercentage + newPercentage ≤ 100%`
2. **Update allocation**: Recalculate based on old vs new percentage
3. **Delete allocation**: Subtract deleted percentage from total
4. **Employee change**: Validate new employee has capacity

**Example**:
```
Employee: John Doe
Current empallocpercentage: 60%

Try to create allocation with 50%:
60% + 50% = 110% ❌ ERROR: "Total allocation percentage would exceed 100%"

Try to create allocation with 40%:
60% + 40% = 100% ✅ SUCCESS
```

#### Automatic Updates

**Location**: `srv/service.js` → Allocation hooks

**When Updated**:
- **Create allocation**: Adds percentage to employee total
- **Update allocation**: Adjusts percentage (subtract old, add new)
- **Delete allocation**: Subtracts percentage from employee total
- **Change employee**: Updates both old and new employee percentages

---

### 3. Project Resource Counts

Projects track resource requirements and allocations.

#### Count Fields

- `requiredResources` - Total resources needed (manual field)
- `allocatedResources` - Number of active allocations (calculated)
- `toBeAllocated` - Remaining resources needed (calculated)

#### Calculation Rules

**Location**: `srv/service.js` → `_updateProjectResourceCounts()`

**How It Works**:
1. **Count active allocations** for the project
2. **Set allocatedResources** = count of active allocations
3. **Calculate toBeAllocated** = `requiredResources - allocatedResources`
4. **Update project** with new counts

**Example**:
```
Project: Project Alpha
requiredResources: 10
Active allocations: 7

Result:
allocatedResources: 7
toBeAllocated: 10 - 7 = 3
```

#### When Updated

Counts are automatically updated when:
- **Allocation created** → `after('CREATE', Allocations)`
- **Allocation updated** → `after('UPDATE', Allocations)` (if project changed)
- **Allocation deleted** → `after('DELETE', Allocations)`
- **Project updated** → `after('UPDATE', Projects)`
- **Demand created/updated/deleted** → `after('CREATE/UPDATE/DELETE', Demands)`

#### Validation

**Location**: `srv/service.js` → `before('CREATE', Allocations)`

**Rule**: Cannot create allocation if `allocatedResources + 1 > requiredResources`

**Example**:
```
Project: Project Alpha
requiredResources: 5
allocatedResources: 5

Try to create new allocation:
5 + 1 = 6 > 5 ❌ ERROR: "Allocated resources would exceed required resources"
```

---

### 4. Demand Resource Counts

Demands track skill-based resource requirements.

#### Count Fields

- `quantity` - Total resources needed (manual field)
- `allocatedCount` - Number of active allocations for this demand (calculated)
- `remaining` - Remaining resources needed (calculated)

#### Calculation Rules

**Location**: `srv/service.js` → `_updateDemandResourceCounts()`

**How It Works**:
1. **Count active allocations** where `demandId` matches
2. **Set allocatedCount** = count of active allocations
3. **Calculate remaining** = `quantity - allocatedCount`
4. **Update demand** with new counts

**Example**:
```
Demand: Java Developer, Band 4A
quantity: 5
Active allocations for this demand: 3

Result:
allocatedCount: 3
remaining: 5 - 3 = 2
```

#### When Updated

Counts are automatically updated when:
- **Allocation created** → `after('CREATE', Allocations)`
- **Allocation updated** → `after('UPDATE', Allocations)` (if demand changed)
- **Allocation deleted** → `after('DELETE', Allocations)`
- **Demand read** → `on('READ', Demands)` (recalculated on every read)

---

### 5. Demand Validation

Demands must not exceed project's required resources.

#### Validation Rules

**Location**: `srv/service.js` → `before('CREATE', Demands)`

**Rule**: Sum of all demand quantities for a project cannot exceed `requiredResources`

**Example**:
```
Project: Project Alpha
requiredResources: 10

Existing demands:
- Demand 1: quantity = 4
- Demand 2: quantity = 3
Total: 7

Try to create Demand 3 with quantity = 5:
7 + 5 = 12 > 10 ❌ ERROR: "Total demand quantity exceeds required resources"
```

#### Automatic Updates

**Location**: `srv/service.js` → `after('CREATE/UPDATE/DELETE', Demands)`

When demand is created/updated/deleted:
- Project resource counts are recalculated
- `toBeAllocated` is updated

---

### 6. Allocation Date Validation

Allocation dates must be within project date range.

#### Validation Rules

**Location**: `srv/service.js` → `before('CREATE', Allocations)`

**Rules**:
1. **Start date** cannot be earlier than project start date
2. **End date** cannot be later than project end date
3. **Start date** cannot be later than end date
4. **Auto-fill**: If not provided, uses project start/end dates

**Example**:
```
Project: Project Alpha
startDate: 2024-01-01
endDate: 2024-12-31

Try to create allocation:
startDate: 2023-12-01 ❌ ERROR: "Allocation start date cannot be earlier than project start date"

Try to create allocation:
endDate: 2025-01-15 ❌ ERROR: "Allocation end date cannot be later than project end date"
```

---

### 7. Expired Allocations & Projects

System automatically marks expired items as completed/closed.

#### Expired Allocations

**Location**: `srv/service.js` → `_markExpiredAllocationsAsCompleted()`

**Rule**: If allocation `endDate` has passed and status is "Active" → Mark as "Completed"

**When Checked**:
- On employee read → `after('READ', Employees)`
- On-demand via `checkExpiredItems` function

**Actions**:
1. Mark allocation as "Completed"
2. Update project resource counts
3. Update employee status

#### Expired Projects

**Location**: `srv/service.js` → `_markExpiredProjectsAsClosed()`

**Rule**: If project `endDate` has passed and status is "Active" → Mark as "Closed"

**Actions**:
1. Mark project as "Closed"
2. Mark all active allocations as "Completed"
3. Update employee statuses
4. Update project resource counts

---

### 8. Project Status Changes

When project status changes to "Closed", all allocations are marked as "Completed".

#### Automatic Actions

**Location**: `srv/service.js` → `after('UPDATE', Projects)`

**Rule**: If project status changed to "Closed":
1. Find all active allocations for the project
2. Mark each allocation as "Completed"
3. Update employee statuses
4. Update project resource counts

**Example**:
```
Project: Project Alpha
Status: Active → Closed

Result:
- All 5 active allocations → "Completed"
- 5 employees' statuses updated
- Project resource counts updated
```

---

### 9. Auto-Generated IDs

Some entities have auto-generated IDs.

#### ID Generation Rules

**Location**: `srv/service.js` → `before('CREATE', Entity)`

| Entity | ID Format | Example |
|--------|-----------|---------|
| **Customer** | `C-####` | `C-0001`, `C-0002` |
| **Opportunity** | `O-####` | `O-0001`, `O-0002` |
| **Project** | `P-####` | `P-0001`, `P-0002` |
| **Demand** | Integer | `1`, `2`, `3` |
| **Allocation** | UUID | Auto-generated UUID |

**How It Works**:
1. Get maximum existing ID
2. Extract numeric part
3. Increment by 1
4. Format with prefix and padding

---

### 10. Demand Linking

Allocations must be linked to a specific demand.

#### Validation Rules

**Location**: `srv/service.js` → `before('CREATE', Allocations)`

**Rules**:
1. **demandId is required** - Cannot create allocation without demand
2. **Auto-assign**: If not provided, uses first demand of the project
3. **One allocation per employee per project** - Employee cannot be allocated to same project twice

**Example**:
```
Project: Project Alpha
Demands:
- Demand 1: Java Developer
- Demand 2: Python Developer

Create allocation for Employee A:
- If demandId not provided → Auto-assigns Demand 1
- If demandId = 2 → Links to Demand 2

Try to create second allocation for Employee A to Project Alpha:
❌ ERROR: "Employee is already allocated to this project"
```

---

## 🔄 Calculation Flow Examples

### Example 1: Creating an Allocation

```
1. User creates allocation:
   Employee: John Doe
   Project: Project Alpha
   Demand: Java Developer (demandId: 1)
   Percentage: 50%
   Start: 2024-01-01
   End: 2024-12-31

2. Backend validates (before CREATE):
   ✅ Employee exists
   ✅ Project exists
   ✅ Demand exists
   ✅ Employee not already allocated to project
   ✅ Employee percentage: 40% + 50% = 90% ≤ 100% ✅
   ✅ Project allocatedResources: 4 + 1 = 5 ≤ requiredResources (10) ✅
   ✅ Dates within project range ✅

3. Data saved to database

4. Backend calculates (after CREATE):
   ✅ Update employee empallocpercentage: 40% → 90%
   ✅ Update project allocatedResources: 4 → 5
   ✅ Update project toBeAllocated: 6 → 5
   ✅ Update demand allocatedCount: 2 → 3
   ✅ Update demand remaining: 3 → 2
   ✅ Update employee status: Check dates and SFDC PID

5. Result:
   - Allocation created
   - All related counts updated
   - Employee status updated (if dates passed)
```

### Example 2: Project Closing

```
1. User updates project:
   Project: Project Alpha
   Status: Active → Closed

2. Backend processes (after UPDATE):
   ✅ Find all active allocations (5 allocations)
   ✅ Mark each as "Completed"
   ✅ Update employee statuses (5 employees)
   ✅ Update project resource counts:
      allocatedResources: 5 → 0
      toBeAllocated: 5 → 10

3. Result:
   - Project status: "Closed"
   - All 5 allocations: "Completed"
   - 5 employees' statuses updated (likely to "Unproductive Bench")
   - Project counts updated
```

---

## 📊 Summary Table

| Business Rule | Location | When Triggered |
|---------------|----------|----------------|
| **Employee Status** | `_updateEmployeeStatus()` | Allocation CRUD, Project update, Employee read |
| **Allocation Percentage** | Allocation hooks | Allocation CRUD |
| **Project Resource Counts** | `_updateProjectResourceCounts()` | Allocation CRUD, Demand CRUD, Project update |
| **Demand Resource Counts** | `_updateDemandResourceCounts()` | Allocation CRUD, Demand read |
| **Expired Allocations** | `_markExpiredAllocationsAsCompleted()` | Employee read, on-demand |
| **Expired Projects** | `_markExpiredProjectsAsClosed()` | On-demand |
| **ID Generation** | `before('CREATE', Entity)` | Entity creation |
| **Date Validation** | `before('CREATE/UPDATE', Allocations)` | Allocation CRUD |

---

## ⚠️ Important Notes

1. **Automatic Calculations**: Many fields are calculated, not stored
2. **Status Updates**: Employee status updates automatically - don't manually set
3. **Resource Counts**: Always recalculated - don't manually set
4. **Validation**: Backend validation cannot be bypassed
5. **Cascade Updates**: Changes to one entity may affect others

---

**This guide explains the business logic. Always check `srv/service.js` for the actual implementation.**


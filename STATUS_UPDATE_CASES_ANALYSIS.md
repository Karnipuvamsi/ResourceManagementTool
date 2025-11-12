# Status Update Cases - Complete Analysis

## 📋 Overview

This document lists **ALL possible cases** for when allocations/projects end and what needs to be handled for automatic status updates.

---

## 🔍 All Possible Cases

### Case 1: Allocation End Date Passes
**Scenario**: Allocation has `status="Active"` but `endDate < currentDate`

**Current Behavior**: ❌ **NOT HANDLED**
- Allocation remains "Active" 
- Employee status remains "Allocated" or "Pre Allocated"
- Employee is NOT moved to bench automatically

**What Should Happen**: ✅
- Mark allocation as `status="Completed"`
- Update employee status (check if other active allocations exist)

**Priority**: 🔴 **HIGH** - This is the most common case

---

### Case 2: Project End Date Passes
**Scenario**: Project has `status="Active"` or `status="Planned"` but `endDate < currentDate`

**Current Behavior**: ❌ **NOT HANDLED**
- Project status remains unchanged
- All allocations to this project remain "Active"
- All employees remain "Allocated" or "Pre Allocated"

**What Should Happen**: ✅
- Option A: Mark project as `status="Closed"`
- Option B: Mark all allocations to this project as `status="Completed"`
- Update all employee statuses (check if other active allocations exist)

**Priority**: 🔴 **HIGH** - Affects multiple employees

---

### Case 3: Allocation End Date = Project End Date (Both Pass)
**Scenario**: Both allocation and project end dates have passed

**Current Behavior**: ❌ **NOT HANDLED**
- Both remain "Active"
- Employee status unchanged

**What Should Happen**: ✅
- Mark allocation as `status="Completed"`
- Mark project as `status="Closed"` (optional)
- Update employee status

**Priority**: 🔴 **HIGH**

---

### Case 4: Allocation End Date Passes, But Project Still Active
**Scenario**: Employee's allocation ends, but project continues with other employees

**Current Behavior**: ❌ **NOT HANDLED**
- Allocation remains "Active"
- Employee status unchanged

**What Should Happen**: ✅
- Mark allocation as `status="Completed"`
- Update employee status (check if other active allocations exist)
- Project remains active

**Priority**: 🟡 **MEDIUM** - Less common but important

---

### Case 5: Project End Date Passes, But Some Allocations Have Future End Dates
**Scenario**: Project ended, but some employees have allocations extending beyond project end

**Current Behavior**: ❌ **NOT HANDLED**
- Project remains "Active"
- Allocations remain "Active"
- Employee statuses unchanged

**What Should Happen**: ✅
- Mark project as `status="Closed"`
- Mark all allocations as `status="Completed"` (even if endDate is in future)
- Update all employee statuses

**Priority**: 🟡 **MEDIUM** - Edge case

---

### Case 6: Multiple Allocations - One Ends, Others Active
**Scenario**: Employee has 3 allocations:
- Allocation A: ends today → should be "Completed"
- Allocation B: ends in 30 days → stays "Active"
- Allocation C: ends in 60 days → stays "Active"

**Current Behavior**: ❌ **NOT HANDLED**
- Allocation A remains "Active"
- Employee status unchanged

**What Should Happen**: ✅
- Mark Allocation A as `status="Completed"`
- Check remaining active allocations (B, C)
- Update employee status based on remaining allocations

**Priority**: 🟡 **MEDIUM** - Common for multi-project employees

---

### Case 7: Employee Has Only One Allocation - It Ends
**Scenario**: Employee has only 1 allocation, and it ends

**Current Behavior**: ❌ **NOT HANDLED**
- Allocation remains "Active"
- Employee status remains "Allocated" or "Pre Allocated"

**What Should Happen**: ✅
- Mark allocation as `status="Completed"`
- Update employee status to `"Unproductive Bench"` (if not Resigned)

**Priority**: 🔴 **HIGH** - Very common case

---

### Case 8: Project Status Changed to "Closed" Manually
**Scenario**: User manually changes project status to "Closed"

**Current Behavior**: ✅ **PARTIALLY HANDLED**
- Project status changes
- But allocations remain "Active"
- Employee statuses unchanged

**What Should Happen**: ✅
- Mark all allocations to this project as `status="Completed"`
- Update all employee statuses

**Priority**: 🟡 **MEDIUM**

---

### Case 9: Allocation Status Manually Changed to "Completed"
**Scenario**: User manually changes allocation status to "Completed"

**Current Behavior**: ✅ **HANDLED**
- Allocation status changes
- Employee status is updated via `_updateEmployeeStatus()`

**What Should Happen**: ✅ Already working correctly

**Priority**: ✅ **COVERED**

---

### Case 10: Allocation Status Manually Changed to "Cancelled"
**Scenario**: User manually changes allocation status to "Cancelled"

**Current Behavior**: ✅ **HANDLED**
- Allocation status changes
- Employee status is updated via `_updateEmployeeStatus()`

**What Should Happen**: ✅ Already working correctly

**Priority**: ✅ **COVERED**

---

### Case 11: Allocation Deleted
**Scenario**: User deletes an allocation

**Current Behavior**: ✅ **HANDLED**
- Allocation is deleted
- Employee status is updated via `_updateEmployeeStatus()`

**What Should Happen**: ✅ Already working correctly

**Priority**: ✅ **COVERED**

---

### Case 12: New Allocation Created
**Scenario**: New allocation is added to employee

**Current Behavior**: ✅ **HANDLED**
- Allocation is created
- Employee status is updated based on project SFDC PID and dates

**What Should Happen**: ✅ Already working correctly

**Priority**: ✅ **COVERED**

---

### Case 13: Project SFDC PID Added (Project Confirmed)
**Scenario**: Project gets SFDC PID (becomes confirmed)

**Current Behavior**: ✅ **HANDLED**
- Project is updated
- All employee statuses are updated via `_updateEmployeeStatusesForProject()`
- Status changes from "Pre Allocated" to "Allocated"

**What Should Happen**: ✅ Already working correctly

**Priority**: ✅ **COVERED**

---

### Case 14: Project Start Date Arrives
**Scenario**: Project start date reaches today

**Current Behavior**: ✅ **HANDLED** (when project is updated)
- If project is updated, employee statuses are recalculated
- But no automatic trigger when date arrives

**What Should Happen**: ⚠️ **PARTIALLY COVERED**
- Works when project is manually updated
- No automatic daily check

**Priority**: 🟢 **LOW** - Works on update

---

### Case 15: Allocation Start Date Arrives
**Scenario**: Allocation start date reaches today

**Current Behavior**: ✅ **HANDLED** (when allocation is updated)
- If allocation is updated, employee status is recalculated
- But no automatic trigger when date arrives

**What Should Happen**: ⚠️ **PARTIALLY COVERED**
- Works when allocation is manually updated
- No automatic daily check

**Priority**: 🟢 **LOW** - Works on update

---

## 📊 Summary Table

| Case | Description | Current Status | Priority | Action Needed |
|------|-------------|----------------|----------|---------------|
| 1 | Allocation end date passes | ✅ **IMPLEMENTED** | ✅ Covered | Auto-mark as Completed (on Employee READ) |
| 2 | Project end date passes | ✅ **IMPLEMENTED** | ✅ Covered | Auto-mark allocations as Completed (via `_markExpiredProjectsAsClosed`) |
| 3 | Both allocation & project end | ✅ **IMPLEMENTED** | ✅ Covered | Auto-mark as Completed (handled by both functions) |
| 4 | Allocation ends, project continues | ✅ **IMPLEMENTED** | ✅ Covered | Auto-mark allocation as Completed (on Employee READ) |
| 5 | Project ends, allocations extend | ✅ **IMPLEMENTED** | ✅ Covered | Auto-mark all as Completed (via `_markExpiredProjectsAsClosed`) |
| 6 | Multiple allocations, one ends | ✅ **IMPLEMENTED** | ✅ Covered | Auto-mark expired as Completed (on Employee READ) |
| 7 | Only allocation ends | ✅ **IMPLEMENTED** | ✅ Covered | Auto-mark as Completed (on Employee READ) |
| 8 | Project manually closed | ✅ **IMPLEMENTED** | ✅ Covered | Auto-mark allocations as Completed (on Project UPDATE) |
| 9 | Allocation manually completed | ✅ Handled | ✅ Covered | No action needed |
| 10 | Allocation manually cancelled | ✅ Handled | ✅ Covered | No action needed |
| 11 | Allocation deleted | ✅ Handled | ✅ Covered | No action needed |
| 12 | New allocation created | ✅ Handled | ✅ Covered | No action needed |
| 13 | Project SFDC PID added | ✅ Handled | ✅ Covered | No action needed |
| 14 | Project start date arrives | ⚠️ Partial | 🟢 LOW | Works on update |
| 15 | Allocation start date arrives | ⚠️ Partial | 🟢 LOW | Works on update |

---

## ✅ Implementation Status

### ✅ Phase 1: Critical Cases (IMPLEMENTED)
1. ✅ **Case 1**: Allocation end date passes → Auto-mark as "Completed" (via Employee READ hook)
2. ✅ **Case 2**: Project end date passes → Auto-mark all allocations as "Completed" (via `_markExpiredProjectsAsClosed`)
3. ✅ **Case 7**: Only allocation ends → Auto-mark as "Completed" (via Employee READ hook)

### ✅ Phase 2: Important Cases (IMPLEMENTED)
4. ✅ **Case 3**: Both allocation & project end → Handle both (via both functions)
5. ✅ **Case 4**: Allocation ends, project continues → Mark allocation only (via Employee READ hook)
6. ✅ **Case 6**: Multiple allocations, one ends → Mark expired only (via Employee READ hook)

### ✅ Phase 3: Edge Cases (IMPLEMENTED)
7. ✅ **Case 5**: Project ends, allocations extend → Mark all as Completed (via `_markExpiredProjectsAsClosed`)
8. ✅ **Case 8**: Project manually closed → Mark allocations as Completed (via Project UPDATE hook)

---

## ✅ Implementation Approach (IMPLEMENTED)

### ✅ Hybrid Approach (Implemented)
1. **Proactive Check on Employee READ**: 
   - When reading a single employee, checks if their allocations have expired
   - Marks expired allocations as "Completed"
   - Updates employee status automatically

2. **On-Demand Function**: 
   - Function `checkExpiredItems` can be called via API
   - Checks all expired allocations and projects
   - Marks them as "Completed"/"Closed"
   - Updates all affected employee statuses

3. **Project UPDATE Hook**: 
   - When project status is manually changed to "Closed"
   - Automatically marks all allocations as "Completed"
   - Updates all employee statuses

4. **Helper Functions**:
   - `_markExpiredAllocationsAsCompleted()` - Checks and marks expired allocations
   - `_markExpiredProjectsAsClosed()` - Checks and marks expired projects
   - `_checkAndUpdateExpiredItems()` - Main function that calls both

### 📝 Usage

**To check expired items on-demand**:
```javascript
// Call via API endpoint
POST /checkExpiredItems
```

**Automatic triggers**:
- Employee READ (single employee) → Checks that employee's allocations
- Project UPDATE (status to "Closed") → Marks all allocations as "Completed"

---

## ✅ Implementation Checklist (COMPLETED)

### ✅ For Allocation End Date:
- [x] Check if `allocation.endDate < currentDate` AND `status="Active"` → **Implemented in `_markExpiredAllocationsAsCompleted()` and Employee READ hook**
- [x] Mark allocation as `status="Completed"` → **Implemented**
- [x] Call `_updateEmployeeStatus(employeeId)` for affected employee → **Implemented**
- [x] Update project resource counts → **Implemented**

### ✅ For Project End Date:
- [x] Check if `project.endDate < currentDate` AND `status="Active"` or `"Planned"` → **Implemented in `_markExpiredProjectsAsClosed()`**
- [x] Mark project as `status="Closed"` → **Implemented**
- [x] Mark all allocations to this project as `status="Completed"` → **Implemented**
- [x] Call `_updateEmployeeStatus(employeeId)` for all affected employees → **Implemented**
- [x] Update project resource counts → **Implemented**

### ✅ For Project Manually Closed:
- [x] When project status changes to "Closed" → **Implemented in Project UPDATE hook**
- [x] Mark all allocations to this project as `status="Completed"` → **Implemented**
- [x] Call `_updateEmployeeStatus(employeeId)` for all affected employees → **Implemented**

---

**Last Updated**: December 2024
**Version**: 1.0


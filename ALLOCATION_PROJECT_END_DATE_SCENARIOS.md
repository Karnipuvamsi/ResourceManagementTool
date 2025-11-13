# Allocation and Project End Date Scenarios - Status Change Logic

## 📋 Your Questions

1. **Scenario 1**: Project exists but allocation end date is finished → What happens to status?
2. **Scenario 2**: Allocation end date exists but project not yet finished → What happens to status?

---

## 🔍 Current System Behavior

### Scenario 1: Project Exists, But Allocation End Date Finished

**Example**:
- Project: P-0001 (Active, ends Dec 31, 2026)
- Employee: John
- Allocation: Starts Jan 1, 2025, Ends Dec 31, 2025 (FINISHED)
- Today: Jan 1, 2026

**What Happens**:

1. **Automatic Check** (on Employee READ or via `checkExpiredItems`):
   ```
   System checks: allocation.endDate (Dec 31, 2025) < currentDate (Jan 1, 2026)?
   Answer: YES
   ```

2. **Action Taken**:
   - Allocation marked as `status="Completed"` ✅
   - Allocation is NO LONGER "Active"
   - System calls `_updateEmployeeStatus(employeeId)`

3. **Status Recalculation**:
   ```javascript
   // System checks: Does employee have other active allocations?
   const aAllocations = await SELECT.from(Allocations)
       .where({ employeeId: sEmployeeId, status: 'Active' });
   
   if (aAllocations.length === 0) {
       // No active allocations → Status = "Unproductive Bench"
       status = "Unproductive Bench"
   } else {
       // Has other active allocations → Status based on those
       status = "Allocated" or "Pre Allocated" (based on other allocations)
   }
   ```

4. **Result**:
   - ✅ Allocation marked as "Completed"
   - ✅ Employee status changes to "Unproductive Bench" (if no other active allocations)
   - ✅ OR Employee status remains "Allocated"/"Pre Allocated" (if has other active allocations)
   - ✅ Project remains "Active" (other employees may still be allocated)

---

### Scenario 2: Allocation End Date Exists, But Project Not Yet Finished

**Example**:
- Project: P-0001 (Active, ends Dec 31, 2026 - NOT FINISHED)
- Employee: John
- Allocation: Starts Jan 1, 2025, Ends Dec 31, 2025 (FINISHED)
- Today: Jan 1, 2026

**What Happens**:

1. **Same as Scenario 1**:
   - Allocation end date has passed
   - Allocation marked as `status="Completed"` ✅
   - Employee status updated

2. **Key Point**:
   - ✅ **Project end date doesn't matter** for individual allocation status
   - ✅ **Each allocation is independent** - if its end date passes, it's marked "Completed"
   - ✅ **Project can continue** with other employees even if one allocation ends

3. **Result**:
   - ✅ Allocation marked as "Completed"
   - ✅ Employee status changes to "Unproductive Bench" (if no other active allocations)
   - ✅ Project remains "Active" (can continue with other employees)
   - ✅ Other employees' allocations to this project remain "Active"

---

## 📊 Complete Flow Diagram

### When Allocation End Date Passes:

```
Allocation End Date < Current Date
    ↓
Allocation Marked as "Completed"
    ↓
Allocation Status = "Completed" (NOT "Active")
    ↓
System Calls: _updateEmployeeStatus(employeeId)
    ↓
Check: Does employee have other "Active" allocations?
    ↓
    ├─ NO → Status = "Unproductive Bench" ✅
    └─ YES → Status = "Allocated" or "Pre Allocated" (based on other allocations) ✅
```

### When Project End Date Passes:

```
Project End Date < Current Date
    ↓
Project Marked as "Closed"
    ↓
ALL Allocations to This Project Marked as "Completed"
    ↓
For Each Employee:
    System Calls: _updateEmployeeStatus(employeeId)
    ↓
Check: Does employee have other "Active" allocations?
    ↓
    ├─ NO → Status = "Unproductive Bench" ✅
    └─ YES → Status = "Allocated" or "Pre Allocated" (based on other allocations) ✅
```

---

## 🎯 Key Points

### 1. Allocation End Date is Independent
- ✅ **Each allocation has its own end date**
- ✅ **When allocation end date passes → Allocation marked "Completed"**
- ✅ **Project can continue** even if one allocation ends
- ✅ **Employee status updated** based on remaining active allocations

### 2. Project End Date Affects All Allocations
- ✅ **When project end date passes → ALL allocations to that project marked "Completed"**
- ✅ **Project marked as "Closed"**
- ✅ **All employees' statuses updated**

### 3. Status Calculation Logic
- ✅ **Only checks "Active" allocations** for status calculation
- ✅ **Completed allocations are ignored** in status calculation
- ✅ **If no active allocations → Status = "Unproductive Bench"**
- ✅ **If has active allocations → Status = "Allocated" or "Pre Allocated"**

---

## 📝 Examples

### Example 1: Allocation Ends, Project Continues

```
Project: P-0001
- Start: Jan 1, 2025
- End: Dec 31, 2026 (NOT FINISHED)
- Status: Active

Employee: John
- Allocation Start: Jan 1, 2025
- Allocation End: Dec 31, 2025 (FINISHED)
- Today: Jan 1, 2026

Result:
✅ Allocation marked as "Completed"
✅ John's status → "Unproductive Bench" (if no other allocations)
✅ Project P-0001 remains "Active"
✅ Other employees' allocations to P-0001 remain "Active"
```

### Example 2: Project Ends, All Allocations End

```
Project: P-0001
- Start: Jan 1, 2025
- End: Dec 31, 2025 (FINISHED)
- Status: Closed

Employee: John
- Allocation Start: Jan 1, 2025
- Allocation End: Dec 31, 2025 (FINISHED)
- Today: Jan 1, 2026

Result:
✅ Project marked as "Closed"
✅ ALL allocations to P-0001 marked as "Completed"
✅ John's status → "Unproductive Bench" (if no other allocations)
✅ All other employees' allocations to P-0001 also marked "Completed"
```

### Example 3: Multiple Allocations, One Ends

```
Employee: John
- Allocation A: Project P-0001, Ends Dec 31, 2025 (FINISHED)
- Allocation B: Project P-0002, Ends Dec 31, 2026 (NOT FINISHED)

Today: Jan 1, 2026

Result:
✅ Allocation A marked as "Completed"
✅ Allocation B remains "Active"
✅ John's status → "Allocated" or "Pre Allocated" (based on Project P-0002)
```

---

## ✅ Summary

### Scenario 1: Project Exists, Allocation End Date Finished
- ✅ Allocation marked as "Completed"
- ✅ Employee status updated (to "Unproductive Bench" if no other active allocations)
- ✅ Project continues (other employees may still be allocated)

### Scenario 2: Allocation End Date Finished, Project Not Finished
- ✅ **Same as Scenario 1** - Allocation end date is independent
- ✅ Allocation marked as "Completed"
- ✅ Employee status updated
- ✅ Project continues with other employees

### Key Rule:
**Allocation end date determines when that specific allocation ends, regardless of project end date.**

---

**Last Updated**: December 2024  
**Version**: 1.0






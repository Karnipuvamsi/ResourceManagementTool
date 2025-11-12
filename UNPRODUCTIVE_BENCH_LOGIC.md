# Unproductive Bench - Logic Explanation

## 📋 What is "Unproductive Bench"?

**Unproductive Bench** is the **default status** for employees who are **not currently allocated to any active project**.

---

## 🎯 When is "Unproductive Bench" Set?

### Automatic Assignment

The system automatically sets an employee's status to **"Unproductive Bench"** when:

1. **Employee has NO active allocations**
   - All their allocations have ended (status = "Completed" or "Cancelled")
   - All their allocations have been deleted
   - They never had any allocations

2. **Allocation end date passes**
   - Allocation automatically marked as "Completed"
   - Employee has no other active allocations
   - Status automatically changes to "Unproductive Bench"

3. **Project ends**
   - Project end date passes
   - All allocations to that project are marked as "Completed"
   - If employee has no other active allocations → Status = "Unproductive Bench"

### Code Logic

```javascript
// From _updateEmployeeStatus() function in service.js

// ✅ Get all active allocations for this employee
const aAllocations = await SELECT.from(Allocations)
    .where({ employeeId: sEmployeeId, status: 'Active' });

// ✅ If no active allocations, revert to Bench
if (!aAllocations || aAllocations.length === 0) {
                if (oEmployee.status !== 'UnproductiveBench' && 
        oEmployee.status !== 'InactiveBench') {
        // Default to UnproductiveBench if not already on bench
        await UPDATE(Employees).where({ ohrId: sEmployeeId })
            .with({ status: 'UnproductiveBench' });
    }
    return;
}
```

---

## 🔄 Status Flow to "Unproductive Bench"

### Scenario 1: Allocation Ends
```
Employee Status: "Allocated" or "Pre Allocated"
    ↓
Allocation End Date Passes
    ↓
Allocation Marked as "Completed"
    ↓
Check: Does employee have other active allocations?
    ↓
NO → Status = "Unproductive Bench"
YES → Status recalculated based on remaining allocations
```

### Scenario 2: All Allocations End
```
Employee has 3 allocations:
- Allocation A: Ends today
- Allocation B: Ends today  
- Allocation C: Ends today
    ↓
All marked as "Completed"
    ↓
No active allocations remaining
    ↓
Status = "Unproductive Bench"
```

### Scenario 3: Project Ends
```
Employee allocated to Project X
    ↓
Project End Date Passes
    ↓
Project marked as "Closed"
    ↓
All allocations to Project X marked as "Completed"
    ↓
Employee has no other active allocations
    ↓
Status = "Unproductive Bench"
```

### Scenario 4: New Employee (Never Allocated)
```
New Employee Created
    ↓
No allocations exist
    ↓
Status = "Unproductive Bench" (default)
```

---

## 🆚 Unproductive Bench vs Other Statuses

### Unproductive Bench vs Inactive Bench

| Aspect | Unproductive Bench | Inactive Bench |
|--------|-------------------|------------------|
| **Meaning** | Employee available but not allocated | Employee on leave (maternity, sick leave, etc.) |
| **How Set** | Automatically (when no active allocations) | Manually (by user) |
| **Can Change Automatically?** | Yes (when allocations are added/removed) | No (protected, manual only) |
| **Availability** | Available for new allocations | Not available (on leave) |
| **Use Case** | Default bench status | Long-term leave |

### Unproductive Bench vs Allocated/Pre Allocated

| Aspect | Unproductive Bench | Allocated/Pre Allocated |
|--------|-------------------|------------------------|
| **Active Allocations** | None | Has active allocation(s) |
| **Project Assignment** | Not assigned | Assigned to project(s) |
| **Status Priority** | Lowest (when no allocations) | Higher (when allocated) |

---

## 📊 Status Priority Hierarchy

When determining employee status, the system uses this priority:

1. **Resigned** (Highest Priority - Protected)
   - Never changes automatically
   - Manual intervention required

2. **Allocated**
   - Employee has active allocation(s) to confirmed project(s) (with SFDC PID)

3. **Pre Allocated**
   - Employee has active allocation(s) to unconfirmed project(s) (no SFDC PID)

4. **Inactive Bench** (Protected)
   - Manually set for employees on leave
   - System preserves this status even if no active allocations

5. **Unproductive Bench** (Default/Lowest)
   - No active allocations
   - Default status when employee is not allocated

---

## 🔍 Key Logic Points

### 1. Automatic Assignment
- ✅ System automatically assigns "Unproductive Bench" when employee has no active allocations
- ✅ No manual intervention needed

### 2. Protection for Inactive Bench
- ✅ If employee is on "Inactive Bench" (on leave), status is **preserved**
- ✅ System does NOT change "Inactive Bench" to "Unproductive Bench" automatically
- ✅ This prevents employees on leave from being marked as available

### 3. Protection for Resigned
- ✅ If employee is "Resigned", status is **never changed**
- ✅ System respects this status regardless of allocations

### 4. Recalculation on Allocation Changes
- ✅ When allocation is created → Status changes from "Unproductive Bench" to "Allocated" or "Pre Allocated"
- ✅ When allocation ends → Status changes from "Allocated"/"Pre Allocated" to "Unproductive Bench" (if no other allocations)

---

## 📝 Examples

### Example 1: Employee's Only Allocation Ends
```
Day 1:
- Employee: John
- Status: "Allocated"
- Allocation: Project A (ends Dec 31, 2025)

Day 2 (Jan 1, 2026):
- Allocation end date passes
- Allocation automatically marked as "Completed"
- System checks: Does John have other active allocations?
- Answer: NO
- Status automatically changed to: "Unproductive Bench"
```

### Example 2: Employee Has Multiple Allocations, One Ends
```
Day 1:
- Employee: Jane
- Status: "Allocated"
- Allocation A: Project X (ends Dec 31, 2025)
- Allocation B: Project Y (ends Jan 15, 2026)

Day 2 (Jan 1, 2026):
- Allocation A end date passes
- Allocation A marked as "Completed"
- System checks: Does Jane have other active allocations?
- Answer: YES (Allocation B still active)
- Status recalculated based on Allocation B
- Status remains: "Allocated" (if Project Y has SFDC PID)
```

### Example 3: New Employee
```
Day 1:
- New Employee: Bob
- Status: "Unproductive Bench" (default - no allocations)
- No active allocations

Day 2:
- Allocation created for Bob
- Allocation start date arrives
- Project start date arrives
- Status automatically changed to: "Allocated" or "Pre Allocated"
```

### Example 4: Employee on Leave
```
Day 1:
- Employee: Alice
- Status: "Inactive Bench" (manually set - on maternity leave)
- No active allocations

Day 2:
- Still no active allocations
- System checks: Is Alice on "Inactive Bench"?
- Answer: YES
- Status preserved: "Inactive Bench" (NOT changed to "Unproductive Bench")
```

---

## ✅ Summary

**Unproductive Bench** is:
- ✅ The **default status** for employees with **no active allocations**
- ✅ **Automatically assigned** when all allocations end
- ✅ **Automatically changed** when new allocations are created
- ✅ **Protected** for employees on "Inactive Bench" (on leave)
- ✅ **Never assigned** to "Resigned" employees (status protected)

**Key Logic**: 
- No active allocations + Not on Inactive Bench + Not Resigned = **Unproductive Bench**

---

**Last Updated**: December 2024  
**Version**: 1.0


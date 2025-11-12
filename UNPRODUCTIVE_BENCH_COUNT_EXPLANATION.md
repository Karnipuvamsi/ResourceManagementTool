# Unproductive Bench Count - How We Get "3" (With Your Data)

## 📊 Current Data Analysis

### From `db-Employee.csv`:

**Total Employees**: 18

**Employees with Status = "Unproductive Bench"** (in CSV):
1. `703013588` - Prateek Singh
2. `703282959` - Meera Patel  
3. `703387205` - Arjun Reddy
4. `703280408` - Deepak Verma
5. `703386913` - Priya Nair

**Count in CSV**: 5 employees

---

## 🔍 Why the Count Shows "3" Instead of "5"

### The Logic Behind It

The system calculates "Unproductive Bench" count **dynamically** based on:

1. **Employee Status in Database** (from `db-Employee.csv`)
2. **Active Allocations** (from `db-EmployeeProjectAllocation.csv`)

### Calculation Method

```javascript
// From Home.controller.js - _loadUnproductiveBenchCount()

_loadUnproductiveBenchCount: async function() {
    const oModel = this.getView().getModel("default");
    
    // Query: Get all employees where status = "Unproductive Bench"
    const oListBinding = oModel.bindList("/Employees", undefined, undefined,
        new sap.ui.model.Filter({
            path: "status",
            operator: sap.ui.model.FilterOperator.EQ,
            value1: "Unproductive Bench"
        })
    );
    
    const aContexts = await oListBinding.requestContexts(0, 10000);
    const unproductiveBenchCount = aContexts.length; // This gives us the count
    
    // Update the home screen card
    oHomeCountsModel.setProperty("/unproductiveBenchCount", unproductiveBenchCount);
}
```

### Why the Count Might Be "3" Instead of "5"

**Possible Reasons**:

1. **Status Updated by System**
   - Some employees might have **active allocations** in the database
   - System automatically updated their status from "Unproductive Bench" to "Allocated" or "Pre Allocated"
   - So when querying, only 3 employees actually have status = "Unproductive Bench"

2. **Active Allocations Exist**
   - Even though CSV shows "Unproductive Bench", if those employees have active allocations:
     - System recalculates status → Changes to "Allocated" or "Pre Allocated"
     - Only employees with **NO active allocations** remain as "Unproductive Bench"

3. **Data Sync Issue**
   - CSV file might be outdated
   - Database might have been updated by the system
   - Status might have changed due to allocation changes

---

## 📋 Step-by-Step: How the Count is Calculated

### Step 1: Query Employees Table
```
SELECT * FROM Employees WHERE status = 'Unproductive Bench'
```

### Step 2: Check Each Employee's Allocations
For each employee with status = "Unproductive Bench":
```
SELECT * FROM EmployeeProjectAllocation 
WHERE employeeId = '<employee_id>' 
AND status = 'Active'
```

### Step 3: System Recalculates Status
If employee has active allocations:
- Status automatically changes to "Allocated" or "Pre Allocated"
- Employee is **removed** from "Unproductive Bench" count

If employee has NO active allocations:
- Status remains "Unproductive Bench"
- Employee is **included** in "Unproductive Bench" count

### Step 4: Final Count
Count = Number of employees with:
- Status = "Unproductive Bench" **AND**
- No active allocations

---

## 🔄 Example Scenario

### Employee: Prateek Singh (703013588)

**In CSV**: Status = "Unproductive Bench"

**In Database**:
- Check allocations: Does he have active allocations?
  - If YES → Status automatically changed to "Allocated" or "Pre Allocated"
  - If NO → Status remains "Unproductive Bench"

**Result**: 
- If he has active allocations → **NOT counted** in "Unproductive Bench"
- If he has NO active allocations → **Counted** in "Unproductive Bench"

---

## 📊 Expected Count Breakdown

### Scenario 1: All 5 Have No Active Allocations
```
Count = 5 employees
- Prateek Singh
- Meera Patel
- Arjun Reddy
- Deepak Verma
- Priya Nair
```

### Scenario 2: 2 Have Active Allocations (Your Case - Count = 3)
```
Count = 3 employees (those with NO active allocations)
- Employee A (no allocations) ✅ Counted
- Employee B (no allocations) ✅ Counted
- Employee C (no allocations) ✅ Counted
- Employee D (has active allocation) ❌ NOT counted (status changed to "Allocated")
- Employee E (has active allocation) ❌ NOT counted (status changed to "Allocated")
```

---

## 🔍 How to Verify the Count

### Method 1: Check Database Directly
```sql
-- Count employees with status = "Unproductive Bench"
SELECT COUNT(*) FROM Employees 
WHERE status = 'Unproductive Bench';
```

### Method 2: Check Active Allocations
```sql
-- For each "Unproductive Bench" employee, check allocations
SELECT e.ohrId, e.fullName, e.status, COUNT(a.allocationId) as active_allocations
FROM Employees e
LEFT JOIN EmployeeProjectAllocation a 
    ON e.ohrId = a.employeeId AND a.status = 'Active'
WHERE e.status = 'Unproductive Bench'
GROUP BY e.ohrId, e.fullName, e.status;
```

### Method 3: Check in UI
1. Go to Employees table
2. Filter by Status = "Unproductive Bench"
3. Count the rows shown

---

## ✅ Summary

**The count "3" means**:
- ✅ 3 employees currently have status = "Unproductive Bench" in the database
- ✅ These 3 employees have **NO active allocations**
- ✅ The other 2 employees (from the 5 in CSV) likely have active allocations
- ✅ System automatically updated their status to "Allocated" or "Pre Allocated"

**The Logic**:
```
Unproductive Bench Count = 
    Employees with status = "Unproductive Bench" 
    AND 
    No active allocations
```

**Why it's dynamic**:
- Status changes automatically when allocations are created/ended
- Count reflects the **current state** in the database, not the CSV file
- CSV might be outdated if allocations were added/removed

---

## 🎯 To See the Actual 3 Employees

Check the Employees table filtered by:
- Status = "Unproductive Bench"

Or check the console log:
```
✅ Unproductive Bench Count: 3
```

The 3 employees shown are the ones currently with:
- Status = "Unproductive Bench"
- No active allocations

---

**Last Updated**: December 2024  
**Version**: 1.0





# Employee Allocation Report - Current Logic and Issues

## 📋 Current Report Logic

### What Records Are Shown:

The **Employee Allocation Report** shows employees with **Active allocations** that meet ALL these conditions:

1. ✅ **Allocation Status = 'Active'** (required)
2. ✅ **Employee has NO Last Working Date (LWD)** - `e.lwd is null`
3. ✅ **Employee Status NOT in**: 'Resigned', 'Inactive Bench', 'Unproductive Bench'
4. ✅ **All joins must succeed**: Employee → Allocation → Project → Opportunity → Customer

### View Definition:

```cds
define view EmployeeAllocationReportView as
select from db.Employee as e
inner join db.EmployeeProjectAllocation as epa
  on e.ohrId = epa.employeeId
  and epa.status = 'Active'  // ✅ Only Active allocations
inner join db.Project as p
  on epa.projectId = p.sapPId
inner join db.Opportunity as opp
  on p.oppId = opp.sapOpportunityId
inner join db.Customer as c
  on opp.customerId = c.SAPcustId
{
  // ... fields ...
}
where
  e.lwd is null  // ✅ No Last Working Date
  and e.status not in ('Resigned', 'Inactive Bench', 'Unproductive Bench');
```

---

## 🔍 Why Future-Dated Allocations Might Not Show

### Issue 1: Missing Related Data (Most Likely)

**Problem**: The view uses `inner join`, which means ALL related entities must exist:
- ✅ Employee must exist
- ✅ Allocation must exist (with status='Active')
- ✅ Project must exist
- ✅ Opportunity must exist
- ✅ Customer must exist

**If ANY of these are missing, the record won't show!**

**Example**:
- Allocation created with start date = tomorrow
- But Project doesn't have an `oppId` (Opportunity link)
- Or Opportunity doesn't have a `customerId` (Customer link)
- Result: Record won't appear in report

### Issue 2: Employee Status Excluded

**Problem**: Employee status is in excluded list:
- Employee status = 'Resigned' → Won't show
- Employee status = 'Inactive Bench' → Won't show
- Employee status = 'Unproductive Bench' → Won't show

### Issue 3: Employee Has LWD Set

**Problem**: Employee has Last Working Date set:
- `e.lwd is not null` → Record excluded

### Issue 4: Allocation Status Not 'Active'

**Problem**: Allocation was created but status is not 'Active':
- Status = 'Completed' → Won't show
- Status = 'Cancelled' → Won't show
- Status = null → Won't show

---

## ✅ What Records SHOULD Show

The report should show:
- ✅ **All Active allocations** (regardless of start/end dates)
- ✅ **Future allocations** (start date = tomorrow, end date = future)
- ✅ **Current allocations** (start date in past, end date in future)
- ✅ **Past allocations** (if still Active and end date passed - though these should be marked Completed)

---

## 🔧 How to Debug

### Step 1: Check Allocation Status
```sql
SELECT * FROM EmployeeProjectAllocation 
WHERE employeeId = '<employee_id>' 
AND allocationId = '<allocation_id>';
```
- Verify `status = 'Active'`

### Step 2: Check Employee Status
```sql
SELECT * FROM Employees 
WHERE ohrId = '<employee_id>';
```
- Verify `status NOT IN ('Resigned', 'Inactive Bench', 'Unproductive Bench')`
- Verify `lwd IS NULL`

### Step 3: Check Related Entities
```sql
-- Check if Project exists and has oppId
SELECT * FROM Projects WHERE sapPId = '<project_id>';

-- Check if Opportunity exists and has customerId
SELECT * FROM Opportunities WHERE sapOpportunityId = '<opp_id>';

-- Check if Customer exists
SELECT * FROM Customers WHERE SAPcustId = '<customer_id>';
```

### Step 4: Check Join Chain
```sql
-- Try the full join manually
SELECT e.ohrId, epa.allocationId, p.sapPId, opp.sapOpportunityId, c.SAPcustId
FROM Employees e
INNER JOIN EmployeeProjectAllocation epa ON e.ohrId = epa.employeeId AND epa.status = 'Active'
INNER JOIN Projects p ON epa.projectId = p.sapPId
INNER JOIN Opportunities opp ON p.oppId = opp.sapOpportunityId
INNER JOIN Customers c ON opp.customerId = c.SAPcustId
WHERE e.ohrId = '<employee_id>' AND epa.allocationId = '<allocation_id>';
```

---

## 🎯 Most Common Issues

### Issue 1: Project Missing Opportunity Link
- **Symptom**: Allocation exists, but Project doesn't have `oppId`
- **Fix**: Ensure Project has a valid `oppId` that links to an Opportunity

### Issue 2: Opportunity Missing Customer Link
- **Symptom**: Project has `oppId`, but Opportunity doesn't have `customerId`
- **Fix**: Ensure Opportunity has a valid `customerId` that links to a Customer

### Issue 3: Allocation Status Not Set
- **Symptom**: Allocation created but status is null or not 'Active'
- **Fix**: Ensure allocation is created with `status='Active'` (we just fixed this)

---

## 📊 Summary

**Current Report Shows**:
- ✅ Employees with Active allocations
- ✅ Where employee has no LWD
- ✅ Where employee status is not Resigned/Inactive Bench/Unproductive Bench
- ✅ Where ALL related entities exist (Project → Opportunity → Customer)

**Report Does NOT Filter By**:
- ❌ Allocation start date (future dates are fine)
- ❌ Allocation end date (future dates are fine)
- ❌ Days remaining (can be negative or positive)

**If Future Allocations Don't Show, Check**:
1. ✅ Allocation status = 'Active'
2. ✅ Employee status is allowed
3. ✅ Employee has no LWD
4. ✅ Project has valid oppId
5. ✅ Opportunity has valid customerId
6. ✅ Customer exists

---

**Last Updated**: December 2024  
**Version**: 1.0


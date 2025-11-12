# Resource Management Tool - Reports and Status Logic Documentation

## 📋 Table of Contents
1. [Employee Status Changes](#employee-status-changes)
2. [Reports Overview](#reports-overview)
3. [Report Details](#report-details)

---

## Employee Status Changes

### Status Types

The system has 5 employee statuses:

1. **Allocated** - Employee is actively working on a confirmed project
2. **Pre Allocated** - Employee is assigned to a project but project is not yet confirmed (no SFDC PID)
3. **Unproductive Bench** - Employee has no active allocations (default bench status)
4. **Inactive Bench** - Employee on leave (maternity, long sick leave, etc.)
5. **Resigned** - Employee has left the organization (status never changes once set)

### Status Change Logic

#### Automatic Status Updates

Employee status is automatically updated based on their **active allocations** and **project details**:

##### Rule 1: When Employee Gets Allocated
- **Condition**: Employee has active allocation(s) AND allocation start date has arrived AND project start date has arrived
- **Status Assignment**:
  - If project has **SFDC PID** → Status = **"Allocated"**
  - If project has **NO SFDC PID** → Status = **"Pre Allocated"**

##### Rule 2: When Allocation Ends
- **Condition**: Employee has no active allocations
- **Status Assignment**: Status = **"Unproductive Bench"** (default bench status)

##### Rule 3: Multiple Allocations
- If employee has multiple active allocations:
  - If **ANY** allocation is to a project with SFDC PID → Status = **"Allocated"**
  - If **ALL** allocations are to projects without SFDC PID → Status = **"Pre Allocated"**
  - Priority: **Allocated** > **Pre Allocated**

##### Rule 4: Resigned Employees
- **Protected Status**: Once an employee is marked as "Resigned", their status **never changes automatically**
- Manual intervention required to change from "Resigned"

##### Rule 5: Inactive Bench
- This status is **manually set** for employees on leave
- System does not automatically change to/from "Inactive Bench"

### Status Change Triggers

Status is automatically updated when:
1. **Allocation Created** - New allocation is added to an employee
2. **Allocation Updated** - Allocation status is manually changed (Active → Completed/Cancelled)
3. **Allocation Deleted** - When an allocation is removed
4. **Project SFDC PID Updated** - If project gets confirmed, all allocated employees' status updates
5. **Project Start Date Updated** - When project start date changes, employee statuses are recalculated

### ✅ Automatic Expired Items Handling (NEW)

**Implemented Features**: The system now automatically:
- ✅ Marks allocations as "Completed" when allocation end date passes
- ✅ Marks projects as "Closed" and all their allocations as "Completed" when project end date passes
- ✅ Updates employee statuses when allocations/projects expire
- ✅ Handles project manually closed → marks all allocations as "Completed"
- ✅ Proactive check on Employee READ (checks expired allocations for that employee)

**How It Works**:
1. **On Employee READ**: When reading a single employee, checks if their allocations have expired and marks them as "Completed"
2. **On Project UPDATE**: When project status is changed to "Closed", automatically marks all allocations as "Completed"
3. **On-Demand Function**: Can call `checkExpiredItems` function to check and update all expired items
4. **Automatic Updates**: Employee statuses are automatically updated when expired allocations are found

**What Happens When Allocation/Project Ends**:
- ✅ Allocation end date passes → Allocation marked as "Completed", employee status updated
- ✅ Project end date passes → Project marked as "Closed", all allocations marked as "Completed", all employee statuses updated
- ✅ Project manually closed → All allocations marked as "Completed", all employee statuses updated
- ✅ Multiple allocations, one expires → Only expired allocation marked as "Completed", employee status updated based on remaining allocations

### Example Scenarios

**Scenario 1: New Allocation**
- Employee: John (Status: Unproductive Bench)
- Action: Allocate John to Project A (has SFDC PID, starts today)
- Result: Status → **"Allocated"**

**Scenario 2: Pre-Allocation**
- Employee: Jane (Status: Unproductive Bench)
- Action: Allocate Jane to Project B (no SFDC PID, starts today)
- Result: Status → **"Pre Allocated"**

**Scenario 3: Allocation Ends**
- Employee: Bob (Status: Allocated)
- Action: Bob's allocation to Project C ends (no other active allocations)
- Result: Status → **"Unproductive Bench"**

**Scenario 4: Multiple Allocations**
- Employee: Alice (Status: Pre Allocated)
- Action: Alice has 2 allocations:
  - Project X (no SFDC PID) - Active
  - Project Y (has SFDC PID) - Active
- Result: Status → **"Allocated"** (because at least one project has SFDC PID)

---

## Reports Overview

The system provides **6 main reports** for resource management:

1. **Employee Bench Report** - Shows employees currently on bench
2. **Employee Probable Release Report** - Shows employees who will be released from projects soon
3. **Revenue Forecast Report** - Shows projected revenue based on opportunities and projects
4. **Employee Allocation Report** - Shows all active employee allocations
5. **Employee Skill Report** - Shows skill availability and allocation statistics
6. **Projects Nearing Completion Report** - Shows projects ending within 90 days

---

## Report Details

### 1. Employee Bench Report

**Purpose**: Track employees who are currently on bench (not allocated to any project)

**Logic**:
- Shows employees with status = **"Unproductive Bench"** OR **"Inactive Bench"**
- Calculates **Days on Bench** = Days since last allocation ended (or since date of joining if never allocated)
- If employee has completed allocations, uses the latest allocation end date
- If employee never had allocations, uses date of joining (DOJ)

**Fields**:
- Employee ID (OHR ID)
- Employee Name
- Band
- Employee Type
- Location
- Skills
- Supervisor OHR
- Email
- Status
- Days on Bench

**Use Case**: Identify available resources for new project assignments

---

### 2. Employee Probable Release Report

**Purpose**: Identify employees who will be released from projects in the future

**Logic**:
- Shows employees with **Active** allocations
- Only includes allocations where end date is **in the future** (not expired)
- **No day limit** - shows ALL future releases (could be 1 day or 1000 days away)
- Calculates **Days to Release** using formula:
  ```
  Days to Release = Allocation End Date - Current Date
  ```
  - Positive number = days until release
  - Example: If allocation ends on Dec 31, 2025 and today is Dec 1, 2025 → Days to Release = 30

**Fields**:
- Employee ID (OHR ID)
- Employee Name
- Band
- Current Project Name
- Customer Name
- Release Date (allocation end date)
- Days to Release (calculated: endDate - currentDate)
- Skills
- Location
- Allocation Status

**Use Case**: Plan resource reallocation and identify upcoming bench resources

**Note**: Currently shows ALL future releases. To focus on "upcoming" releases (e.g., within 30/60/90 days), you can filter the report by Days to Release column.

---

### 3. Revenue Forecast Report

**Purpose**: Forecast revenue based on opportunities and their probability

**Logic**:
- Shows all **Active** and **Planned** projects
- Joins with Opportunities to get Total Contract Value (TCV)
- Calculates **Weighted Revenue** based on opportunity probability:
  - `0%-ProposalStage` → 0% of TCV
  - `33%-SoWSent` → 33% of TCV
  - `85%-SoWSigned` → 85% of TCV
  - `100%-PurchaseOrderReceived` → 100% of TCV
- Groups by Customer and Vertical

**Fields**:
- Project ID (SAP P ID)
- Project Name
- Project Type
- Start Date
- End Date
- Project Status
- Total Revenue (TCV)
- Probability
- Weighted Revenue (TCV × Probability %)
- Customer Name
- Vertical
- Start Year
- Start Month

**Use Case**: Financial planning and revenue forecasting

---

### 4. Employee Allocation Report

**Purpose**: Track all active employee allocations across projects

**Logic**:
- Shows employees with **Active** allocations
- Excludes employees who are:
  - Resigned
  - On Inactive Bench
  - On Unproductive Bench
  - Have Last Working Date (LWD) set
- Calculates **Days Remaining** using formula:
  ```
  Days Remaining = Allocation End Date - Current Date
  ```
  - Positive number = days left in allocation
  - Negative number = allocation has expired (should not appear if filter works correctly)
  - Example: If allocation ends on Jan 15, 2026 and today is Dec 1, 2025 → Days Remaining = 45
- Shows allocation percentage (utilization)

**Fields**:
- Employee ID (OHR ID)
- Employee Name
- Band
- Employee Type
- Employee Status
- Current Project Name
- Customer Name
- Allocation Start Date
- Allocation End Date
- Days Remaining (calculated: endDate - currentDate)
- Utilization Percentage

**Use Case**: Monitor resource utilization and allocation health

**Note**: Both "Days to Release" (Probable Release Report) and "Days Remaining" (Allocation Report) use the same calculation formula: `allocation end date - current date`

---

### 5. Employee Skill Report

**Purpose**: Analyze skill availability and allocation across the organization

**Logic**:
- Shows all skills from the Skills master data
- For each skill, calculates:
  - **Total Employees**: Count of employees who have this skill (via EmployeeSkill junction table)
  - **Available Employees**: Count of employees with this skill who are on bench (Unproductive Bench or Inactive Bench)
  - **Allocated Employees**: Count of employees with this skill who have active allocations

**Fields**:
- Skill ID
- Skill Name
- Category
- Total Employees (with this skill)
- Available Employees (on bench with this skill)
- Allocated Employees (actively using this skill)

**Use Case**: Skill gap analysis and resource planning for skill-based assignments

---

### 6. Projects Nearing Completion Report

**Purpose**: Identify projects ending soon to plan resource reallocation

**Logic**:
- Shows **Active** projects
- Only includes projects where:
  - End date is **in the future** (not expired)
  - **Days to Completion** ≤ 90 days
- Calculates **Completion Risk**:
  - ≤ 30 days → "Critical"
  - ≤ 60 days → "High"
  - ≤ 90 days → "Medium"
  - > 90 days → "Low" (not shown in report)
- Counts active employees on each project

**Fields**:
- Project ID (SAP P ID)
- Project Reference
- Project Name
- Project Type
- Completion Date (project end date)
- Days to Completion
- Project Status
- Completion Risk (Critical/High/Medium)
- Employee Count (active allocations on project)
- Project Manager Name
- Project Manager Email
- Customer Name

**Use Case**: Proactive resource planning and project completion management

---

## Summary

### Status Change Summary

| Current Status | Has Active Allocation? | Project Has SFDC PID? | New Status |
|---------------|------------------------|----------------------|------------|
| Any (except Resigned) | No | N/A | Unproductive Bench |
| Any (except Resigned) | Yes | Yes | Allocated |
| Any (except Resigned) | Yes | No | Pre Allocated |
| Resigned | Any | Any | Resigned (unchanged) |

### Report Quick Reference

| Report | Purpose | Key Filter |
|--------|---------|------------|
| Employee Bench Report | Find available resources | Status = Bench |
| Employee Probable Release Report | Plan upcoming releases | Active allocations, future end dates |
| Revenue Forecast Report | Financial planning | Active/Planned projects |
| Employee Allocation Report | Monitor utilization | Active allocations, not resigned/bench |
| Employee Skill Report | Skill analysis | All skills, counts by status |
| Projects Nearing Completion Report | Project completion planning | Active projects, ≤90 days to end |

---

**Last Updated**: December 2024
**Version**: 1.0


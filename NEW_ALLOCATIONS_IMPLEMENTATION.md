# New Allocations Implementation Documentation

This document provides a comprehensive overview of all functionalities implemented for the `newAllocations` entity, organized by Frontend and Backend sections.

---

## 📱 Frontend Implementation

### UI Components

#### **AllocateN Fragment** (`app/webapp/view/fragments/AllocateN.fragment.xml`)
- **Purpose**: Main UI form for creating new allocations
- **Components**:
  - Customer input field (with value help)
  - Project input field (with value help, enabled after customer selection)
  - Employee input field (with value help, enabled after project selection)
  - Start Date picker (enabled after project selection)
  - End Date picker (enabled after project selection)
  - Allocation Percentage input (default: 100%, enabled after project selection)
  - Allocate button (enabled after all required fields are filled)
  - Selected Employees' Current Allocations panel
  - Employees Allocated to Selected Project panel

---

### Controller Functions

#### **1. `onCustomerValueHelpConfirm`**
- **Purpose**: Handles customer selection from value help dialog
- **Functionality**:
  - Stores selected customer ID in `_sAllocateCustomerFilter`
  - Enables project input field
  - Clears project input when customer changes
- **Location**: `Home.controller.js` (line ~8891)

#### **2. `onProjectValueHelpRequest`**
- **Purpose**: Opens project value help dialog with customer filtering
- **Functionality**:
  - Validates customer is selected before opening project dialog
  - Stores customer ID for filtering projects
  - Applies customer filter to project search
  - Calls `_applyProjectCustomerFilter()` to filter projects by customer
- **Location**: `Home.controller.js` (line ~8457)

#### **3. `onProjectValueHelpSearch`**
- **Purpose**: Filters projects in value help dialog based on customer
- **Functionality**:
  - Adds filter to include `to_Opportunity/customerId` based on selected customer
  - Ensures only projects for the selected customer are shown
- **Location**: `Home.controller.js` (line ~8509)

#### **4. `_applyProjectCustomerFilter`**
- **Purpose**: Helper function to apply customer filter to project value help table
- **Functionality**:
  - Filters project table to show only projects for the selected customer
  - Applied when project value help dialog opens
- **Location**: `Home.controller.js` (line ~8550)

#### **5. `_onCustomerChange`**
- **Purpose**: Handles customer change event
- **Functionality**:
  - Clears project input field and its `selectedId` data when customer changes
  - Resets dependent fields
- **Location**: `Home.controller.js` (line ~9041)

#### **6. `_onCustomerChangeCancel`**
- **Purpose**: Handles customer selection cancellation
- **Functionality**:
  - Clears `_sAllocateCustomerFilter`
  - Calls `_onProjectChangeCancel()` to reset project-related fields
- **Location**: `Home.controller.js` (line ~8410)

#### **7. `onAllocateConfirmNew`**
- **Purpose**: Main function to create new allocation after form submission
- **Functionality**:
  - **Frontend Validations**:
    - Validates required fields (employeeId, projectId, customerId)
    - Validates allocation percentage (number, 0-100 range)
    - Validates start date and end date (not empty, startDate <= endDate)
    - Validates allocation dates are within project dates (if available)
  - **Payload Building**:
    - Builds allocation payload with validated values
    - Converts allocation percentage to number
    - Formats dates properly
  - **Error Handling**:
    - Handles success and error messages from backend
    - Resets form on error
    - Shows user-friendly error messages
- **Location**: `Home.controller.js` (line ~3484)

#### **8. `_onProjectChange`**
- **Purpose**: Handles project selection change
- **Functionality**:
  - Enables employee input field
  - Enables date pickers
  - Fetches project data and sets default start/end dates from project
  - Populates "Employees Allocated to Selected Project" panel
- **Location**: `Home.controller.js` (line ~10422)

---

## 🔧 Backend Implementation

### Service Hooks

#### **1. `before('CREATE', newAllocations)`**
- **Purpose**: Validates allocation data before creation
- **Location**: `service.js` (line ~1909)
- **Validations**:
  1. **Required Fields**: Validates `employeeId`, `projectId`, and `customerId` are provided
  2. **Allocation Date**: Sets `allocationDate` to current date if not provided
  3. **Allocation Percentage**:
     - Converts to number (strict type conversion)
     - Validates range (0-100)
     - Validates not NaN
  4. **Entity Existence**:
     - Validates employee exists and status is not 'Resigned'
     - Validates customer exists
     - Validates project exists and status is not 'Closed'
  5. **Customer-Project Relationship**: Validates project's customer matches selected customer
  6. **Date Auto-fill**: Auto-fills `startDate` and `endDate` from project if not provided
  7. **Date Validations**:
     - Validates `startDate <= endDate`
     - Validates allocation dates are within project date range
  8. **Project Resource Validation**:
     - Validates `requiredResources` is set (> 0)
     - Validates `allocatedResources` won't exceed `requiredResources` after new allocation
     - Uses strict number conversion for resource counts
  9. **Duplicate Allocation Check**: Prevents same employee from being allocated to same project multiple times
  10. **Overlapping Allocation Percentage Check**:
      - Uses `maxCumulativeWithNew` function to calculate peak cumulative percentage
      - Validates peak doesn't exceed 100% for the employee
      - Considers all overlapping allocations in the date range

---

#### **2. `on('CREATE', newAllocations)`**
- **Purpose**: Handles allocation persistence
- **Location**: `service.js` (line ~2075)
- **Functionality**:
  - Supports both single object and array of objects
  - Ensures `allocationPercentage` is converted to Number
  - Ensures `allocationDate` is set
  - Persists allocation to database

---

#### **3. `after('CREATE', newAllocations)`**
- **Purpose**: Updates related entities after allocation is created
- **Location**: `service.js` (line ~2226)
- **Functionality**:
  - Uses `data` parameter (first parameter) to get created allocation data
  - **Updates Project Resource Counts**: Calls `_updateProjectResourceCountsForNewAllocations()`
  - **Updates Employee Allocation Percentage**: Calls `_updateEmployeeAllocationPercentage()`
  - **Updates Employee Status**: Calls `_updateEmployeeStatusForNewAllocations()`
  - Error handling: Logs errors but doesn't fail allocation creation

---

#### **4. `before('UPDATE', newAllocations)`**
- **Purpose**: Validates allocation updates
- **Location**: `service.js` (line ~1883)
- **Validations**:
  - Validates overlapping allocation percentage doesn't exceed 100%
  - Uses `maxCumulativeWithNew` function for peak calculation
  - Excludes current allocation from overlap check

---

### Helper Functions

#### **1. `_updateProjectResourceCountsForNewAllocations(sProjectId)`**
- **Purpose**: Updates project resource counts (allocatedResources, toBeAllocated) for newAllocations
- **Location**: `service.js` (line ~2119)
- **Functionality**:
  - Counts ALL allocations from `newAllocations` entity for the project (no date filtering)
  - Includes past, present, and future allocations
  - Calculates: `allocatedResources = count of all newAllocations`
  - Calculates: `toBeAllocated = requiredResources - allocatedResources`
  - Updates project with both values
- **Note**: Separate from `_updateProjectResourceCounts` which handles `Allocations` entity

---

#### **2. `_updateEmployeeAllocationPercentage(sEmployeeId)`**
- **Purpose**: Updates employee's current allocation percentage based on active allocations
- **Location**: `service.js` (line ~2185)
- **Functionality**:
  - Gets all `newAllocations` for the employee
  - Filters to only allocations active TODAY: `startDate <= today <= endDate`
  - Sums allocation percentages of active allocations
  - Caps at 100% (validation should prevent exceeding)
  - Updates employee's `empallocpercentage` field
- **Note**: Only counts allocations active today, not future or past allocations

---

#### **3. `_updateEmployeeStatusForNewAllocations(sEmployeeId)`**
- **Purpose**: Updates employee status (Allocated/PreAllocated/Bench) based on active newAllocations
- **Location**: `service.js` (line ~2279)
- **Functionality**:
  - Gets all `newAllocations` for the employee
  - Filters to only allocations active TODAY: `startDate <= today <= endDate`
  - For each active allocation:
    - Checks if project start date has arrived
    - Checks if allocation start date has arrived
    - If both dates have arrived:
      - Project has SFDC PID → Status = "Allocated"
      - Project has NO SFDC PID → Status = "PreAllocated"
  - If no active allocations → Status = "UnproductiveBench"
  - Priority: Allocated > PreAllocated
  - Updates employee status accordingly
- **Note**: Separate from `_updateEmployeeStatus` which handles `Allocations` entity

---

#### **4. `_updateAllEmployeesAllocationPercentages()`**
- **Purpose**: Updates allocation percentages for all employees with newAllocations (for daily batch updates)
- **Location**: `service.js` (line ~2387)
- **Functionality**:
  - Gets all unique employee IDs who have `newAllocations`
  - Calls `_updateEmployeeAllocationPercentage()` for each employee
  - Returns count of updated employees
- **Usage**: Should be called daily via BTP Job Scheduling service to handle date transitions

---

#### **5. `updateAllEmployeesAllocationPercentages` (Endpoint)**
- **Purpose**: Standalone endpoint for BTP Job Scheduling service
- **Location**: `service.js` (line ~2415)
- **Functionality**:
  - Calls `_updateAllEmployeesAllocationPercentages()`
  - Returns success status and count of updated employees
  - Can be scheduled to run daily via BTP Job Scheduling
- **Endpoint**: `POST /updateAllEmployeesAllocationPercentages`

---

### Utility Functions

#### **1. `maxCumulativeWithNew(existing, newAlloc)`**
- **Purpose**: Calculates peak cumulative allocation percentage using sweep-line algorithm
- **Location**: `service.js` (line ~1849)
- **Functionality**:
  - Takes existing allocations and new allocation candidate
  - Finds all overlapping allocations in the date range
  - Uses sweep-line algorithm to calculate peak cumulative percentage at any point in time
  - Returns peak percentage value
- **Usage**: Used in `before CREATE` and `before UPDATE` hooks to validate employee doesn't exceed 100% allocation

#### **2. `overlaps(aStart, aEnd, bStart, bEnd)`**
- **Purpose**: Checks if two date ranges overlap
- **Location**: `service.js` (line ~1845)
- **Functionality**: Returns true if date ranges overlap, false otherwise

#### **3. `dateToNumber(d)`**
- **Purpose**: Converts date to timestamp number
- **Location**: `service.js` (line ~1842)
- **Functionality**: Converts date to milliseconds timestamp for comparison

---

## 📊 Data Flow

### Creation Flow:
1. **Frontend**: User fills form → `onAllocateConfirmNew` validates → Sends payload to backend
2. **Backend**: `before CREATE` validates → `on CREATE` persists → `after CREATE` updates related entities
3. **Updates**:
   - Project resource counts updated
   - Employee allocation percentage updated
   - Employee status updated (if applicable)

### Daily Update Flow:
1. **BTP Job Scheduling**: Calls `updateAllEmployeesAllocationPercentages` endpoint daily
2. **Backend**: Updates all employee allocation percentages based on active allocations
3. **Result**: Employee allocation percentages reflect current active allocations

---

## 🔑 Key Features

1. **Comprehensive Validation**: Frontend and backend validations ensure data integrity
2. **Automatic Date Handling**: Dates auto-filled from project if not provided
3. **Resource Management**: Project resource counts automatically updated
4. **Employee Tracking**: Employee allocation percentage and status automatically updated
5. **Overlap Prevention**: Prevents employee from being over-allocated (>100%)
6. **Customer-Project Relationship**: Ensures customer matches project's customer
7. **Date-Based Logic**: Employee status and allocation percentage based on active allocations (today)
8. **Daily Automation**: Supports daily batch updates via BTP Job Scheduling

---

## 📝 Notes

- All functions use strict type conversion (Number()) for numeric fields to prevent data type issues
- Employee allocation percentage only counts allocations active TODAY
- Project resource counts count ALL allocations (past, present, future)
- Employee status updates consider both allocation start date and project start date
- Separate functions for `newAllocations` keep logic independent from old `Allocations` entity


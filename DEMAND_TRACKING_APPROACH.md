# Demand Tracking in Allocations - Implementation Approach

## 📋 Current State Analysis

### What We Have Now:

1. **Allocation Entity** (`EmployeeProjectAllocation`):
   - `allocationId` (UUID)
   - `employeeId` (String)
   - `projectId` (String) ✅
   - `startDate`, `endDate`
   - `allocationPercentage`
   - `status`

2. **Demand Entity**:
   - `demandId` (Integer)
   - `skill` (String)
   - `band` (String)
   - `sapPId` (String) - links to project
   - `quantity` (Integer) - required count
   - `allocatedCount` (Integer) - ✅ Already exists! Count of allocations
   - `remaining` (Integer) - ✅ Already exists! quantity - allocatedCount

3. **Project Resource Counts** (Working Pattern):
   - `requiredResources` - calculated from sum of demand quantities
   - `allocatedResources` - count of ACTIVE allocations
   - `toBeAllocated` - requiredResources - allocatedResources
   - Updated via `_updateProjectResourceCounts()` function
   - Called in hooks: `after('CREATE', Allocations)`, `after('UPDATE', Allocations)`, `after('DELETE', Allocations)`

## 🎯 What We Need to Add:

1. **Add `demandId` field to Allocation entity** (schema change)
2. **Create `_updateDemandResourceCounts()` function** (similar to `_updateProjectResourceCounts`)
3. **Call demand update function in allocation hooks** (CREATE/UPDATE/DELETE)
4. **Update frontend to pass `demandId` when creating allocations**

## 🔧 Implementation Approach (Mirroring Project Counts)

### Step 1: Schema Changes
**File: `db/schema.cds`**
```cds
entity EmployeeProjectAllocation {
    key allocationId      : UUID;
    employeeId            : String;
    projectId             : String;
    demandId              : Integer;  // ✅ NEW: Link to Demand
    startDate             : Date;
    endDate               : Date;
    allocationDate        : Date;
    allocationPercentage  : Integer;
    status                : AllocationStatusEnum;
    
    to_Employee           : Association to one Employee
                              on to_Employee.ohrId = $self.employeeId;
    to_Project            : Association to one Project
                              on to_Project.sapPId = $self.projectId;
    to_Demand             : Association to one Demand  // ✅ NEW
                              on to_Demand.demandId = $self.demandId;
}
```

### Step 2: Backend Service - Demand Count Update Function
**File: `srv/service.js`**

Create new function (similar to `_updateProjectResourceCounts`):
```javascript
// ✅ NEW: Helper function to update demand resource counts (allocatedCount and remaining)
// This counts ONLY ACTIVE allocations for the demand and updates:
// - allocatedCount = count of ACTIVE allocations for this demand
// - remaining = quantity - allocatedCount
this._updateDemandResourceCounts = async function(iDemandId) {
    try {
        // Get demand details
        const oDemand = await SELECT.one.from(Demands).where({ demandId: iDemandId });
        if (!oDemand) {
            console.warn("⚠️ Demand not found for resource count update:", iDemandId);
            return;
        }

        // Get quantity from demand
        const iQuantity = oDemand.quantity || 0;

        // ✅ Count ONLY ACTIVE allocations for this demand
        const aAllocations = await SELECT.from(Allocations)
            .where({ demandId: iDemandId, status: 'Active' });
        const iAllocatedCount = aAllocations ? aAllocations.length : 0;

        // Calculate remaining
        const iRemaining = Math.max(0, iQuantity - iAllocatedCount);

        console.log(`🔄 Updating demand ${iDemandId} resource counts: Quantity=${iQuantity}, Current Allocated=${oDemand.allocatedCount || 0}, New Allocated=${iAllocatedCount}, Remaining=${iRemaining}`);

        // Update demand
        const oUpdateData = {
            allocatedCount: iAllocatedCount,
            remaining: iRemaining
        };
        
        const iUpdated = await UPDATE(Demands).where({ demandId: iDemandId }).with(oUpdateData);
        console.log(`✅ UPDATE executed for demand ${iDemandId}. Rows updated:`, iUpdated);
        
        // Verify the update
        const oUpdatedDemand = await SELECT.one.from(Demands).where({ demandId: iDemandId });
        if (oUpdatedDemand) {
            console.log(`✅ Verified update - Demand ${iDemandId} now has: quantity=${oUpdatedDemand.quantity}, allocatedCount=${oUpdatedDemand.allocatedCount}, remaining=${oUpdatedDemand.remaining}`);
        }
    } catch (oError) {
        console.error("❌ Error updating demand resource counts:", oError);
        throw oError;
    }
};
```

### Step 3: Update Allocation Hooks

**In `after('CREATE', Allocations)` hook:**
```javascript
// After updating project counts (existing code)...
if (sProjectId) {
    await this._updateProjectResourceCounts(sProjectId);
}

// ✅ NEW: Update demand resource counts
const iDemandId = oAllocationData.demandId;
if (iDemandId) {
    await this._updateDemandResourceCounts(iDemandId);
}
```

**In `after('UPDATE', Allocations)` hook:**
```javascript
// After updating project counts (existing code)...
if (sProjectId) {
    await this._updateProjectResourceCounts(sProjectId);
}

// ✅ NEW: Update demand resource counts (both old and new demand if changed)
const iOldDemandId = req._oldAllocation?.demandId || null;
const iNewDemandId = req.data.demandId || req.keys?.demandId || iOldDemandId;

if (iOldDemandId && iOldDemandId !== iNewDemandId) {
    // Demand changed - update old demand
    await this._updateDemandResourceCounts(iOldDemandId);
}
if (iNewDemandId) {
    // Update new demand
    await this._updateDemandResourceCounts(iNewDemandId);
}
```

**In `after('DELETE', Allocations)` hook:**
```javascript
// After updating project counts (existing code)...
if (sProjectId) {
    await this._updateProjectResourceCounts(sProjectId);
}

// ✅ NEW: Update demand resource counts
const iDemandId = req._deletedAllocation?.demandId || req.keys?.demandId || null;
if (iDemandId) {
    await this._updateDemandResourceCounts(iDemandId);
}
```

### Step 4: Frontend Changes

**Where allocations are created:**
1. **Employee-level allocation** (`onAllocateConfirm`)
2. **Find Resources allocation** (`onFindResourcesAllocate`)

**Need to:**
- Add `demandId` field to allocation creation data
- Determine which demand to link to (based on employee's skill/band matching demand's skill/band)
- Or allow user to select demand when creating allocation

**Example in `_createAllocationsForFindResources`:**
```javascript
const oAllocData = {
    allocationId: sAllocationId,
    employeeId: oEmployee.ohrId,
    projectId: sProjectId,
    demandId: iDemandId,  // ✅ NEW: Link to demand
    startDate: sStartDate,
    endDate: sEndDate,
    allocationPercentage: iPercentage,
    status: "Active"
};
```

## 📊 Logic Flow

### When Allocation is Created:
1. ✅ Update employee `empallocpercentage` (existing)
2. ✅ Update project `allocatedResources` and `toBeAllocated` (existing)
3. ✅ **NEW:** Update demand `allocatedCount` and `remaining`

### When Allocation is Updated:
1. ✅ Update employee `empallocpercentage` (existing)
2. ✅ Update project counts (existing)
3. ✅ **NEW:** Update demand counts (both old and new if demand changed)

### When Allocation is Deleted:
1. ✅ Update employee `empallocpercentage` (existing)
2. ✅ Update project counts (existing)
3. ✅ **NEW:** Update demand counts

## 🎯 Key Points:

1. **Same Pattern as Projects**: Demand counts follow the exact same pattern as project counts
2. **Only Active Allocations**: Count only `status='Active'` allocations (same as projects)
3. **Automatic Updates**: Demand counts update automatically when allocations change
4. **Demand Matching**: Need to determine which demand to link when creating allocation (skill/band matching)

## ❓ Questions to Resolve:

1. **How to determine `demandId` when creating allocation?**
   - Option A: Match employee's skill/band to demand's skill/band
   - Option B: User selects demand when creating allocation
   - Option C: Auto-select first matching demand for the project

2. **What if employee matches multiple demands?**
   - Option A: Create multiple allocations (one per demand)
   - Option B: Link to first matching demand
   - Option C: User selects which demand

3. **What if no matching demand exists?**
   - Option A: Allow allocation without demandId (nullable)
   - Option B: Require demand to exist before allocation
   - Option C: Auto-create demand

## ✅ Next Steps:

1. Confirm approach with user
2. Implement schema change (add `demandId` to Allocation)
3. Implement `_updateDemandResourceCounts()` function
4. Update allocation hooks to call demand update
5. Update frontend to pass `demandId` when creating allocations
6. Test end-to-end flow


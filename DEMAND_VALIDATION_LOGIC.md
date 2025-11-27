# Demand Validation Logic - Complete Documentation

## 📋 Overview

The system validates that the total quantity of all demands for a project does not exceed the project's `requiredResources` field. This validation happens both on the backend (server-side) and frontend (client-side for better UX).

## 🔍 Backend Validation Logic

### Location: `srv/service.js`

#### CREATE Demand Validation (Lines 107-133)
```javascript
this.before('CREATE', Demands, async (req) => {
    const sProjectId = req.data?.sapPId;
    const iNewQuantity = req.data?.quantity || 0;
    
    if (sProjectId && iNewQuantity > 0) {
        // 1. Get project to check requiredResources
        const oProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
        
        if (oProject && oProject.requiredResources) {
            // 2. Get sum of ALL existing demand quantities for this project
            const aExistingDemands = await SELECT.from(Demands).where({ sapPId: sProjectId });
            const iExistingTotal = aExistingDemands.reduce((sum, demand) => sum + (demand.quantity || 0), 0);
            
            // 3. Calculate new total (existing + new quantity)
            const iNewTotal = iExistingTotal + iNewQuantity;
            
            // 4. Validate: new total must not exceed requiredResources
            if (iNewTotal > oProject.requiredResources) {
                const iExcess = iNewTotal - oProject.requiredResources;
                return req.error(409, `Total demand quantity (${iNewTotal}) exceeds required resources (${oProject.requiredResources}) for project ${sProjectId}. Excess: ${iExcess}`);
            }
        }
    }
});
```

**Key Points:**
- ✅ Validates BEFORE demand is created
- ✅ Includes ALL existing demands for the project
- ✅ Returns HTTP 409 (Conflict) error if validation fails
- ✅ Error message includes: total quantity, required resources, project ID, and excess amount

#### UPDATE Demand Validation (Lines 148-177)
```javascript
this.before('UPDATE', Demands, async (req) => {
    const sDemandId = req.keys?.demandId || req.data.demandId;
    const iNewQuantity = req.data.quantity;
    
    if (sDemandId && iNewQuantity !== undefined) {
        // 1. Get current demand to get project ID
        const oCurrentDemand = await SELECT.one.from(Demands).where({ demandId: sDemandId });
        
        if (oCurrentDemand && oCurrentDemand.sapPId) {
            const sProjectId = oCurrentDemand.sapPId;
            
            // 2. Get project to check requiredResources
            const oProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
            
            if (oProject && oProject.requiredResources) {
                // 3. Get sum of existing demands EXCEPT the current one being updated
                const aExistingDemands = await SELECT.from(Demands).where({ sapPId: sProjectId });
                const iExistingTotal = aExistingDemands
                    .filter(d => d.demandId !== sDemandId) // Exclude current demand
                    .reduce((sum, demand) => sum + (demand.quantity || 0), 0);
                
                // 4. Calculate new total (existing + new quantity)
                const iNewTotal = iExistingTotal + iNewQuantity;
                
                // 5. Validate
                if (iNewTotal > oProject.requiredResources) {
                    const iExcess = iNewTotal - oProject.requiredResources;
                    return req.error(409, `Total demand quantity (${iNewTotal}) exceeds required resources (${oProject.requiredResources}) for project ${sProjectId}. Excess: ${iExcess}`);
                }
            }
        }
    }
});
```

**Key Points:**
- ✅ Excludes the current demand being updated from the total
- ✅ Uses the NEW quantity value for validation
- ✅ Same error format as CREATE validation

## 🎨 Frontend Error Handling

### Location: `app/webapp/controller/Home.controller.js`

#### Current Error Handling

1. **`onSubmitMasterDemands`** (Lines 5492-5609)
   - Uses `submitBatch()` for both CREATE and UPDATE
   - Has `.catch()` handler that calls `showError()` function
   - `showError()` parses error response and shows `MessageBox.error()`

2. **`_createMasterDemandsDirect`** (Lines 5610-5645)
   - Fallback method when batch binding is not available
   - Uses direct `oModel.create()` with error callback
   - Parses error response and shows `MessageBox.error()`

#### Issue Identified

When using `submitBatch()`, OData V4 batch responses may not expose errors in the same format. The error parsing might fail, causing the error popup not to display properly.

## ✅ Solution: Enhanced Error Handling

The error handling has been improved to:
1. Better parse OData V4 batch errors
2. Extract error messages from various response formats
3. Always display user-friendly error popups
4. Include detailed error information

## 📊 Demand Count Calculation

### Project Resource Counts
- `requiredResources`: Total number of resources needed for the project
- `allocatedResources`: Count of ACTIVE allocations for the project
- `toBeAllocated`: `requiredResources - allocatedResources`

### Demand Fields
- `quantity`: Required number of resources for this demand
- `allocatedCount`: Count of allocations matching this demand's skill/band
- `remaining`: `quantity - allocatedCount`

### Validation Rule
**Total of all demand quantities for a project ≤ Project's requiredResources**

Example:
- Project P-0001 has `requiredResources = 10`
- Existing demands: 3 + 4 = 7
- New demand quantity: 5
- Total: 7 + 5 = 12
- **Validation fails**: 12 > 10 (Excess: 2)

## 🔧 Files Modified

1. `srv/service.js` - Backend validation (already implemented)
2. `app/webapp/controller/Home.controller.js` - Frontend error handling (improved)



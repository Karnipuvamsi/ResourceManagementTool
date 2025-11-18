const cds = require('@sap/cds');
const { UPDATE } = cds.ql;

module.exports = cds.service.impl(async function () {
    const { Opportunities, Customers, Projects, Employees, Demands, Allocations } = this.entities;
    
    // ✅ CRITICAL: Module-level Map to store allocation data between before/after hooks
    // This is needed because req._allocationData doesn't persist in batch operations
    const mAllocationData = new Map();


    this.before('CREATE', Opportunities, async (req) => {
        // Get the highest existing numeric part of sapOpportunityId
        const result = await SELECT.one`max(sapOpportunityId)`.from(Opportunities);


        let nextId = 1;
        if (result && result.max) {
            const currentNum = parseInt(result.max.replace('O-', ''), 10);


            nextId = currentNum + 1;
        }

        // Format the new ID
        req.data.sapOpportunityId = `O-${String(nextId).padStart(4, '0')}`;

    });
    this.before('CREATE', Customers, async (req) => {
        // Get the highest existing numeric part of SAPcustId
        const result = await SELECT.one`max(SAPcustId)`.from(Customers);

        


        let nextId = 1;
        if (result && result.max) {
            const currentNum = parseInt(result.max.replace('C-', ''), 10);


            nextId = currentNum + 1;
        }

        // Format the new ID
        req.data.SAPcustId = `C-${String(nextId).padStart(4, '0')}`;

    });
    this.before('CREATE', Projects, async (req) => {
        // Get the highest existing numeric part of sapPId
        const result = await SELECT.one`max(sapPId)`.from(Projects);


        let nextId = 1;
        if (result && result.max) {
            const currentNum = parseInt(result.max.replace('P-', ''), 10);


            nextId = currentNum + 1;
        }

        // Format the new ID
        req.data.sapPId = `P-${String(nextId).padStart(4, '0')}`;

    });

    // ✅ NEW: Auto-generate Demand ID (Integer, sequential) and validate quantity
    this.before('CREATE', Demands, async (req) => {
        try {
            // Get the highest existing demandId
            // For integer fields, use SELECT with max() function
            // CAP's SELECT.one returns the result directly when using aggregate functions
            const result = await SELECT.one`max(demandId) as max`.from(Demands);

            let nextId = 1;
            if (result && result.max != null && result.max !== undefined) {
                // Ensure we get a number
                const iMaxId = typeof result.max === 'number' ? result.max : parseInt(String(result.max), 10);
                if (!isNaN(iMaxId) && iMaxId >= 0) {
                    nextId = iMaxId + 1;
                }
            }

            // Set the new ID (ensure it's a number, not string)
            req.data.demandId = nextId;
        } catch (oError) {
            // Fallback: try to get count and use that + 1
            try {
                const aAllDemands = await SELECT.from(Demands).columns('demandId');
                const iCount = aAllDemands.length;
                if (iCount > 0) {
                    const aIds = aAllDemands.map(d => d.demandId || 0).filter(id => typeof id === 'number' && !isNaN(id));
                    if (aIds.length > 0) {
                        req.data.demandId = Math.max(...aIds) + 1;
                    } else {
                        req.data.demandId = iCount + 1;
                    }
                } else {
                    req.data.demandId = 1;
                }
            } catch (oFallbackError) {
                // Last resort: use 1
                req.data.demandId = 1;
            }
        }

        // ✅ VALIDATION: Check that total demand quantities don't exceed requiredResources
        const sProjectId = req.data?.sapPId;
        const iNewQuantity = req.data?.quantity || 0;
        
        if (sProjectId && iNewQuantity > 0) {
            try {
                // Get project to check requiredResources
                const oProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
                if (oProject && oProject.requiredResources) {
                    // Get sum of all existing demand quantities for this project
                    const aExistingDemands = await SELECT.from(Demands).where({ sapPId: sProjectId });
                    const iExistingTotal = aExistingDemands.reduce((sum, demand) => sum + (demand.quantity || 0), 0);
                    
                    // Calculate new total (existing + new)
                    const iNewTotal = iExistingTotal + iNewQuantity;
                    
                    if (iNewTotal > oProject.requiredResources) {
                        const iExcess = iNewTotal - oProject.requiredResources;
                        return req.error(409, `Total demand quantity (${iNewTotal}) exceeds required resources (${oProject.requiredResources}) for project ${sProjectId}. Excess: ${iExcess}`);
                    }
                }
            } catch (oError) {
                // Don't block creation if validation fails due to error
            }
        }
    });

    // ✅ NEW: Update project resource counts when demand is created
    this.after('CREATE', Demands, async (req) => {
        try {
            const sProjectId = req.data.sapPId;
            if (sProjectId) {
                await this._updateProjectResourceCounts(sProjectId);
            }
        } catch (oError) {
        }
    });

    // ✅ VALIDATION: Check that total demand quantities don't exceed requiredResources (for UPDATE)
    this.before('UPDATE', Demands, async (req) => {
        const sDemandId = req.keys?.demandId || req.data.demandId;
        const iNewQuantity = req.data.quantity;
        
        if (sDemandId && iNewQuantity !== undefined) {
            // Get current demand to get project ID
            const oCurrentDemand = await SELECT.one.from(Demands).where({ demandId: sDemandId });
            if (oCurrentDemand && oCurrentDemand.sapPId) {
                const sProjectId = oCurrentDemand.sapPId;
                
                // Get project to check requiredResources
                const oProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
                if (oProject && oProject.requiredResources) {
                    // Get sum of all existing demand quantities EXCEPT the current one being updated
                    const aExistingDemands = await SELECT.from(Demands).where({ sapPId: sProjectId });
                    const iExistingTotal = aExistingDemands
                        .filter(d => d.demandId !== sDemandId) // Exclude current demand
                        .reduce((sum, demand) => sum + (demand.quantity || 0), 0);
                    
                    // Calculate new total (existing + new quantity)
                    const iNewTotal = iExistingTotal + iNewQuantity;
                    
                    if (iNewTotal > oProject.requiredResources) {
                        const iExcess = iNewTotal - oProject.requiredResources;
                        return req.error(409, `Total demand quantity (${iNewTotal}) exceeds required resources (${oProject.requiredResources}) for project ${sProjectId}. Excess: ${iExcess}`);
                    }
                }
            }
        }
    });

    // ✅ NEW: Update project resource counts when demand is updated
    this.after('UPDATE', Demands, async (req) => {
        try {
            // Get project ID from updated data or from current demand
            let sProjectId = req.data.sapPId;
            if (!sProjectId) {
                const sDemandId = req.keys?.demandId || req.data.demandId;
                if (sDemandId) {
                    const oCurrentDemand = await SELECT.one.from(Demands).where({ demandId: sDemandId });
                    if (oCurrentDemand) {
                        sProjectId = oCurrentDemand.sapPId;
                    }
                }
            }
            
            if (sProjectId) {
                await this._updateProjectResourceCounts(sProjectId);
            }
        } catch (oError) {
        }
    });

    // ✅ NEW: Store project ID before demand deletion
    this.before('DELETE', Demands, async (req) => {
        try {
            const sDemandId = req.keys?.demandId;
            if (sDemandId) {
                const oDemand = await SELECT.one.from(Demands).where({ demandId: sDemandId });
                if (oDemand && oDemand.sapPId) {
                    // Store project ID in request for use in after hook
                    req._deletedDemandProjectId = oDemand.sapPId;
                }
            }
        } catch (oError) {
        }
    });

    // ✅ NEW: Update project resource counts when demand is deleted
    this.after('DELETE', Demands, async (req) => {
        try {
            // Get project ID stored in before hook
            const sProjectId = req._deletedDemandProjectId;
            if (sProjectId) {
                await this._updateProjectResourceCounts(sProjectId);
            }
        } catch (oError) {
        }
    });

    // ✅ NEW: Set allocationDate and auto-fill startDate/endDate from project when allocation is created
    // ✅ Also validate allocation percentage doesn't exceed 100% total for employee
    this.before('CREATE', Allocations, async (req) => {
        // ✅ Set default status to 'Active' if not provided
        if (!req.data.status) {
            req.data.status = 'Active';
        }
        
        // Set allocationDate to current date if not provided
        if (!req.data.allocationDate) {
            req.data.allocationDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        }
        
        // ✅ NEW: Validate demandId - if not provided, try to auto-assign from project's first demand
        if (!req.data.demandId && req.data.demandId !== 0) {
            if (req.data.projectId) {
                try {
                    // Try to get first demand for the project
                    const aDemands = await SELECT.from(Demands).where({ sapPId: req.data.projectId }).limit(1);
                    if (aDemands && aDemands.length > 0) {
                        req.data.demandId = aDemands[0].demandId;
                    } else {
                        req.reject(400, `demandId is required. Project ${req.data.projectId} has no demands. Please create a demand first.`);
                        return;
                    }
                } catch (oError) {
                    req.reject(400, "demandId is required. Employee must be allocated to a specific demand.");
                    return;
                }
            } else {
                req.reject(400, "demandId is required. Employee must be allocated to a specific demand.");
                return;
            }
        }
        
        // ✅ NEW: Validate employee cannot be allocated to same project twice (regardless of demand)
        // This prevents: Same employee → Same project (even with different demands)
        // This allows: Same employee → Different projects (based on available percentage)
        if (req.data.employeeId && req.data.projectId) {
            try {
                const sEmployeeId = req.data.employeeId;
                const sProjectId = req.data.projectId;
                
                // Check if employee already has an active allocation to this project (any demand)
                const oExistingAllocation = await SELECT.one.from(Allocations)
                    .where({ 
                        employeeId: sEmployeeId, 
                        projectId: sProjectId, 
                        status: 'Active'
                    });
                
                if (oExistingAllocation) {
                    const sErrorMessage = `Employee ${sEmployeeId} is already allocated to project ${sProjectId}. An employee can only be allocated to a project once.`;
                    req.reject(400, sErrorMessage);
                    return;
                }
                
            } catch (oError) {
                req.reject(500, `Error validating allocation: ${oError.message}`);
                return;
            }
        }
        
        // ✅ Set default allocationPercentage to 100 if not provided
        // ✅ CRITICAL: Log the incoming value to debug
        
        if (req.data.allocationPercentage === undefined || req.data.allocationPercentage === null || req.data.allocationPercentage === "") {
            req.data.allocationPercentage = 100;
        } else {
            // ✅ Parse the value - handle string, number, or other types
            let iPercentage;
            if (typeof req.data.allocationPercentage === 'number') {
                iPercentage = req.data.allocationPercentage;
            } else if (typeof req.data.allocationPercentage === 'string') {
                const sTrimmed = req.data.allocationPercentage.trim();
                if (sTrimmed === "") {
                    iPercentage = 100; // Default if empty string
                } else {
                    iPercentage = parseInt(sTrimmed, 10);
                    if (isNaN(iPercentage)) {
                        req.reject(400, `Allocation percentage must be a number. Provided: "${req.data.allocationPercentage}"`);
                        return;
                    }
                }
            } else {
                // Try to convert to number
                iPercentage = parseInt(req.data.allocationPercentage, 10);
                if (isNaN(iPercentage)) {
                    req.reject(400, `Allocation percentage must be a number. Provided: ${req.data.allocationPercentage} (type: ${typeof req.data.allocationPercentage})`);
                    return;
                }
            }
            
            // ✅ Validate range (0-100) - NOTE: 0 is valid!
            if (iPercentage < 0 || iPercentage > 100) {
                req.reject(400, `Allocation percentage must be between 0 and 100. Provided: ${req.data.allocationPercentage} (parsed: ${iPercentage})`);
                return;
            }
            
            req.data.allocationPercentage = iPercentage;
        }
        
        // ✅ Validate total allocation percentage for employee doesn't exceed 100%
        // ✅ NEW APPROACH: Use empallocpercentage field instead of querying all allocations
        if (req.data.employeeId) {
            try {
                const sEmployeeId = req.data.employeeId;
                const iNewPercentage = req.data.allocationPercentage || 100;
                
                // ✅ Get employee's current allocation percentage from field
                const oEmployee = await SELECT.one.from(Employees).where({ ohrId: sEmployeeId });
                if (!oEmployee) {
                    req.reject(400, `Employee ${sEmployeeId} not found`);
                    return;
                }
                
                // Get current percentage from field (default to 0 if null/undefined)
                const iCurrentTotal = oEmployee.empallocpercentage || 0;
                const iNewTotal = iCurrentTotal + iNewPercentage;
                
                
                if (iNewTotal > 100) {
                    const sErrorMessage = `Cannot create allocation: Total allocation percentage (${iNewTotal}%) would exceed 100% for employee ${sEmployeeId}. Current allocation: ${iCurrentTotal}%, New allocation: ${iNewPercentage}%`;
                    req.reject(400, sErrorMessage);
                    return;
                }
                
            } catch (oError) {
                req.reject(500, `Error validating allocation percentage: ${oError.message}`);
                return;
            }
        }
        
        // ✅ CRITICAL: Store allocation data for use in after hook (batch operations don't have req.data in after hook)
        // Store in both req._allocationData (for single operations) and module-level Map (for batch operations)
        const oAllocationData = {
            employeeId: req.data.employeeId,
            projectId: req.data.projectId,
            demandId: req.data.demandId, // ✅ NEW: Store demandId
            allocationPercentage: req.data.allocationPercentage || 100,
            status: req.data.status || 'Active',
            allocationId: req.data.allocationId // May be undefined if not provided
        };
        req._allocationData = oAllocationData;
        
        // ✅ Also store in module-level Map using allocationId as key (if available) or employeeId+projectId
        const sMapKey = oAllocationData.allocationId || `${oAllocationData.employeeId}_${oAllocationData.projectId}_${Date.now()}`;
        mAllocationData.set(sMapKey, oAllocationData);
        
        // ✅ Clean up old entries (keep only last 100 entries to prevent memory leak)
        if (mAllocationData.size > 100) {
            const aKeys = Array.from(mAllocationData.keys());
            aKeys.slice(0, aKeys.length - 100).forEach(sKey => mAllocationData.delete(sKey));
        }
        
        // ✅ NEW: Validate allocation dates against project dates and auto-fill if needed
        // ✅ Also validate that allocatedResources + 1 ≤ requiredResources
        if (req.data.projectId) {
            try {
                const oProject = await SELECT.one.from(Projects).where({ sapPId: req.data.projectId });
                if (!oProject) {
                    req.reject(400, `Project ${req.data.projectId} not found`);
                    return;
                }

                // ✅ NEW: Validate allocatedResources + 1 ≤ requiredResources
                const iRequiredResources = oProject.requiredResources || 0;
                const iCurrentAllocated = oProject.allocatedResources || 0;
                const iNewAllocated = iCurrentAllocated + 1;

                if (iNewAllocated > iRequiredResources) {
                    const sErrorMessage = `Cannot create allocation: Allocated resources (${iNewAllocated}) would exceed required resources (${iRequiredResources}) for project ${req.data.projectId}. Current allocated: ${iCurrentAllocated}`;
                    req.reject(400, sErrorMessage);
                    return;
                }

                
                // Auto-fill dates from project if not provided
                const bNeedsStartDate = !req.data.startDate || req.data.startDate === "" || req.data.startDate.trim() === "";
                const bNeedsEndDate = !req.data.endDate || req.data.endDate === "" || req.data.endDate.trim() === "";
                
                if (bNeedsStartDate && oProject.startDate) {
                    req.data.startDate = oProject.startDate;
                }
                if (bNeedsEndDate && oProject.endDate) {
                    req.data.endDate = oProject.endDate;
                }
                
                // ✅ CRITICAL: Validate allocation dates are within project date range
                if (req.data.startDate && oProject.startDate) {
                    const oAllocStart = new Date(req.data.startDate);
                    const oProjStart = new Date(oProject.startDate);
                    if (oAllocStart < oProjStart) {
                        req.reject(400, `Allocation start date (${req.data.startDate}) cannot be earlier than project start date (${oProject.startDate})`);
                        return;
                    }
                }
                
                if (req.data.endDate && oProject.endDate) {
                    const oAllocEnd = new Date(req.data.endDate);
                    const oProjEnd = new Date(oProject.endDate);
                    if (oAllocEnd > oProjEnd) {
                        req.reject(400, `Allocation end date (${req.data.endDate}) cannot be later than project end date (${oProject.endDate})`);
                        return;
                    }
                }
                
                // Validate start <= end
                if (req.data.startDate && req.data.endDate) {
                    const oStart = new Date(req.data.startDate);
                    const oEnd = new Date(req.data.endDate);
                    if (oStart > oEnd) {
                        req.reject(400, "Allocation start date cannot be later than end date");
                        return;
                    }
                }
            } catch (oError) {
                req.reject(500, `Error validating allocation dates: ${oError.message}`);
                return;
            }
        }
    });

    // ✅ NEW: Update employee statuses after allocation is created
    this.after('CREATE', Allocations, async (req) => {
        try {
            
            // ✅ CRITICAL: In batch operations, req.data/req.result/req.keys are often undefined
            // We need to fetch the allocation from the database using the keys
            let oAllocationData = null;
            
            // ✅ METHOD 1: Try to get from module-level Map using allocationId from keys
            if (req.keys && req.keys.allocationId) {
                const sMapKey = req.keys.allocationId;
                oAllocationData = mAllocationData.get(sMapKey);
                if (oAllocationData) {
                    // Clean up - remove from Map after use
                    mAllocationData.delete(sMapKey);
                }
            }
            
            // ✅ METHOD 2: Try to get from req._allocationData (for single operations)
            if (!oAllocationData && req._allocationData) {
                oAllocationData = req._allocationData;
            }
            
            // ✅ METHOD 3: Try to fetch from database using allocationId from keys
            if (!oAllocationData && req.keys && req.keys.allocationId) {
                try {
                    oAllocationData = await SELECT.one.from(Allocations).where({ allocationId: req.keys.allocationId });
                    if (oAllocationData) {
                    }
                } catch (oFetchError) {
                }
            }
            
            // ✅ METHOD 4: Try req.data, req.result, or req.keys directly
            if (!oAllocationData) {
                oAllocationData = req.data || req.result || req.keys;
                if (oAllocationData) {
                }
            }
            
            // ✅ METHOD 5: Last resort - search module-level Map for matching employeeId+projectId
            if (!oAllocationData) {
                // Try to find in Map by searching all entries (should be recent)
                for (const [sKey, oStoredData] of mAllocationData.entries()) {
                    // Check if this entry matches (we'll use the most recent one)
                    oAllocationData = oStoredData;
                    mAllocationData.delete(sKey); // Clean up
                    break;
                }
            }
            
            if (!oAllocationData) {
                return;
            }
            
            const sProjectId = oAllocationData.projectId;
            const sEmployeeId = oAllocationData.employeeId;
            const sAllocationStatus = oAllocationData.status || 'Active';
            const iAllocationPercentage = oAllocationData.allocationPercentage || 100;

            
            // ✅ Validate we have required data
            if (!sEmployeeId) {
                return;
            }

            // ✅ NEW: Update employee's allocation percentage field (regardless of status)
            if (sEmployeeId && iAllocationPercentage > 0) {
                try {
                    const oEmployee = await SELECT.one.from(Employees).where({ ohrId: sEmployeeId });
                    if (oEmployee) {
                        const iCurrentPercentage = oEmployee.empallocpercentage || 0;
                        const iNewPercentage = iCurrentPercentage + iAllocationPercentage;
                        
                        // ✅ Use UPDATE from cds.ql for proper UPDATE operation
                        // Use cds.run() to ensure proper execution
                        await cds.run(UPDATE(Employees)
                            .where({ ohrId: sEmployeeId })
                            .with({ empallocpercentage: iNewPercentage }));
                        
                    } else {
                    }
                } catch (oPercentError) {
                    // Don't throw - continue with other updates
                }
            }

            // ✅ CRITICAL: Update project resource counts
            if (sProjectId) {
                try {
                    await this._updateProjectResourceCounts(sProjectId);
                } catch (oUpdateError) {
                    // Don't throw - continue with other updates
                }
            } else {
            }

            // ✅ NEW: Update demand resource counts
            const iDemandId = oAllocationData.demandId ? parseInt(oAllocationData.demandId, 10) : null;
            if (iDemandId && !isNaN(iDemandId)) {
                try {
                    await this._updateDemandResourceCounts(iDemandId);
                } catch (oUpdateError) {
                    // Don't throw - continue with other updates
                }
            } else {
            }

            if (sProjectId) {
                await this._updateEmployeeStatusesForProject(sProjectId);
            }
            // ✅ Also update the specific employee's status (handles multiple allocations)
            if (sEmployeeId) {
                await this._updateEmployeeStatus(sEmployeeId);
            }
        } catch (oError) {
        }
    });

    // ✅ NEW: Validate allocation update (if projectId changes, validate new project)
    // ✅ Also validate allocation percentage if it's being updated
    // ✅ Also validate if employeeId changes (need to check percentage for new employee)
    // ✅ Also store old allocation data for percentage calculation in after hook
    this.before('UPDATE', Allocations, async (req) => {
        // ✅ Store old allocation data first (needed for percentage calculation in after hook)
        try {
            const sAllocationId = req.keys?.allocationId || req.data.allocationId;
            if (sAllocationId) {
                const oOldAllocation = await SELECT.one.from(Allocations).where({ allocationId: sAllocationId });
                if (oOldAllocation) {
                    req._oldAllocation = {
                        employeeId: oOldAllocation.employeeId,
                        projectId: oOldAllocation.projectId,
                        demandId: oOldAllocation.demandId, // ✅ NEW: Store demandId
                        allocationPercentage: oOldAllocation.allocationPercentage || 0,
                        status: oOldAllocation.status || 'Active'
                    };
                }
            }
        } catch (oError) {
            // Don't throw - continue with validation
        }
        
        // ✅ Get employeeId (could be changing or staying the same)
        const sEmployeeId = req.data.employeeId || req.keys?.employeeId;
        const bEmployeeIdChanged = req.data.employeeId !== undefined && req.data.employeeId !== req.keys?.employeeId;
        
        // ✅ If employeeId is changing, we need to validate percentage for the new employee
        if (bEmployeeIdChanged && req.data.employeeId) {
            try {
                const sNewEmployeeId = req.data.employeeId;
                // Use stored old allocation data
                const iAllocationPercentage = req.data.allocationPercentage !== undefined 
                    ? parseInt(req.data.allocationPercentage, 10) 
                    : (req._oldAllocation?.allocationPercentage || 100);
                
                // ✅ NEW APPROACH: Use empallocpercentage field for new employee
                const oNewEmployee = await SELECT.one.from(Employees).where({ ohrId: sNewEmployeeId });
                if (!oNewEmployee) {
                    req.reject(400, `Employee ${sNewEmployeeId} not found`);
                    return;
                }
                
                // Get new employee's current percentage (excluding this allocation if it was already assigned to them)
                let iNewEmployeeTotal = oNewEmployee.empallocpercentage || 0;
                
                // If allocation was already assigned to this employee and was Active, subtract it first
                if (req._oldAllocation && req._oldAllocation.employeeId === sNewEmployeeId && req._oldAllocation.status === 'Active') {
                    iNewEmployeeTotal = Math.max(0, iNewEmployeeTotal - (req._oldAllocation.allocationPercentage || 0));
                }
                
                const iNewTotal = iNewEmployeeTotal + iAllocationPercentage;
                
                
                if (iNewTotal > 100) {
                    const sErrorMessage = `Cannot move allocation: Total allocation percentage (${iNewTotal}%) would exceed 100% for employee ${sNewEmployeeId}. Current allocation: ${iNewEmployeeTotal}%, This allocation: ${iAllocationPercentage}%`;
                    req.reject(400, sErrorMessage);
                    return;
                }
            } catch (oError) {
                req.reject(500, `Error validating allocation percentage: ${oError.message}`);
                return;
            }
        }
        
        // ✅ Validate allocation percentage if being updated
        if (req.data.allocationPercentage !== undefined && sEmployeeId) {
            try {
                if (!sEmployeeId) {
                } else {
                    // Handle empty/null values - default to 100
                    let iNewPercentage;
                    if (req.data.allocationPercentage === null || req.data.allocationPercentage === "") {
                        iNewPercentage = 100;
                        req.data.allocationPercentage = 100;
                    } else {
                        iNewPercentage = parseInt(req.data.allocationPercentage, 10);
                        if (isNaN(iNewPercentage) || iNewPercentage < 0 || iNewPercentage > 100) {
                            req.reject(400, `Allocation percentage must be between 0 and 100. Provided: ${req.data.allocationPercentage}`);
                            return;
                        }
                        req.data.allocationPercentage = iNewPercentage;
                    }
                    
                    // ✅ NEW APPROACH: Use empallocpercentage field and stored old allocation data
                    const oEmployee = await SELECT.one.from(Employees).where({ ohrId: sEmployeeId });
                    if (!oEmployee) {
                        req.reject(400, `Employee ${sEmployeeId} not found`);
                        return;
                    }
                    
                    // Use stored old allocation data
                    const iCurrentPercentage = req._oldAllocation?.allocationPercentage || 0;
                    
                    // Calculate: current employee total - old allocation percentage + new allocation percentage
                    let iEmployeeTotal = oEmployee.empallocpercentage || 0;
                    
                    // If old allocation was Active, subtract its percentage
                    if (req._oldAllocation && req._oldAllocation.status === 'Active') {
                        iEmployeeTotal = Math.max(0, iEmployeeTotal - iCurrentPercentage);
                    }
                    
                    const iNewTotal = iEmployeeTotal + iNewPercentage;
                    
                    
                    if (iNewTotal > 100) {
                        const sErrorMessage = `Cannot update allocation: Total allocation percentage (${iNewTotal}%) would exceed 100% for employee ${sEmployeeId}. Current total: ${iEmployeeTotal}%, Updated allocation: ${iNewPercentage}%`;
                        req.reject(400, sErrorMessage);
                        return;
                    }
                    
                }
            } catch (oError) {
                req.reject(500, `Error validating allocation percentage: ${oError.message}`);
                return;
            }
        }
        
        // If projectId is being changed, validate the new project
        if (req.data.projectId !== undefined) {
            try {
                const sNewProjectId = req.data.projectId;
                const sOldProjectId = req.keys?.projectId || null;

                // Only validate if project is actually changing
                if (sOldProjectId && sNewProjectId === sOldProjectId) {
                    return; // No change, skip validation
                }

                // Get new project details
                const oNewProject = await SELECT.one.from(Projects).where({ sapPId: sNewProjectId });
                if (!oNewProject) {
                    req.reject(400, `Project ${sNewProjectId} not found`);
                    return;
                }

                // ✅ Validate that allocatedResources + 1 ≤ requiredResources for new project
                const iRequiredResources = oNewProject.requiredResources || 0;
                const iCurrentAllocated = oNewProject.allocatedResources || 0;
                const iNewAllocated = iCurrentAllocated + 1;

                if (iNewAllocated > iRequiredResources) {
                    const sErrorMessage = `Cannot move allocation: Allocated resources (${iNewAllocated}) would exceed required resources (${iRequiredResources}) for project ${sNewProjectId}. Current allocated: ${iCurrentAllocated}`;
                    req.reject(400, sErrorMessage);
                    return;
                }

            } catch (oError) {
                req.reject(500, `Error validating allocation update: ${oError.message}`);
                return;
            }
        }
    });

    // ✅ NEW: Update employee statuses when allocation is updated (e.g., status changed to Completed/Cancelled)
    this.after('UPDATE', Allocations, async (req) => {
        try {
            const sEmployeeId = req.data.employeeId || req.keys?.employeeId || null;
            const sOldEmployeeId = req._oldAllocation?.employeeId || req.keys?.employeeId || null;
            const sOldProjectId = req.keys?.projectId || null;
            const sNewProjectId = req.data.projectId || req.keys?.projectId || null;
            const sAllocationId = req.keys?.allocationId || req.data.allocationId;
            
            // ✅ Get old and new values from stored data and request
            const iOldPercentage = req._oldAllocation?.allocationPercentage || 0;
            const sOldStatus = req._oldAllocation?.status || 'Active';
            const iNewPercentage = req.data.allocationPercentage !== undefined ? parseInt(req.data.allocationPercentage, 10) : iOldPercentage;
            const sNewStatus = req.data.status || sOldStatus;
            const bEmployeeIdChanged = sOldEmployeeId && sEmployeeId && sOldEmployeeId !== sEmployeeId;

            // ✅ NEW: Update employee allocation percentage field (regardless of status)
            if (sOldEmployeeId || sEmployeeId) {
                try {
                    // If employee changed, update both old and new employees
                    if (bEmployeeIdChanged) {
                        // Update old employee: subtract old allocation percentage
                        if (sOldEmployeeId && iOldPercentage > 0) {
                            const oOldEmployee = await SELECT.one.from(Employees).where({ ohrId: sOldEmployeeId });
                            if (oOldEmployee) {
                                const iOldEmpTotal = oOldEmployee.empallocpercentage || 0;
                                const iNewOldEmpTotal = Math.max(0, iOldEmpTotal - iOldPercentage);
                                await UPDATE(Employees)
                                    .where({ ohrId: sOldEmployeeId })
                                    .with({ empallocpercentage: iNewOldEmpTotal });
                            }
                        }
                        
                        // Update new employee: add new allocation percentage
                        if (sEmployeeId && iNewPercentage > 0) {
                            const oNewEmployee = await SELECT.one.from(Employees).where({ ohrId: sEmployeeId });
                            if (oNewEmployee) {
                                const iNewEmpTotal = oNewEmployee.empallocpercentage || 0;
                                const iNewNewEmpTotal = iNewEmpTotal + iNewPercentage;
                                await UPDATE(Employees)
                                    .where({ ohrId: sEmployeeId })
                                    .with({ empallocpercentage: iNewNewEmpTotal });
                            }
                        }
                    } else if (sEmployeeId) {
                        // Same employee - adjust percentage based on old vs new (regardless of status)
                        const oEmployee = await SELECT.one.from(Employees).where({ ohrId: sEmployeeId });
                        if (oEmployee) {
                            let iEmployeeTotal = oEmployee.empallocpercentage || 0;
                            
                            // Subtract old percentage and add new percentage
                            iEmployeeTotal = Math.max(0, iEmployeeTotal - iOldPercentage);
                            iEmployeeTotal = iEmployeeTotal + iNewPercentage;
                            
                            await UPDATE(Employees)
                                .where({ ohrId: sEmployeeId })
                                .with({ empallocpercentage: iEmployeeTotal });
                            
                        }
                    }
                } catch (oPercentError) {
                    // Don't throw - continue with other updates
                }
            }

            // ✅ Update project resource counts if projectId changed
            if (sOldProjectId && sNewProjectId && sOldProjectId !== sNewProjectId) {
                // Project changed - update both old and new projects
                await this._updateProjectResourceCounts(sOldProjectId);
                await this._updateProjectResourceCounts(sNewProjectId);
            } else if (sNewProjectId) {
                // Same project or new allocation - update project counts
                await this._updateProjectResourceCounts(sNewProjectId);
            }

            // ✅ NEW: Update demand resource counts if demandId changed
            const iOldDemandId = req._oldAllocation?.demandId ? parseInt(req._oldAllocation.demandId, 10) : null;
            const iNewDemandIdRaw = req.data.demandId || req.keys?.demandId || req._oldAllocation?.demandId || null;
            const iNewDemandId = iNewDemandIdRaw ? parseInt(iNewDemandIdRaw, 10) : null;
            
            if (iOldDemandId && iNewDemandId && !isNaN(iOldDemandId) && !isNaN(iNewDemandId) && iOldDemandId !== iNewDemandId) {
                // Demand changed - update both old and new demands
                try {
                    await this._updateDemandResourceCounts(iOldDemandId);
                    await this._updateDemandResourceCounts(iNewDemandId);
                } catch (oUpdateError) {
                }
            } else if (iNewDemandId && !isNaN(iNewDemandId)) {
                // Same demand or new allocation - update demand counts
                try {
                    await this._updateDemandResourceCounts(iNewDemandId);
                } catch (oUpdateError) {
                }
            }

            // ✅ If allocation status changed to Completed or Cancelled, update employee status
            if (sEmployeeId && (req.data.status === 'Completed' || req.data.status === 'Cancelled')) {
                await this._updateEmployeeStatus(sEmployeeId);
            } else if (sEmployeeId && req.data.status === 'Active') {
                // ✅ If allocation was reactivated, also update status
                if (sNewProjectId) {
                    await this._updateEmployeeStatusesForProject(sNewProjectId);
                }
                await this._updateEmployeeStatus(sEmployeeId);
            }
        } catch (oError) {
        }
    });

    // ✅ NEW: Store allocation data before deletion (needed for percentage update)
    this.before('DELETE', Allocations, async (req) => {
        try {
            const sAllocationId = req.keys?.allocationId;
            if (sAllocationId) {
                // Store allocation data in request context for use in after hook
                const oAllocation = await SELECT.one.from(Allocations).where({ allocationId: sAllocationId });
                if (oAllocation) {
                    req._deletedAllocation = {
                        employeeId: oAllocation.employeeId,
                        projectId: oAllocation.projectId,
                        demandId: oAllocation.demandId, // ✅ NEW: Store demandId
                        allocationPercentage: oAllocation.allocationPercentage || 0,
                        status: oAllocation.status || 'Active'
                    };
                }
            }
        } catch (oError) {
            // Don't throw - continue with deletion
        }
    });

    // ✅ NEW: Update employee statuses when allocation is deleted
    this.after('DELETE', Allocations, async (req) => {
        try {
            const sEmployeeId = req._deletedAllocation?.employeeId || req.keys?.employeeId || null;
            const sProjectId = req.keys?.projectId || null;
            const iDeletedPercentage = req._deletedAllocation?.allocationPercentage || 0;
            const sDeletedStatus = req._deletedAllocation?.status || 'Active';

            // ✅ NEW: Update employee allocation percentage field (regardless of status)
            if (sEmployeeId && iDeletedPercentage > 0) {
                try {
                    const oEmployee = await SELECT.one.from(Employees).where({ ohrId: sEmployeeId });
                    if (oEmployee) {
                        const iCurrentPercentage = oEmployee.empallocpercentage || 0;
                        const iNewPercentage = Math.max(0, iCurrentPercentage - iDeletedPercentage);
                        
                        await UPDATE(Employees)
                            .where({ ohrId: sEmployeeId })
                            .with({ empallocpercentage: iNewPercentage });
                        
                    }
                } catch (oPercentError) {
                    // Don't throw - continue with other updates
                }
            }

            // ✅ Update project resource counts
            if (sProjectId) {
                await this._updateProjectResourceCounts(sProjectId);
            }

            // ✅ NEW: Update demand resource counts
            const iDemandIdRaw = req._deletedAllocation?.demandId || req.keys?.demandId || null;
            const iDemandId = iDemandIdRaw ? parseInt(iDemandIdRaw, 10) : null;
            if (iDemandId && !isNaN(iDemandId)) {
                try {
                    await this._updateDemandResourceCounts(iDemandId);
                } catch (oUpdateError) {
                }
            }

            if (sEmployeeId) {
                await this._updateEmployeeStatus(sEmployeeId);
            }
        } catch (oError) {
        }
    });

    // ✅ NEW: Validate project update (if requiredResources is updated, ensure ≥ allocatedResources)
    // ✅ Note: requiredResources is now calculated dynamically from demands
    // ✅ If user tries to manually update requiredResources, it will be recalculated from demands in the after hook
    this.before('UPDATE', Projects, async (req) => {
        // If requiredResources is being manually updated, warn that it will be recalculated
        if (req.data.requiredResources !== undefined) {
            const sProjectId = req.data.sapPId || req.keys?.sapPId;
        }
    });

    // ✅ NEW: Update employee statuses when project is updated
    // This handles cases where:
    // 1. Project status changed to "Closed" → Mark all allocations as Completed
    // 2. sfdcPId is added/changed
    // 3. Project start date is updated
    // 4. requiredResources is updated (recalculate toBeAllocated)
    // 5. Any other project update that might affect employee statuses
    this.after('UPDATE', Projects, async (req) => {
        try {
            // Get project ID from the key in the request
            const sProjectId = req.data.sapPId || req.keys?.sapPId || null;
            if (!sProjectId) return;
            
            // ✅ Check if project status was changed to "Closed" (Case 8)
            if (req.data.status === 'Closed') {
                const oCurrentProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
                
                // Only process if project was not already closed
                if (oCurrentProject && oCurrentProject.status === 'Closed') {
                    
                    // Mark all active allocations to this project as Completed
                    const aProjectAllocations = await SELECT.from(Allocations)
                        .where({ projectId: sProjectId, status: 'Active' });
                    
                    const aAffectedEmployees = new Set();
                    
                    if (aProjectAllocations && aProjectAllocations.length > 0) {
                        for (const oAllocation of aProjectAllocations) {
                            await UPDATE(Allocations)
                                .where({ allocationId: oAllocation.allocationId })
                                .with({ status: 'Completed' });
                            
                            if (oAllocation.employeeId) {
                                aAffectedEmployees.add(oAllocation.employeeId);
                            }
                        }
                        
                    }
                    
                    // Update employee statuses
                    for (const sEmployeeId of aAffectedEmployees) {
                        try {
                            await this._updateEmployeeStatus(sEmployeeId);
                        } catch (oError) {
                        }
                    }
                    
                    // Update project resource counts
                    await this._updateProjectResourceCounts(sProjectId);
                }
            }
            
            // ✅ Check if sfdcPId was updated
            const bSfdcPIdUpdated = req.data.sfdcPId !== undefined;
            
            // ✅ Check if project start date was updated
            const bStartDateUpdated = req.data.startDate !== undefined;
            
            // ✅ Always recalculate project resource counts on any project update
            // This ensures requiredResources is always calculated from demands
            await this._updateProjectResourceCounts(sProjectId);
            
            // ✅ Update employee statuses if relevant fields were updated
            if (bSfdcPIdUpdated || bStartDateUpdated) {
                if (bSfdcPIdUpdated) {
                }
                if (bStartDateUpdated) {
                }
                await this._updateEmployeeStatusesForProject(sProjectId);
            }
        } catch (oError) {
        }
    });

    // ✅ UPDATED: Calculate allocatedCount and remaining for Demands when reading
    // Now uses demandId from allocations instead of skill matching
    this.on('READ', Demands, async (req, next) => {
        try {
            // Execute the default read (gets values from database)
            const aDemands = await next();
            
            // ✅ NEW: Recalculate counts from actual allocations using demandId
            // This ensures counts are always accurate even if database values are stale
            if (Array.isArray(aDemands) && aDemands.length > 0) {
                for (const oDemand of aDemands) {
                    if (oDemand.demandId) {
                        const iDemandIdInt = parseInt(oDemand.demandId, 10);
                        if (!isNaN(iDemandIdInt)) {
                            // Count active allocations for this demandId
                            const aAllocations = await SELECT.from(Allocations)
                                .where({ demandId: iDemandIdInt, status: 'Active' });
                            const iAllocatedCount = aAllocations ? aAllocations.length : 0;
                            const iQuantity = oDemand.quantity || 0;
                            const iRemaining = Math.max(0, iQuantity - iAllocatedCount);
                            
                            oDemand.allocatedCount = iAllocatedCount;
                            oDemand.remaining = iRemaining;
                        }
                    }
                }
            } else if (aDemands && aDemands.demandId) {
                // Single demand result
                const oDemand = aDemands;
                const iDemandIdInt = parseInt(oDemand.demandId, 10);
                if (!isNaN(iDemandIdInt)) {
                    // Count active allocations for this demandId
                    const aAllocations = await SELECT.from(Allocations)
                        .where({ demandId: iDemandIdInt, status: 'Active' });
                    const iAllocatedCount = aAllocations ? aAllocations.length : 0;
                    const iQuantity = oDemand.quantity || 0;
                    const iRemaining = Math.max(0, iQuantity - iAllocatedCount);
                    
                    oDemand.allocatedCount = iAllocatedCount;
                    oDemand.remaining = iRemaining;
                }
            }
            
            return aDemands;
        } catch (oError) {
            // Return the original result even if calculation fails
            return await next();
        }
    });

    // ✅ NEW: Helper function to calculate allocatedCount for a demand
    // This counts allocations where:
    // 1. Allocation is for the same project (sapPId)
    // 2. Employee has the matching skill
    this._calculateDemandAllocatedCount = async function(sProjectId, sDemandSkill) {
        try {
            // Get all active allocations for this project
            const aAllocations = await SELECT.from(Allocations)
                .where({ projectId: sProjectId, status: 'Active' });
            
            if (!aAllocations || aAllocations.length === 0) {
                return 0;
            }

            let iCount = 0;
            
            // For each allocation, check if the employee has the matching skill
            for (const oAllocation of aAllocations) {
                const sEmployeeId = oAllocation.employeeId;
                if (!sEmployeeId) continue;

                // Get employee to check their skills
                const oEmployee = await SELECT.one.from(Employees).where({ ohrId: sEmployeeId });
                if (!oEmployee || !oEmployee.skills) continue;

                // Check if employee's skills (comma-separated string) contains the demand skill
                // Split skills by comma and trim each
                const aEmployeeSkills = oEmployee.skills.split(',').map(s => s.trim());
                const bHasMatchingSkill = aEmployeeSkills.some(sSkill => 
                    sSkill.toLowerCase() === sDemandSkill.toLowerCase()
                );

                if (bHasMatchingSkill) {
                    iCount++;
                }
            }

            return iCount;
        } catch (oError) {
            return 0;
        }
    };

    // ✅ NEW: Check and update employee statuses when reading Employees
    // This handles the case where:
    // - Allocation start date passed but project hadn't started yet
    // - Later, when project starts, we need to update statuses
    // - This ensures statuses are always up-to-date when viewing employees
    this.before('READ', Employees, async (req) => {
        try {
            // ✅ Get all projects that have started (today >= project start date)
            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);
            
            const aProjects = await SELECT.from(Projects).where({
                startDate: { '<=': oToday.toISOString().split('T')[0] }
            });
            
            // ✅ For each project that has started, check if employee statuses need updating
            // This is efficient because we only check projects that have actually started
            for (const oProject of aProjects) {
                if (oProject && oProject.sapPId) {
                    // Check if there are any active allocations for this project
                    const aAllocations = await SELECT.from(Allocations)
                        .where({ projectId: oProject.sapPId, status: 'Active' })
                        .limit(1); // Just check if any exist
                    
                    if (aAllocations && aAllocations.length > 0) {
                        // Project has started and has allocations - update statuses
                        // Use a flag to prevent infinite loops (only update once per request)
                        if (!req._employeeStatusUpdateChecked) {
                            req._employeeStatusUpdateChecked = new Set();
                        }
                        
                        if (!req._employeeStatusUpdateChecked.has(oProject.sapPId)) {
                            req._employeeStatusUpdateChecked.add(oProject.sapPId);
                            // Update statuses asynchronously (don't block the read)
                            this._updateEmployeeStatusesForProject(oProject.sapPId).catch((oError) => {
                            });
                        }
                    }
                }
            }
        } catch (oError) {
            // Don't fail the read if status update check fails
        }
    });

    // ✅ NEW: Helper function to update a specific employee's status based on ALL their active allocations
    // This handles cases where:
    // - Employee has multiple active allocations (takes the "highest" status: Allocated > PreAllocated)
    // - Employee has no active allocations (reverts to Bench, unless Resigned)
    // - Allocation ended or cancelled (checks if other active allocations exist)
    this._updateEmployeeStatus = async function(sEmployeeId) {
        try {
            const oEmployee = await SELECT.one.from(Employees).where({ ohrId: sEmployeeId });
            if (!oEmployee) {
                return;
            }

            // ✅ Don't change status if employee is Resigned
            if (oEmployee.status === 'Resigned') {
                return;
            }

            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);

            // ✅ Get all active allocations for this employee
            const aAllocations = await SELECT.from(Allocations)
                .where({ employeeId: sEmployeeId, status: 'Active' });

            // ✅ If no active allocations, revert to Bench
            if (!aAllocations || aAllocations.length === 0) {
                if (oEmployee.status !== 'UnproductiveBench' && oEmployee.status !== 'InactiveBench') {
                    // Default to UnproductiveBench if not already on bench
                    await UPDATE(Employees).where({ ohrId: sEmployeeId }).with({ status: 'UnproductiveBench' });
                }
                return;
            }

            // ✅ Employee has active allocations - determine status based on all of them
            let sFinalStatus = null;
            let bHasAllocated = false; // Track if any allocation qualifies for "Allocated"
            let bHasPreAllocated = false; // Track if any allocation qualifies for "PreAllocated"

            for (const oAllocation of aAllocations) {
                const sProjectId = oAllocation.projectId;
                if (!sProjectId) continue;

                // Get project details
                const oProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
                if (!oProject) continue;

                const bHasSfdcPId = oProject.sfdcPId && oProject.sfdcPId.trim() !== "";

                // Check project start date
                const oProjectStartDate = oProject.startDate ? new Date(oProject.startDate) : null;
                if (oProjectStartDate) {
                    oProjectStartDate.setHours(0, 0, 0, 0);
                }
                const bProjectStarted = oProjectStartDate && oToday >= oProjectStartDate;

                // Check allocation start date
                const oAllocationStartDate = oAllocation.startDate ? new Date(oAllocation.startDate) : null;
                if (oAllocationStartDate) {
                    oAllocationStartDate.setHours(0, 0, 0, 0);
                }
                const bAllocationStarted = oAllocationStartDate && oToday >= oAllocationStartDate;

                // ✅ Both dates must have arrived for status to apply
                if (bAllocationStarted && bProjectStarted) {
                    if (bHasSfdcPId) {
                        bHasAllocated = true; // "Allocated" takes precedence
                    } else {
                        bHasPreAllocated = true;
                    }
                }
            }

            // ✅ Determine final status (Allocated > PreAllocated)
            if (bHasAllocated) {
                sFinalStatus = 'Allocated';
            } else if (bHasPreAllocated) {
                sFinalStatus = 'PreAllocated';
            } else {
                // ✅ Employee has active allocations but none have started yet
                // Keep current status (don't change to Bench yet)
                return;
            }

            // Update employee status if different
            if (sFinalStatus && oEmployee.status !== sFinalStatus) {
                await UPDATE(Employees).where({ ohrId: sEmployeeId }).with({ status: sFinalStatus });
            } else if (oEmployee.status === sFinalStatus) {
            }
        } catch (oError) {
            throw oError;
        }
    };

    // ✅ NEW: Helper function to calculate requiredResources from sum of demand quantities
    // This calculates: requiredResources = sum of all demand quantities for the project
    this._calculateRequiredResourcesFromDemands = async function(sProjectId) {
        try {
            // Get all demands for this project
            const aDemands = await SELECT.from(Demands).where({ sapPId: sProjectId });
            
            // Calculate sum of all demand quantities
            const iRequiredResources = aDemands.reduce((sum, demand) => {
                return sum + (demand.quantity || 0);
            }, 0);
            
            return iRequiredResources;
        } catch (oError) {
            return 0;
        }
    };

    // ✅ NEW: Helper function to update project resource counts (allocatedResources and toBeAllocated)
    // This counts ONLY ACTIVE allocations for the project and updates:
    // - allocatedResources = count of ACTIVE allocations only
    // - toBeAllocated = requiredResources - allocatedResources
    // Note: requiredResources is NOT updated - it's a manual field
    this._updateProjectResourceCounts = async function(sProjectId) {
        try {
            // Get project details
            const oProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
            if (!oProject) {
                return;
            }

            // ✅ Get requiredResources from project (manual field - don't calculate from demands)
            const iRequiredResources = oProject.requiredResources || 0;

            // ✅ Count ONLY ACTIVE allocations for this project
            const aAllocations = await SELECT.from(Allocations).where({ projectId: sProjectId, status: 'Active' });
            const iAllocatedResources = aAllocations ? aAllocations.length : 0;

            // Calculate toBeAllocated
            const iToBeAllocated = Math.max(0, iRequiredResources - iAllocatedResources);

            if (aAllocations && aAllocations.length > 0) {
            }

            // ✅ CRITICAL: Use UPDATE with proper syntax (UPDATE is available in service context)
            // Don't import from cds.ql - use the service's UPDATE directly
            // Update ONLY: allocatedResources (from active allocations), toBeAllocated (calculated)
            // Do NOT update requiredResources - it's a manual field
            try {
                const oUpdateData = {
                    allocatedResources: iAllocatedResources,
                    toBeAllocated: iToBeAllocated
                };
                
                const iUpdated = await UPDATE(Projects).where({ sapPId: sProjectId }).with(oUpdateData);

            } catch (oUpdateError) {
                throw oUpdateError;
            }
            
            // ✅ Verify the update by reading back the project
            const oUpdatedProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
            if (oUpdatedProject) {
                
                // ✅ Double-check: if values don't match, log warning
                if (oUpdatedProject.allocatedResources !== iAllocatedResources || oUpdatedProject.toBeAllocated !== iToBeAllocated) {
                }
            } else {
            }
        } catch (oError) {
            throw oError;
        }
    };

    // ✅ NEW: Helper function to update demand resource counts (allocatedCount and remaining)
    // This counts ONLY ACTIVE allocations for the demand and updates:
    // - allocatedCount = count of ACTIVE allocations for this demand
    // - remaining = quantity - allocatedCount
    this._updateDemandResourceCounts = async function(iDemandId) {
        try {
            // Get demand details
            const oDemand = await SELECT.one.from(Demands).where({ demandId: iDemandId });
            if (!oDemand) {
                return;
            }

            // Get quantity from demand
            const iQuantity = oDemand.quantity || 0;

            // ✅ Count ONLY ACTIVE allocations for this demand
            // ✅ CRITICAL: Ensure demandId is integer for proper query matching
            const iDemandIdInt = parseInt(iDemandId, 10);
            if (isNaN(iDemandIdInt)) {
                return;
            }
            
            const aAllocations = await SELECT.from(Allocations)
                .where({ demandId: iDemandIdInt, status: 'Active' });
            const iAllocatedCount = aAllocations ? aAllocations.length : 0;

            // Calculate remaining
            const iRemaining = Math.max(0, iQuantity - iAllocatedCount);

            if (aAllocations && aAllocations.length > 0) {
            }

            // Update demand
            try {
                const oUpdateData = {
                    allocatedCount: iAllocatedCount,
                    remaining: iRemaining
                };
                
                const iUpdated = await UPDATE(Demands).where({ demandId: iDemandId }).with(oUpdateData);
            } catch (oUpdateError) {
                throw oUpdateError;
            }
            
            // ✅ Verify the update by reading back the demand
            const oUpdatedDemand = await SELECT.one.from(Demands).where({ demandId: iDemandId });
            if (oUpdatedDemand) {
                
                // ✅ Double-check: if values don't match, log warning
                if (oUpdatedDemand.allocatedCount !== iAllocatedCount || oUpdatedDemand.remaining !== iRemaining) {
                }
            } else {
            }
        } catch (oError) {
            throw oError;
        }
    };

    // ✅ NEW: Helper function to update employee statuses based on ALLOCATION start date and project sfdcPId
    // This is called per-project and updates all employees for that project
    this._updateEmployeeStatusesForProject = async function(sProjectId) {
        try {
            // Get project details
            const oProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
            if (!oProject) {
                return;
            }

            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0); // Reset time to start of day
            
            const bHasSfdcPId = oProject.sfdcPId && oProject.sfdcPId.trim() !== "";


            // Get all active allocations for this project
            const aAllocations = await SELECT.from(Allocations)
                .where({ projectId: sProjectId, status: 'Active' });

            if (!aAllocations || aAllocations.length === 0) {
                return;
            }

            // ✅ CRITICAL: Update employee statuses based on BOTH allocation start date AND project start date
            // Get project start date for comparison
            const oProjectStartDate = oProject.startDate ? new Date(oProject.startDate) : null;
            if (oProjectStartDate) {
                oProjectStartDate.setHours(0, 0, 0, 0);
            }
            const bProjectStarted = oProjectStartDate && oToday >= oProjectStartDate;

            for (const oAllocation of aAllocations) {
                const sEmployeeId = oAllocation.employeeId;
                if (!sEmployeeId) continue;

                // ✅ Use allocation start date
                const oAllocationStartDate = oAllocation.startDate ? new Date(oAllocation.startDate) : null;
                if (oAllocationStartDate) {
                    oAllocationStartDate.setHours(0, 0, 0, 0);
                }

                // ✅ CRITICAL: Check if BOTH allocation start date AND project start date have arrived
                const bAllocationStarted = oAllocationStartDate && oToday >= oAllocationStartDate;

                let sNewStatus = null;

                // ✅ Only update status if BOTH conditions are met:
                // 1. Allocation start date has arrived
                // 2. Project start date has arrived (project has started)
                if (bAllocationStarted && bProjectStarted) {
                    // ✅ Both allocation and project have started - check project SFDC PID
                    if (bHasSfdcPId) {
                        // Project has SFDC PID → Set to "Allocated"
                        sNewStatus = 'Allocated';
                    } else {
                        // Project doesn't have SFDC PID → Set to "Pre Allocated"
                        sNewStatus = 'PreAllocated';
                    }
                } else {
                    // Either allocation hasn't started OR project hasn't started → Don't change status
                    if (!bAllocationStarted) {
                    } else if (!bProjectStarted) {
                    }
                    continue;
                }

                // Update employee status if needed
                if (sNewStatus) {
                    // Get current employee status
                    const oEmployee = await SELECT.one.from(Employees).where({ ohrId: sEmployeeId });
                    if (oEmployee && oEmployee.status !== sNewStatus) {
                        // Only update if status is different
                        await UPDATE(Employees).where({ ohrId: sEmployeeId }).with({ status: sNewStatus });
                    } else if (oEmployee) {
                    }
                }
            }
            
            // ✅ CRITICAL: Also call _updateEmployeeStatus for each employee to handle multiple allocations
            // This ensures if an employee has allocations in multiple projects, we get the correct status
            const aUniqueEmployeeIds = [...new Set(aAllocations.map(a => a.employeeId).filter(id => id))];
            for (const sEmployeeId of aUniqueEmployeeIds) {
                try {
                    await this._updateEmployeeStatus(sEmployeeId);
                } catch (oError) {
                }
            }
        } catch (oError) {
            throw oError;
        }
    };

    // ✅ NEW: Check and mark expired allocations as "Completed"
    // This handles Case 1, 3, 4, 6, 7: Allocation end date passes
    this._markExpiredAllocationsAsCompleted = async function() {
        try {
            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);


            // Find all active allocations where endDate has passed
            const aExpiredAllocations = await SELECT.from(Allocations)
                .where({ status: 'Active' });

            if (!aExpiredAllocations || aExpiredAllocations.length === 0) {
                return { updated: 0, employees: [] };
            }

            let iUpdatedCount = 0;
            const aAffectedEmployees = new Set();

            for (const oAllocation of aExpiredAllocations) {
                if (!oAllocation.endDate) continue;

                const oEndDate = new Date(oAllocation.endDate);
                oEndDate.setHours(0, 0, 0, 0);

                // Check if allocation end date has passed
                if (oEndDate < oToday) {
                    const sAllocationId = oAllocation.allocationId;
                    const sEmployeeId = oAllocation.employeeId;


                    // Mark allocation as Completed
                    await UPDATE(Allocations)
                        .where({ allocationId: sAllocationId })
                        .with({ status: 'Completed' });

                    iUpdatedCount++;
                    if (sEmployeeId) {
                        aAffectedEmployees.add(sEmployeeId);
                    }

                    // Update project resource counts
                    if (oAllocation.projectId) {
                        await this._updateProjectResourceCounts(oAllocation.projectId);
                    }
                }
            }

            // Update employee statuses for all affected employees
            for (const sEmployeeId of aAffectedEmployees) {
                try {
                    await this._updateEmployeeStatus(sEmployeeId);
                } catch (oError) {
                }
            }

            return { updated: iUpdatedCount, employees: Array.from(aAffectedEmployees) };
        } catch (oError) {
            throw oError;
        }
    };

    // ✅ NEW: Check and mark expired projects and their allocations
    // This handles Case 2, 3, 5: Project end date passes
    this._markExpiredProjectsAsClosed = async function() {
        try {
            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);


            // Find all active or to be created projects where endDate has passed
            const aExpiredProjects = await SELECT.from(Projects)
                .where({ status: { in: ['Active', 'ToBeCreated'] } });

            if (!aExpiredProjects || aExpiredProjects.length === 0) {
                return { updated: 0, allocations: 0, employees: [] };
            }

            let iUpdatedProjects = 0;
            let iUpdatedAllocations = 0;
            const aAffectedEmployees = new Set();

            for (const oProject of aExpiredProjects) {
                if (!oProject.endDate) continue;

                const oEndDate = new Date(oProject.endDate);
                oEndDate.setHours(0, 0, 0, 0);

                // Check if project end date has passed
                if (oEndDate < oToday) {
                    const sProjectId = oProject.sapPId;


                    // Mark project as Closed
                    await UPDATE(Projects)
                        .where({ sapPId: sProjectId })
                        .with({ status: 'Closed' });

                    iUpdatedProjects++;

                    // Mark all active allocations to this project as Completed
                    const aProjectAllocations = await SELECT.from(Allocations)
                        .where({ projectId: sProjectId, status: 'Active' });

                    if (aProjectAllocations && aProjectAllocations.length > 0) {
                        for (const oAllocation of aProjectAllocations) {
                            await UPDATE(Allocations)
                                .where({ allocationId: oAllocation.allocationId })
                                .with({ status: 'Completed' });

                            iUpdatedAllocations++;
                            if (oAllocation.employeeId) {
                                aAffectedEmployees.add(oAllocation.employeeId);
                            }
                        }
                    }

                    // Update project resource counts
                    await this._updateProjectResourceCounts(sProjectId);
                }
            }

            // Update employee statuses for all affected employees
            for (const sEmployeeId of aAffectedEmployees) {
                try {
                    await this._updateEmployeeStatus(sEmployeeId);
                } catch (oError) {
                }
            }

            return { 
                updated: iUpdatedProjects, 
                allocations: iUpdatedAllocations, 
                employees: Array.from(aAffectedEmployees) 
            };
        } catch (oError) {
            throw oError;
        }
    };

    // ✅ NEW: Main function to check and update all expired allocations and projects
    // This can be called on-demand or scheduled
    this._checkAndUpdateExpiredItems = async function() {
        try {
            
            // First check expired allocations
            const oAllocationResult = await this._markExpiredAllocationsAsCompleted();
            
            // Then check expired projects (this will also mark their allocations)
            const oProjectResult = await this._markExpiredProjectsAsClosed();
            
            const iTotalUpdated = oAllocationResult.updated + oProjectResult.allocations;
            const aAllEmployees = [...new Set([...oAllocationResult.employees, ...oProjectResult.employees])];
            
            
            return {
                allocations: oAllocationResult.updated,
                projects: oProjectResult.updated,
                totalAllocations: oAllocationResult.updated + oProjectResult.allocations,
                employees: aAllEmployees
            };
        } catch (oError) {
            throw oError;
        }
    };


    // ✅ NEW: On-demand function to check expired items (can be called via API)
    this.on('checkExpiredItems', async (req) => {
        try {
            const oResult = await this._checkAndUpdateExpiredItems();
            return {
                success: true,
                message: `Checked and updated expired items`,
                ...oResult
            };
        } catch (oError) {
            return {
                success: false,
                error: oError.message
            };
        }
    });

    // ✅ NEW: Proactive check on Employee READ (lightweight check)
    // This checks if the employee's allocations have expired when reading a single employee
    // Note: This runs AFTER the existing before('READ', Employees) handler
    this.after('READ', Employees, async (req) => {
        try {
            // Only check if it's a single employee read (by key)
            if (req.keys && req.keys.ohrId) {
                const sEmployeeId = req.keys.ohrId;
                
                // Lightweight check: only check this employee's allocations
                const aActiveAllocations = await SELECT.from(Allocations)
                    .where({ employeeId: sEmployeeId, status: 'Active' });
                
                if (aActiveAllocations && aActiveAllocations.length > 0) {
                    const oToday = new Date();
                    oToday.setHours(0, 0, 0, 0);
                    
                    let bNeedsUpdate = false;
                    
                    for (const oAllocation of aActiveAllocations) {
                        if (oAllocation.endDate) {
                            const oEndDate = new Date(oAllocation.endDate);
                            oEndDate.setHours(0, 0, 0, 0);
                            
                            if (oEndDate < oToday) {
                                // Mark as Completed
                                await UPDATE(Allocations)
                                    .where({ allocationId: oAllocation.allocationId })
                                    .with({ status: 'Completed' });
                                
                                bNeedsUpdate = true;
                                
                                // Update project resource counts
                                if (oAllocation.projectId) {
                                    await this._updateProjectResourceCounts(oAllocation.projectId);
                                }
                            }
                        }
                    }
                    
                    if (bNeedsUpdate) {
                        // Update employee status
                        await this._updateEmployeeStatus(sEmployeeId);
                    }
                }
            }
        } catch (oError) {
            // Don't fail the read, just log the error
        }
    });

    // ============================================
    // METADATA & CONFIGURATION ENDPOINTS
    // ============================================

    // ✅ NEW: Get enum metadata from schema
    // Returns enum values and labels for all entities
    this.on('getEnumMetadata', async (req) => {
        try {
            const aEnumMetadata = [
                // Customers
                { entity: "Customers", property: "status", values: ["Active", "Inactive", "Prospect"], labels: ["Active", "Inactive", "Prospect"] },
                { entity: "Customers", property: "vertical", values: ["BFS", "CapitalMarkets", "CPG", "Healthcare", "HighTech", "Insurance", "LifeSciences", "Manufacturing", "Retail", "Services"], labels: ["BFS", "Capital Markets", "CPG", "Healthcare", "High Tech", "Insurance", "Life Sciences", "Manufacturing", "Retail", "Services"] },
                
                // Opportunities
                { entity: "Opportunities", property: "probability", values: ["0%-ProposalStage", "33%-SoWSent", "85%-SoWSigned", "100%-PurchaseOrderReceived"], labels: ["0%-ProposalStage", "33%-SoWSent", "85%-SoWSigned", "100%-PurchaseOrderReceived"] },
                { entity: "Opportunities", property: "Stage", values: ["Discover", "Define", "OnBid", "DownSelect", "SignedDeal"], labels: ["Discover", "Define", "On Bid", "Down Select", "Signed Deal"] },
                
                // Projects
                { entity: "Projects", property: "projectType", values: ["FixedPrice", "TransactionBased", "FixedMonthly", "PassThru", "Divine", "TimeAndMaterial"], labels: ["Fixed Price", "Transaction Based", "Fixed Monthly", "Pass Thru", "Divine", "Time & Material"] },
                { entity: "Projects", property: "status", values: ["Active", "Closed", "ToBeCreated"], labels: ["Active", "Closed", "TO BE CREATED"] },
                { entity: "Projects", property: "SOWReceived", values: ["Yes", "No"], labels: ["Yes", "No"] },
                { entity: "Projects", property: "POReceived", values: ["Yes", "No"], labels: ["Yes", "No"] },
                
                // Employees
                { entity: "Employees", property: "gender", values: ["Male", "Female", "Others"], labels: ["Male", "Female", "Others"] },
                { entity: "Employees", property: "employeeType", values: ["FullTime", "SubCon", "Intern", "YTJ"], labels: ["Full Time", "Subcon", "Intern", "Yet To Join"] },
                { entity: "Employees", property: "band", values: ["1", "2", "3", "4A", "4B-C", "4B-LC", "4C", "4D", "5A", "5B", "Subcon"], labels: ["1", "2", "3", "4A", "4B-C", "4B-LC", "4C", "4D", "5A", "5B", "Subcon"] },
                { entity: "Employees", property: "status", values: ["PreAllocated", "Allocated", "Resigned", "UnproductiveBench", "InactiveBench"], labels: ["Pre Allocated", "Allocated", "Resigned", "Unproductive Bench", "Inactive Bench"] },
                
                // Allocations
                { entity: "Allocations", property: "status", values: ["Active", "Completed", "Cancelled"], labels: ["Active", "Completed", "Cancelled"] }
            ];
            
            return aEnumMetadata;
        } catch (oError) {
            req.reject(500, `Error getting enum metadata: ${oError.message}`);
        }
    });

    // ✅ NEW: Get Country-City mappings
    this.on('getCountryCityMappings', async (req) => {
        try {
            const aMappings = [
                { country: "South Africa", cities: ["Johannesburg (Gauteng)"] },
                { country: "China", cities: ["Dalian", "Foshan (Guangdong)", "Kunshan (Jiangsu)"] },
                { country: "India", cities: ["Bangalore (Karnataka)", "Chennai (Tamil Nadu)", "Gurgaon/Haryana (NCR)", "Hyderabad (Telangana)", "Jaipur (Rajasthan)", "Jodhpur (Rajasthan)", "Kolkata (West Bengal)", "Madurai (Tamil Nadu)", "Mumbai (Maharashtra)", "New Delhi (Delhi)", "Noida (Uttar Pradesh)", "Pune (Maharashtra)", "Warangal (Telangana)"] },
                { country: "Japan", cities: ["Tokyo (Chiyoda-ku)", "Yokohama (Kanagawa)"] },
                { country: "Malaysia", cities: ["Kuala Lumpur / Petaling Jaya (Selangor)"] },
                { country: "Philippines", cities: ["Bataan", "Manila / Quezon City"] },
                { country: "Singapore", cities: ["Singapore"] },
                { country: "Colombia", cities: ["Bogota"] },
                { country: "Costa Rica", cities: ["Heredia"] },
                { country: "Brazil", cities: ["Belo Horizonte (MG)", "Uberlândia (MG)"] },
                { country: "Guatemala", cities: ["Guatemala City"] },
                { country: "Mexico", cities: ["Juárez (Chihuahua)", "Guadalajara (Jalisco)", "Monterrey / San Pedro Garza García (Nuevo León)"] },
                { country: "Egypt", cities: ["Cairo"] },
                { country: "Israel", cities: ["Netanya"] },
                { country: "Turkey", cities: ["Istanbul"] },
                { country: "Canada", cities: ["Toronto (Ontario)"] },
                { country: "USA", cities: ["Atlanta (Georgia)", "Danville (Illinois)", "New York (New York)", "Richardson (Texas)", "Wilkes-Barre (Pennsylvania)"] },
                { country: "Australia", cities: ["Melbourne (Victoria)", "Sydney (New South Wales)"] },
                { country: "Bulgaria", cities: ["Sofia"] },
                { country: "France", cities: ["Paris"] },
                { country: "Hungary", cities: ["Budapest"] },
                { country: "Italy", cities: ["Milano"] },
                { country: "Germany", cities: ["Munich"] },
                { country: "Netherlands", cities: ["Hoofddorp"] },
                { country: "Poland", cities: ["Katowice", "Kraków", "Lublin", "Bielsko-Biała", "Wrocław"] },
                { country: "Portugal", cities: ["Lisbon"] },
                { country: "Republic of Ireland", cities: ["Dublin"] },
                { country: "Romania", cities: ["Bucharest", "Cluj Napoca", "Iași"] },
                { country: "Switzerland", cities: ["Zug"] },
                { country: "United Kingdom", cities: ["London (England)", "Manchester (Greater Manchester)", "Bellshill (Scotland)"] }
            ];
            
            return aMappings;
        } catch (oError) {
            req.reject(500, `Error getting country-city mappings: ${oError.message}`);
        }
    });

    // ✅ NEW: Get Band-Designation mappings
    this.on('getBandDesignationMappings', async (req) => {
        try {
            const aMappings = [
                { band: "1", designations: ["Senior Vice President"] },
                { band: "2", designations: ["Vice President"] },
                { band: "3", designations: ["Assistant Vice President"] },
                { band: "4A", designations: ["Consultant", "Management Trainee"] },
                { band: "4B-C", designations: ["Consultant", "Assistant Manager"] },
                { band: "4B-LC", designations: ["Assistant Manager", "Lead Consultant"] },
                { band: "4C", designations: ["Manager", "Principal Consultant", "Project Manager"] },
                { band: "4D", designations: ["Senior Manager", "Senior Principal Consultant", "Senior Project Manager"] },
                { band: "5A", designations: ["Process Associate"] },
                { band: "5B", designations: ["Senior Associate", "Technical Associate"] },
                { band: "Subcon", designations: ["Subcon"] }
            ];
            
            return aMappings;
        } catch (oError) {
            req.reject(500, `Error getting band-designation mappings: ${oError.message}`);
        }
    });

});

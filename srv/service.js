const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
    const { Opportunities, Customers, Projects, Employees, Demands, Allocations } = this.entities;


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

        console.log(result);
        


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
            console.log("✅ SELECT result for demandId max:", result);

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
            console.log("✅ Generated Demand ID:", nextId, "from max:", result?.max);
        } catch (oError) {
            console.error("❌ Error generating Demand ID:", oError);
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
                console.log("✅ Generated Demand ID (fallback):", req.data.demandId);
            } catch (oFallbackError) {
                console.error("❌ Fallback ID generation also failed:", oFallbackError);
                // Last resort: use 1
                req.data.demandId = 1;
            }
        }

        // ✅ NEW: Validate demand quantity doesn't exceed project required resources
        if (req.data.sapPId && req.data.quantity) {
            try {
                const sProjectId = req.data.sapPId;
                const iNewQuantity = parseInt(req.data.quantity, 10) || 0;

                // Get project details
                const oProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
                if (!oProject) {
                    throw new Error(`Project ${sProjectId} not found`);
                }

                const iRequiredResources = oProject.requiredResources || 0;

                // Get all existing demands for this project (excluding the current one being created)
                const aExistingDemands = await SELECT.from(Demands).where({ sapPId: sProjectId });
                const iCurrentTotal = aExistingDemands.reduce((sum, demand) => {
                    return sum + (demand.quantity || 0);
                }, 0);

                const iNewTotal = iCurrentTotal + iNewQuantity;

                console.log(`✅ Demand validation: Project ${sProjectId} - Required: ${iRequiredResources}, Current: ${iCurrentTotal}, New: ${iNewQuantity}, Total: ${iNewTotal}`);

                if (iNewTotal > iRequiredResources) {
                    const sErrorMessage = `Error validating demand quantity: Total demand quantity (${iNewTotal}) exceeds required resources (${iRequiredResources}) for project ${sProjectId}. Current demands: ${iCurrentTotal}, New demand: ${iNewQuantity}`;
                    console.error("❌", sErrorMessage);
                    req.reject(500, sErrorMessage);
                    return;
                }

                console.log("✅ Demand quantity validation passed");
            } catch (oError) {
                console.error("❌ Error validating demand quantity:", oError);
                // Reject the request with error message
                req.reject(500, `Error validating demand quantity: ${oError.message}`);
                return;
            }
        }
    });

    // ✅ NEW: Validate demand quantity on UPDATE (similar to CREATE validation)
    this.before('UPDATE', Demands, async (req) => {
        // Only validate if quantity or sapPId is being updated
        if (req.data.quantity !== undefined || req.data.sapPId !== undefined) {
            try {
                // Get the demand being updated
                const sDemandId = req.keys?.demandId || req.data.demandId;
                if (!sDemandId) {
                    console.warn("⚠️ Cannot validate demand update: demandId not found");
                    return;
                }

                // Get current demand to determine project
                const oCurrentDemand = await SELECT.one.from(Demands).where({ demandId: sDemandId });
                if (!oCurrentDemand) {
                    console.warn("⚠️ Demand not found for validation:", sDemandId);
                    return;
                }

                // Use updated sapPId if provided, otherwise use current
                const sProjectId = req.data.sapPId || oCurrentDemand.sapPId;
                if (!sProjectId) {
                    console.warn("⚠️ Cannot validate demand: project ID not found");
                    return;
                }

                // Get project details
                const oProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
                if (!oProject) {
                    throw new Error(`Project ${sProjectId} not found`);
                }

                const iRequiredResources = oProject.requiredResources || 0;

                // Get all existing demands for this project (excluding the current one being updated)
                const aExistingDemands = await SELECT.from(Demands).where({ sapPId: sProjectId });
                const iCurrentDemandQuantity = oCurrentDemand.quantity || 0;
                const iNewQuantity = req.data.quantity !== undefined ? parseInt(req.data.quantity, 10) || 0 : iCurrentDemandQuantity;

                // Calculate total: sum of all other demands + new quantity
                const iCurrentTotal = aExistingDemands.reduce((sum, demand) => {
                    // Exclude the demand being updated
                    if (demand.demandId === sDemandId) {
                        return sum;
                    }
                    return sum + (demand.quantity || 0);
                }, 0);

                const iNewTotal = iCurrentTotal + iNewQuantity;

                console.log(`✅ Demand UPDATE validation: Project ${sProjectId} - Required: ${iRequiredResources}, Current (others): ${iCurrentTotal}, Updated demand: ${iNewQuantity}, Total: ${iNewTotal}`);

                if (iNewTotal > iRequiredResources) {
                    const sErrorMessage = `Error validating demand quantity: Total demand quantity (${iNewTotal}) exceeds required resources (${iRequiredResources}) for project ${sProjectId}. Current demands (excluding this): ${iCurrentTotal}, Updated demand: ${iNewQuantity}`;
                    console.error("❌", sErrorMessage);
                    req.reject(500, sErrorMessage);
                    return;
                }

                console.log("✅ Demand UPDATE quantity validation passed");
            } catch (oError) {
                console.error("❌ Error validating demand quantity on UPDATE:", oError);
                req.reject(500, `Error validating demand quantity: ${oError.message}`);
                return;
            }
        }
    });

    // ✅ NEW: Set allocationDate and auto-fill startDate/endDate from project when allocation is created
    // ✅ Also validate allocation percentage doesn't exceed 100% total for employee
    this.before('CREATE', Allocations, async (req) => {
        // Set allocationDate to current date if not provided
        if (!req.data.allocationDate) {
            req.data.allocationDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            console.log("✅ Set allocationDate to:", req.data.allocationDate);
        }
        
        // ✅ Set default allocationPercentage to 100 if not provided
        // ✅ CRITICAL: Log the incoming value to debug
        console.log(`🔵 Backend received allocationPercentage: type=${typeof req.data.allocationPercentage}, value="${req.data.allocationPercentage}"`);
        
        if (req.data.allocationPercentage === undefined || req.data.allocationPercentage === null || req.data.allocationPercentage === "") {
            req.data.allocationPercentage = 100;
            console.log("✅ Set default allocationPercentage to 100 (value was missing/empty)");
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
            console.log(`✅ Parsed allocationPercentage: ${iPercentage}%`);
        }
        
        // ✅ Validate total allocation percentage for employee doesn't exceed 100%
        // ✅ CRITICAL: This validation runs for each allocation in a batch, but they don't see each other
        // So we need to check existing allocations in the database
        if (req.data.employeeId) {
            try {
                const sEmployeeId = req.data.employeeId;
                const iNewPercentage = req.data.allocationPercentage || 100;
                
                // ✅ Get all active allocations for this employee from database
                // Note: This won't see other allocations in the same batch, but that's okay
                // because batch items are processed sequentially and each validation is independent
                const aExistingAllocations = await SELECT.from(Allocations)
                    .where({ employeeId: sEmployeeId, status: 'Active' });
                
                // Calculate current total percentage from existing allocations
                const iCurrentTotal = aExistingAllocations.reduce((sum, alloc) => {
                    return sum + (alloc.allocationPercentage || 0);
                }, 0);
                
                const iNewTotal = iCurrentTotal + iNewPercentage;
                
                console.log(`✅ Allocation percentage validation: Employee ${sEmployeeId} - Current total: ${iCurrentTotal}%, New: ${iNewPercentage}%, Total: ${iNewTotal}%`);
                console.log(`✅ Existing allocations for employee ${sEmployeeId}:`, aExistingAllocations.map(a => `${a.projectId}:${a.allocationPercentage}%`).join(", "));
                
                if (iNewTotal > 100) {
                    const sErrorMessage = `Cannot create allocation: Total allocation percentage (${iNewTotal}%) would exceed 100% for employee ${sEmployeeId}. Current allocations: ${iCurrentTotal}%, New allocation: ${iNewPercentage}%`;
                    console.error("❌", sErrorMessage);
                    req.reject(400, sErrorMessage);
                    return;
                }
                
                console.log("✅ Allocation percentage validation passed");
            } catch (oError) {
                console.error("❌ Error validating allocation percentage:", oError);
                console.error("❌ Error stack:", oError.stack);
                req.reject(500, `Error validating allocation percentage: ${oError.message}`);
                return;
            }
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
                    console.error("❌", sErrorMessage);
                    req.reject(400, sErrorMessage);
                    return;
                }

                console.log(`✅ Allocation CREATE validation: Project ${req.data.projectId} - Required: ${iRequiredResources}, Current allocated: ${iCurrentAllocated}, New allocated: ${iNewAllocated}`);
                
                // Auto-fill dates from project if not provided
                const bNeedsStartDate = !req.data.startDate || req.data.startDate === "" || req.data.startDate.trim() === "";
                const bNeedsEndDate = !req.data.endDate || req.data.endDate === "" || req.data.endDate.trim() === "";
                
                if (bNeedsStartDate && oProject.startDate) {
                    req.data.startDate = oProject.startDate;
                    console.log("✅ Auto-filled startDate from project:", req.data.startDate);
                }
                if (bNeedsEndDate && oProject.endDate) {
                    req.data.endDate = oProject.endDate;
                    console.log("✅ Auto-filled endDate from project:", req.data.endDate);
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
                console.error("❌ Error validating allocation dates:", oError);
                req.reject(500, `Error validating allocation dates: ${oError.message}`);
                return;
            }
        }
    });

    // ✅ NEW: Update employee statuses after allocation is created
    this.after('CREATE', Allocations, async (req) => {
        try {
            const sProjectId = req.data.projectId;
            const sEmployeeId = req.data.employeeId;

            console.log(`✅ Allocation created - Project: ${sProjectId}, Employee: ${sEmployeeId}`);

            // ✅ CRITICAL: Update project resource counts FIRST (this is the main issue)
            if (sProjectId) {
                console.log(`🔄 Updating project resource counts for ${sProjectId}...`);
                // Execute update in the same transaction context
                await this._updateProjectResourceCounts(sProjectId);
                console.log(`✅ Project resource counts updated for ${sProjectId}`);
            } else {
                console.warn("⚠️ No projectId found in allocation data");
            }

            // ✅ Note: Demand allocatedCount/remaining are calculated on READ, so no need to update here
            // The calculation happens dynamically when demands are read

            if (sProjectId) {
                await this._updateEmployeeStatusesForProject(sProjectId);
            }
            // ✅ Also update the specific employee's status (handles multiple allocations)
            if (sEmployeeId) {
                await this._updateEmployeeStatus(sEmployeeId);
            }
        } catch (oError) {
            console.error("❌ Error updating employee statuses after allocation creation:", oError);
            console.error("❌ Error stack:", oError.stack);
        }
    });

    // ✅ NEW: Validate allocation update (if projectId changes, validate new project)
    // ✅ Also validate allocation percentage if it's being updated
    // ✅ Also validate if employeeId changes (need to check percentage for new employee)
    this.before('UPDATE', Allocations, async (req) => {
        // ✅ Get employeeId (could be changing or staying the same)
        const sEmployeeId = req.data.employeeId || req.keys?.employeeId;
        const bEmployeeIdChanged = req.data.employeeId !== undefined && req.data.employeeId !== req.keys?.employeeId;
        
        // ✅ If employeeId is changing, we need to validate percentage for the new employee
        if (bEmployeeIdChanged && req.data.employeeId) {
            try {
                const sNewEmployeeId = req.data.employeeId;
                const iNewPercentage = req.data.allocationPercentage !== undefined ? parseInt(req.data.allocationPercentage, 10) : 100;
                
                // Get all active allocations for the NEW employee
                const aNewEmployeeAllocations = await SELECT.from(Allocations)
                    .where({ employeeId: sNewEmployeeId, status: 'Active' });
                
                // Calculate total for new employee (excluding current allocation since it's moving)
                const iNewEmployeeTotal = aNewEmployeeAllocations.reduce((sum, alloc) => {
                    // Exclude the allocation being moved (by allocationId)
                    const sAllocationId = req.keys?.allocationId;
                    if (sAllocationId && alloc.allocationId === sAllocationId) {
                        return sum;
                    }
                    return sum + (alloc.allocationPercentage || 0);
                }, 0);
                
                const iNewTotal = iNewEmployeeTotal + iNewPercentage;
                
                console.log(`✅ Allocation employeeId change validation: Moving to employee ${sNewEmployeeId} - Other allocations: ${iNewEmployeeTotal}%, This allocation: ${iNewPercentage}%, Total: ${iNewTotal}%`);
                
                if (iNewTotal > 100) {
                    const sErrorMessage = `Cannot move allocation: Total allocation percentage (${iNewTotal}%) would exceed 100% for employee ${sNewEmployeeId}. Other allocations: ${iNewEmployeeTotal}%, This allocation: ${iNewPercentage}%`;
                    console.error("❌", sErrorMessage);
                    req.reject(400, sErrorMessage);
                    return;
                }
            } catch (oError) {
                console.error("❌ Error validating allocation percentage for employee change:", oError);
                req.reject(500, `Error validating allocation percentage: ${oError.message}`);
                return;
            }
        }
        
        // ✅ Validate allocation percentage if being updated
        if (req.data.allocationPercentage !== undefined && sEmployeeId) {
            try {
                if (!sEmployeeId) {
                    console.warn("⚠️ Cannot validate allocation percentage update: employeeId not found");
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
                    
                    // Get allocation being updated
                    const sAllocationId = req.keys?.allocationId || req.data.allocationId;
                    const oCurrentAllocation = sAllocationId ? await SELECT.one.from(Allocations).where({ allocationId: sAllocationId }) : null;
                    const iCurrentPercentage = oCurrentAllocation?.allocationPercentage || 0;
                    
                    // Get all other active allocations for this employee (excluding the current one being updated)
                    const aOtherAllocations = await SELECT.from(Allocations)
                        .where({ employeeId: sEmployeeId, status: 'Active' });
                    
                    // Calculate total from other allocations (excluding current)
                    const iOtherTotal = aOtherAllocations.reduce((sum, alloc) => {
                        // Exclude the allocation being updated
                        if (sAllocationId && alloc.allocationId === sAllocationId) {
                            return sum;
                        }
                        return sum + (alloc.allocationPercentage || 0);
                    }, 0);
                    
                    const iNewTotal = iOtherTotal + iNewPercentage;
                    
                    console.log(`✅ Allocation percentage UPDATE validation: Employee ${sEmployeeId} - Other allocations: ${iOtherTotal}%, Updated: ${iNewPercentage}%, Total: ${iNewTotal}%`);
                    
                    if (iNewTotal > 100) {
                        const sErrorMessage = `Cannot update allocation: Total allocation percentage (${iNewTotal}%) would exceed 100% for employee ${sEmployeeId}. Other allocations: ${iOtherTotal}%, Updated allocation: ${iNewPercentage}%`;
                        console.error("❌", sErrorMessage);
                        req.reject(400, sErrorMessage);
                        return;
                    }
                    
                    console.log("✅ Allocation percentage UPDATE validation passed");
                }
            } catch (oError) {
                console.error("❌ Error validating allocation percentage update:", oError);
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
                    console.error("❌", sErrorMessage);
                    req.reject(400, sErrorMessage);
                    return;
                }

                console.log(`✅ Allocation UPDATE validation: Moving to project ${sNewProjectId} - Required: ${iRequiredResources}, Current allocated: ${iCurrentAllocated}, New allocated: ${iNewAllocated}`);
            } catch (oError) {
                console.error("❌ Error validating allocation update:", oError);
                req.reject(500, `Error validating allocation update: ${oError.message}`);
                return;
            }
        }
    });

    // ✅ NEW: Update employee statuses when allocation is updated (e.g., status changed to Completed/Cancelled)
    this.after('UPDATE', Allocations, async (req) => {
        try {
            const sEmployeeId = req.data.employeeId || req.keys?.employeeId || null;
            const sOldProjectId = req.keys?.projectId || null;
            const sNewProjectId = req.data.projectId || req.keys?.projectId || null;

            // ✅ Update project resource counts if projectId changed
            if (sOldProjectId && sNewProjectId && sOldProjectId !== sNewProjectId) {
                // Project changed - update both old and new projects
                await this._updateProjectResourceCounts(sOldProjectId);
                await this._updateProjectResourceCounts(sNewProjectId);
            } else if (sNewProjectId) {
                // Same project or new allocation - update project counts
                await this._updateProjectResourceCounts(sNewProjectId);
            }

            // ✅ If allocation status changed to Completed or Cancelled, update employee status
            if (sEmployeeId && (req.data.status === 'Completed' || req.data.status === 'Cancelled')) {
                console.log(`✅ Allocation status changed to ${req.data.status} for employee ${sEmployeeId}, updating status`);
                await this._updateEmployeeStatus(sEmployeeId);
            } else if (sEmployeeId && req.data.status === 'Active') {
                // ✅ If allocation was reactivated, also update status
                if (sNewProjectId) {
                    await this._updateEmployeeStatusesForProject(sNewProjectId);
                }
                await this._updateEmployeeStatus(sEmployeeId);
            }
        } catch (oError) {
            console.error("❌ Error updating employee statuses after allocation update:", oError);
        }
    });

    // ✅ NEW: Update employee statuses when allocation is deleted
    this.after('DELETE', Allocations, async (req) => {
        try {
            const sEmployeeId = req.keys?.employeeId || null;
            const sProjectId = req.keys?.projectId || null;

            // ✅ Update project resource counts
            if (sProjectId) {
                await this._updateProjectResourceCounts(sProjectId);
            }

            if (sEmployeeId) {
                console.log(`✅ Allocation deleted for employee ${sEmployeeId}, updating status`);
                await this._updateEmployeeStatus(sEmployeeId);
            }
        } catch (oError) {
            console.error("❌ Error updating employee statuses after allocation deletion:", oError);
        }
    });

    // ✅ NEW: Validate project update (if requiredResources is updated, ensure ≥ allocatedResources)
    this.before('UPDATE', Projects, async (req) => {
        // If requiredResources is being updated, validate it's not less than current allocatedResources
        if (req.data.requiredResources !== undefined) {
            try {
                const sProjectId = req.data.sapPId || req.keys?.sapPId || null;
                if (!sProjectId) {
                    console.warn("⚠️ Cannot validate project update: sapPId not found");
                    return;
                }

                // Get current project to check allocatedResources
                const oCurrentProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
                if (!oCurrentProject) {
                    console.warn("⚠️ Project not found for validation:", sProjectId);
                    return;
                }

                const iNewRequiredResources = parseInt(req.data.requiredResources, 10) || 0;
                const iCurrentAllocated = oCurrentProject.allocatedResources || 0;

                if (iNewRequiredResources < iCurrentAllocated) {
                    const sErrorMessage = `Cannot update required resources: New required resources (${iNewRequiredResources}) cannot be less than currently allocated resources (${iCurrentAllocated}) for project ${sProjectId}`;
                    console.error("❌", sErrorMessage);
                    req.reject(400, sErrorMessage);
                    return;
                }

                console.log(`✅ Project UPDATE validation: ${sProjectId} - New required: ${iNewRequiredResources}, Current allocated: ${iCurrentAllocated}`);
            } catch (oError) {
                console.error("❌ Error validating project update:", oError);
                req.reject(500, `Error validating project update: ${oError.message}`);
                return;
            }
        }
    });

    // ✅ NEW: Update employee statuses when project is updated
    // This handles cases where:
    // 1. sfdcPId is added/changed
    // 2. Project start date is updated
    // 3. requiredResources is updated (recalculate toBeAllocated)
    // 4. Any other project update that might affect employee statuses
    this.after('UPDATE', Projects, async (req) => {
        try {
            // Get project ID from the key in the request
            const sProjectId = req.data.sapPId || req.keys?.sapPId || null;
            if (!sProjectId) return;
            
            // ✅ Check if requiredResources was updated
            const bRequiredResourcesUpdated = req.data.requiredResources !== undefined;
            
            // ✅ Check if sfdcPId was updated
            const bSfdcPIdUpdated = req.data.sfdcPId !== undefined;
            
            // ✅ Check if project start date was updated
            const bStartDateUpdated = req.data.startDate !== undefined;
            
            // ✅ If requiredResources was updated, recalculate project resource counts
            if (bRequiredResourcesUpdated) {
                console.log(`✅ Project ${sProjectId} requiredResources updated: ${req.data.requiredResources}`);
                await this._updateProjectResourceCounts(sProjectId);
            }
            
            // ✅ Update employee statuses if relevant fields were updated
            if (bSfdcPIdUpdated || bStartDateUpdated) {
                if (bSfdcPIdUpdated) {
                    console.log(`✅ Project ${sProjectId} updated with sfdcPId: ${req.data.sfdcPId}`);
                }
                if (bStartDateUpdated) {
                    console.log(`✅ Project ${sProjectId} start date updated: ${req.data.startDate}`);
                }
                await this._updateEmployeeStatusesForProject(sProjectId);
            }
        } catch (oError) {
            console.error("❌ Error updating employee statuses after project update:", oError);
        }
    });

    // ✅ NEW: Calculate allocatedCount and remaining for Demands when reading
    // This calculates how many employees are allocated matching each demand's skill
    this.on('READ', Demands, async (req, next) => {
        try {
            // Execute the default read
            const aDemands = await next();
            
            // If result is an array, process each demand
            if (Array.isArray(aDemands) && aDemands.length > 0) {
                // Calculate allocatedCount and remaining for each demand
                for (const oDemand of aDemands) {
                    if (oDemand.demandId && oDemand.sapPId && oDemand.skill) {
                        const iAllocatedCount = await this._calculateDemandAllocatedCount(
                            oDemand.sapPId, 
                            oDemand.skill
                        );
                        const iQuantity = oDemand.quantity || 0;
                        const iRemaining = Math.max(0, iQuantity - iAllocatedCount);
                        
                        oDemand.allocatedCount = iAllocatedCount;
                        oDemand.remaining = iRemaining;
                    }
                }
            } else if (aDemands && aDemands.demandId) {
                // Single demand result
                const oDemand = aDemands;
                if (oDemand.sapPId && oDemand.skill) {
                    const iAllocatedCount = await this._calculateDemandAllocatedCount(
                        oDemand.sapPId, 
                        oDemand.skill
                    );
                    const iQuantity = oDemand.quantity || 0;
                    const iRemaining = Math.max(0, iQuantity - iAllocatedCount);
                    
                    oDemand.allocatedCount = iAllocatedCount;
                    oDemand.remaining = iRemaining;
                }
            }
            
            return aDemands;
        } catch (oError) {
            console.warn("⚠️ Error calculating demand allocatedCount/remaining:", oError);
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
            console.error("❌ Error calculating demand allocatedCount:", oError);
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
                                console.warn(`⚠️ Background status update failed for project ${oProject.sapPId}:`, oError);
                            });
                        }
                    }
                }
            }
        } catch (oError) {
            // Don't fail the read if status update check fails
            console.warn("⚠️ Error checking employee statuses before read:", oError);
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
                console.warn("⚠️ Employee not found:", sEmployeeId);
                return;
            }

            // ✅ Don't change status if employee is Resigned
            if (oEmployee.status === 'Resigned') {
                console.log(`✅ Employee ${sEmployeeId} is Resigned, keeping status unchanged`);
                return;
            }

            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);

            // ✅ Get all active allocations for this employee
            const aAllocations = await SELECT.from(Allocations)
                .where({ employeeId: sEmployeeId, status: 'Active' });

            // ✅ If no active allocations, revert to Bench
            if (!aAllocations || aAllocations.length === 0) {
                if (oEmployee.status !== 'UnproductiveBench' && oEmployee.status !== 'ProductiveBench') {
                    // Default to UnproductiveBench if not already on bench
                    await UPDATE(Employees).where({ ohrId: sEmployeeId }).with({ status: 'UnproductiveBench' });
                    console.log(`✅ Employee ${sEmployeeId} has no active allocations, status set to UnproductiveBench`);
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
                console.log(`✅ Employee ${sEmployeeId} has active allocations but none have started yet, keeping current status`);
                return;
            }

            // Update employee status if different
            if (sFinalStatus && oEmployee.status !== sFinalStatus) {
                await UPDATE(Employees).where({ ohrId: sEmployeeId }).with({ status: sFinalStatus });
                console.log(`✅ Updated employee ${sEmployeeId} status from "${oEmployee.status}" to "${sFinalStatus}" (based on ${aAllocations.length} active allocation(s))`);
            } else if (oEmployee.status === sFinalStatus) {
                console.log(`✅ Employee ${sEmployeeId} already has correct status "${sFinalStatus}"`);
            }
        } catch (oError) {
            console.error("❌ Error in _updateEmployeeStatus:", oError);
            throw oError;
        }
    };

    // ✅ NEW: Helper function to update project resource counts (allocatedResources and toBeAllocated)
    // This counts ALL allocations for the project (regardless of status) and updates:
    // - allocatedResources = count of all allocations
    // - toBeAllocated = requiredResources - allocatedResources
    this._updateProjectResourceCounts = async function(sProjectId) {
        try {
            // Get project details
            const oProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
            if (!oProject) {
                console.warn("⚠️ Project not found for resource count update:", sProjectId);
                return;
            }

            // ✅ Count ALL allocations for this project (regardless of status)
            const aAllocations = await SELECT.from(Allocations).where({ projectId: sProjectId });
            const iAllocatedResources = aAllocations ? aAllocations.length : 0;

            // Get required resources
            const iRequiredResources = oProject.requiredResources || 0;

            // Calculate toBeAllocated
            const iToBeAllocated = Math.max(0, iRequiredResources - iAllocatedResources);

            console.log(`🔄 Updating project ${sProjectId} resource counts: Required=${iRequiredResources}, Current Allocated=${oProject.allocatedResources || 0}, New Allocated=${iAllocatedResources}, ToBeAllocated=${iToBeAllocated}`);

            // ✅ CRITICAL: Use UPDATE with proper syntax (UPDATE is available in service context)
            // Don't import from cds.ql - use the service's UPDATE directly
            const iUpdated = await UPDATE(Projects).where({ sapPId: sProjectId }).with({
                allocatedResources: iAllocatedResources,
                toBeAllocated: iToBeAllocated
            });

            console.log(`✅ UPDATE executed for project ${sProjectId}. Result:`, iUpdated);
            
            // ✅ Verify the update by reading back the project
            const oUpdatedProject = await SELECT.one.from(Projects).where({ sapPId: sProjectId });
            if (oUpdatedProject) {
                console.log(`✅ Verified update - Project ${sProjectId} now has: allocatedResources=${oUpdatedProject.allocatedResources}, toBeAllocated=${oUpdatedProject.toBeAllocated}`);
                
                // ✅ Double-check: if values don't match, log warning
                if (oUpdatedProject.allocatedResources !== iAllocatedResources || oUpdatedProject.toBeAllocated !== iToBeAllocated) {
                    console.warn(`⚠️ WARNING: Update may not have worked correctly! Expected: allocated=${iAllocatedResources}, toBeAllocated=${iToBeAllocated}, Got: allocated=${oUpdatedProject.allocatedResources}, toBeAllocated=${oUpdatedProject.toBeAllocated}`);
                }
            } else {
                console.warn(`⚠️ Could not verify update for project ${sProjectId}`);
            }
        } catch (oError) {
            console.error("❌ Error updating project resource counts:", oError);
            console.error("❌ Error details:", JSON.stringify(oError, null, 2));
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
                console.warn("⚠️ Project not found:", sProjectId);
                return;
            }

            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0); // Reset time to start of day
            
            const bHasSfdcPId = oProject.sfdcPId && oProject.sfdcPId.trim() !== "";

            console.log(`✅ Checking project ${sProjectId}: HasSFDC=${bHasSfdcPId}`);

            // Get all active allocations for this project
            const aAllocations = await SELECT.from(Allocations)
                .where({ projectId: sProjectId, status: 'Active' });

            if (!aAllocations || aAllocations.length === 0) {
                console.log("✅ No active allocations found for project:", sProjectId);
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
                        console.log(`✅ Allocation for employee ${sEmployeeId} hasn't started yet (starts: ${oAllocation.startDate}), keeping status unchanged`);
                    } else if (!bProjectStarted) {
                        console.log(`✅ Project ${sProjectId} hasn't started yet (starts: ${oProject.startDate}), keeping employee ${sEmployeeId} status unchanged`);
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
                        console.log(`✅ Updated employee ${sEmployeeId} status from "${oEmployee.status}" to "${sNewStatus}" (allocation started: ${oAllocation.startDate}, project started: ${oProject.startDate}, has SFDC: ${bHasSfdcPId})`);
                    } else if (oEmployee) {
                        console.log(`✅ Employee ${sEmployeeId} already has status "${sNewStatus}", no update needed`);
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
                    console.warn(`⚠️ Error updating employee ${sEmployeeId} status (individual check):`, oError);
                }
            }
        } catch (oError) {
            console.error("❌ Error in _updateEmployeeStatusesForProject:", oError);
            throw oError;
        }
    };

});
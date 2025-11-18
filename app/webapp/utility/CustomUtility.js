
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/mdc/p13n/StateUtil",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "glassboard/utility/FormHandler",
    "glassboard/utility/TableInitializer",
    "glassboard/utility/CRUDHelper",
    "glassboard/utility/FileUploadHelper",
    "glassboard/utility/SelectionManager"
], function (Controller, StateUtil, JSONModel, MessageToast, FormHandler, TableInitializer, CRUDHelper, FileUploadHelper, SelectionManager) {
    "use strict";

    // Fixed syntax error - removed duplicate oData declarations
    // Force refresh to clear browser cache

    return Controller.extend("glassboard.utility.CustomUtility", {
        onInit: function () {


            const oModel = this.getOwnerComponent().getModel();
            this.getView().setModel(oModel);


            // Lightweight view state model for button enablement
            const oViewState = new JSONModel({ hasSelected: false, hasPendingChanges: false });
            this.getView().setModel(oViewState, "model");
            // ✅ FIXED: Model to track row-level inline editing - TABLE-SCOPED
            // Each table has its own edit state to prevent cross-table interference
            const oEditModel = new JSONModel({
                Customers: { editingPath: "", mode: null },
                Employees: { editingPath: "", mode: null },
                Opportunities: { editingPath: "", mode: null },
                Projects: { editingPath: "", mode: null },
                SAPIdStatuses: { editingPath: "", mode: null },
                // ✅ REMOVED: Verticals: { editingPath: "", mode: null }, (Vertical is now an enum)
                currentTable: null  // Track which table is currently being edited
            });
            this.getView().setModel(oEditModel, "edit");
            // -------------------------------------------------------------
            const oMessageManager = sap.ui.getCore().getMessageManager();
            const oMessageModel = oMessageManager.getMessageModel();
            this.getView().setModel(oMessageModel, "message");
            oMessageManager.registerObject(this.getView(), true);

            const oBinding = oMessageModel.bindList("/");
            oBinding.attachChange(() => {
                this.updateMessageButtonIcon(this);
            });
            this.updateMessageButtonIcon(this);

            // -------------------------------------------------------------
            // 4. Footer Button Handling
            // -------------------------------------------------------------
            const oFooterButton = this.byId("uploadLogButton");
            if (oFooterButton) {
                const oButtonBinding = oFooterButton.getBinding("visible");
                if (oButtonBinding) {
                    oButtonBinding.attachChange(() => {
                        if (oFooterButton.getVisible()) {
                            this.onCloseUpload();
                            const oFileUploader = this.byId("fileUploader");
                            if (oFileUploader) oFileUploader.clear();
                            this._csvPayload = null;
                        }
                    });
                }
            }
        },

        // Initialize table-specific functionality when table is available
        // ✅ Delegated to TableInitializer
        initializeTable: function (sTableId) {
            return TableInitializer.prototype.initializeTable.call(this, sTableId);
        },

        // Utilities
        _getPersonsBinding: function () {
            const oTable = this.byId("Customers");
            return oTable && oTable.getRowBinding && oTable.getRowBinding();
        },

        // ✅ Delegated to SelectionManager
        _getSelectedContexts: function () {
            return SelectionManager.prototype._getSelectedContexts.call(this);
        },

        // ✅ Delegated to TableInitializer
        _updateSelectionState: function () {
            return TableInitializer.prototype._updateSelectionState.call(this);
        },

        // ✅ Delegated to TableInitializer
        _updatePendingState: function () {
            return TableInitializer.prototype._updatePendingState.call(this);
        },

        // Toolbar actions

        // ✅ Delegated to SelectionManager
        onSelectionChange: function (oEvent) {
            return SelectionManager.prototype.onSelectionChange.call(this, oEvent);
        },

        // ✅ Delegated to FormHandler
        _onDemandDialogData: function (aSelectedContexts) {
            FormHandler.prototype.onDemandDialogData.call(this, aSelectedContexts);
        },

        _onEmpDialogData: function (aSelectedContexts) {
            FormHandler.prototype.onEmpDialogData.call(this, aSelectedContexts);
        },
         _onMasterDemandsDialogData: function (aSelectedContexts) {
            FormHandler.prototype.onMasterDemandsDialogData.call(this, aSelectedContexts);
        },

        _onOppDialogData: function (aSelectedContexts) {
            FormHandler.prototype.onOppDialogData.call(this, aSelectedContexts);
        },

        // Helper to set customer ID for opportunity field
        _loadCustomerIdForOpportunity: function (sCustomerId) {
            // ✅ Display only ID (not name) for association fields
            if (this.byId("inputCustomerId_oppr")) {
                this.byId("inputCustomerId_oppr").setValue(sCustomerId || "");
                this.byId("inputCustomerId_oppr").data("selectedId", sCustomerId || "");
                // Also update/create model with the ID (for backend submission)
                let oOppModel = this.getView().getModel("opportunityModel");
                if (!oOppModel) {
                    oOppModel = new sap.ui.model.json.JSONModel({ customerId: sCustomerId });
                    this.getView().setModel(oOppModel, "opportunityModel");
                } else {
                    oOppModel.setProperty("/customerId", sCustomerId);
                }
            }
        },

        // Helper function for retry case (kept for backward compatibility)
        _populateOpportunityFormDirect: function (oObj) {
            if (!oObj) return;
            this.byId("inputSapOppId_oppr")?.setValue(oObj.sapOpportunityId || "");
            this.byId("inputSapOppId_oppr")?.setEnabled(false);
            this.byId("inputSapOppId_oppr")?.setPlaceholder("");
            this.byId("inputSfdcOppId_oppr")?.setValue(oObj.sfdcOpportunityId || "");
            this.byId("inputOppName_oppr")?.setValue(oObj.opportunityName || "");
            this.byId("inputBusinessUnit_oppr")?.setValue(oObj.businessUnit || "");
            this.byId("inputProbability_oppr")?.setSelectedKey(oObj.probability || "");
            this.byId("inputStage_oppr")?.setSelectedKey(oObj.Stage || "");
            // ✅ Sales SPOC and Delivery SPOC - set OHR ID initially, will load names if needed
            this.byId("inputSalesSPOC_oppr")?.setValue(oObj.salesSPOC || "");
            this.byId("inputSalesSPOC_oppr")?.data("selectedId", oObj.salesSPOC || "");
            this.byId("inputDeliverySPOC_oppr")?.setValue(oObj.deliverySPOC || "");
            this.byId("inputDeliverySPOC_oppr")?.data("selectedId", oObj.deliverySPOC || "");
            this.byId("inputExpectedStart_oppr")?.setValue(oObj.expectedStart || "");
            this.byId("inputExpectedEnd_oppr")?.setValue(oObj.expectedEnd || "");
            this.byId("inputTCV_oppr")?.setValue(oObj.tcv || "");

            // Handle customer field
            // ✅ Customer field - display only ID (not name)
            const sCustomerId = oObj.customerId || "";
            const oCustomerInput = this.byId("inputCustomerId_oppr");
            if (oCustomerInput) {
                oCustomerInput.setValue(sCustomerId);
                oCustomerInput.data("selectedId", sCustomerId);
                // Also update/create model with the ID (for backend submission)
                let oOppModel = this.getView().getModel("opportunityModel");
                if (!oOppModel) {
                    oOppModel = new sap.ui.model.json.JSONModel({ customerId: sCustomerId });
                    this.getView().setModel(oOppModel, "opportunityModel");
                } else {
                    oOppModel.setProperty("/customerId", sCustomerId);
                }
            }
        },

        _onProjDialogData: function (aSelectedContexts) {
            FormHandler.prototype.onProjDialogData.call(this, aSelectedContexts);
        },

        // Helper to set opportunity ID for project field
        _loadOpportunityIdForProject: function (sOppId) {
            // ✅ Display only ID (not name) for association fields
            if (this.byId("inputOppId_proj")) {
                this.byId("inputOppId_proj").setValue(sOppId || "");
                this.byId("inputOppId_proj").data("selectedId", sOppId || "");
                // Also update/create model with the ID (for backend submission)
                let oProjModel = this.getView().getModel("projectModel");
                if (!oProjModel) {
                    oProjModel = new sap.ui.model.json.JSONModel({ oppId: sOppId });
                    this.getView().setModel(oProjModel, "projectModel");
                } else {
                    oProjModel.setProperty("/oppId", sOppId);
                }
            }
        },

        // Helper function for retry case
        _populateProjectFormDirect: function (oObj) {
            if (!oObj) return;
            this.byId("inputSapProjId_proj")?.setValue(oObj.sapPId || "");
            this.byId("inputSapProjId_proj")?.setEnabled(false);
            this.byId("inputSapProjId_proj")?.setPlaceholder("");
            this.byId("inputSfdcProjId_proj")?.setValue(oObj.sfdcPId || "");
            this.byId("inputProjectName_proj")?.setValue(oObj.projectName || "");
            this.byId("inputStartDate_proj")?.setValue(oObj.startDate || "");
            this.byId("inputEndDate_proj")?.setValue(oObj.endDate || "");

            // ✅ GPM field - display only ID (not name)
            const sGPMId = oObj.gpm || "";
            const oGPMInput = this.byId("inputGPM_proj");
            if (oGPMInput) {
                oGPMInput.setValue(sGPMId);
                oGPMInput.data("selectedId", sGPMId);
            }

            this.byId("inputProjectType_proj")?.setSelectedKey(oObj.projectType || "");
            this.byId("inputStatus_proj")?.setSelectedKey(oObj.status || "");

            // ✅ Opportunity field - display only ID (not name)
            const sOppId = oObj.oppId || "";
            const oOppInput = this.byId("inputOppId_proj");
            if (oOppInput) {
                oOppInput.setValue(sOppId);
                oOppInput.data("selectedId", sOppId);
                // Also update/create model with the ID (for backend submission)
                let oProjModel = this.getView().getModel("projectModel");
                if (!oProjModel) {
                    oProjModel = new sap.ui.model.json.JSONModel({ oppId: sOppId });
                    this.getView().setModel(oProjModel, "projectModel");
                } else {
                    oProjModel.setProperty("/oppId", sOppId);
                }
            }

            this.byId("inputSegment_proj")?.setSelectedKey(oObj.segment || "");
            this.byId("inputVertical_proj")?.setSelectedKey(oObj.vertical || "");
            this.byId("inputSubVertical_proj")?.setSelectedKey(oObj.subVertical || "");
            this.byId("inputUnit_proj")?.setSelectedKey(oObj.unit || "");


            this.byId("inputRequiredResources_proj")?.setValue(oObj.requiredResources || "");
            this.byId("inputAllocatedResources_proj")?.setValue(oObj.allocatedResources || "");
            this.byId("inputToBeAllocated_proj")?.setValue(oObj.toBeAllocated || "");
            this.byId("inputSOWReceived_proj")?.setSelectedKey(oObj.SOWReceived || "");
            this.byId("inputPOReceived_proj")?.setSelectedKey(oObj.POReceived || "");
        },

        _onCustDialogData: function (aSelectedContexts) {
            FormHandler.prototype.onCustDialogData.call(this, aSelectedContexts);
        },




        // ✅ Delegated to CRUDHelper
        onDeletePress: function (oEvent) {
            return CRUDHelper.prototype.onDeletePress.call(this, oEvent);
        },
        // ✅ Delegated to CRUDHelper
        onEditPress: function (oEvent) {
            return CRUDHelper.prototype.onEditPress.call(this, oEvent);
        },
        // ✅ Delegated to CRUDHelper
        _performCancelOperation: function (sTableId, bSkipConfirmation) {
            return CRUDHelper.prototype._performCancelOperation.call(this, sTableId, bSkipConfirmation);
        },
        // ✅ Public method: Cancel button press (shows confirmation dialog)
        onCancelButtonPress: function (oEvent) {
            // ✅ FIXED: Store reference to this (which is the controller when delegated)
            // When called from fragment via controller delegation, 'this' is the controller instance
            const oController = this;

            // Button mapping for all tables
            const buttonMap = {
                "Customers": { edit: "btnEdit_cus", delete: "btnDelete_cus", save: "saveButton", cancel: "cancelButton", add: "btnAdd" },
                "Employees": { edit: "Edit_emp", delete: "Delete_emp", save: "saveButton_emp", cancel: "cancelButton_emp", add: "btnAdd_emp" },
                "Opportunities": { edit: "btnEdit_oppr", delete: "btnDelete_oppr", save: "saveButton_oppr", cancel: "cancelButton_oppr", add: "btnAdd_oppr" },
                "Projects": { edit: "btnEdit_proj", delete: "btnDelete_proj", save: "saveButton_proj", cancel: "cancelButton_proj", add: "btnAdd_proj" },
                "SAPIdStatuses": { edit: "btnEdit_sap", delete: "btnDelete_sap", save: "saveButton_sap", cancel: "cancelButton_sap", add: "btnAdd_sap" }
                // ✅ REMOVED: "Verticals": { edit: "btnEdit_vert", delete: "btnDelete_vert", save: "saveButton_vert", cancel: "cancelButton_vert", add: "btnAdd_vert" }
            };

            // Determine which table this cancel is for
            let sTableId = "Customers"; // Default fallback
            if (oEvent && oEvent.getSource) {
                const sButtonId = oEvent.getSource().getId().split("--").pop();
                sTableId = Object.keys(buttonMap).find(tableId => buttonMap[tableId].cancel === sButtonId) || "Customers";
            }

            sap.m.MessageBox.confirm(
                "Are you sure you want to cancel? Unsaved changes will be lost.",
                {
                    icon: sap.m.MessageBox.Icon.WARNING,
                    title: "Cancel Edit",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function (sAction) {
                        if (sAction === sap.m.MessageBox.Action.YES) {
                            // ✅ FIXED: Call _performCancelOperation on the controller instance
                            // The method is exposed in Home.controller.js, so it's available on the controller
                            oController._performCancelOperation(sTableId, false);
                        }
                    }
                }
            );
        },
        // ✅ Delegated to CRUDHelper
        _setUIChanges: function (bHasChanges) {
            return CRUDHelper.prototype._setUIChanges.call(this, bHasChanges);
        },

        // 🚀 HELPERS: Row binding and context resolution
        _getRowBinding: function (oTable) {
            return (oTable && oTable.getRowBinding && oTable.getRowBinding())
                || (oTable && oTable.getBinding && (oTable.getBinding("items") || oTable.getBinding("rows")))
                || null;
        },
        // ✅ Delegated to CRUDHelper
        _resolveContextByPath: function (oTable, sPath) {
            return CRUDHelper.prototype._resolveContextByPath.call(this, oTable, sPath);
        },
        onSaveButtonPress: async function (oEvent) {

            // Button mapping for all tables
            const buttonMap = {
                "Customers": { edit: "btnEdit_cus", delete: "btnDelete_cus", save: "saveButton", cancel: "cancelButton", add: "btnAdd" },
                "Employees": { edit: "Edit_emp", delete: "Delete_emp", save: "saveButton_emp", cancel: "cancelButton_emp", add: "btnAdd_emp" },
                "Opportunities": { edit: "btnEdit_oppr", delete: "btnDelete_oppr", save: "saveButton_oppr", cancel: "cancelButton_oppr", add: "btnAdd_oppr" },
                "Projects": { edit: "btnEdit_proj", delete: "btnDelete_proj", save: "saveButton_proj", cancel: "cancelButton_proj", add: "btnAdd_proj" },
                "SAPIdStatuses": { edit: "btnEdit_sap", delete: "btnDelete_sap", save: "saveButton_sap", cancel: "cancelButton_sap", add: "btnAdd_sap" }
                // ✅ REMOVED: "Verticals": { edit: "btnEdit_vert", delete: "btnDelete_vert", save: "saveButton_vert", cancel: "cancelButton_vert", add: "btnAdd_vert" }
            };

            // Determine which table this save is for
            let sTableId = "Customers"; // Default fallback
            if (oEvent && oEvent.getSource) {
                const sButtonId = oEvent.getSource().getId().split("--").pop();
                sTableId = Object.keys(buttonMap).find(tableId => buttonMap[tableId].save === sButtonId) || "Customers";
            }

            // ✅ FIXED: Use table-specific group ID (no hyphens - OData V4 requirement)
            // Ensure no hyphens - replace any that might exist
            let sSafeTableId = sTableId.replace(/-/g, ""); // Remove any hyphens
            const GROUP_ID = `changesGroup${sSafeTableId}`;

            const oTable = this.byId(sTableId);
            const oView = this.getView();
            const oModel = oView.getModel(); // OData V4 model
            const oEditModel = oView.getModel("edit");
            // ✅ FIXED: Get edit state for THIS specific table only
            const sPath = oEditModel.getProperty(`/${sTableId}/editingPath`) || "";
            const sMode = oEditModel.getProperty(`/${sTableId}/mode`);

            if (!sPath) {
                sap.m.MessageToast.show("No row is in edit mode.");
                return;
            }

            // 🚀 MULTI-ROW SAVE: Handle multi-edit and multi-add
            let aContextsToSave = [];

            if (sMode === "multi-edit" && sPath.includes(",")) {
                // Multi-row editing: get all selected contexts
                const aSelectedContexts = oTable.getSelectedContexts();
                aContextsToSave = aSelectedContexts;
            } else if (sMode === "add-multi" && sPath.includes(",")) {
                // Multi-add: resolve all transient contexts from the stored paths
                const aPaths = sPath.split(",").filter(Boolean);
                aContextsToSave = aPaths.map(p => this._resolveContextByPath(oTable, p)).filter(Boolean);
            } else {
                // Single row editing: find the specific context
                let oContext = this._resolveContextByPath(oTable, sPath);
                if (!oContext) {
                    // As a fallback, use first selected
                    const aSelectedContexts = oTable.getSelectedContexts();
                    oContext = aSelectedContexts && aSelectedContexts[0];
                }
                if (!oContext) {
                    sap.m.MessageBox.error("Unable to find edited context.");
                    return;
                }
                aContextsToSave = [oContext];
            }

            this.getView().setBusy(true);

            try {
                // 🔹 Push changed values from table cells into ALL contexts
                const oInnerTable = oTable._oTable; // internal responsiveTable of MDC
                if (oInnerTable && oInnerTable.getItems) {
                    const aItems = oInnerTable.getItems();

                    // Process each context to save
                    aContextsToSave.forEach((oContext, index) => {
                        const sContextPath = oContext.getPath();
                        const oData = oContext.getObject();
                        const bIsNewRow = oData && (oData._isNew || (typeof oContext.isTransient === "function" && oContext.isTransient()));


                        if (bIsNewRow) {
                            // ✅ NEW ROW: Properties are set during cell edits (they automatically use "changesGroup")
                            // ✅ CRITICAL: New rows are created with "changesGroup" from manifest.json
                            // ✅ DO NOT call setProperty again - it causes group mismatch errors
                            // ✅ The properties are already set when user edits cells in the table

                            // Remove client-side properties
                            if (oData) {
                                delete oData._isNew;
                                delete oData.isEditable;
                                delete oData._hasChanged;
                                delete oData._originalData;
                            }
                        } else {
                            // ✅ EXISTING ROW: Update properties from table cells
                            const oRow = aItems.find(item => {
                                const ctx = item.getBindingContext();
                                return ctx && ctx.getPath() === sContextPath;
                            });

                            if (oRow) {
                                oRow.getCells().forEach((cell) => {
                                    const oBinding = cell.getBinding("value");
                                    if (oBinding?.getPath && cell.getValue) {
                                        const sProp = oBinding.getPath();
                                        const vVal = cell.getValue();
                                        // ✅ Use GROUP_ID without hyphen (OData V4 requirement)
                                        oContext.setProperty(sProp, vVal, GROUP_ID);
                                    }
                                });

                                // Remove client-side properties
                                if (oData) {
                                    delete oData._isNew;
                                    delete oData.isEditable;
                                    delete oData._hasChanged;
                                    delete oData._originalData;
                                }
                            }
                        }
                    });
                }

                // ✅ FIXED: For new rows, use the default "changesGroup" from manifest
                // ✅ For existing rows, use table-specific GROUP_ID
                // ✅ Check if we have new rows - if so, submit both groups
                const aNewRows = aContextsToSave.filter(ctx => {
                    const oData = ctx.getObject();
                    return oData && (oData._isNew || (typeof ctx.isTransient === "function" && ctx.isTransient()));
                });

                if (aNewRows.length > 0) {
                    // ✅ New rows exist - submit with default "changesGroup"
                    await oModel.submitBatch("changesGroup");

                    // If there are existing rows, submit them separately
                    const aExistingRows = aContextsToSave.filter(ctx => !aNewRows.includes(ctx));
                    if (aExistingRows.length > 0) {
                        await oModel.submitBatch(GROUP_ID);
                    }
                } else {
                    // ✅ Only existing rows - use table-specific group
                    await oModel.submitBatch(GROUP_ID);
                }

                // 🔹 Clear the original data after successful save for ALL contexts
                aContextsToSave.forEach((oContext, index) => {
                    const oData = oContext.getObject();
                    if (oData._originalData) {
                        delete oData._originalData;
                    }
                    delete oData.isEditable;
                    delete oData._isNew; // Clear new row marker
                });

                sap.m.MessageToast.show("Changes saved successfully.");

                // 🔹 Refresh table
                oTable.getBinding("items")?.refresh();

                // ✅ FIXED: Reset edit state for THIS table only
                oEditModel.setProperty(`/${sTableId}/editingPath`, "");
                oEditModel.setProperty(`/${sTableId}/mode`, null);
                if (oEditModel.getProperty("/currentTable") === sTableId) {
                    oEditModel.setProperty("/currentTable", null);
                }

                // Clear selection to make table look normal
                oTable.clearSelection();

                const config = buttonMap[sTableId];
                this.byId(config.save)?.setEnabled(false);
                this.byId(config.cancel)?.setEnabled(false);
                this.byId(config.edit)?.setEnabled(false); // Disable edit until new selection
                this.byId(config.delete)?.setEnabled(false); // Disable delete until new selection
                this.byId(config.add)?.setEnabled(true);

                // Force table refresh to exit edit mode completely
                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.refresh();
                }

            } catch (err) {
                sap.m.MessageBox.error("Error saving changes. Check console for details.");
            } finally {
                this.getView().setBusy(false);
            }
        },

        // 🚀 ADD NEW ROW FUNCTIONALITY
        // ✅ Delegated to CRUDHelper
        onAdd: function (oEvent) {
            return CRUDHelper.prototype.onAdd.call(this, oEvent);
        },

        // ✅ Delegated to CRUDHelper
        _createEmptyRowData: function (sTableId) {
            return CRUDHelper.prototype._createEmptyRowData.call(this, sTableId);
        },
        // segemented button
        onToggleRowDetail: function (oEvent) {
            const sKey = oEvent.getParameters("key").item.mProperties.key;

            // Detect which table is currently visible - includes main tables and report tables
            const aTableIds = [
                "Opportunities", "Employees", "Customers", "Projects", "SAPIdStatuses", "Res", "Allocations",
                "EmployeeBenchReportTable", "EmployeeProbableReleaseReportTable", "RevenueForecastReportTable",
                "EmployeeAllocationReportTable", "EmployeeSkillReportTable", "ProjectsNearingCompletionReportTable"
            ];
            aTableIds.forEach((sTableId) => {
                const oTable = this.byId(sTableId);
                if (oTable && oTable.getVisible()) {
                    if (sKey === "more") {
                        // Show more: remove show-less, add show-more
                        oTable.removeStyleClass("show-less");
                        oTable.addStyleClass("show-more");
                    } else {
                        // Show less: remove show-more, add show-less
                        oTable.removeStyleClass("show-more");
                        oTable.addStyleClass("show-less");
                    }
                }
            });
        },
        // ✅ Delegated to FormHandler - kept here for backward compatibility
        _generateNextIdFromBinding: function (oTable, sEntitySet, sIdField, sPrefix) {
            return FormHandler.prototype._generateNextIdFromBinding.call(this, oTable, sEntitySet, sIdField, sPrefix);
        },
        onFilterSearch: function (oEvent) {

            // Get the source FilterBar
            const oFilterBar = oEvent.getSource();
            let sFilterBarId = oFilterBar.getId();

            // ✅ Extract base ID from full ID (e.g., "container-glassboard---Home--customerFilterBar" -> "customerFilterBar")
            const aIdParts = sFilterBarId.split("--");
            if (aIdParts.length > 0) {
                sFilterBarId = aIdParts[aIdParts.length - 1]; // Get the last part (base ID)
            }

            // ✅ Map FilterBar IDs to corresponding Table IDs - ISOLATED per fragment
            const filterToTableMap = {
                "customerFilterBar": "Customers",
                "employeeFilterBar": "Employees",
                "opportunityFilterBar": "Opportunities",
                "masterDemandsFilterBar" : "MasterDemands",
                "projectFilterBar": "Projects",
                "projectsFilterBar": "Projects", // ✅ Support both naming conventions
                "resFilterBar": "Res", // ✅ NEW: Employee FilterBar in Res fragment (Allocations - Employees view)
                "allocationFilterBar": "Allocations" // ✅ NEW: Project FilterBar in Allocations fragment (Allocations - Projects view)
                // ✅ REMOVED: "verticalsFilterBar": "Verticals"
                // Add more mappings as needed
            };

            const sTableId = filterToTableMap[sFilterBarId];
            if (!sTableId) {
                return;
            }

            // ✅ Only rebind the specific table for this FilterBar - ISOLATED
            const oTable = this.byId(sTableId);
            if (oTable && typeof oTable.rebind === "function") {
                oTable.rebind();
                
                // ✅ NEW: For Res table, apply allocation filter (empallocpercentage <= 95 and status != "Resigned") after rebind
                if (sTableId === "Res" && this._getAllocationFilter) {
                    setTimeout(() => {
                        const oBinding = oTable.getRowBinding && oTable.getRowBinding();
                        if (oBinding) {
                            const oAllocationFilter = this._getAllocationFilter();
                            const aCurrentFilters = oBinding.getFilters() || [];
                            // Check if allocation filter is already in the filters
                            const bHasAllocationFilter = aCurrentFilters.some(f => {
                                if (f.getFilters && f.getFilters().length === 2) {
                                    const aSubFilters = f.getFilters();
                                    return aSubFilters.some(sf => 
                                        sf.getPath() === "empallocpercentage" && (sf.getOperator() === "LT" || sf.getOperator() === "LE") && sf.getValue1() === 95
                                    ) && aSubFilters.some(sf => 
                                        sf.getPath() === "status" && sf.getOperator() === "NE" && sf.getValue1() === "Resigned"
                                    );
                                }
                                return false;
                            });
                            if (!bHasAllocationFilter) {
                                // Combine existing filters with allocation filter
                                const aCombinedFilters = [...aCurrentFilters, oAllocationFilter];
                                oBinding.filter(aCombinedFilters);
                            }
                        }
                    }, 500);
                }
            } else if (oTable && typeof oTable.bindRows === "function") {
                oTable.bindRows();
            } else {
            }
        },
        // ✅ Delegated to FileUploadHelper
        _onUploadPress: function (oEvent) {
            return FileUploadHelper.prototype._onUploadPress.call(this, oEvent);
        },
        // ✅ Delegated to FileUploadHelper
        _onCloseUpload: function () {
            return FileUploadHelper.prototype._onCloseUpload.call(this);
        },
        _onSplitButtonArrowPress: function (oEvent) {

            this.oEventStore = oEvent;
            const oSource = this.oEventStore.getSource();

            if (!this._oMenu) {
                this._oMenu = new sap.m.Menu({
                    items: [
                        new sap.m.MenuItem({
                            text: "Upload Template",
                            tooltip: "Upload",
                            press: () => this.onUpload(this.oEventStore)
                        }),
                        new sap.m.MenuItem({
                            text: "Download Template",
                            tooltip: "Download Template",
                            press: () => this.exportUploadTemplate(this.oEventStore)
                        })
                    ]
                });
            }
            this._oMenu.openBy(oSource);

        },
        // ✅ Delegated to FileUploadHelper
        _onFileUploadChange: function (oEvent) {
            return FileUploadHelper.prototype._onFileUploadChange.call(this, oEvent);
        },
        _onMessagePopoverPress: function (oEvent) {

            var oSourceControl = oEvent.getSource(); // The button that was clicked
            this.getMessagePopover(this).then(function (oMessagePopover) {
                oMessagePopover.openBy(oSourceControl); // Open the MessagePopover anchored to the button
            });
        },
        _getMessagePopover: function (oController) {
            const oView = oController.getView();
            if (!oController._pMessagePopover) {
                oController._pMessagePopover = new sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "glassboard.view.fragments.MessagePopover"
                }).then(function (oMessagePopover) {
                    oView.addDependent(oMessagePopover);
                    return oMessagePopover;
                });
            }
            return oController._pMessagePopover;
        },
        // ✅ Delegated to FileUploadHelper
        _onFileUploadSubmit: async function () {
            return FileUploadHelper.prototype._onFileUploadSubmit.call(this);
        },

        _updateMessageButtonIcon: function (oController) {
            const oView = oController.getView();
            const aMessages = oView.getModel("message").getData();

            const oButton = oView.byId("uploadLogButton");


            if (oButton) {
                if (aMessages && aMessages.length > 0) {
                    const oLastMessage = aMessages[aMessages.length - 1];
                    const sType = oLastMessage.type;

                    if (sType === "Error") {
                        oButton.setIcon("sap-icon://error");
                        oButton.setType("Negative");
                    } else if (sType === "Success") {
                        oButton.setIcon("sap-icon://sys-enter-2");
                        oButton.setType("Success");
                    } else {
                        oButton.setIcon("sap-icon://alert");
                        oButton.setType("Default");
                    }
                } else {
                    // Reset when there are no messages
                    oButton.setIcon("sap-icon://message-popup");
                    oButton.setType("Default");
                }
            }
        },
        // ✅ Delegated to FileUploadHelper
        _exportUploadTemplate: function (oEvent) {
            return FileUploadHelper.prototype._exportUploadTemplate.call(this, oEvent);
        },
        // ✅ Delegated to FileUploadHelper
        _downloadCSV: function (sContent, sFileName) {
            return FileUploadHelper.prototype._downloadCSV.call(this, sContent, sFileName);
        },




    });
});

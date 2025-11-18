sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("glassboard.utility.CRUDHelper", {
        /**
         * Delete selected rows
         */
        onDeletePress: function (oEvent) {
            const buttonMap = {
                "Customers": { edit: "btnEdit_cus", delete: "btnDelete_cus" },
                "Employees": { edit: "Edit_emp", delete: "Delete_emp" },
                "Opportunities": { edit: "btnEdit_oppr", delete: "btnDelete_oppr" },
                "Projects": { edit: "btnEdit_proj", delete: "btnDelete_proj" },
                "SAPIdStatuses": { edit: "btnEdit_sap", delete: "btnDelete_sap" }
            };

            const sButtonId = oEvent.getSource().getId().split("--").pop();
            const sTableId = Object.keys(buttonMap).find(tableId => buttonMap[tableId].delete === sButtonId);

            if (!sTableId) {
                return sap.m.MessageBox.error("No table mapping found for delete button: " + sButtonId);
            }

            const oView = this.getView();
            const oTable = this.byId(sTableId);
            const oDeleteBtn = this.byId(buttonMap[sTableId].delete);
            const oEditBtn = this.byId(buttonMap[sTableId].edit);

            if (!oTable) {
                return sap.m.MessageBox.error(`Table '${sTableId}' not found.`);
            }

            const aSelectedContexts = oTable.getSelectedContexts?.() || [];

            if (aSelectedContexts.length === 0) {
                return sap.m.MessageBox.warning("Please select one or more entries to delete.");
            }

            sap.m.MessageBox.confirm("Are you sure you want to delete the selected entries?", {
                onClose: async (sAction) => {
                    if (sAction !== sap.m.MessageBox.Action.OK) {
                        return;
                    }

                    oView.setBusy(true);

                    try {
                        oView.setBusy(false);

                        let bAllDeleted = true;
                        let sErrorMessage = "";

                        try {
                            const oModel = this.getView().getModel();
                            const sGroupId = "changesGroup";
                            let queued = 0;
                            aSelectedContexts.forEach((oContext) => {
                                try {
                                    const sPath = oContext.getPath && oContext.getPath();
                                    oContext.delete(sGroupId);
                                    queued++;
                                } catch (e) {
                                }
                            });
                            if (queued > 0 && oModel && oModel.submitBatch) {
                                await oModel.submitBatch(sGroupId);
                                bAllDeleted = true;
                            } else {
                                bAllDeleted = false;
                            }
                        } catch (deleteError) {
                            bAllDeleted = false;
                        }

                        try {
                            this._setUIChanges(true);

                            setTimeout(() => {
                                try {
                                    this.initializeTable(sTableId);
                                    this._setUIChanges(false);
                                } catch (updateError) {
                                    this._setUIChanges(false);
                                }
                            }, 500);

                        } catch (updateError) {
                            this._setUIChanges(false);
                        }

                        oTable.clearSelection();

                        try {
                            this.initializeTable(sTableId);
                        } catch (finalUpdateError) {
                        }

                        if (bAllDeleted) {
                            sap.m.MessageToast.show(`${sTableId} entries successfully deleted.`);

                            setTimeout(() => {
                                if (oTable.rebind) {
                                    try {
                                        oTable.rebind();
                                    } catch (e) {
                                    }
                                }

                                const oRowBinding = oTable.getRowBinding && oTable.getRowBinding();
                                const oBinding = oTable.getBinding("rows") || oTable.getBinding("items");

                                if (oRowBinding) {
                                    oRowBinding.refresh().then(() => {
                                    }).catch(() => {
                                        // Error refreshing row binding - silently fail
                                    });
                                } else if (oBinding) {
                                    oBinding.refresh().then(() => {
                                    }).catch(() => {
                                        // Error refreshing binding - silently fail
                                    });
                                }
                            }, 200);
                        } else {
                            sap.m.MessageBox.error("Some entries could not be deleted. Check console for details.");

                            setTimeout(() => {
                                const oRowBinding = oTable.getRowBinding && oTable.getRowBinding();
                                const oBinding = oTable.getBinding("rows") || oTable.getBinding("items");

                                const fnRefresh = () => {
                                    if (oRowBinding) {
                                        return oRowBinding.refresh(true);
                                    } else if (oBinding) {
                                        return oBinding.refresh(true);
                                    }
                                    return Promise.resolve();
                                };

                                fnRefresh().then(() => {
                                    if (oTable.rebind) {
                                        oTable.rebind();
                                    }
                                }).catch(() => {
                                    if (oTable.rebind) {
                                        oTable.rebind();
                                    }
                                });
                            }, 100);
                        }

                    } catch (error) {
                        if (!bAllDeleted) {
                            sap.m.MessageBox.error("Delete operation failed completely. Please try again.");
                            const oBinding = oTable.getBinding("items");
                            if (oBinding) {
                                oBinding.refresh();
                            }
                        }
                    } finally {
                        oView.setBusy(false);
                        oDeleteBtn?.setEnabled(false);
                        oEditBtn?.setEnabled(false);

                        setTimeout(() => {
                            oView.invalidate();
                        }, 100);
                    }
                }
            });
        },

        /**
         * Enable edit mode for selected rows
         */
        onEditPress: function (oEvent) {
            const buttonMap = {
                "Customers": { edit: "btnEdit_cus", delete: "btnDelete_cus", save: "saveButton", cancel: "cancelButton", add: "btnAdd" },
                "Employees": { edit: "Edit_emp", delete: "Delete_emp", save: "saveButton_emp", cancel: "cancelButton_emp", add: "btnAdd_emp" },
                "Opportunities": { edit: "btnEdit_oppr", delete: "btnDelete_oppr", save: "saveButton_oppr", cancel: "cancelButton_oppr", add: "btnAdd_oppr" },
                "Projects": { edit: "btnEdit_proj", delete: "btnDelete_proj", save: "saveButton_proj", cancel: "cancelButton_proj", add: "btnAdd_proj" },
                "SAPIdStatuses": { edit: "btnEdit_sap", delete: "btnDelete_sap", save: "saveButton_sap", cancel: "cancelButton_sap", add: "btnAdd_sap" }
            };

            let sTableId = "Customers";
            if (oEvent && oEvent.getSource) {
                const sButtonId = oEvent.getSource().getId().split("--").pop();
                sTableId = Object.keys(buttonMap).find(tableId => buttonMap[tableId].edit === sButtonId) || "Customers";
            }

            const oTable = this.byId(sTableId);
            const aSelectedContexts = oTable.getSelectedContexts();

            if (!aSelectedContexts.length) {
                sap.m.MessageToast.show("Please select one or more rows to edit.");
                return;
            }

            const aEditingPaths = [];
            const aEditingContexts = [];

            aSelectedContexts.forEach((oContext) => {
                const oData = oContext.getObject();
                oData._originalData = JSON.parse(JSON.stringify(oData));
                oData.isEditable = true;
                aEditingPaths.push(oContext.getPath());
                aEditingContexts.push(oContext);
            });

            const oEditModel = this.getView().getModel("edit");
            const sEditingPaths = aEditingPaths.join(",");
            oEditModel.setProperty(`/${sTableId}/editingPath`, sEditingPaths);
            oEditModel.setProperty(`/${sTableId}/mode`, "multi-edit");
            oEditModel.setProperty("/currentTable", sTableId);

            const config = buttonMap[sTableId];
            this.byId(config.save)?.setEnabled(true);
            this.byId(config.cancel)?.setEnabled(true);
            this.byId(config.edit)?.setEnabled(false);
            this.byId(config.delete)?.setEnabled(false);
            this.byId(config.add)?.setEnabled(false);

            oTable.getBinding("items")?.refresh();

            setTimeout(() => {
                oTable.getBinding("items")?.refresh();
            }, 100);

            sap.m.MessageToast.show(`${aSelectedContexts.length} rows are now in edit mode.`);
        },

        /**
         * Add new row
         */
        onAdd: function (oEvent) {
            const sTableId = oEvent.getSource().data("tableId") || "Customers";
            const oTable = this.byId(sTableId);

            if (!oTable) {
                sap.m.MessageBox.error(`Table '${sTableId}' not found.`);
                return;
            }

            try {
                let oBinding = oTable.getBinding("items") || oTable.getBinding("rows") || oTable.getBinding("data");

                if (!oBinding) {
                    const oModel = oTable.getModel();
                    if (oModel) {
                        const sPath = "/" + sTableId;
                        try {
                            const oNewContext = oModel.createEntry(sPath, {
                                properties: this._createEmptyRowData(sTableId)
                            });

                            if (oNewContext) {
                                const oData = oNewContext.getObject();
                                if (oData) {
                                    oData._isNew = true;
                                    oData.isEditable = true;
                                    oData._hasChanged = false;
                                }
                                this._executeAddWithRetry(oTable, null, sTableId, oNewContext);
                                return;
                            }
                        } catch (directError) {
                        }
                    }

                    setTimeout(() => {
                        oBinding = oTable.getBinding("items") || oTable.getBinding("rows") || oTable.getBinding("data");
                        if (oBinding) {
                            this._executeAddWithRetry(oTable, oBinding, sTableId);
                        } else {
                            sap.m.MessageBox.error("No data binding available. Please ensure the table is fully loaded and try again.");
                        }
                    }, 1000);
                    return;
                }

                const oNewRowData = this._createEmptyRowData(sTableId);

                try {
                    const idMap = {
                        Customers: { field: "SAPcustId", prefix: "C" },
                        Opportunities: { field: "sapOpportunityId", prefix: "O" },
                        Projects: { field: "sapPId", prefix: "P" }
                    };

                    if (idMap[sTableId]) {
                        const { field, prefix } = idMap[sTableId];
                        const sGeneratedId = this._generateNextIdFromBinding(oTable, sTableId, field, prefix);
                        oNewRowData[field] = sGeneratedId;
                    }
                } catch (e) {
                }

                const oNewContext = oBinding.create(oNewRowData, "changesGroup");

                const oData = oNewContext.getObject();
                if (oData) {
                    oData._isNew = true;
                    oData.isEditable = true;
                    oData._hasChanged = false;
                }

                const oEditModel = this.getView().getModel("edit");
                if (!oEditModel) {
                    const oEditModelData = {
                        editingPath: "",
                        mode: null
                    };
                    this.getView().setModel(new sap.ui.model.json.JSONModel(oEditModelData), "edit");
                }

                const oEditModelFinal = this.getView().getModel("edit");
                const sExistingPaths = oEditModelFinal.getProperty(`/${sTableId}/editingPath`) || "";
                const sNewPath = oNewContext.getPath();
                if (sExistingPaths && sExistingPaths.length > 0) {
                    const aPaths = sExistingPaths.split(",").filter(Boolean);
                    if (!aPaths.includes(sNewPath)) {
                        aPaths.push(sNewPath);
                    }
                    oEditModelFinal.setProperty(`/${sTableId}/editingPath`, aPaths.join(","));
                    oEditModelFinal.setProperty(`/${sTableId}/mode`, "add-multi");
                } else {
                    oEditModelFinal.setProperty(`/${sTableId}/editingPath`, sNewPath);
                    oEditModelFinal.setProperty(`/${sTableId}/mode`, "add");
                }
                oEditModelFinal.setProperty("/currentTable", sTableId);

                const buttonMap = {
                    "Customers": { edit: "btnEdit_cus", delete: "btnDelete_cus", save: "saveButton", cancel: "cancelButton", add: "btnAdd" },
                    "Employees": { edit: "Edit_emp", delete: "Delete_emp", save: "saveButton_emp", cancel: "cancelButton_emp", add: "btnAdd_emp" },
                    "Opportunities": { edit: "btnEdit_oppr", delete: "btnDelete_oppr", save: "saveButton_oppr", cancel: "cancelButton_oppr", add: "btnAdd_oppr" },
                    "Projects": { edit: "btnEdit_proj", delete: "btnDelete_proj", save: "saveButton_proj", cancel: "cancelButton_proj", add: "btnAdd_proj" },
                    "SAPIdStatuses": { edit: "btnEdit_sap", delete: "btnDelete_sap", save: "saveButton_sap", cancel: "cancelButton_sap", add: "btnAdd_sap" }
                };

                const config = buttonMap[sTableId];
                this.byId(config.save)?.setEnabled(true);
                this.byId(config.cancel)?.setEnabled(true);
                this.byId(config.edit)?.setEnabled(false);
                this.byId(config.delete)?.setEnabled(false);
                this.byId(config.add)?.setEnabled(true);

                if (oTable.clearSelection) {
                    oTable.clearSelection();
                } else if (oTable.removeSelections) {
                    oTable.removeSelections();
                }

                const sTableIdLower = sTableId.toLowerCase();
                if (sTableIdLower === "customers") {
                    this._onCustDialogData([]);
                } else if (sTableIdLower === "employees") {
                    this._onEmpDialogData([]);
                } else if (sTableIdLower === "opportunities") {
                    this._onOppDialogData([]);
                } else if (sTableIdLower === "projects") {
                    this._onProjDialogData([]);
                }

                oTable.getBinding("items")?.refresh();

                setTimeout(() => {
                    oTable.getBinding("items")?.refresh();
                }, 100);

                sap.m.MessageToast.show("New row added. You can now fill in the data.");

            } catch (error) {
                sap.m.MessageBox.error("Failed to add new row: " + error.message);
            }
        },

        /**
         * Create empty row data for a table
         */
        _createEmptyRowData: function (sTableId) {
            const oEmptyData = {};

            if (sTableId === "Customers") {
                oEmptyData.SAPcustId = "";
                oEmptyData.customerName = "";
                oEmptyData.state = "";
                oEmptyData.country = "";
                oEmptyData.status = "";
                oEmptyData.vertical = "";
            } else if (sTableId === "Employees") {
                oEmptyData.ohrId = "";
                oEmptyData.mailid = "";
                oEmptyData.fullName = "";
                oEmptyData.gender = "";
                oEmptyData.employeeType = "";
                oEmptyData.doj = "";
                oEmptyData.band = "";
                oEmptyData.role = "";
                oEmptyData.location = "";
                oEmptyData.supervisorOHR = "";
                oEmptyData.skills = "";
                oEmptyData.city = "";
                oEmptyData.lwd = "";
                oEmptyData.status = "";
            } else if (sTableId === "Opportunities") {
                oEmptyData.sapOpportunityId = "";
                oEmptyData.sfdcOpportunityId = "";
                oEmptyData.opportunityName = "";
                oEmptyData.businessUnit = "";
                oEmptyData.probability = "";
                oEmptyData.salesSPOC = "";
                oEmptyData.deliverySPOC = "";
                oEmptyData.expectedStart = "";
                oEmptyData.expectedEnd = "";
                oEmptyData.tcv = "";
                oEmptyData.currency = "";
                oEmptyData.Stage = "";
                oEmptyData.customerId = "";
            } else if (sTableId === "Projects") {
                oEmptyData.sapPId = "";
                oEmptyData.sfdcPId = "";
                oEmptyData.projectName = "";
                oEmptyData.startDate = "";
                oEmptyData.endDate = "";
                oEmptyData.gpm = "";
                oEmptyData.projectType = "";
                oEmptyData.status = "";
                oEmptyData.oppId = "";
                oEmptyData.requiredResources = "";
                oEmptyData.allocatedResources = "";
                oEmptyData.toBeAllocated = "";
                oEmptyData.SOWReceived = "";
                oEmptyData.POReceived = "";
            }

            return oEmptyData;
        },

        /**
         * Execute add with retry logic
         */
        _executeAddWithRetry: function (oTable, oBinding, sTableId, oNewContext) {
            // This is a helper method that may be called from onAdd
            // Implementation can be added if needed
        },

        /**
         * Cancel edit operation
         */
        _performCancelOperation: function (sTableId, bSkipConfirmation) {
            const self = this;

            const buttonMap = {
                "Customers": { edit: "btnEdit_cus", delete: "btnDelete_cus", save: "saveButton", cancel: "cancelButton", add: "btnAdd" },
                "Employees": { edit: "Edit_emp", delete: "Delete_emp", save: "saveButton_emp", cancel: "cancelButton_emp", add: "btnAdd_emp" },
                "Opportunities": { edit: "btnEdit_oppr", delete: "btnDelete_oppr", save: "saveButton_oppr", cancel: "cancelButton_oppr", add: "btnAdd_oppr" },
                "Projects": { edit: "btnEdit_proj", delete: "btnDelete_proj", save: "saveButton_proj", cancel: "cancelButton_proj", add: "btnAdd_proj" },
                "SAPIdStatuses": { edit: "btnEdit_sap", delete: "btnDelete_sap", save: "saveButton_sap", cancel: "cancelButton_sap", add: "btnAdd_sap" }
            };

            const oTable = self.byId(sTableId);
            const oView = self.getView();
            const oModel = oView.getModel();
            const oEditModel = oView.getModel("edit");
            const sPath = oEditModel.getProperty(`/${sTableId}/editingPath`) || "";
            const sMode = oEditModel.getProperty(`/${sTableId}/mode`);

            if (!sPath) {
                sap.m.MessageToast.show("No row is in edit mode.");
                return;
            }

            let aContextsToCancel = [];
            const aSelectedContexts = oTable.getSelectedContexts();

            if (aSelectedContexts && aSelectedContexts.length > 0) {
                aContextsToCancel = aSelectedContexts.filter(ctx => {
                    const sCtxPath = ctx.getPath();
                    if (sMode === "add-multi" || sMode === "multi-edit") {
                        return sPath.includes(sCtxPath);
                    }
                    return sPath === sCtxPath || sPath.includes(sCtxPath);
                });
            } else if ((sMode === "multi-edit" || sMode === "add-multi") && sPath.includes(",")) {
                const aPaths = sPath.split(",").filter(Boolean);
                aContextsToCancel = aPaths.map(p => self._resolveContextByPath(oTable, p)).filter(Boolean);
            } else {
                let oContext = self._resolveContextByPath(oTable, sPath);
                if (!oContext) {
                    const aFallbackSelected = oTable.getSelectedContexts();
                    oContext = aFallbackSelected && aFallbackSelected.find(ctx => ctx.getPath() === sPath) || aFallbackSelected && aFallbackSelected[0];
                }
                if (!oContext) {
                    sap.m.MessageToast.show("Unable to find edited context.");
                    return;
                }
                aContextsToCancel = [oContext];
            }

            if (aContextsToCancel.length === 0) {
                sap.m.MessageToast.show("No contexts to cancel.");
                return;
            }

            aContextsToCancel.forEach((oContext) => {
                try {
                    const oData = oContext.getObject();
                    if (oData._isNew) {
                        oContext.delete();
                    } else if (oData._originalData) {
                        Object.keys(oData._originalData).forEach(key => {
                            if (key !== "_originalData" && key !== "_isNew" && key !== "isEditable" && key !== "_hasChanged") {
                                oData[key] = oData._originalData[key];
                            }
                        });
                        delete oData._originalData;
                        delete oData.isEditable;
                        delete oData._hasChanged;
                    }
                } catch (e) {
                }
            });

            const aRemainingPaths = aContextsToCancel.map(ctx => ctx.getPath());
            const sRemainingPath = sPath.split(",").filter(p => !aRemainingPaths.includes(p)).join(",");

            if (sRemainingPath) {
                oEditModel.setProperty(`/${sTableId}/editingPath`, sRemainingPath);
            } else {
                oEditModel.setProperty(`/${sTableId}/editingPath`, "");
                oEditModel.setProperty(`/${sTableId}/mode`, null);
            }

            const config = buttonMap[sTableId];
            this.byId(config.save)?.setEnabled(false);
            this.byId(config.cancel)?.setEnabled(false);
            this.byId(config.edit)?.setEnabled(true);
            this.byId(config.delete)?.setEnabled(true);
            this.byId(config.add)?.setEnabled(true);

            oTable.getBinding("items")?.refresh();

            setTimeout(() => {
                oTable.getBinding("items")?.refresh();
            }, 100);

            sap.m.MessageToast.show("Changes cancelled.");
        },

        /**
         * Resolve context by path
         */
        _resolveContextByPath: function (oTable, sPath) {
            if (!oTable || !sPath) return null;
            const oBinding = this._getRowBinding(oTable);
            if (oBinding) {
                const aCtx = (typeof oBinding.getAllCurrentContexts === "function") ? oBinding.getAllCurrentContexts() : oBinding.getContexts();
                if (Array.isArray(aCtx) && aCtx.length) {
                    const hit = aCtx.find((c) => c && c.getPath && c.getPath() === sPath);
                    if (hit) return hit;
                }
            }
            const oInner = oTable && oTable._oTable;
            if (oInner && typeof oInner.getItems === "function") {
                const aItems = oInner.getItems();
                for (let i = 0; i < aItems.length; i++) {
                    const ctx = aItems[i].getBindingContext && aItems[i].getBindingContext();
                    if (ctx && ctx.getPath && ctx.getPath() === sPath) {
                        return ctx;
                    }
                }
            }
            return null;
        },

        /**
         * Get row binding
         */
        _getRowBinding: function (oTable) {
            return (oTable && oTable.getRowBinding && oTable.getRowBinding())
                || (oTable && oTable.getBinding && (oTable.getBinding("items") || oTable.getBinding("rows")))
                || null;
        },

        /**
         * Set UI changes state
         */
        _setUIChanges: function (bHasChanges) {
            try {
                const oView = this.getView();
                const oAppModel = oView.getModel("appView");

                if (oAppModel) {
                    oAppModel.setProperty("/hasUIChanges", bHasChanges);
                } else {
                    const oViewModel = new sap.ui.model.json.JSONModel({
                        busy: false,
                        hasUIChanges: bHasChanges,
                        usernameEmpty: false,
                        order: 0
                    });
                    oView.setModel(oViewModel, "appView");
                }
            } catch (error) {
            }
        }
    });
});


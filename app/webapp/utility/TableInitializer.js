sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/mdc/p13n/StateUtil"
], function (Controller, StateUtil) {
    "use strict";

    return Controller.extend("glassboard.utility.TableInitializer", {
        /**
         * Initialize table with personalization and actions column
         */
        initializeTable: function (sTableId) {
            const aTableIds = sTableId ? [sTableId] : ["Customers", "Opportunities", "Projects", "SAPIdStatuses", "Employees", "Demands", "Allocations", "Res"];
            let oTable = null;

            for (const sId of aTableIds) {
                oTable = this.byId(sId);
                if (oTable) {
                    break;
                }
            }

            if (!oTable) {
                return Promise.resolve();
            }

            return oTable.initialized().then(() => {
                // ✅ CRITICAL: Wait additional time to ensure personalization API is fully ready
                // Reduced delay to show columns faster
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, 100);
                });
            }).then(() => {
                const oDelegate = oTable.getControlDelegate();

                return oDelegate.fetchProperties(oTable)
                    .then((aProperties) => {
                        if (!aProperties || aProperties.length === 0) {
                            return new Promise((resolve) => {
                                setTimeout(() => {
                                    oDelegate.fetchProperties(oTable).then((aRetryProperties) => {
                                        if (aRetryProperties && aRetryProperties.length > 0) {
                                            resolve(aRetryProperties);
                                        } else {
                                            resolve([]);
                                        }
                                    }).catch(() => resolve([]));
                                }, 300);
                            });
                        }

                        const aItems = aProperties
                            .filter((p) => !p.name || !String(p.name).startsWith("$"))
                            .map((p) => ({
                                name: p.name || p.path,
                                visible: true
                            }));

                        const oExternalState = { items: aItems };
                        const sTableIdForCheck = oTable.getId() || sTableId || "";
                        const bSkipStateApplication = false; // Can be set to true for problematic tables
                        
                        // ✅ CRITICAL: Apply column state IMMEDIATELY to show columns right away
                        // This prevents the "no visible columns" message
                        if (!bSkipStateApplication) {
                            try {
                                if (StateUtil && typeof StateUtil.applyExternalState === 'function') {
                                    if (oTable && oTable.getId) {
                                        // Try to apply state immediately (non-blocking)
                                        try {
                                            const oApplyPromise = StateUtil.applyExternalState(oTable, oExternalState);
                                            if (oApplyPromise && typeof oApplyPromise.then === 'function') {
                                                // Don't wait for this - let it complete in background
                                                oApplyPromise.catch((oError) => {
                                                    const sErrorMsg = oError && (oError.message || String(oError)) || '';
                                                    if (!sErrorMsg.includes("waitForInit") && !sErrorMsg.includes("is not a function") && !sErrorMsg.includes("Cannot read properties")) {
                                                        console.warn(`[TableInitializer] Could not apply external state for ${sTableIdForCheck}:`, sErrorMsg);
                                                    }
                                                });
                                            }
                                        } catch (oSyncError) {
                                            // Synchronous error - API not ready, will retry below
                                            const sErrorMsg = oSyncError && (oSyncError.message || String(oSyncError)) || '';
                                            if (!sErrorMsg.includes("waitForInit") && !sErrorMsg.includes("is not a function")) {
                                                console.warn(`[TableInitializer] Personalization API not ready for ${sTableIdForCheck}, will retry`);
                                            }
                                        }
                                    }
                                }
                            } catch (oError) {
                                // Ignore errors on first attempt - will retry below
                            }
                        }
                        
                        // ✅ Return immediately so table can show columns
                        // Apply personalization state in background (non-blocking)
                        if (!bSkipStateApplication) {
                            // Retry with delay in background for personalization API readiness
                            setTimeout(() => {
                                try {
                                    if (StateUtil && typeof StateUtil.applyExternalState === 'function') {
                                        if (oTable && oTable.getId) {
                                            try {
                                                const oApplyPromise = StateUtil.applyExternalState(oTable, oExternalState);
                                                if (oApplyPromise && typeof oApplyPromise.then === 'function') {
                                                    oApplyPromise.catch((oError) => {
                                                        const sErrorMsg = oError && (oError.message || String(oError)) || '';
                                                        if (!sErrorMsg.includes("waitForInit") && !sErrorMsg.includes("is not a function") && !sErrorMsg.includes("Cannot read properties")) {
                                                            console.warn(`[TableInitializer] Could not apply external state (retry) for ${sTableIdForCheck}:`, sErrorMsg);
                                                        }
                                                    });
                                                }
                                            } catch (oSyncError) {
                                                // Ignore - already tried
                                            }
                                        }
                                    }
                                } catch (oError) {
                                    // Ignore background retry errors
                                }
                            }, 1000); // Retry after 1 second in background
                        }
                        
                        // ✅ Resolve immediately so table shows columns right away
                        return Promise.resolve();
                    })
                    .then(() => {
                        const sTableId = oTable.getId() || "";
                        const bIsReportTable = sTableId.includes("Report") || oTable.getMetadata().getName() === "sap.ui.mdc.Table";

                        if (!bIsReportTable) {
                            const oDelegateAgain = oTable.getControlDelegate();
                            if (!oTable.getColumns().some(function (c) { return c.getId && c.getId().endsWith("--col-actions"); })) {
                                return oDelegateAgain.addItem(oTable, "_actions").then(function (oCol) {
                                    oTable.addColumn(oCol);
                                    oTable.rebind();
                                }).catch(function () {
                                    oTable.rebind();
                                    return Promise.resolve();
                                });
                            } else {
                                oTable.rebind();
                                return Promise.resolve();
                            }
                        } else {
                            oTable.rebind();
                            return Promise.resolve();
                        }
                    })
                    .then(() => {
                        oTable.attachSelectionChange(this._updateSelectionState, this);

                        const oModel = this.getOwnerComponent().getModel();
                        if (oModel && oModel.attachPropertyChange) {
                            oModel.attachPropertyChange(this._updatePendingState, this);
                        }

                        return Promise.resolve();
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            });
        },

        /**
         * Update selection state
         */
        _updateSelectionState: function () {
            const oView = this.getView();
            const oModel = oView.getModel("model");
            if (!oModel) {
                oModel = new sap.ui.model.json.JSONModel({});
                oView.setModel(oModel, "model");
            }

            const aTables = ["Customers", "Employees", "Opportunities", "Projects", "Demands", "Allocations", "Res"];
            let bHasSelection = false;

            aTables.forEach((sTableId) => {
                const oTable = this.byId(sTableId);
                if (oTable) {
                    const aSelected = oTable.getSelectedContexts ? oTable.getSelectedContexts() : [];
                    if (aSelected.length > 0) {
                        bHasSelection = true;
                    }
                }
            });

            oModel.setProperty("/hasSelected", bHasSelection);
        },

        /**
         * Update pending changes state
         */
        _updatePendingState: function () {
            const oView = this.getView();
            const oModel = oView.getModel("model");
            if (!oModel) {
                oModel = new sap.ui.model.json.JSONModel({});
                oView.setModel(oModel, "model");
            }

            const oMainModel = this.getOwnerComponent().getModel();
            const bHasChanges = oMainModel && oMainModel.hasPendingChanges ? oMainModel.hasPendingChanges() : false;
            oModel.setProperty("/hasPendingChanges", bHasChanges);
        }
    });
});


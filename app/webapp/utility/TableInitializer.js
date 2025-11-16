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
                                }, 500);
                            });
                        }

                        const aItems = aProperties
                            .filter((p) => !p.name || !String(p.name).startsWith("$"))
                            .map((p) => ({
                                name: p.name || p.path,
                                visible: true
                            }));

                        const oExternalState = { items: aItems };
                        return StateUtil.applyExternalState(oTable, oExternalState);
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


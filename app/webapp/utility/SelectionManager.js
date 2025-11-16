sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("glassboard.utility.SelectionManager", {
        /**
         * Get selected contexts from table
         */
        _getSelectedContexts: function () {
            const oTable = this.byId("Customers");
            return (oTable && oTable.getSelectedContexts) ? oTable.getSelectedContexts() : [];
        },

        /**
         * Handle selection change
         */
        onSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const sTableId = oTable.getId().split("--").pop();

            const buttonMap = {
                "Customers": { edit: "btnEdit_cus", delete: "btnDelete_cus" },
                "Employees": { edit: "Edit_emp", delete: "Delete_emp" },
                "Opportunities": { edit: "btnEdit_oppr", delete: "btnDelete_oppr" },
                "Projects": { edit: "btnEdit_proj", delete: "btnDelete_proj" },
                "SAPIdStatuses": { edit: "btnEdit_sap", delete: "btnDelete_sap" },
                "Allocations": { demand: "demand_alloc", delete: "btnDelete_alloc" },
                "Demands": { resources: "Resources_demand", delete: "btnDelete_demand" },
                "Res": { allocate: "btnResAllocate", delete: "Delete_res1" }
            };

            const config = buttonMap[sTableId];
            if (!config) {
                return;
            }

            const aSelectedContexts = oTable.getSelectedContexts();
            const bHasSelection = aSelectedContexts.length > 0;

            if (!bHasSelection) {
                if (sTableId === "Customers") {
                    this._onCustDialogData([]);
                } else if (sTableId === "Employees") {
                    this._onEmpDialogData([]);
                } else if (sTableId === "Opportunities") {
                    this._onOppDialogData([]);
                } else if (sTableId === "Projects") {
                    this._onProjDialogData([]);
                } else if (sTableId === "Demands") {
                    this._onDemandDialogData([]);
                }
            }

            if (sTableId === "Customers") {
                this.byId("editButton_cus")?.setEnabled(bHasSelection);
            } else if (sTableId === "Employees") {
                this.byId("editButton_emp")?.setEnabled(bHasSelection);
            } else if (sTableId === "Opportunities") {
                this.byId("editButton_oppr")?.setEnabled(bHasSelection);
            } else if (sTableId === "Projects") {
                this.byId("editButton_proj")?.setEnabled(bHasSelection);
            } else if (sTableId === "Demands") {
                this.byId("editButton_demand")?.setEnabled(bHasSelection);
            }

            if (config.edit) {
                this.byId(config.edit)?.setEnabled(bHasSelection);
            }
            if (config.delete) {
                this.byId(config.delete)?.setEnabled(bHasSelection);
            }
            if (config.demand) {
                this.byId(config.demand)?.setEnabled(bHasSelection);
            }
            if (config.resources) {
                this.byId(config.resources)?.setEnabled(bHasSelection);
            }
            if (config.allocate) {
                this.byId(config.allocate)?.setEnabled(bHasSelection);
            }

            if (sTableId === "Res") {
                const vbox = this.byId("selectedEmployeeVBox");

                const items = vbox.getItems();
                items.slice(1).forEach(item => vbox.removeItem(item));

                if (bHasSelection) {
                    const oModel = this.getView().getModel();

                    const oListBinding = oModel.bindList("/Allocations", null, null, null, {
                        $expand: "to_Project"
                    });

                    aSelectedContexts.forEach((oContext) => {
                        const oObj = oContext.getObject();
                        const sEmployeeId = oObj.employeeId;
                        const sProjectId = oObj.projectId;

                        oModel.read(`/Projects('${sProjectId}')`).then((oProject) => {
                            const sProjectName = oProject.projectName || sProjectId;

                            vbox.addItem(new sap.m.Text({
                                text: `Employee: ${sEmployeeId} | Project: ${sProjectName}`
                            }));
                        }).catch(() => {
                            vbox.addItem(new sap.m.Text({
                                text: "Error loading allocation details"
                            }));
                        });
                    });
                } else {
                    vbox.addItem(new sap.m.Text({ text: "Select a project to see allocation details" }));
                }
            }
        }
    });
});


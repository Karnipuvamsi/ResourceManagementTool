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
                const aSelectedContexts = oTable.getSelectedContexts();
                const bHasSelection = aSelectedContexts.length > 0;

                const vbox = this.byId("selectedEmployeeVBox");
                if (!vbox) {
                    return;
                }

                // Clear previous entries except the header
                const items = vbox.getItems();
                items.slice(1).forEach(item => vbox.removeItem(item));

                if (bHasSelection) {
                    const oModel = this.getView().getModel();
                    if (!oModel) {
                        vbox.addItem(new sap.m.Text({ text: "Model not found" }));
                        return;
                    }

                    const oListBinding = oModel.bindList("/Allocations", null, null, null, {
                        $expand: "to_Project"
                    });

                    const formatDate = dateStr => {
                        if (!dateStr) return "N/A";
                        const date = new Date(dateStr);
                        return new Intl.DateTimeFormat("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        }).format(date);
                    };

                    oListBinding.requestContexts().then(allocationContexts => {
                        const allAllocations = allocationContexts.map(ctx => ctx.getObject());

                        aSelectedContexts.forEach((ctx, index) => {
                            const employee = ctx.getObject();
                            const ohrId = employee.ohrId;
                            const name = employee.fullName;

                            // Add separator only between employees (not before the first one)
                            if (index > 0) {
                                vbox.addItem(new sap.ui.core.HTML({
                                    content: "<div style='border-top:2px solid #007cc0; margin:15px 0;'></div>"
                                }));
                            }
                            vbox.addItem(new sap.m.Title({
                                text: `OHR ID: ${ohrId}, Name: ${name}`,
                                level: "H4",
                                titleStyle: "H4"
                            }).addStyleClass("customTitleStyle"));

                            const employeeAllocations = allAllocations.filter(a => a.employeeId === ohrId);

                            if (employeeAllocations.length === 0) {
                                vbox.addItem(new sap.m.Text({
                                    text: "No allocation record.",
                                    design: "Italic"
                                }));
                            } else {
                                // Create one table for all allocations of this employee
                                const oTable = new sap.m.Table({
                                    inset: false,
                                    columns: [
                                        new sap.m.Column({ header: new sap.m.Text({ text: "Project ID" }) }),
                                        new sap.m.Column({ header: new sap.m.Text({ text: "Project Name" }) }),
                                        new sap.m.Column({ header: new sap.m.Text({ text: "Start Date" }) }),
                                        new sap.m.Column({ header: new sap.m.Text({ text: "End Date" }) }),
                                        new sap.m.Column({ header: new sap.m.Text({ text: "Allocation %" }) }),
                                        new sap.m.Column({ header: new sap.m.Text({ text: "Status" }) })
                                    ]
                                });

                                // Add rows for each allocation
                                employeeAllocations.forEach(allocation => {
                                    const projectId = allocation.projectId;
                                    const projectName = allocation.to_Project?.projectName || "N/A";
                                    const startDate = formatDate(allocation.startDate);
                                    const endDate = formatDate(allocation.endDate);
                                    const percent = allocation.allocationPercentage;
                                    const status = allocation.status || "N/A";

                                    oTable.addItem(new sap.m.ColumnListItem({
                                        cells: [
                                            new sap.m.Text({ text: projectId }),
                                            new sap.m.Text({ text: projectName }),
                                            new sap.m.Text({ text: startDate }),
                                            new sap.m.Text({ text: endDate }),
                                            new sap.m.Text({ text: percent }),
                                            new sap.m.Text({ text: status })
                                        ]
                                    }));
                                });

                                // Add the table inside one panel
                                const allocationPanel = new sap.m.Panel({
                                    content: [oTable]
                                }).addStyleClass("sapUiSmallMarginBottom");

                                vbox.addItem(allocationPanel);
                            }
                        });
                    }).catch(err => {
                        vbox.addItem(new sap.m.Text({
                            text: "Error loading allocation details: " + (err.message || "Unknown error")
                        }));
                    });
                } else {
                    vbox.addItem(new sap.m.Text({ text: "Select an employee to see allocation details" }));
                }
            }

            // ✅ Populate Project Allocation Details when project is selected in Allocations table (same pattern as Res table)
            if (sTableId === "Allocations") {
                const aSelectedContexts = oTable.getSelectedContexts();
                const bHasSelection = aSelectedContexts.length > 0;

                const vbox = this.byId("projectAllocationDetailsVBox");
                if (!vbox) {
                    return;
                }

                // Clear previous entries
                vbox.removeAllItems();

                if (bHasSelection) {
                    const oProject = aSelectedContexts[0].getObject();
                    const sProjectId = oProject.sapPId;
                    
                    if (!sProjectId) {
                        vbox.addItem(new sap.m.Text({ text: "Project ID not found" }));
                        return;
                    }
                    
                    const oModel = this.getView().getModel();
                    if (!oModel) {
                        vbox.addItem(new sap.m.Text({ text: "Model not found" }));
                        return;
                    }

                    // Fetch all allocations and filter in JavaScript (same pattern as Res table)
                    const oListBinding = oModel.bindList("/Allocations", null, null, null, {
                        $expand: "to_Employee($select=ohrId,fullName),to_Demand($select=demandId,skill,band)"
                    });

                    const formatDate = dateStr => {
                        if (!dateStr) return "N/A";
                        const date = new Date(dateStr);
                        return new Intl.DateTimeFormat("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        }).format(date);
                    };

                    oListBinding.requestContexts().then(allocationContexts => {
                        const allAllocations = allocationContexts.map(ctx => ctx.getObject());

                        // Filter allocations for this project - show ALL allocations (history)
                        const projectAllocations = allAllocations.filter(a => 
                            a.projectId === sProjectId
                        );

                        if (projectAllocations.length === 0) {
                            vbox.addItem(new sap.m.Text({
                                text: "No employees allocated to this project."
                            }));
                        } else {
                            // Create one table for all allocations of this project
                            const oTable = new sap.m.Table({
                                inset: false,
                                columns: [
                                    new sap.m.Column({ header: new sap.m.Text({ text: "OHR ID" }) }),
                                    new sap.m.Column({ header: new sap.m.Text({ text: "Employee Name" }) }),
                                    new sap.m.Column({ header: new sap.m.Text({ text: "Demand" }) }),
                                    new sap.m.Column({ header: new sap.m.Text({ text: "Start Date" }) }),
                                    new sap.m.Column({ header: new sap.m.Text({ text: "End Date" }) }),
                                    new sap.m.Column({ header: new sap.m.Text({ text: "Allocation %" }) }),
                                    new sap.m.Column({ header: new sap.m.Text({ text: "Status" }) })
                                ]
                            });

                            // Add rows for each allocation
                            projectAllocations.forEach(allocation => {
                                const sOhrId = allocation.to_Employee?.ohrId || allocation.employeeId || "N/A";
                                const sEmployeeName = allocation.to_Employee?.fullName || "N/A";
                                const sDemand = allocation.to_Demand ? `${allocation.to_Demand.skill || ""} - ${allocation.to_Demand.band || ""}` : "N/A";
                                const startDate = formatDate(allocation.startDate);
                                const endDate = formatDate(allocation.endDate);
                                const percent = allocation.allocationPercentage || 0;
                                const status = allocation.status || "N/A";

                                oTable.addItem(new sap.m.ColumnListItem({
                                    cells: [
                                        new sap.m.Text({ text: sOhrId }),
                                        new sap.m.Text({ text: sEmployeeName }),
                                        new sap.m.Text({ text: sDemand }),
                                        new sap.m.Text({ text: startDate }),
                                        new sap.m.Text({ text: endDate }),
                                        new sap.m.Text({ text: percent + "%" }),
                                        new sap.m.Text({ text: status })
                                    ]
                                }));
                            });

                            // Add the table inside one panel
                            const allocationPanel = new sap.m.Panel({
                                content: [oTable]
                            }).addStyleClass("sapUiSmallMarginBottom");

                            vbox.addItem(new sap.m.Text({ 
                                text: `Project: ${oProject.projectName || sProjectId} - ${projectAllocations.length} employee(s) allocated:`
                            }));
                            vbox.addItem(allocationPanel);
                        }
                    }).catch(err => {
                        vbox.addItem(new sap.m.Text({
                            text: "Error loading allocation details: " + (err.message || "Unknown error")
                        }));
                    });
                } else {
                    // No selection - show placeholder
                    vbox.addItem(new sap.m.Text({ text: "Select a project to see allocation details" }));
                }
            }
        }
    });
});


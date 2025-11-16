sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("glassboard.utility.FormHandler", {
        /**
         * Form data handler for Demand form
         */
        onDemandDialogData: function (aSelectedContexts) {
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                // No selection - clear form for new entry
                let oDemandModel = this.getView().getModel("demandModel");
                if (!oDemandModel) {
                    oDemandModel = new sap.ui.model.json.JSONModel({});
                    this.getView().setModel(oDemandModel, "demandModel");
                }

                const oController = this.getView().getController();
                const sPreSelectedProjectId = oController?._sSelectedProjectId || "";

                oDemandModel.setData({
                    demandId: "",
                    skill: "",
                    band: "",
                    sapPId: sPreSelectedProjectId,
                    quantity: ""
                });

                this.byId("inputSkill_demand")?.removeAllSelectedItems();
                this.byId("inputBand_demand")?.setSelectedKey("");
                this.byId("inputQuantity_demand")?.setValue("");
                this.byId("editButton_demand")?.setEnabled(false);
                return;
            }

            // Row selected - populate form for update
            let oObj = aSelectedContexts[0].getObject();
            let oDemandModel = this.getView().getModel("demandModel");
            if (!oDemandModel) {
                oDemandModel = new sap.ui.model.json.JSONModel({});
                this.getView().setModel(oDemandModel, "demandModel");
            }
            oDemandModel.setProperty("/demandId", oObj.demandId || "");
            oDemandModel.setProperty("/skill", oObj.skill || "");
            oDemandModel.setProperty("/band", oObj.band || "");
            oDemandModel.setProperty("/sapPId", oObj.sapPId || "");
            oDemandModel.setProperty("/quantity", oObj.quantity != null ? oObj.quantity : null);

            this.byId("inputBand_demand")?.setSelectedKey(oObj.band || "");
            this.byId("inputQuantity_demand")?.setValue(oObj.quantity != null ? String(oObj.quantity) : "");

            const sSkill = oObj.skill || "";
            const oSkillComboBox = this.byId("inputSkill_demand");
            if (oSkillComboBox && sSkill) {
                const aSkillNames = sSkill.split(",").map(s => s.trim()).filter(s => s !== "");
                oSkillComboBox.setSelectedKeys(aSkillNames);
            } else if (oSkillComboBox) {
                oSkillComboBox.removeAllSelectedItems();
            }

            this.byId("editButton_demand")?.setEnabled(true);
        },

        /**
         * Form data handler for Employee form
         */
        onEmpDialogData: function (aSelectedContexts) {
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                // No selection - clear form for new entry
                this.byId("inputOHRId_emp")?.setValue("");
                this.byId("inputOHRId_emp")?.setEnabled(true);
                this.byId("inputFullName_emp")?.setValue("");
                this.byId("inputMailId_emp")?.setValue("");
                this.byId("inputGender_emp")?.setSelectedKey("");
                this.byId("inputEmployeeType_emp")?.setSelectedKey("");
                this.byId("inputDoJ_emp")?.setValue("");
                this.byId("inputBand_emp")?.setSelectedKey("");
                this.byId("inputRole_emp")?.setSelectedKey("");
                this.byId("inputLocation_emp")?.setValue("");
                this.byId("inputCity_emp")?.setValue("");
                this.byId("inputSupervisor_emp")?.setValue("");
                this.byId("inputSupervisor_emp")?.data("selectedId", "");
                this.byId("inputSkills_emp")?.removeAllSelectedItems();
                this.byId("inputStatus_emp")?.setSelectedKey("");
                this.byId("inputLWD_emp")?.setValue("");
                return;
            }

            // Row selected - populate form for update
            let oObj = aSelectedContexts[0].getObject();
            this.byId("inputOHRId_emp")?.setValue(oObj.ohrId || "");
            this.byId("inputOHRId_emp")?.setEnabled(false);
            this.byId("inputFullName_emp")?.setValue(oObj.fullName || "");
            this.byId("inputMailId_emp")?.setValue(oObj.mailid || "");
            this.byId("inputGender_emp")?.setSelectedKey(oObj.gender || "");
            this.byId("inputEmployeeType_emp")?.setSelectedKey(oObj.employeeType || "");
            this.byId("inputDoJ_emp")?.setValue(oObj.doj || "");
            const sBand = oObj.band || "";
            this.byId("inputBand_emp")?.setSelectedKey(sBand);

            // Populate Designation dropdown based on Band selection
            if (sBand && this.getView()) {
                const oController = this.getView().getController();
                if (oController && oController.mBandToDesignations) {
                    const aDesignations = oController.mBandToDesignations[sBand] || [];
                    const oDesignationSelect = this.byId("inputRole_emp");
                    if (oDesignationSelect) {
                        const aItems = oDesignationSelect.getItems();
                        aItems.forEach((oItem, iIndex) => {
                            if (iIndex > 0) {
                                oDesignationSelect.removeItem(oItem);
                            }
                        });
                        aDesignations.forEach((sDesignation) => {
                            oDesignationSelect.addItem(new sap.ui.core.Item({
                                key: sDesignation,
                                text: sDesignation
                            }));
                        });
                    }
                }
            }
            this.byId("inputRole_emp")?.setSelectedKey(oObj.role || "");
            this.byId("inputLocation_emp")?.setValue(oObj.location || "");
            this.byId("inputCity_emp")?.setValue(oObj.city || "");

            const sSupervisorId = oObj.supervisorOHR || "";
            const oSupervisorInput = this.byId("inputSupervisor_emp");
            if (oSupervisorInput) {
                oSupervisorInput.setValue(sSupervisorId);
                oSupervisorInput.data("selectedId", sSupervisorId);
            }

            const sSkills = oObj.skills || "";
            const oSkillsComboBox = this.byId("inputSkills_emp");
            if (oSkillsComboBox && sSkills) {
                const aSkillNames = sSkills.split(",").map(s => s.trim()).filter(s => s !== "");
                oSkillsComboBox.setSelectedKeys(aSkillNames);
            } else if (oSkillsComboBox) {
                oSkillsComboBox.removeAllSelectedItems();
            }
            this.byId("inputStatus_emp")?.setSelectedKey(oObj.status || "");
            this.byId("inputLWD_emp")?.setValue(oObj.lwd || "");
        },

        /**
         * Form data handler for Opportunity form
         */
        onOppDialogData: function (aSelectedContexts) {
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                // No selection - clear form for new entry
                const oTable = this.byId("Opportunities");
                let sNextId = "O-0001";
                try {
                    if (oTable) {
                        sNextId = this._generateNextIdFromBinding(oTable, "Opportunities", "sapOpportunityId", "O") || sNextId;
                    }
                } catch (e) {
                }

                this.byId("inputSapOppId_oppr")?.setValue(sNextId);
                this.byId("inputSapOppId_oppr")?.setEnabled(false);
                this.byId("inputSapOppId_oppr")?.setPlaceholder("Auto-generated");
                this.byId("inputSfdcOppId_oppr")?.setValue("");
                this.byId("inputOppName_oppr")?.setValue("");
                this.byId("inputBusinessUnit_oppr")?.setValue("");
                this.byId("inputProbability_oppr")?.setSelectedKey("");
                this.byId("inputStage_oppr")?.setSelectedKey("");
                this.byId("inputSalesSPOC_oppr")?.setValue("");
                this.byId("inputSalesSPOC_oppr")?.data("selectedId", "");
                this.byId("inputDeliverySPOC_oppr")?.setValue("");
                this.byId("inputDeliverySPOC_oppr")?.data("selectedId", "");
                this.byId("inputExpectedStart_oppr")?.setValue("");
                this.byId("inputExpectedEnd_oppr")?.setValue("");
                this.byId("inputTCV_oppr")?.setValue("");
                this.byId("inputCustomerId_oppr")?.setValue("");
                this.byId("inputCustomerId_oppr")?.data("selectedId", "");
                return;
            }

            // Row selected - populate form for update
            let oObj = aSelectedContexts[0].getObject();

            let oOppModel = this.getView().getModel("opportunityModel");
            if (!oOppModel) {
                oOppModel = new sap.ui.model.json.JSONModel({});
                this.getView().setModel(oOppModel, "opportunityModel");
            }
            oOppModel.setProperty("/sapOpportunityId", oObj.sapOpportunityId || "");
            oOppModel.setProperty("/sfdcOpportunityId", oObj.sfdcOpportunityId || "");
            oOppModel.setProperty("/opportunityName", oObj.opportunityName || "");
            oOppModel.setProperty("/businessUnit", oObj.businessUnit || "");
            oOppModel.setProperty("/probability", oObj.probability || "");
            oOppModel.setProperty("/Stage", oObj.Stage || "");
            oOppModel.setProperty("/salesSPOC", oObj.salesSPOC || "");
            oOppModel.setProperty("/deliverySPOC", oObj.deliverySPOC || "");
            oOppModel.setProperty("/expectedStart", oObj.expectedStart || "");
            oOppModel.setProperty("/expectedEnd", oObj.expectedEnd || "");
            oOppModel.setProperty("/tcv", oObj.tcv != null ? oObj.tcv : null);
            oOppModel.setProperty("/customerId", oObj.customerId || "");

            this.byId("inputSapOppId_oppr")?.setValue(oObj.sapOpportunityId || "");
            this.byId("inputSapOppId_oppr")?.setEnabled(false);
            this.byId("inputSapOppId_oppr")?.setPlaceholder("");
            this.byId("inputSfdcOppId_oppr")?.setValue(oObj.sfdcOpportunityId || "");
            this.byId("inputOppName_oppr")?.setValue(oObj.opportunityName || "");
            this.byId("inputBusinessUnit_oppr")?.setValue(oObj.businessUnit || "");
            this.byId("inputProbability_oppr")?.setSelectedKey(oObj.probability || "");
            this.byId("inputStage_oppr")?.setSelectedKey(oObj.Stage || "");

            const sSalesSPOCId = oObj.salesSPOC || "";
            const oSalesSPOCInput = this.byId("inputSalesSPOC_oppr");
            if (oSalesSPOCInput) {
                oSalesSPOCInput.setValue(sSalesSPOCId);
                oSalesSPOCInput.data("selectedId", sSalesSPOCId);
            }

            const sDeliverySPOCId = oObj.deliverySPOC || "";
            const oDeliverySPOCInput = this.byId("inputDeliverySPOC_oppr");
            if (oDeliverySPOCInput) {
                oDeliverySPOCInput.setValue(sDeliverySPOCId);
                oDeliverySPOCInput.data("selectedId", sDeliverySPOCId);
            }

            this.byId("inputExpectedStart_oppr")?.setValue(oObj.expectedStart || "");
            this.byId("inputExpectedEnd_oppr")?.setValue(oObj.expectedEnd || "");
            this.byId("inputTCV_oppr")?.setValue(oObj.tcv != null ? String(oObj.tcv) : "");

            const sCustomerId = oObj.customerId || "";
            const oCustomerInput = this.byId("inputCustomerId_oppr");
            if (oCustomerInput) {
                oCustomerInput.setValue(sCustomerId);
                oCustomerInput.data("selectedId", sCustomerId);
            }
        },

        /**
         * Form data handler for Project form
         */
        onProjDialogData: function (aSelectedContexts) {
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                // No selection - clear form for new entry
                const oTable = this.byId("Projects");
                let sNextId = "P-0001";
                try {
                    if (oTable) {
                        sNextId = this._generateNextIdFromBinding(oTable, "Projects", "sapPId", "P") || sNextId;
                    }
                } catch (e) {
                }

                let oProjModel = this.getView().getModel("projectModel");
                if (!oProjModel) {
                    oProjModel = new sap.ui.model.json.JSONModel({});
                    this.getView().setModel(oProjModel, "projectModel");
                }
                oProjModel.setData({
                    sapPId: sNextId,
                    sfdcPId: "",
                    projectName: "",
                    startDate: "",
                    endDate: "",
                    gpm: "",
                    projectType: "",
                    status: "",
                    oppId: "",
                    requiredResources: "",
                    allocatedResources: "",
                    toBeAllocated: "",
                    SOWReceived: "",
                    POReceived: ""
                });

                this.byId("inputSapProjId_proj")?.setValue(sNextId);
                this.byId("inputSapProjId_proj")?.setEnabled(false);
                this.byId("inputSapProjId_proj")?.setPlaceholder("Auto-generated");
                this.byId("inputOppId_proj")?.setValue("");
                this.byId("inputOppId_proj")?.data("selectedId", "");
                this.byId("inputGPM_proj")?.data("selectedId", "");
                return;
            }

            // Row selected - populate form for update
            let oObj = aSelectedContexts[0].getObject();

            let oProjModel = this.getView().getModel("projectModel");
            if (!oProjModel) {
                oProjModel = new sap.ui.model.json.JSONModel({});
                this.getView().setModel(oProjModel, "projectModel");
            }
            oProjModel.setProperty("/sapPId", oObj.sapPId || "");
            oProjModel.setProperty("/sfdcPId", oObj.sfdcPId || "");
            oProjModel.setProperty("/projectName", oObj.projectName || "");
            oProjModel.setProperty("/startDate", oObj.startDate || "");
            oProjModel.setProperty("/endDate", oObj.endDate || "");
            oProjModel.setProperty("/gpm", oObj.gpm || "");
            oProjModel.setProperty("/projectType", oObj.projectType || "");
            oProjModel.setProperty("/status", oObj.status || "");
            oProjModel.setProperty("/requiredResources", oObj.requiredResources != null ? oObj.requiredResources : null);
            oProjModel.setProperty("/allocatedResources", oObj.allocatedResources != null ? oObj.allocatedResources : null);
            oProjModel.setProperty("/toBeAllocated", oObj.toBeAllocated != null ? oObj.toBeAllocated : null);
            oProjModel.setProperty("/SOWReceived", oObj.SOWReceived || "");
            oProjModel.setProperty("/POReceived", oObj.POReceived || "");
            oProjModel.setProperty("/oppId", oObj.oppId || "");

            this.byId("inputSapProjId_proj")?.setValue(oObj.sapPId || "");
            this.byId("inputSapProjId_proj")?.setEnabled(false);
            this.byId("inputSapProjId_proj")?.setPlaceholder("");
            this.byId("inputSfdcProjId_proj")?.setValue(oObj.sfdcPId || "");
            this.byId("inputProjectName_proj")?.setValue(oObj.projectName || "");
            this.byId("inputStartDate_proj")?.setValue(oObj.startDate || "");
            this.byId("inputEndDate_proj")?.setValue(oObj.endDate || "");
            this.byId("inputProjectType_proj")?.setSelectedKey(oObj.projectType || "");
            this.byId("inputStatus_proj")?.setSelectedKey(oObj.status || "");
            this.byId("inputRequiredResources_proj")?.setValue(oObj.requiredResources != null ? String(oObj.requiredResources) : "");
            this.byId("inputAllocatedResources_proj")?.setValue(oObj.allocatedResources != null ? String(oObj.allocatedResources) : "");
            this.byId("inputToBeAllocated_proj")?.setValue(oObj.toBeAllocated != null ? String(oObj.toBeAllocated) : "");
            this.byId("inputSOWReceived_proj")?.setSelectedKey(oObj.SOWReceived || "");
            this.byId("inputPOReceived_proj")?.setSelectedKey(oObj.POReceived || "");

            const sGPMId = oObj.gpm || "";
            const oGPMInput = this.byId("inputGPM_proj");
            if (oGPMInput) {
                oGPMInput.setValue(sGPMId);
                oGPMInput.data("selectedId", sGPMId);
            }

            const sOppId = oObj.oppId || "";
            const oOppInput = this.byId("inputOppId_proj");
            if (oOppInput) {
                oOppInput.setValue(sOppId);
                oOppInput.data("selectedId", sOppId);
            }
        },

        /**
         * Form data handler for Customer form
         */
        onCustDialogData: function (aSelectedContexts) {
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                // No selection - clear form for new entry
                const oCustomerIdInput = this.byId("inputCustomerId");
                if (oCustomerIdInput) {
                    const sCurrentValue = oCustomerIdInput.getValue();
                    if (!sCurrentValue || sCurrentValue === "C-0001") {
                        const oTable = this.byId("Customers");
                        let sNextId = "C-0001";
                        try {
                            if (oTable) {
                                sNextId = this._generateNextIdFromBinding(oTable, "Customers", "SAPcustId", "C") || sNextId;
                            }
                        } catch (e) {
                        }
                        oCustomerIdInput.setValue(sNextId);
                    }
                    oCustomerIdInput.setEnabled(false);
                    oCustomerIdInput.setPlaceholder("Auto-generated");
                }
                this.byId("inputCustomerName")?.setValue("");
                this.byId("inputState")?.setValue("");
                this.byId("inputCountry")?.setValue("");
                this.byId("inputStartDate_cus")?.setValue("");
                this.byId("inputEndDate_cus")?.setValue("");
                this.byId("inputStatus")?.setSelectedKey("");
                this.byId("inputVertical")?.setSelectedKey("");
                return;
            }

            // Row selected - populate form for update
            let oObj = aSelectedContexts[0].getObject();
            this.byId("inputCustomerId")?.setValue(oObj.SAPcustId || "");
            this.byId("inputCustomerId")?.setEnabled(false);
            this.byId("inputCustomerId")?.setPlaceholder("");
            this.byId("inputCustomerName")?.setValue(oObj.customerName || "");
            this.byId("inputState")?.setValue(oObj.state || "");
            this.byId("inputCountry")?.setValue(oObj.country || "");
            this.byId("inputStartDate_cus")?.setValue(oObj.startDate || "");
            this.byId("inputEndDate_cus")?.setValue(oObj.endDate || "");
            this.byId("inputStatus")?.setSelectedKey(oObj.status || "");
            this.byId("inputVertical")?.setSelectedKey(oObj.vertical || "");
        },

        /**
         * Helper to generate next ID from binding
         */
        _generateNextIdFromBinding: function (oTable, sEntitySet, sIdField, sPrefix) {
            try {
                const oBinding = oTable.getRowBinding ? oTable.getRowBinding() : oTable.getBinding("items");
                if (!oBinding) return null;

                const aContexts = oBinding.getAllContexts ? oBinding.getAllContexts() : [];
                if (aContexts.length === 0) return `${sPrefix}-0001`;

                const aIds = aContexts
                    .map(ctx => ctx.getObject())
                    .map(obj => obj[sIdField])
                    .filter(id => id && typeof id === "string" && id.startsWith(sPrefix + "-"))
                    .map(id => {
                        const match = id.match(new RegExp(sPrefix + "-(\\d+)"));
                        return match ? parseInt(match[1], 10) : 0;
                    })
                    .filter(num => !isNaN(num) && num > 0);

                if (aIds.length === 0) return `${sPrefix}-0001`;

                const iMaxId = Math.max(...aIds);
                const iNextId = iMaxId + 1;
                return `${sPrefix}-${String(iNextId).padStart(4, "0")}`;
            } catch (e) {
                return null;
            }
        }
    });
});


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
                this.byId("inputUnit_emp")?.setSelectedKey("");
                this.byId("inputDoJ_emp")?.setValue("");
                this.byId("inputBand_emp")?.setSelectedKey("");
                this.byId("inputRole_emp")?.setSelectedKey("");
                this.byId("inputLocation_emp")?.setValue("");
                this.byId("inputCountry_emp")?.setSelectedKey("");
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
            this.byId("inputUnit_emp")?.setSelectedKey(oObj.unit || "");
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
            // inputCountry_emp
            // this.byId("inputCountry_emp")?.setSelectedKey(oObj.country || "");
            // this.byId("inputCity_emp")?.setSelectedKey(oObj.city || "");
            const sCountry = oObj.country || "";
            this.byId("inputCountry_emp")?.setSelectedKey(sCountry || "");
            if (sCountry && this.getView()) {
                const oController = this.getView().getController();
                if (oController && oController._mCountryToCities) {
                    const aCities = oController._mCountryToCities[sCountry] || [];
                    const oCitySelect = this.byId("inputCity_emp");
                    if (oCitySelect) {
                        // Remove old items except the first placeholder
                        const aItems = oCitySelect.getItems();
                        aItems.forEach((oItem, iIndex) => {
                            if (iIndex > 0) {
                                oCitySelect.removeItem(oItem);
                            }
                        });
                        // Add new city items
                        aCities.forEach((sCity) => {
                            oCitySelect.addItem(new sap.ui.core.Item({
                                key: sCity,
                                text: sCity
                            }));
                        });
                    }
                }
            }

            this.byId("inputCity_emp")?.setSelectedKey(oObj.city || "");



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

        onMasterDemandsDialogData: function (aSelectedContexts) {


            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                // No selection - clear form for new entry
                const oTable = this.byId("MasterDemands");
                let sNextId = ""; // Employees might not have auto-generated IDs
                try {
                    // For now, just clear - Employees might use manual OHR IDs
                    sNextId = "";
                } catch (e) {
                    sap.m.MessageToast.show("Could not generate next Demand ID: " + e.message, {
                        duration: 4000, // 4 seconds
                        width: "20em"
                    });

                }

                this.byId("inputDemandId")?.setValue(sNextId);
                this.byId("inputDemandId")?.setEnabled(false); // Employees might need manual OHR ID entry

                this.byId("inputSkills")?.removeAllSelectedItems();

                this.byId("inputBand")?.setSelectedKey("");

                this.byId("inputProject")?.setValue("");
                this.byId("inputProject")?.data("selectedId", "");

                this.byId("inputQuantity")?.setValue("");
                this.byId("inputAllocatedCount")?.setValue("");
                this.byId("inputRemainingCount")?.setValue("");
                return;
            }

            // Row selected - populate form for update
            let oObj = aSelectedContexts[0].getObject();
            this.byId("inputDemandId")?.setValue(oObj.demandId || "");
            this.byId("inputDemandId")?.setEnabled(false); // Disable OHR ID in update mode (key field)
            const sSkills = oObj.skill || "";
            const oSkillsComboBox = this.byId("inputSkills");
            if (oSkillsComboBox && sSkills) {
                // Split comma-separated skills and set as selected keys
                const aSkillNames = sSkills.split(",").map(s => s.trim()).filter(s => s !== "");
                oSkillsComboBox.setSelectedKeys(aSkillNames);
            } else if (oSkillsComboBox) {
                oSkillsComboBox.removeAllSelectedItems();
            }

            const sBand = oObj.band || "";
            this.byId("inputBand")?.setSelectedKey(sBand);

            const sSapPId = oObj.sapPId || "";
            const oSapPIdInput = this.byId("inputProject");
            if (sSapPId && oSapPIdInput) {
                // First check association (same pattern as Customer, Opportunity, GPM)
                if (oObj.to_Project && oObj.to_Project.projectName) {
                    oSapPIdInput.setValue(oObj.to_Project.projectNameName);
                    oSapPIdInput.data("selectedId", sSapPId);
                } else {
                    // Load async if association not available
                    oSapPIdInput.setValue(sSapPId);
                    oSapPIdInput.data("selectedId", sSapPId);
                    const oModel = this.getView().getModel();
                    if (oModel && /^\d{6,10}$/.test(sSapPId.trim())) {
                        const oEmployeeContext = oModel.bindContext(`/Demands('${sSapPId}')`, null, { deferred: true });
                        oEmployeeContext.execute().then(() => {
                            const oSapPId = oEmployeeContext.getObject();
                            if (oSapPId && oSapPId.projectName) {
                                oSapPIdInput.setValue(oSapPId.fullName);
                                oSapPIdInput.data("selectedId", sSapPId);
                            }
                        }).catch(() => { });
                    }
                }
            } else if (oSapPIdInput) {
                oSapPIdInput.setValue("");
                oSapPIdInput.data("selectedId", "");
            }


            this.byId("inputQuantity")?.setValue(oObj.quantity || "");
            // this.byId("inputAllocatedCount")?.setValue(oObj.allocatedCount || "");
            this.byId("inputAllocatedCount")?.setValue(1 || "");

            this.byId("inputRemainingCount")?.setValue(oObj.remaining || "");


            // ✅ Populate Designation dropdown based on Band selection



            // ✅ Supervisor field - display name from association, store ID

            // ✅ Load skills from employee.skills field (comma-separated string)

        },
        // onMasterDemandsDialogData: function (aSelectedContexts) {
        //     if (!aSelectedContexts || aSelectedContexts.length === 0) {
        //         // No selection - clear form for new entry
        //         const oTable = this.byId("MaterDemands");
        //         let sNextId = "";
        //         try {
        //             if (oTable) {
        //                 sNextId = this._generateNextIdFromBinding(oTable, "MaterDemands", "demandId") || sNextId;
        //             }
        //         } catch (e) {
        //         }

        //         let oMasterDemandModel = this.getView().getModel("demandModel");
        //         if (!oMasterDemandModel) {
        //             oMasterDemandModel = new sap.ui.model.json.JSONModel({});
        //             this.getView().setModel(oProjModel, "demandModel");
        //         }
        //         oMasterDemandModel.setData({
        //             demandId: "",
        //             skill: "",
        //             band: "",
        //             sapPId: "",
        //             quantity: ""
        //         });

        //         this.byId("inputDemandId")?.setValue(sNextId);
        //         this.byId("inputDemandId")?.setEnabled(false);
        //         this.byId("inputDemandId")?.setPlaceholder("Auto-generated");

        //         this.byId("inputSkills")?.removeAllSelectedItems();

        //         this.byId("inputBand")?.setSelectedKey("");

        //         this.byId("inputProject")?.setValue("");
        //         this.byId("inputProject")?.data("selectedId", "");

        //         this.byId("inputQuantity")?.setValue("");
        //         this.byId("inputAllocatedCount")?.setValue("");
        //         this.byId("inputRemainingCount")?.setValue("");

        //         return;
        //     }

        //     // Row selected - populate form for update
        //     let oObj = aSelectedContexts[0].getObject();

        //     let oMasterDemandModel = this.getView().getModel("demandModel");
        //     if (!oMasterDemandModel) {
        //         oMasterDemandModel = new sap.ui.model.json.JSONModel({});
        //         this.getView().setModel(oMasterDemandModel, "demandModel");
        //     }

        //     oMasterDemandModel.setProperty("/demandId", oObj.demandId || "");
        //     oMasterDemandModel.setProperty("/skill", oObj.skill || "");
        //     oMsterDemandModel.setProperty("/band", oObj.band || "");
        //     oMasterDemandModel.setProperty("/sapPId", oObj.sapPId || "");
        //     oMasterDemandModel.setProperty("/quantity", oObj.quantity != null ? oObj.quantity : null);


        //     this.byId("inputDemandId")?.setValue(oObj.demandId || "");
        //     this.byId("inputDemandId")?.setEnabled(false);
        //     this.byId("inputDemandId")?.setPlaceholder("");
        //     const sSkills = oObj.skill || "";
        //     const oSkillsComboBox = this.byId("inputSkills");
        //     if (oSkillsComboBox && sSkills) {
        //         // Split comma-separated skills and set as selected keys
        //         const aSkillNames = sSkills.split(",").map(s => s.trim()).filter(s => s !== "");
        //         oSkillsComboBox.setSelectedKeys(aSkillNames);
        //     } else if (oSkillsComboBox) {
        //         oSkillsComboBox.removeAllSelectedItems();
        //     }

        //     const sBand = oObj.band || "";
        //     this.byId("inputBand")?.setSelectedKey(sBand);

        //     const sSapPId = oObj.sapPId || "";
        //     const oSapPIdInput = this.byId("inputProject");
        //     if (sSapPId && oSapPIdInput) {
        //         // First check association (same pattern as Customer, Opportunity, GPM)
        //         if (oObj.to_Project && oObj.to_Project.projectName) {
        //             oSapPIdInput.setValue(oObj.to_Project.projectNameName);
        //             oSapPIdInput.data("selectedId", sSapPId);
        //         } else {
        //             // Load async if association not available
        //             oSapPIdInput.setValue(sSapPId);
        //             oSapPIdInput.data("selectedId", sSapPId);
        //             const oModel = this.getView().getModel();
        //             if (oModel && /^\d{6,10}$/.test(sSapPId.trim())) {
        //                 const oEmployeeContext = oModel.bindContext(`/Demands('${sSapPId}')`, null, { deferred: true });
        //                 oEmployeeContext.execute().then(() => {
        //                     const oSapPId = oEmployeeContext.getObject();
        //                     if (oSapPId && oSapPId.projectName) {
        //                         oSapPIdInput.setValue(oSapPId.fullName);
        //                         oSapPIdInput.data("selectedId", sSapPId);
        //                     }
        //                 }).catch(() => { });
        //             }
        //         }
        //     } else if (oSapPIdInput) {
        //         oSapPIdInput.setValue("");
        //         oSapPIdInput.data("selectedId", "");
        //     }


        //     this.byId("inputQuantity")?.setValue(oObj.quantity || "");
        //     // this.byId("inputAllocatedCount")?.setValue(oObj.allocatedCount || "");
        //     this.byId("inputAllocatedCount")?.setValue(1 || "");

        //     this.byId("inputRemainingCount")?.setValue(oObj.remaining || "");

        // },

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
            oOppModel.setProperty("/currency", oObj.currency || "");
            oOppModel.setProperty("/customerId", oObj.customerId || "");

            this.byId("inputSapOppId_oppr")?.setValue(oObj.sapOpportunityId || "");
            this.byId("inputSapOppId_oppr")?.setEnabled(false);
            this.byId("inputSapOppId_oppr")?.setPlaceholder("");
            this.byId("inputSfdcOppId_oppr")?.setValue(oObj.sfdcOpportunityId || "");
            this.byId("inputOppName_oppr")?.setValue(oObj.opportunityName || "");
            this.byId("inputBusinessUnit_oppr")?.setValue(oObj.businessUnit || "");
            this.byId("inputProbability_oppr")?.setSelectedKey(oObj.probability || "");
            this.byId("inputStage_oppr")?.setSelectedKey(oObj.Stage || "");
            this.byId("inputCurrency_oppr")?.setSelectedKey(oObj.currency || "");

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
                    POReceived: "",
                    segment: "",
                    vertical: "",
                    subVertical: "",
                    unit: "",
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
            oProjModel.setProperty("/segment", oObj.segment || "");
            oProjModel.setProperty("/vertical", oObj.vertical || "");
            oProjModel.setProperty("/subVertical", oObj.subVertical || "");
            oProjModel.setProperty("/unit", oObj.unit || "");


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
            this.byId("inputsegment_proj")?.setSelectedKey(oObj.segment || "");
            this.byId("inputVertical_proj")?.setSelectedKey(oObj.vertical || "");
            this.byId("inputSubVertical_proj")?.setSelectedKey(oObj.subVertical || "");
            this.byId("inputUnit_proj")?.setSelectedKey(oObj.unit || "");


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
            // Initialize customerModel if it doesn't exist
            let oCustomerModel = this.getView().getModel("customerModel");
            if (!oCustomerModel) {
                oCustomerModel = new sap.ui.model.json.JSONModel({});
                this.getView().setModel(oCustomerModel, "customerModel");
            }

            // ⬅️ Explicitly lift the default 100-item cap for list bindings on this model
            if (typeof oCustomerModel.setSizeLimit === "function") {
                oCustomerModel.setSizeLimit(5000); // adjust as needed (e.g., 2000, 10000)
            }


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

                // Clear customerModel
                oCustomerModel.setData({
                    SAPcustId: oCustomerIdInput ? oCustomerIdInput.getValue() : "",
                    customerName: "",
                    custCountryId: "",
                    custStateId: "",
                    custCityId: "",
                    status: "",
                    vertical: "",
                    startDate: "",
                    endDate: ""
                });

                // Clear cascading dropdowns
                const oCountryCombo = this.byId("countryComboBox");
                const oStateCombo = this.byId("stateComboBox");
                const oCityCombo = this.byId("cityComboBox");

                if (oCountryCombo) {
                    oCountryCombo.setSelectedKey("");
                }
                if (oStateCombo) {
                    oStateCombo.setSelectedKey("");
                    oStateCombo.unbindItems();
                    oStateCombo.setEnabled(false);
                }
                if (oCityCombo) {
                    oCityCombo.setSelectedKey("");
                    oCityCombo.unbindItems();
                    oCityCombo.setEnabled(false);
                }

                return;
            }

            // Row selected - populate form for update
            let oObj = aSelectedContexts[0].getObject();

            // Convert IDs to strings for ComboBox selectedKey (ComboBoxes use string keys)
            const sCountryId = oObj.custCountryId ? String(oObj.custCountryId) : "";
            const sStateId = oObj.custStateId ? String(oObj.custStateId) : "";
            const sCityId = oObj.custCityId ? String(oObj.custCityId) : "";

            // Populate customerModel
            oCustomerModel.setData({
                SAPcustId: oObj.SAPcustId || "",
                customerName: oObj.customerName || "",
                custCountryId: sCountryId,
                custStateId: sStateId,
                custCityId: sCityId,
                status: oObj.status || "",
                vertical: oObj.vertical || "",
                startDate: oObj.startDate || "",
                endDate: oObj.endDate || ""
            });

            // Set basic fields
            this.byId("inputCustomerId")?.setValue(oObj.SAPcustId || "");
            this.byId("inputCustomerId")?.setEnabled(false);
            this.byId("inputCustomerId")?.setPlaceholder("");

            // Handle cascading dropdowns
            const oCountryCombo = this.byId("countryComboBox");
            const oStateCombo = this.byId("stateComboBox");
            const oCityCombo = this.byId("cityComboBox");

            // Convert IDs to numbers for filtering (use the string IDs we already converted above)
            const countryId = sCountryId ? Number(sCountryId) : null;
            const stateId = sStateId ? Number(sStateId) : null;
            const cityId = sCityId ? Number(sCityId) : null;

            // Set country dropdown
            if (oCountryCombo && sCountryId) {
                oCountryCombo.setSelectedKey(sCountryId);

                // Load states for this country
                if (oStateCombo) {
                    oStateCombo.setEnabled(true);
                    // Ensure countryId is a number for filtering (same as onCountryChange handler)
                    const nCountryIdForFilter = Number(countryId);


                    oStateCombo.bindItems({
                        path: "default>/CustomerStates",
                        filters: [
                            new sap.ui.model.Filter("country_id", "EQ", nCountryIdForFilter)
                        ],
                        length:1000,

                        template: new sap.ui.core.ListItem({
                            key: "{default>id}",
                            text: "{default>name}"
                        })
                    });

                    // Set state dropdown after binding completes
                    if (sStateId && stateId) {
                        const fnSetStateAndCity = () => {
                            // Verify the state key exists in items before setting
                            const aStateItems = oStateCombo.getItems();
                            // Filter out placeholder items (empty key) and check if our key exists
                            const aValidItems = aStateItems.filter(function (oItem) {
                                const sKey = oItem.getKey();
                                return sKey !== "" && sKey !== null && sKey !== undefined;
                            });

                            // Debug: Log loaded state keys
                            const aLoadedKeys = aValidItems.map(function (oItem) {
                                return oItem.getKey();
                            });

                            // Check if the state key exists in valid items - handle comma-formatted numbers
                            const bStateKeyExists = aValidItems.some(function (oItem) {
                                // Get item key and remove commas/spaces (handle formatted numbers like "4,017")
                                let sItemKey = String(oItem.getKey()).replace(/[,\s]/g, "");
                                // Get search key and remove commas/spaces
                                let sSearchKey = String(sStateId).replace(/[,\s]/g, "");

                                // Try exact match after cleaning
                                if (sItemKey === sSearchKey) {
                                    return true;
                                }
                                // Try numeric comparison (handle cases where one is "4017" and other is 4017)
                                const nItemKey = Number(sItemKey);
                                const nSearchKey = Number(sSearchKey);
                                if (!isNaN(nItemKey) && !isNaN(nSearchKey) && nItemKey === nSearchKey) {
                                    return true;
                                }
                                return false;
                            });

                            // Also check if we have valid items loaded (not just placeholder)
                            if (aValidItems.length > 0 && bStateKeyExists) {
                                // Find the actual key from the items (might be comma-formatted)
                                let sActualKey = sStateId;
                                for (let i = 0; i < aValidItems.length; i++) {
                                    const sItemKey = String(aValidItems[i].getKey()).replace(/[,\s]/g, "");
                                    const sSearchKey = String(sStateId).replace(/[,\s]/g, "");
                                    if (sItemKey === sSearchKey) {
                                        // Use the actual key from the item (preserves formatting if needed)
                                        sActualKey = aValidItems[i].getKey();
                                        break;
                                    }
                                }

                                // Update model first (ComboBox is bound to model) - use cleaned key
                                oCustomerModel.setProperty("/custStateId", sStateId);
                                // Set selectedKey using the actual formatted key from the item
                                oStateCombo.setSelectedKey(sActualKey);


                                // Load cities for this state and country
                                if (oCityCombo && sCityId && cityId) {
                                    oCityCombo.setEnabled(true);
                                    oCityCombo.bindItems({
                                        path: "default>/CustomerCities",
                                        filters: [
                                            new sap.ui.model.Filter("state_id", "EQ", stateId),
                                            new sap.ui.model.Filter("country_id", "EQ", countryId)
                                        ],
                                       length:1000,

                                        template: new sap.ui.core.ListItem({
                                            key: "{default>id}",
                                            text: "{default>name}"
                                        })
                                    });

                                    // Set city after cities are loaded
                                    const fnSetCity = () => {
                                        const aCityItems = oCityCombo.getItems();
                                        const aValidCityItems = aCityItems.filter(function (oItem) {
                                            const sKey = oItem.getKey();
                                            return sKey !== "" && sKey !== null && sKey !== undefined;
                                        });

                                        // Debug: Log loaded city keys
                                        const aLoadedCityKeys = aValidCityItems.map(function (oItem) {
                                            return oItem.getKey();
                                        });

                                        const bCityKeyExists = aValidCityItems.some(function (oItem) {
                                            // Get item key and remove commas/spaces (handle formatted numbers like "4,017")
                                            let sItemKey = String(oItem.getKey()).replace(/[,\s]/g, "");
                                            // Get search key and remove commas/spaces
                                            let sSearchKey = String(sCityId).replace(/[,\s]/g, "");

                                            if (sItemKey === sSearchKey) {
                                                return true;
                                            }
                                            const nItemKey = Number(sItemKey);
                                            const nSearchKey = Number(sSearchKey);
                                            if (!isNaN(nItemKey) && !isNaN(nSearchKey) && nItemKey === nSearchKey) {
                                                return true;
                                            }
                                            return false;
                                        });

                                        if (aValidCityItems.length > 0 && bCityKeyExists) {
                                            // Find the actual key from the items (might be comma-formatted)
                                            let sActualCityKey = sCityId;
                                            for (let i = 0; i < aValidCityItems.length; i++) {
                                                const sItemKey = String(aValidCityItems[i].getKey()).replace(/[,\s]/g, "");
                                                const sSearchKey = String(sCityId).replace(/[,\s]/g, "");
                                                if (sItemKey === sSearchKey) {
                                                    // Use the actual key from the item (preserves formatting if needed)
                                                    sActualCityKey = aValidCityItems[i].getKey();
                                                    break;
                                                }
                                            }

                                            // Update model first (ComboBox is bound to model) - use cleaned key
                                            oCustomerModel.setProperty("/custCityId", sCityId);
                                            // Set selectedKey using the actual formatted key from the item
                                            oCityCombo.setSelectedKey(sActualCityKey);

                                        } else if (aValidCityItems.length > 0) {
                                            // Items loaded but key not found - might be invalid, stop retrying
                                            console.warn("City ID " + sCityId + " not found in loaded cities. Available keys:", aLoadedCityKeys);
                                        } else {
                                            // Items not loaded yet, retry
                                            setTimeout(fnSetCity, 50);
                                        }
                                    };

                                    // Get city binding and wait for data
                                    const oCityBinding = oCityCombo.getBinding("items");
                                    if (oCityBinding) {
                                        oCityBinding.attachDataReceived(fnSetCity);
                                        oCityBinding.refresh();
                                    } else {
                                        // Fallback: poll until city items are loaded
                                        const fnPollForCities = () => {
                                            const aCityItems = oCityCombo.getItems();
                                            const aValidCityItems = aCityItems.filter(function (oItem) {
                                                const sKey = oItem.getKey();
                                                return sKey !== "" && sKey !== null && sKey !== undefined;
                                            });
                                            if (aValidCityItems.length > 0) {
                                                fnSetCity();
                                            } else {
                                                setTimeout(fnPollForCities, 50);
                                            }
                                        };
                                        setTimeout(fnPollForCities, 100);
                                    }
                                }
                            } else if (aValidItems.length > 0) {
                                // Items loaded but key not found - might be invalid state ID, log warning with details
                                console.warn("State ID " + sStateId + " not found in loaded states for country " + countryId);
                                console.warn("Available state keys:", aLoadedKeys);
                                console.warn("Filter used: country_id EQ " + countryId + " (type: " + typeof countryId + ")");
                            } else {
                                // Items not loaded yet, try again after a delay
                                setTimeout(fnSetStateAndCity, 50);
                            }
                        };

                        // Get the binding after items are bound
                        const oStateBinding = oStateCombo.getBinding("items");

                        // Use multiple approaches for reliability
                        let bStateSet = false;
                        const fnSetStateOnce = () => {
                            if (!bStateSet) {
                                bStateSet = true;
                                fnSetStateAndCity();
                            }
                        };

                        if (oStateBinding) {
                            // Approach 1: Use dataReceived event
                            oStateBinding.attachDataReceived(fnSetStateOnce);
                            oStateBinding.refresh();

                            // Approach 2: Timeout fallback in case event doesn't fire
                            setTimeout(() => {
                                if (!bStateSet) {
                                    fnSetStateOnce();
                                }
                            }, 300);
                        } else {
                            // Fallback: poll until items are loaded
                            const fnPollForStates = () => {
                                const aStateItems = oStateCombo.getItems();
                                // Filter out placeholder items and check if we have valid items
                                const aValidItems = aStateItems.filter(function (oItem) {
                                    return oItem.getKey() !== "";
                                });
                                if (aValidItems.length > 0) {
                                    fnSetStateOnce();
                                } else {
                                    setTimeout(fnPollForStates, 50);
                                }
                            };
                            setTimeout(fnPollForStates, 100);
                        }
                    }
                }
            } else {
                // No country selected - disable state and city
                if (oStateCombo) {
                    oStateCombo.setSelectedKey("");
                    oStateCombo.unbindItems();
                    oStateCombo.setEnabled(false);
                }
                if (oCityCombo) {
                    oCityCombo.setSelectedKey("");
                    oCityCombo.unbindItems();
                    oCityCombo.setEnabled(false);
                }
            }
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


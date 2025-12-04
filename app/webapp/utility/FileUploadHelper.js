sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("glassboard.utility.FileUploadHelper", {
        /**
         * Handle upload button press
         */
        _onUploadPress: function (oEvent) {
            const sButtonId = oEvent.getSource().getId().split("--").pop();
            const oView = this.getView();
            const oController = this;

            if (!this._pDialog) {
                this._pDialog = sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "glassboard.view.fragments.UploadDialog",
                    controller: oController
                }).then((oDialog) => {
                    oView.addDependent(oDialog);
                    oDialog.data("uploadButtonId", sButtonId);
                    return oDialog;
                });
            }

            this._pDialog.then((oDialog) => {
                oDialog.data("uploadButtonId", sButtonId);
                oDialog.open();
            });
        },

        /**
         * Handle file upload change
         */
        _onFileUploadChange: function (oEvent) {
            const oFileUploader = oEvent.getSource();
            const oFiles = oEvent.getParameter("files");
            const oFile = oFiles && oFiles.length > 0 ? oFiles[0] : (oFileUploader.oFileUpload ? oFileUploader.oFileUpload.files[0] : null);

            if (!oFile) {
                sap.m.MessageToast.show("Please select a CSV file.");
                return;
            }

            const oDialog = this.getView().byId("uploadDialog");
            if (!oDialog) {
                sap.m.MessageToast.show("Upload dialog not found.");
                return;
            }

            const sButtonId = oDialog.data("uploadButtonId");
            const that = this;

            const oReader = new FileReader();
            oReader.onload = function (oEvent) {
                const sContent = oEvent.target.result;
                const aLines = sContent.split("\n").filter(line => line.trim());

                if (aLines.length < 2) {
                    sap.m.MessageBox.error("CSV file must have at least a header row and one data row.");
                    return;
                }

                const mExpectedHeaders = {
                    "customerUpload": [
                        "customerName",
                        "custCountryId", "custStateId", "custCityId", "status", "vertical",
                        "startDate", "endDate",
                    ],
                    "opportunityUpload": [
                        "opportunityName", "sfdcOpportunityId", "businessUnit", "probability",
                        "salesSPOC", "expectedStart", "expectedEnd", "deliverySPOC",
                        "Stage", "tcv", "currency", "customerId",
                    ],
                    "employeeUpload": [
                        "ohrId", "mailid", "fullName", "gender", "employeeType", "unit", "doj", "band", "role", "location", "supervisorOHR", "skills", "country", "city", "lwd", "status", "empallocpercentage",
                    ],
                    "projectUpload": [
                        "sfdcPId", "projectName", "startDate",
                        "endDate", "gpm", "projectType",
                        "oppId", "status", "requiredResources",
                        "allocatedResources", "toBeAllocated",
                        "SOWReceived", "POReceived", "segment", "vertical", "subVertical", "unit"
                    ],
                    "masterDemandUpload": [
                        "skill", "band", "sapPId", "quantity", "allocatedCount", "remaining"
                    ],
                };
                const mExpectedMessage = {
                    "customerUpload": "Customers",
                    "opportunityUpload": "Opportunities",
                    "employeeUpload": "Employees",
                    "projectUpload": "Projects",
                    "masterDemandUpload": "Demands"
                };

                const aHeaders = aLines[0].split(",").map(h => h.trim());

                const aMissingHeaders = mExpectedHeaders[sButtonId].filter(h => !aHeaders.includes(h));
                const aExtraHeaders = aHeaders.filter(h => !mExpectedHeaders[sButtonId].includes(h));

                if (aMissingHeaders.length > 0 || aExtraHeaders.length > 0) {
                    const oMessageManager = sap.ui.getCore().getMessageManager();

                    const oHeaderMessage = new sap.ui.core.message.Message({
                        message: `Invalid CSV template for ${mExpectedMessage[sButtonId]}`,
                        type: sap.ui.core.MessageType.Error,
                        description: `Missing: ${aMissingHeaders.join(", ") || "None"} | Unexpected: ${aExtraHeaders.join(", ") || "None"}`,
                        target: "/Dummy",
                        processor: that.getView().getModel()
                    });
                    oMessageManager.addMessages(oHeaderMessage);
                    return;
                }

                if (aMissingHeaders.length > 0 || aExtraHeaders.length > 0) {
                    sap.m.MessageBox.error(
                        `Invalid CSV template for ${mExpectedMessage[sButtonId]}`,
                        {
                            title: "Invalid File",
                            details: `Missing: ${aMissingHeaders.join(", ") || "None"} | Unexpected: ${aExtraHeaders.join(", ") || "None"}`
                        }
                    );
                    return;
                }

                const sHeaderDates = ["startDate", "endDate", "expectedStart", "expectedEnd", "doj", "lwd"];

                const aPayloadArray = [];


                for (let i = 1; i < aLines.length; i++) {
                    if (!aLines[i].trim()) continue;
                    const aRow = aLines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

                    const oRecord = {};
                    aHeaders.forEach((sHeader, iIndex) => {


                        if (sHeaderDates.includes(sHeader)) {

                            if (aRow[iIndex]?.trim() === "") {
                                oRecord[sHeader] = null;
                            } else {

                                // Convert to ISO format
                                const oDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MM/dd/yyyy" }).parse(aRow[iIndex]?.trim());

                                oRecord[sHeader] = oDate.toISOString().split("T")[0];
                            }



                        } else {
                            oRecord[sHeader] = aRow[iIndex]?.replace(/^"|"$/g, '').trim();
                        }




                    });



                    console.log("records",oRecord);
                    
                    aPayloadArray.push(oRecord);
                }

                that._csvPayload = aPayloadArray;
                sap.m.MessageToast.show("✅ CSV file validated and parsed successfully!");
            };

            oReader.readAsText(oFile);
        },

        /**
         * Handle file upload submit
         */
        _onFileUploadSubmit: async function () {
            const oView = this.getView();
            const oDialog = oView.byId("uploadDialog");

            const oMainModel = this.getView().getModel();

            const oMessageManager = sap.ui.getCore().getMessageManager();
            oMessageManager.removeAllMessages();

            const sButtonId = oDialog.data("uploadButtonId");
            if (!this._csvPayload?.length) {
                sap.m.MessageToast.show("Please parse a CSV file first.");
                return;
            }

            const mEntityMap = {
                customerUpload: "/Customers",
                opportunityUpload: "/Opportunities",
                employeeUpload: "/Employees",
                masterDemandUpload: "/Demands",
                projectUpload: "/Projects",
            };
            const sEntitySet = mEntityMap[sButtonId];
            if (!sEntitySet) return sap.m.MessageBox.error("Invalid entry type selected.");

            sap.m.MessageToast.show(`📤 Uploading ${this._csvPayload.length} records...`);
            oView.setBusy(true);

            const oUploadBtn = this.byId("uploadSubmitBtn");


            if (oUploadBtn) oUploadBtn.setBusy(true);

            const sServiceUrl = oMainModel?.sServiceUrl || "";
            let sCsrfToken = null;
            try {
                const oTokenRes = await fetch(sServiceUrl, {
                    method: "GET",
                    headers: { "X-CSRF-Token": "Fetch" },
                    credentials: "same-origin"
                });
                sCsrfToken = oTokenRes.headers.get("x-csrf-token");
            } catch (oError) {
            }

            let iSuccessCount = 0, iFailureCount = 0;
            const aMessages = [];

            if (this._pDialog) {
                this._pDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
            for (const [iIndex, oRecord] of this._csvPayload.entries()) {





                try {
                    const oRes = await fetch(`${sServiceUrl}${sEntitySet}`, {
                        method: "POST",
                        credentials: "same-origin",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json;odata.metadata=minimal",
                            ...(sCsrfToken && { "X-CSRF-Token": sCsrfToken }),
                        },
                        body: JSON.stringify(oRecord)
                    });

                    const sText = await oRes.text();
                    let sBackendMsg = "";
                    try {
                        const oParsed = JSON.parse(sText);
                        sBackendMsg = oParsed?.Message || oParsed?.message || oParsed?.error?.message || oParsed?.d?.error?.message || "";
                    } catch {
                        sBackendMsg = sText;
                    }

                    if (oRes.status === 201) {
                        iSuccessCount++;
                        aMessages.push(new sap.ui.core.message.Message({
                            message: `✅ Record ${iIndex + 1} uploaded successfully`,
                            type: sap.ui.core.MessageType.Success,
                            description: sBackendMsg || "HTTP 201 Created",
                            additionalText: `Record Index: ${iIndex + 1}`,
                            target: "/Dummy",
                            processor: this.getView().getModel()
                        }));
                    } else {
                        iFailureCount++;
                        aMessages.push(new sap.ui.core.message.Message({
                            message: `❌ Record ${iIndex + 1} failed: ${sBackendMsg || oRes.statusText}`,
                            type: sap.ui.core.MessageType.Error,
                            description: `HTTP ${oRes.status} ${oRes.statusText}`,
                            additionalText: `Record Index: ${iIndex + 1}`,
                            target: "/Dummy",
                            processor: this.getView().getModel()
                        }));
                    }
                } catch (oError) {
                    iFailureCount++;
                    aMessages.push(new sap.ui.core.message.Message({
                        message: `❌ Record ${iIndex + 1} failed: Network/Unexpected error`,
                        type: sap.ui.core.MessageType.Error,
                        description: oError.message || JSON.stringify(oError),
                        additionalText: `Record Index: ${iIndex + 1}`,
                        target: "/Dummy",
                        processor: this.getView().getModel()
                    }));
                }
            }

            if (oUploadBtn) oUploadBtn.setBusy(false);
            oMessageManager.addMessages(aMessages);
            this.getView().getModel("message").setData(oMessageManager.getMessageModel().getData());

            this._csvPayload = null;
            // await oMainModel.refresh();
            oView.setBusy(false);

            sap.m.MessageToast.show(`📋 Upload complete: ${iSuccessCount} success, ${iFailureCount} failed`);
        },

        /**
         * Export upload template
         */
        _exportUploadTemplate: function (oEvent) {
            try {
                if (!oEvent || !oEvent.getSource) {
                    sap.m.MessageBox.error("Invalid event object for template download.");
                    return;
                }

                const oSource = oEvent.getSource();
                const sFullId = oSource.getId();

                // Extract button ID - handle both full ID and base ID
                let sButtonId = sFullId.split("--").pop();

                // If the ID doesn't end with "Upload", it might be a different format
                // Try to find the upload button ID from common patterns
                if (!sButtonId.endsWith("Upload")) {
                    // Check if it contains upload-related keywords
                    const aParts = sFullId.split("--");
                    for (let i = aParts.length - 1; i >= 0; i--) {
                        if (aParts[i].includes("Upload") || aParts[i] === "customerUpload" ||
                            aParts[i] === "opportunityUpload" || aParts[i] === "employeeUpload" ||
                            aParts[i] === "projectUpload" || aParts[i] === "verticalUpload") {
                            sButtonId = aParts[i];
                            break;
                        }
                    }
                }

                // Template headers based on schema (excluding auto-generated keys)
                // Customer: SAPcustId is auto-generated, so exclude it
                // Opportunity: sapOpportunityId is auto-generated, so exclude it
                // Project: sapPId is auto-generated, so exclude it
                // Employee: ohrId is the key but required for upload
                const mExpectedHeaders = {
                    "customerUpload": [
                        "customerName",
                        "custCountryId", "custStateId", "custCityId", "status", "vertical",
                        "startDate", "endDate",
                    ],
                    "opportunityUpload": [
                        "opportunityName", "sfdcOpportunityId", "businessUnit", "probability",
                        "salesSPOC", "expectedStart", "expectedEnd", "deliverySPOC",
                        "Stage", "tcv", "currency", "customerId",
                    ],
                    "employeeUpload": [
                        "ohrId", "mailid", "fullName", "gender", "employeeType", "unit", "doj", "band", "role", "location", "supervisorOHR", "skills", "country", "city", "lwd", "status", "empallocpercentage",
                    ],
                    "projectUpload": [
                        "sfdcPId", "projectName", "startDate",
                        "endDate", "gpm", "projectType",
                        "oppId", "status", "requiredResources",
                        "allocatedResources", "toBeAllocated",
                        "SOWReceived", "POReceived", "segment", "vertical", "subVertical", "unit"
                    ],
                    "masterDemandUpload": [
                        "skill", "band", "sapPId", "quantity", "allocatedCount", "remaining"
                    ],
                };

                const aHeaders = mExpectedHeaders[sButtonId];
                if (!aHeaders) {
                    sap.m.MessageBox.error(`Unknown upload type: ${sButtonId}. Full ID: ${sFullId}`);
                    console.error("Download Template Error:", { sButtonId, sFullId, availableKeys: Object.keys(mExpectedHeaders) });
                    return;
                }

                // Add BOM for Excel compatibility
                const sCsvContent = "\uFEFF" + aHeaders.join(",") + "\n";
                const mExpectedMessage = {
                    "customerUpload": "Customers",
                    "opportunityUpload": "Opportunities",
                    "employeeUpload": "Employees",
                    "projectUpload": "Projects",
                    "masterDemandUpload": "Demands"
                };
                const sFileBase = mExpectedMessage[sButtonId] || sButtonId.replace("Upload", "");
                const sFileName = `${sFileBase}_Template.csv`;

                // Call downloadCSV with proper context - try both public and private methods
                if (typeof this.downloadCSV === "function") {
                    // Public method from controller
                    this.downloadCSV(sCsvContent, sFileName);
                } else if (typeof this._downloadCSV === "function") {
                    // Private method from CustomUtility
                    this._downloadCSV(sCsvContent, sFileName);
                } else if (typeof FileUploadHelper.prototype._downloadCSV === "function") {
                    // Direct prototype call
                    FileUploadHelper.prototype._downloadCSV.call(this, sCsvContent, sFileName);
                } else {
                    // Fallback: direct download implementation
                    try {
                        const oBlob = new Blob([sCsvContent], { type: "text/csv;charset=utf-8;" });
                        const sUrl = URL.createObjectURL(oBlob);
                        const oLink = document.createElement("a");

                        oLink.href = sUrl;
                        oLink.download = sFileName;
                        oLink.style.display = "none";
                        document.body.appendChild(oLink);
                        oLink.click();

                        setTimeout(() => {
                            document.body.removeChild(oLink);
                            URL.revokeObjectURL(sUrl);
                        }, 100);

                        sap.m.MessageToast.show(`Template downloaded: ${sFileName}`);
                    } catch (oDownloadError) {
                        console.error("Error downloading CSV:", oDownloadError);
                        sap.m.MessageBox.error("Failed to download template: " + oDownloadError.message);
                    }
                }
            } catch (oError) {
                console.error("Error in _exportUploadTemplate:", oError);
                sap.m.MessageBox.error("Failed to export template: " + oError.message);
            }
        },

        /**
         * Download CSV file
         */
        _downloadCSV: function (sContent, sFileName) {
            try {
                const oBlob = new Blob([sContent], { type: "text/csv;charset=utf-8;" });
                const sUrl = URL.createObjectURL(oBlob);
                const oLink = document.createElement("a");

                oLink.href = sUrl;
                oLink.download = sFileName;
                oLink.style.display = "none";
                document.body.appendChild(oLink);
                oLink.click();

                // Clean up after a short delay
                setTimeout(() => {
                    document.body.removeChild(oLink);
                    URL.revokeObjectURL(sUrl);
                }, 100);

                sap.m.MessageToast.show(`Template downloaded: ${sFileName}`);
            } catch (oError) {
                sap.m.MessageBox.error("Failed to download template: " + oError.message);
            }
        },

        /**
         * Close upload dialog
         */
        _onCloseUpload: function () {
            const oDialog = this.getView().byId("uploadDialog");
            if (oDialog) {
                oDialog.close();
            } else if (this._pDialog) {
                this._pDialog.then((oDialog) => {
                    if (oDialog) {
                        oDialog.close();
                    }
                });
            }
        }
    });
});


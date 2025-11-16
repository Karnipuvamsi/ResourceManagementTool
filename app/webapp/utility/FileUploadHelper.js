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

            if (!this._pDialog) {
                this._pDialog = sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "glassboard.view.fragments.UploadDialog"
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
            const oFile = oEvent.getParameter("files")[0];
            if (!oFile) return;

            const oDialog = this.getView().byId("uploadDialog");
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
                        "state", "country", "status", "vertical",
                        "startDate", "endDate",
                    ],
                    "opportunityUpload": [
                        "opportunityName", "sfdcOpportunityId", "businessUnit", "probability",
                        "salesSPOC", "expectedStart", "expectedEnd", "deliverySPOC",
                        "Stage", "tcv", "customerId",
                    ],
                    "employeeUpload": [
                        "ohrId", "mailid", "fullName", "gender", "employeeType", "doj", "band", "role", "location", "supervisorOHR", "skills", "country", "city", "lwd", "status", "empallocpercentage",
                    ],
                    "projectUpload": [
                        "sfdcPId", "projectName", "startDate",
                        "endDate", "gpm", "projectType",
                        "oppId", "status", "requiredResources",
                        "allocatedResources", "toBeAllocated",
                        "SOWReceived", "POReceived",
                    ],
                    "verticalUpload": [
                        "id", "verticalName"
                    ],
                };
                const mExpectedMessage = {
                    "customerUpload": "Customers",
                    "opportunityUpload": "Opportunities",
                    "employeeUpload": "Employees",
                    "projectUpload": "Projects",
                    "verticalUpload": "Verticals"
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

                const aPayloadArray = [];
                for (let i = 1; i < aLines.length; i++) {
                    if (!aLines[i].trim()) continue;
                    const aRow = aLines[i].split(",");
                    const oRecord = {};
                    aHeaders.forEach((sHeader, iIndex) => {
                        oRecord[sHeader] = aRow[iIndex]?.trim();
                    });

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
                verticalUpload: "/Verticals",
                projectUpload: "/Projects",
            };
            const sEntitySet = mEntityMap[sButtonId];
            if (!sEntitySet) return sap.m.MessageBox.error("Invalid entry type selected.");

            sap.m.MessageToast.show(`📤 Uploading ${this._csvPayload.length} records...`);
            oView.setBusy(true);

            const oUploadBtn = sap.ui.getCore().byId("uploadSubmitBtn");
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
            await oMainModel.refresh();
            oView.setBusy(false);

            sap.m.MessageToast.show(`📋 Upload complete: ${iSuccessCount} success, ${iFailureCount} failed`);
        },

        /**
         * Export upload template
         */
        _exportUploadTemplate: function (oEvent) {
            const sButtonId = oEvent.getSource().getId().split("--").pop();

            const mExpectedHeaders = {
                "customerUpload": [
                    "customerName",
                    "state", "country", "status", "vertical",
                    "startDate", "endDate",
                ],
                "opportunityUpload": [
                    "opportunityName", "sfdcOpportunityId", "businessUnit", "probability",
                    "salesSPOC", "expectedStart", "expectedEnd", "deliverySPOC",
                    "Stage", "tcv", "customerId",
                ],
                "employeeUpload": [
                    "ohrId", "mailid", "fullName",
                    "gender", "employeeType", "doj", "band", "role", "location", "supervisorOHR", "skills", "country", "city", "lwd", "status", "empallocpercentage",
                ],
                "projectUpload": [
                    "sfdcPId", "projectName", "startDate",
                    "endDate", "gpm", "projectType",
                    "oppId", "status", "requiredResources",
                    "allocatedResources", "toBeAllocated",
                    "SOWReceived", "POReceived",
                ],
                "verticalUpload": [
                    "id", "verticalName"
                ],
            };

            const aHeaders = mExpectedHeaders[sButtonId];
            if (!aHeaders) {
                sap.m.MessageBox.error("Unknown upload type: " + sButtonId);
                return;
            }

            const sCsvContent = aHeaders.join(",") + "\n";
            const sFileName = sButtonId.replace("Upload", "") + "_template.csv";

            this._downloadCSV(sCsvContent, sFileName);
        },

        /**
         * Download CSV file
         */
        _downloadCSV: function (sContent, sFileName) {
            const oBlob = new Blob([sContent], { type: "text/csv;charset=utf-8;" });
            const sUrl = URL.createObjectURL(oBlob);
            const oLink = document.createElement("a");

            if (oLink.download !== undefined) {
                oLink.href = sUrl;
                oLink.download = sFileName;
                oLink.style.visibility = "hidden";
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
            }
        },

        /**
         * Close upload dialog
         */
        _onCloseUpload: function () {
            if (this._pDialog) {
                this._pDialog.then((oDialog) => {
                    oDialog.close();
                });
            }
        }
    });
});


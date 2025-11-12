sap.ui.define([
    "sap/ui/mdc/odata/v4/TableDelegate",
    "sap/ui/model/Sorter",
    "sap/ui/mdc/FilterField",
    "sap/ui/mdc/Field",
    "sap/ui/mdc/library",
    "sap/m/HBox",
    "sap/m/Button",
    "sap/m/library",
    "sap/m/ComboBox",
    "sap/ui/core/Item"
], function (ODataTableDelegate, Sorter, FilterField, Field, mdcLibrary, HBox, Button, mLibrary, ComboBox, Item) {
    "use strict";

    const ProjectsNearingCompletionReportTableDelegate = Object.assign({}, ODataTableDelegate);

    ProjectsNearingCompletionReportTableDelegate.getSupportedP13nModes = function () {
        return ["Column", "Sort", "Filter", "Group"];
    };

    // Format property labels
    ProjectsNearingCompletionReportTableDelegate._formatPropertyLabel = function(sPropertyName) {
        // Custom header mapping for Projects Nearing Completion Report
        const mCustomHeaders = {
            "sapPId": "SAP PID",
            "projectReference": "Project Reference",
            "projectName": "Project Name",
            "projectType": "Project Type",
            "completionDate": "Completion Date",
            "daysToCompletion": "Days To Completion",
            "status": "Status",
            "completionRisk": "Completion Risk",
            "employeeCount": "Employee Count",
            "projectManager": "Project Manager",
            "projectManagerEmail": "Project Manager Email",
            "customer": "Customer"
        };

        if (mCustomHeaders[sPropertyName]) {
            return mCustomHeaders[sPropertyName];
        }

        // Smart fallback formatting
        return sPropertyName
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    ProjectsNearingCompletionReportTableDelegate.fetchProperties = function (oTable) {
        console.log("=== [ProjectsNearingCompletionReportTableDelegate] fetchProperties called ===");

        const oModel = oTable.getModel();
        if (!oModel) {
            console.error("[ProjectsNearingCompletionReportTableDelegate] No model found on table");
            return Promise.resolve([]);
        }

        const oMetaModel = oModel.getMetaModel();
        const sCollectionPath = "ProjectsNearingCompletionReport";

        return oMetaModel.requestObject(`/${sCollectionPath}/$Type`)
            .then(function (sEntityTypePath) {
                return oMetaModel.requestObject(`/${sEntityTypePath}/`);
            })
            .then(function (oEntityType) {
                const aProperties = [];

                Object.keys(oEntityType).forEach(function (sPropertyName) {
                    if (sPropertyName.startsWith("$")) {
                        return;
                    }

                    const oProperty = oEntityType[sPropertyName];

                    if (oProperty.$kind === "Property" || !oProperty.$kind) {
                        const sType = oProperty.$Type || "Edm.String";
                        const sLabel = ProjectsNearingCompletionReportTableDelegate._formatPropertyLabel(sPropertyName);

                        aProperties.push({
                            name: sPropertyName,
                            path: sPropertyName,
                            label: sLabel,
                            dataType: sType,
                            sortable: true,
                            filterable: true,
                            groupable: true,
                            maxConditions: -1,
                            caseSensitive: sType === "Edm.String" ? false : undefined
                        });
                    }
                });

                return aProperties;
            })
            .catch(function (oError) {
                console.error("[ProjectsNearingCompletionReportTableDelegate] Error fetching properties:", oError);
                return [];
            });
    };

    ProjectsNearingCompletionReportTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        ODataTableDelegate.updateBindingInfo.apply(this, arguments);

        oBindingInfo.path = "/ProjectsNearingCompletionReport";
        oBindingInfo.parameters = Object.assign(oBindingInfo.parameters || {}, {
            $count: true
        });
    };

    ProjectsNearingCompletionReportTableDelegate.addItem = function (oTable, sPropertyName, mPropertyBag) {
        return this.fetchProperties(oTable).then(function (aProperties) {
            const oProperty = aProperties.find(function (p) {
                return p.name === sPropertyName || p.path === sPropertyName;
            });

            if (!oProperty) {
                return Promise.reject("Property not found: " + sPropertyName);
            }

            // Format label using the helper function
            const sLabel = ProjectsNearingCompletionReportTableDelegate._formatPropertyLabel(sPropertyName);

            return new Promise(function (resolve) {
                sap.ui.require(["sap/ui/mdc/table/Column"], function (Column) {
                    const oField = new Field({
                        value: "{" + sPropertyName + "}",
                        tooltip: sLabel,
                        editMode: "Display"
                    });

                    const oColumn = new Column({
                        id: oTable.getId() + "--col-" + sPropertyName,
                        dataProperty: sPropertyName,
                        propertyKey: sPropertyName,
                        header: sLabel,
                        template: oField
                    });

                    resolve(oColumn);
                });
            });
        });
    };

    ProjectsNearingCompletionReportTableDelegate.removeItem = function (oTable, oColumn, mPropertyBag) {
        if (oColumn) {
            oColumn.destroy();
        }
        return Promise.resolve(true);
    };

    ProjectsNearingCompletionReportTableDelegate.getFilterDelegate = function () {
        return {
            addItem: function (vArg1, vArg2, vArg3) {
                var oTable = (vArg1 && typeof vArg1.isA === "function" && vArg1.isA("sap.ui.mdc.Table")) ? vArg1 : vArg2;
                var vProperty = (oTable === vArg1) ? vArg2 : vArg1;
                var mPropertyBag = vArg3;

                const sName =
                    (typeof vProperty === "string" && vProperty) ||
                    (vProperty && (vProperty.name || vProperty.path || vProperty.key)) ||
                    (mPropertyBag && (mPropertyBag.name || mPropertyBag.propertyKey)) ||
                    (mPropertyBag && mPropertyBag.property && (mPropertyBag.property.name || mPropertyBag.property.path || mPropertyBag.property.key));
                if (!sName) {
                    return Promise.reject("Invalid property for filter item");
                }

                let sDataType = "sap.ui.model.odata.type.String";
                try {
                    const oModel = oTable.getModel();
                    const oMetaModel = oModel && oModel.getMetaModel && oModel.getMetaModel();
                    if (oMetaModel) {
                        const oProp = oMetaModel.getObject(`/ProjectsNearingCompletionReport/${sName}`);
                        const sEdmType = oProp && oProp.$Type;
                        const mTypeMap = {
                            "Edm.String": "sap.ui.model.odata.type.String",
                            "Edm.Int16": "sap.ui.model.odata.type.Int16",
                            "Edm.Int32": "sap.ui.model.odata.type.Int32",
                            "Edm.Int64": "sap.ui.model.odata.type.Int64",
                            "Edm.Decimal": "sap.ui.model.odata.type.Decimal",
                            "Edm.Double": "sap.ui.model.odata.type.Double",
                            "Edm.Boolean": "sap.ui.model.odata.type.Boolean",
                            "Edm.Date": "sap.ui.model.odata.type.Date",
                            "Edm.DateTimeOffset": "sap.ui.model.odata.type.DateTimeOffset",
                            "Edm.Guid": "sap.ui.model.odata.type.Guid"
                        };
                        sDataType = mTypeMap[sEdmType] || sDataType;
                    }
                } catch (e) { /* ignore */ }

                return Promise.resolve(new FilterField({
                    label: sName,
                    propertyKey: sName,
                    conditions: "{$filters>/conditions/" + sName + "}",
                    dataType: sDataType
                }));
            }
        };
    };

    return ProjectsNearingCompletionReportTableDelegate;
});


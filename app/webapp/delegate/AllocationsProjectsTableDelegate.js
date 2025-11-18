sap.ui.define([
    "glassboard/delegate/BaseTableDelegate",
    "sap/ui/model/Sorter",
    "sap/ui/mdc/FilterField",
    "sap/ui/mdc/Field",
    "sap/ui/mdc/library",
    "sap/m/HBox",
    "sap/m/Button",
    "sap/m/library",
    "sap/m/ComboBox",
    "sap/ui/core/Item"
], function (BaseTableDelegate, Sorter, FilterField, Field, mdcLibrary, HBox, Button, mLibrary, ComboBox, Item) {
    "use strict";

    /**
     * Allocations Projects Table Delegate
     * Extends BaseTableDelegate with Projects-specific logic for Allocations Overview
     * This is a separate delegate from ProjectsTableDelegate to avoid conflicts
     */
    const AllocationsProjectsTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Allocations Projects
    AllocationsProjectsTableDelegate._getDefaultTableId = function() {
        return "Projects";
    };

    // ✅ Override delegate name for logging
    AllocationsProjectsTableDelegate._getDelegateName = function() {
        return "AllocationsProjectsTableDelegate";
    };

    // ✅ fetchProperties is inherited from BaseTableDelegate
    // Only override if Allocations Projects-specific logic is needed

    // ✅ Allocations Projects-specific: Override updateBindingInfo to expand Opportunity and GPM associations
    AllocationsProjectsTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call parent implementation first (handles common logic)
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);

        const sPath = oTable.getPayload()?.collectionPath || "Projects";
        const sCollectionPath = sPath.replace(/^\//, "");
        
        // ✅ Allocations Projects-specific: Expand Opportunity and GPM associations
        if (sCollectionPath === "Projects") {
            // ✅ Expand Opportunity and GPM associations (like Supervisor in Employees)
            oBindingInfo.parameters.$expand = "to_Opportunity,to_GPM";
        }
    };

    // ✅ Allocations Projects-specific: addItem method with custom headers
    AllocationsProjectsTableDelegate.addItem = function (oTable, sPropertyName, mPropertyBag) {
        return this.fetchProperties(oTable).then(function (aProperties) {
            const oProperty = aProperties.find(function (p) {
                return p.name === sPropertyName || p.path === sPropertyName;
            });

            if (!oProperty) {
                return Promise.reject("Property not found: " + sPropertyName);
            }

            // Custom header mapping for Allocations Projects table
            const mCustomHeaders = {
                "sapPId": "Internal PID",
                "sfdcPId": "Actual PID",
                "projectName": "Project Name",
                "startDate": "Start Date",
                "endDate": "End Date",
                "gpm": "GPM",
                "projectType": "Project Type",
                "oppId": "Opp Name",
                "status": "Project Status"
            };

            // Smart header generation with better fallback
            let sLabel;
            let sTooltip;

            if (mCustomHeaders[sPropertyName]) {
                // Use custom header if available
                sLabel = mCustomHeaders[sPropertyName];
                sTooltip = sLabel; // Same as label
            } else {
                // Smart fallback for any new or unmapped fields
                sLabel = sPropertyName
                    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')   // e.g., "SAPId" → "SAP Id"
                    .replace(/([a-z])([A-Z])/g, '$1 $2')         // e.g., "projectName" → "Project Name"
                    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')    // e.g., "OHRId" → "OHR Id"
                    .replace(/^./, str => str.toUpperCase())     // Capitalize first letter
                    .trim();

                sTooltip = `${sLabel} (Field: ${sPropertyName})`;

                // console.log(`[AllocationsProjectsTableDelegate] New field detected: "${sPropertyName}" → "${sLabel}"`);
            }

            // Assign to property metadata
            oProperty.label = sLabel;
            oProperty.tooltip = sTooltip;


            // Load the Column module and create column
            return new Promise(function (resolve) {
                sap.ui.require(["sap/ui/mdc/table/Column"], function (Column) {
                    const sTableId = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Projects";
                    
                    const oEnumConfig = AllocationsProjectsTableDelegate._getEnumConfig(sTableId, sPropertyName);
                    const bIsEnum = !!oEnumConfig;
                    const oAssocPromise = AllocationsProjectsTableDelegate._detectAssociation(oTable, sPropertyName);
                    
                    const fnEditModeFormatter = function (sPath) {
                        var rowPath = this.getBindingContext() && this.getBindingContext().getPath();
                        if (sPath && sPath.includes(",")) {
                            const aEditingPaths = sPath.split(",");
                            return aEditingPaths.includes(rowPath) ? "Editable" : "Display";
                        }
                        return sPath === rowPath ? "Editable" : "Display";
                    };

                    const oEditableBinding = {
                        parts: [{ path: `edit>/${sTableId}/editingPath` }],
                        mode: "TwoWay",
                        formatter: function (sPath) {
                            var rowPath = this.getBindingContext() && this.getBindingContext().getPath();
                            if (sPath && sPath.includes(",")) {
                                const aEditingPaths = sPath.split(",");
                                return aEditingPaths.includes(rowPath);
                            }
                            return sPath === rowPath;
                        }
                    };

                    oAssocPromise.then(function(oAssocConfig) {
                        const bIsAssoc = !!oAssocConfig;
                        let oField;

                        if (bIsEnum) {
                            const aItems = oEnumConfig.values.map(function(sVal, iIndex) {
                                return new Item({
                                    key: sVal,
                                    text: oEnumConfig.labels[iIndex] || sVal
                                });
                            });
                            const oComboBox = new ComboBox({
                                value: "{" + sPropertyName + "}",
                                selectedKey: "{" + sPropertyName + "}",
                                items: aItems,
                                editable: oEditableBinding
                            });
                            oField = new Field({
                                value: "{" + sPropertyName + "}",
                                contentEdit: oComboBox,
                                editMode: {
                                    parts: [{ path: `edit>/${sTableId}/editingPath` }],
                                    mode: "TwoWay",
                                    formatter: fnEditModeFormatter
                                }
                            });
                        } else if (bIsAssoc) {
                            // ✅ ASSOCIATION: Display name from association, but store ID for editing
                            // Determine association path based on property
                            let sAssocPath = "";
                            if (sPropertyName === "customerId") {
                                sAssocPath = "to_Customer/customerName"; // Display customer name
                            } else if (sPropertyName === "supervisorOHR") {
                                sAssocPath = "to_Supervisor/fullName"; // Display supervisor name
                            } else if (sPropertyName === "oppId") {
                                sAssocPath = "to_Opportunity/opportunityName"; // Display opportunity name
                            } else {
                                // Fallback: try to construct association path
                                sAssocPath = sPropertyName.replace("Id", "").replace("OHR", "");
                                if (sAssocPath === "customer") {
                                    sAssocPath = "to_Customer/customerName";
                                } else if (sAssocPath === "opp") {
                                    sAssocPath = "to_Opportunity/opportunityName";
                                } else if (sAssocPath === "supervisor") {
                                    sAssocPath = "to_Supervisor/fullName";
                                } else {
                                    sAssocPath = sPropertyName; // Fallback to ID
                                }
                            }
                            
                            const oModel = oTable.getModel();
                            const sCollectionPath = "/" + oAssocConfig.targetEntity;
                            
                            const oComboBox = new ComboBox({
                                selectedKey: "{" + sPropertyName + "}",
                                value: "{" + sPropertyName + "}",
                                items: {
                                    path: sCollectionPath,
                                    template: new Item({
                                        key: "{" + oAssocConfig.keyField + "}",
                                        text: "{" + oAssocConfig.displayField + "}"
                                    })
                                },
                                editable: oEditableBinding,
                                showSecondaryValues: true,
                                filterSecondaryValues: true,
                                placeholder: "Select " + oAssocConfig.displayField
                            });
                            
                            // Bind to the same model as the table
                            oComboBox.setModel(oModel);

                            // ✅ Display only ID (not description) for association fields
                            oField = new Field({
                                value: "{" + sPropertyName + "}",
                                contentEdit: oComboBox,
                                editMode: {
                                    parts: [{ path: `edit>/${sTableId}/editingPath` }],
                                    mode: "TwoWay",
                                    formatter: fnEditModeFormatter
                                }
                            });
                        } else {
                            oField = new Field({
                                value: "{" + sPropertyName + "}",
                                tooltip: "{" + sPropertyName + "}",
                                editMode: {
                                    parts: [{ path: `edit>/${sTableId}/editingPath` }],
                                    mode: "TwoWay",
                                    formatter: fnEditModeFormatter
                                }
                            });
                        }

                        const oColumn = new Column({
                            id: oTable.getId() + "--col-" + sPropertyName,
                            dataProperty: sPropertyName,
                            propertyKey: sPropertyName,
                            header: sLabel,
                            template: oField
                        });

                        resolve(oColumn);
                    }).catch(function(oError) {
                        const oField = new Field({
                            value: "{" + sPropertyName + "}",
                            tooltip: "{" + sPropertyName + "}",
                            editMode: {
                                parts: [{ path: `edit>/${sTableId}/editingPath` }],
                                mode: "TwoWay",
                                formatter: fnEditModeFormatter
                            }
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
        });
    };

    AllocationsProjectsTableDelegate.removeItem = function (oTable, oColumn, mPropertyBag) {
        if (oColumn) {
            oColumn.destroy();
        }

        return Promise.resolve(true);
    };

    // Provide FilterField creation for Adaptation Filter panel in table p13n
    AllocationsProjectsTableDelegate.getFilterDelegate = function () {
        return {
            addItem: function (vArg1, vArg2, vArg3) {
                // Normalize signature: MDC may call (oTable, vProperty, mBag) or (vProperty, oTable, mBag)
                var oTable = (vArg1 && typeof vArg1.isA === "function" && vArg1.isA("sap.ui.mdc.Table")) ? vArg1 : vArg2;
                var vProperty = (oTable === vArg1) ? vArg2 : vArg1;
                var mPropertyBag = vArg3;

                // Resolve property name from string, property object, or mPropertyBag
                const sName =
                    (typeof vProperty === "string" && vProperty) ||
                    (vProperty && (vProperty.name || vProperty.path || vProperty.key)) ||
                    (mPropertyBag && (mPropertyBag.name || mPropertyBag.propertyKey)) ||
                    (mPropertyBag && mPropertyBag.property && (mPropertyBag.property.name || mPropertyBag.property.path || mPropertyBag.property.key));
                if (!sName) {
                    return Promise.reject("Invalid property for filter item");
                }

                let sDataType = "sap.ui.model.type.String";
                try {
                    const oModel = oTable.getModel();
                    const oMetaModel = oModel && oModel.getMetaModel && oModel.getMetaModel();
                    if (oMetaModel) {
                        const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Projects";
                        const oProp = oMetaModel.getObject(`/${sCollectionPath}/${sName}`);
                        const sEdmType = oProp && oProp.$Type;
                        if (sEdmType === "Edm.Int16" || sEdmType === "Edm.Int32" || sEdmType === "Edm.Int64" || sEdmType === "Edm.Decimal") {
                            sDataType = "sap.ui.model.type.Integer";
                        } else if (sEdmType === "Edm.Boolean") {
                            sDataType = "sap.ui.model.type.Boolean";
                        } else if (sEdmType === "Edm.Date" || sEdmType === "Edm.DateTimeOffset") {
                            sDataType = "sap.ui.model.type.Date";
                        }
                    }
                } catch (e) { /* ignore */ }

                return Promise.resolve(new FilterField({
                    label: String(sName)
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, function (str) { return str.toUpperCase(); })
                        .trim(),
                    propertyKey: sName,
                    conditions: "{$filters>/conditions/" + sName + "}",
                    dataType: sDataType
                }));
            }
        };
    };

    return AllocationsProjectsTableDelegate;
});


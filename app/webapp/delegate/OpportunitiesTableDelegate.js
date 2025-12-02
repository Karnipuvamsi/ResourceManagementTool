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
     * Opportunities Table Delegate
     * Extends BaseTableDelegate with Opportunities-specific logic
     */
    const OpportunitiesTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Opportunities
    OpportunitiesTableDelegate._getDefaultTableId = function() {
        return "Opportunities";
    };

    // ✅ Override delegate name for logging
    OpportunitiesTableDelegate._getDelegateName = function() {
        return "OpportunitiesTableDelegate";
    };

    // ✅ fetchProperties is inherited from BaseTableDelegate
    // Override to provide fallback properties for Opportunities
    OpportunitiesTableDelegate._getFallbackProperties = function(sCollectionPath) {
        if (sCollectionPath === "Opportunities") {
            return [
                        { name: "sapOpportunityId", path: "sapOpportunityId", label: "SAP Opportunity ID", dataType: "Edm.Int32", sortable: true, filterable: true, groupable: true },
                        { name: "sfdcOpportunityId", path: "sfdcOpportunityId", label: "SFDC Opportunity ID", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                        { name: "probability", path: "probability", label: "Actual Probability %", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                        { name: "salesSPOC", path: "salesSPOC", label: "Sales SPOC", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                        { name: "deliverySPOC", path: "deliverySPOC", label: "Delivery SPOC", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                        { name: "expectedStart", path: "expectedStart", label: "Expected Start", dataType: "Edm.Date", sortable: true, filterable: true, groupable: true },
                        { name: "expectedEnd", path: "expectedEnd", label: "Expected End", dataType: "Edm.Date", sortable: true, filterable: true, groupable: true },
                        { name: "customerId", path: "customerId", label: "Customer ID", dataType: "Edm.Int32", sortable: true, filterable: true, groupable: true }
            ];
        }
        return [];
    };

    // ✅ Opportunities-specific: Override updateBindingInfo to expand Customer association
    OpportunitiesTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call parent implementation first (handles common logic)
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);

        const sPath = oTable.getPayload()?.collectionPath || "Opportunities";
        const sCollectionPath = sPath.replace(/^\//, "");
        
        // ✅ Opportunities-specific: Expand Customer association
        if (sCollectionPath === "Opportunities") {
            // Expand Customer association for Opportunity table
            oBindingInfo.parameters.$expand = "to_Customer";
        }
        
    };

    // ✅ Opportunities-specific: addItem method with custom headers
    OpportunitiesTableDelegate.addItem = function (oTable, sPropertyName, mPropertyBag) {
        return this.fetchProperties(oTable).then(function (aProperties) {
            const oProperty = aProperties.find(function (p) {
                return p.name === sPropertyName || p.path === sPropertyName;
            });

            if (!oProperty) {
                return Promise.reject("Property not found: " + sPropertyName);
            }

            // Format label
            // const sLabel = sPropertyName
            //     // .replace(/([A-Z])/g, ' $1')
            //     .replace(/([a-z])([A-Z])/g, '$1 $2')
            //     .replace(/^./, function(str) { return str.toUpperCase(); })
            //     .trim();
            // Custom header mapping for Opportunities table
            const mCustomHeaders = {
                "sapOpportunityId": "SAP Opp. ID",
                "sfdcOpportunityId": "SFDC Opp. ID",
                "opportunityName": "Opp. Name",
                "businessUnit": "Business Unit",
                "probability": "Actual Probability %",
                "salesSPOC": "Sales SPOC",
                "deliverySPOC": "Delivery SPOC",
                "expectedStart": "Expected Start",
                "expectedEnd": "Expected End",
                "tcv":"TCV",
                "Stage": "SFDC Probability %",
                "customerId": "Customer Name"
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
                    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')   // "SAPId" → "SAP Id"
                    .replace(/([a-z])([A-Z])/g, '$1 $2')         // "customerName" → "Customer Name"
                    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')    // "OHRId" → "OHR Id"
                    .replace(/^./, str => str.toUpperCase())     // Capitalize first letter
                    .trim();

                sTooltip = `${sLabel} (Field: ${sPropertyName})`;

                // console.log(`[OpportunitiesTableDelegate] New field detected: "${sPropertyName}" → "${sLabel}"`);
            }

            oProperty.label = sLabel;
            oProperty.tooltip = sTooltip;


            // Load the Column module and create column
            return new Promise(function (resolve) {
                sap.ui.require(["sap/ui/mdc/table/Column"], function (Column) {
                    const sTableId = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Opportunities";
                    
                    const oEnumConfig = OpportunitiesTableDelegate._getEnumConfig(sTableId, sPropertyName);
                    const bIsEnum = !!oEnumConfig;
                    const oAssocPromise = OpportunitiesTableDelegate._detectAssociation(oTable, sPropertyName);
                    
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
                                    }),
                                    templateShareable: false
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

    OpportunitiesTableDelegate.removeItem = function (oTable, oColumn, mPropertyBag) {
        if (oColumn) {
            oColumn.destroy();
        }

        return Promise.resolve(true);
    };

    OpportunitiesTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
    // call Base first
    BaseTableDelegate.updateBindingInfo.apply(this, arguments);

    // get search text from the ValueHelp content
    let sSearch = "";
    try {
        const oVH = oTable.getParent().getParent(); // MDCTable → Dialog → ValueHelp
        const aContent = oVH?.getContent?.();
        const oDialogContent = aContent && aContent[0];
        sSearch = oDialogContent?.getSearch?.();
    } catch (e) {}

    // Fallback to main Opportunity FilterBar (if any)
    if (!sSearch) {
        const oFilterBar = sap.ui.getCore().byId("opportunityFilterBar");
        if (oFilterBar?.getSearch) sSearch = oFilterBar.getSearch();
    }

    // if nothing searched → no filter injected
    if (!sSearch) return;

    // table ID to decide which fields to filter
    const sId = oTable.getId();

    let aFilters = [];

    // ----------- SAP Opp ID VH -------------------
    if (sId.includes("tblSAPOppVH")) {
        aFilters = [
            new sap.ui.model.Filter({ path: "sapOpportunityId", operator: "Contains", value1: sSearch, caseSensitive: false }),
            new sap.ui.model.Filter({ path: "opportunityName", operator: "Contains", value1: sSearch, caseSensitive: false })
        ];
    }

    // ----------- SFDC Opp ID VH -------------------
    else if (sId.includes("tblSfdcOppVH")) {
        aFilters = [
            new sap.ui.model.Filter({ path: "sfdcOpportunityId", operator: "Contains", value1: sSearch, caseSensitive: false }),
            new sap.ui.model.Filter({ path: "opportunityName", operator: "Contains", value1: sSearch, caseSensitive: false })
        ];
    }

    // ----------- Opportunity Name VH -------------------
    else if (sId.includes("tblOppNameVH")) {
        aFilters = [
            new sap.ui.model.Filter({ path: "opportunityName", operator: "Contains", value1: sSearch, caseSensitive: false }),
            new sap.ui.model.Filter({ path: "sapOpportunityId", operator: "Contains", value1: sSearch, caseSensitive: false})
        ];
    }

    // ----------- Business Unit VH -------------------
    else if (sId.includes("tblBusinessUnitVH")) {
        aFilters = [
            new sap.ui.model.Filter({ path: "businessUnit", operator: "Contains", value1: sSearch, caseSensitive: false })
        ];
    }

    // ----------- Sales SPOC VH -------------------
    else if (sId.includes("tblSalesSpocVH")) {
        aFilters = [
            new sap.ui.model.Filter({ path: "salesSPOC", operator: "Contains", value1: sSearch, caseSensitive: false })
        ];
    }

    // ----------- Delivery SPOC VH -------------------
    else if (sId.includes("tblDeliverySpocVH")) {
        aFilters = [
            new sap.ui.model.Filter({ path: "deliverySPOC", operator: "Contains", value1: sSearch, caseSensitive: false })
        ];
    }

    // ----------- Customer VH inside Opportunities -------------------
    else if (sId.includes("tblOppCustomerVH")) {
        aFilters = [
            new sap.ui.model.Filter({ path: "customerName", operator: "Contains", value1: sSearch, caseSensitive: false }),
            new sap.ui.model.Filter({ path: "SAPcustId", operator: "Contains", value1: sSearch, caseSensitive: false })
        ];
    }

    // fallback if no mapping found
    if (aFilters.length === 0) {
        console.warn("No filter mapping for table:", sId);
        return;
    }

    // OR group
    oBindingInfo.filters = [
        new sap.ui.model.Filter({
            filters: aFilters,
            and: false
        })
    ];

    console.log("OPPORTUNITY VH FILTER APPLIED for", sId, oBindingInfo.filters);
};


    // Provide FilterField creation for Adaptation Filter panel in table p13n
    OpportunitiesTableDelegate.getFilterDelegate = function () {
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
                        const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Customers";
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

    return OpportunitiesTableDelegate;
});
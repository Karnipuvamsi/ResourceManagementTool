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
     * Demands Table Delegate
     * Extends BaseTableDelegate with Demands-specific logic
     */
    const DemandsTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Demands
    DemandsTableDelegate._getDefaultTableId = function() {
        return "Demands";
    };

    // ✅ Override delegate name for logging
    DemandsTableDelegate._getDelegateName = function() {
        return "DemandsTableDelegate";
    };

    // ✅ SHARED LABEL FORMATTER: Ensures consistent labels across fetchProperties and getFilterDelegate
    DemandsTableDelegate._formatPropertyLabel = function(sTableId, sPropertyName) {
        // Custom header mapping - check table type first
        let mCustomHeaders = {};
        
        if (sTableId === "Demands") {
            mCustomHeaders = {
                "sapPId": "Project ID", // ✅ Changed from "Project Name" to "Project ID"
                "skillId": "Skill",
                "skill": "Skill",
                "band": "Band",
                "quantity": "Quantity"
                // ✅ Removed "demandId" - it's auto-generated and not needed in table display
            };
        } else {
            // Default headers for other tables
            mCustomHeaders = {};
        }

        if (mCustomHeaders[sPropertyName]) {
            return mCustomHeaders[sPropertyName];
        }

        // Smart fallback formatting (same as in getFilterDelegate)
        return String(sPropertyName)
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, function (str) { return str.toUpperCase(); })
            .trim();
    };

    DemandsTableDelegate.fetchProperties = function (oTable) {
        const oModel = oTable.getModel();
        if (!oModel) {
            return Promise.resolve([]);
        }

        const oMetaModel = oModel.getMetaModel();

        // Get collection path from payload
        const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Demands";

        // Wait for metadata to be loaded
        return oMetaModel.requestObject(`/${sCollectionPath}/$Type`)
            .then(function (sEntityTypePath) {
                // Request the entity type definition
                return oMetaModel.requestObject(`/${sEntityTypePath}/`);
            }.bind(this))
            .then(function (oEntityType) {
                const aProperties = [];
                const oDelegate = this;

                // Iterate through entity type properties
                Object.keys(oEntityType).forEach(function (sPropertyName) {
                    // Skip metadata properties that start with $
                    if (sPropertyName.startsWith("$")) {
                        return;
                    }

                    const oProperty = oEntityType[sPropertyName];

                    // Check if it's a property (not a navigation property)
                    if (oProperty.$kind === "Property" || !oProperty.$kind) {
                        // ✅ For Demands table, exclude demandId from display (it's auto-generated)
                        if (sCollectionPath === "Demands" && sPropertyName === "demandId") {
                            return;
                        }
                        
                        const sType = oProperty.$Type || "Edm.String";
                        
                        // ✅ Use shared formatter to ensure label matches getFilterDelegate
                        const sLabel = oDelegate._formatPropertyLabel(sCollectionPath, sPropertyName);

                        // Include all necessary attributes for sorting/filtering
                        aProperties.push({
                            name: sPropertyName,
                            path: sPropertyName,
                            label: sLabel, // ✅ Use formatted label
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
            }.bind(this))
            .catch(function (oError) {

                // Fallback properties for Opportunities
                const mFallbackProperties = {
                    "Opportunities": [
                        { name: "sapOpportunityId", path: "sapOpportunityId", label: "SAP Opportunity ID", dataType: "Edm.Int32", sortable: true, filterable: true, groupable: true },
                        { name: "sfdcOpportunityId", path: "sfdcOpportunityId", label: "SFDC Opportunity ID", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                        { name: "probability", path: "probability", label: "Probability", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                        { name: "salesSPOC", path: "salesSPOC", label: "Sales SPOC", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                        { name: "deliverySPOC", path: "deliverySPOC", label: "Delivery SPOC", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                        { name: "expectedStart", path: "expectedStart", label: "Expected Start", dataType: "Edm.Date", sortable: true, filterable: true, groupable: true },
                        { name: "expectedEnd", path: "expectedEnd", label: "Expected End", dataType: "Edm.Date", sortable: true, filterable: true, groupable: true },
                        { name: "customerId", path: "customerId", label: "Customer ID", dataType: "Edm.Int32", sortable: true, filterable: true, groupable: true }
                    ]
                };

                return mFallbackProperties[sCollectionPath] || [];
            });
    };

    DemandsTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call parent implementation first (handles common logic)
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);

        const sPath = oTable.getPayload()?.collectionPath || "Demands";
        const sCollectionPath = sPath.replace(/^\//, "");
        
        // ✅ Expand associations to load related entity names
        if (sCollectionPath === "Demands") {
            // Expand Project association for Demands table (skill is now a simple string field)
            oBindingInfo.parameters.$expand = "to_Project";
            
            // ✅ CRITICAL: Try to get project filter from controller if available
            // This is a workaround - ideally filter should be applied via binding.filter()
            // but we can also try to get it from the controller's stored value
            try {
                const oController = oTable.getParent && oTable.getParent().getController && oTable.getParent().getController();
                if (oController && oController._sDemandProjectFilter) {
                    // Note: We can't apply filter here directly in updateBindingInfo
                    // Filter will be applied via binding.filter() in controller after initialization
                }
            } catch (e) {
                // Ignore if controller not accessible
            }
        } else if (sCollectionPath === "Projects") {
            // Expand Opportunity association for Project table
            oBindingInfo.parameters.$expand = "to_Opportunity";
        }

        // ✅ Process filters: group by field, combine same field with OR, different fields with AND
        if (oBindingInfo.filters && Array.isArray(oBindingInfo.filters)) {
            const oModel = oTable.getModel();
            const oMetaModel = oModel && oModel.getMetaModel && oModel.getMetaModel();
            const fnMakeCaseInsensitive = (aFilters) => {
                if (!aFilters || !Array.isArray(aFilters)) return aFilters;
                return aFilters.map((oFilter) => {
                    if (!oFilter || !oFilter.getPath) return oFilter;
                    const sFilterPath = oFilter.getPath();
                    let bIsString = false;
                    try {
                        if (oMetaModel) {
                            const oProp = oMetaModel.getObject(`/${sCollectionPath}/${sFilterPath}`);
                            if (oProp && oProp.$Type === "Edm.String") bIsString = true;
                        }
                    } catch (e) {}
                    if (bIsString) {
                        try {
                            return new sap.ui.model.Filter({
                                path: sFilterPath,
                                operator: oFilter.getOperator(),
                                value1: oFilter.getValue1(),
                                value2: oFilter.getValue2(),
                                caseSensitive: false,
                                filters: oFilter.getFilters ? fnMakeCaseInsensitive(oFilter.getFilters()) : undefined,
                                and: oFilter.getFilters ? (oFilter.getAnd ? oFilter.getAnd() : true) : undefined
                            });
                        } catch (e) {
                            return oFilter;
                        }
                    }
                    if (oFilter.getFilters && oFilter.getFilters()) {
                        const aNewNested = fnMakeCaseInsensitive(oFilter.getFilters());
                        if (aNewNested !== oFilter.getFilters()) {
                            try {
                                return new sap.ui.model.Filter({
                                    path: sFilterPath,
                                    operator: oFilter.getOperator(),
                                    value1: oFilter.getValue1(),
                                    value2: oFilter.getValue2(),
                                    filters: aNewNested,
                                    and: oFilter.getAnd ? oFilter.getAnd() : true
                                });
                            } catch (e) {
                                return oFilter;
                            }
                        }
                    }
                    return oFilter;
                });
            };
            const fnOptimizeFilters = (vFilters) => {
                if (!vFilters) return null;
                if (!Array.isArray(vFilters)) {
                    if (vFilters.getFilters && vFilters.getFilters()) {
                        const aNested = vFilters.getFilters();
                        const oOptimized = fnOptimizeFilters(aNested);
                        if (oOptimized && Array.isArray(oOptimized) && oOptimized.length > 0) {
                            return new sap.ui.model.Filter({
                                filters: oOptimized,
                                and: vFilters.getAnd ? vFilters.getAnd() : true
                            });
                        }
                    }
                    return vFilters;
                }
                if (vFilters.length === 0) return null;
                let aProcessedFilters = fnMakeCaseInsensitive(vFilters);
                const mFiltersByPath = {};
                const aOtherFilters = [];
                aProcessedFilters.forEach((oFilter) => {
                    if (!oFilter) return;
                    if (oFilter.getFilters && oFilter.getFilters()) {
                        const aNested = oFilter.getFilters();
                        const oOptimizedNested = fnOptimizeFilters(aNested);
                        if (oOptimizedNested) {
                            aOtherFilters.push(new sap.ui.model.Filter({
                                filters: Array.isArray(oOptimizedNested) ? oOptimizedNested : [oOptimizedNested],
                                and: oFilter.getAnd ? oFilter.getAnd() : true
                            }));
                        }
                        return;
                    }
                    if (!oFilter.getPath) {
                        aOtherFilters.push(oFilter);
                        return;
                    }
                    const sPath = oFilter.getPath();
                    if (!mFiltersByPath[sPath]) mFiltersByPath[sPath] = [];
                    const sValue1 = String(oFilter.getValue1() || "");
                    const sValue2 = String(oFilter.getValue2() || "");
                    const sOperator = String(oFilter.getOperator() || "");
                    const sFilterKey = `${sOperator}|${sValue1}|${sValue2}`;
                    const bIsDuplicate = mFiltersByPath[sPath].some((oExistingFilter) => {
                        const sExistingValue1 = String(oExistingFilter.getValue1() || "");
                        const sExistingValue2 = String(oExistingFilter.getValue2() || "");
                        const sExistingOperator = String(oExistingFilter.getOperator() || "");
                        return sFilterKey === `${sExistingOperator}|${sExistingValue1}|${sExistingValue2}`;
                    });
                    if (!bIsDuplicate) mFiltersByPath[sPath].push(oFilter);
                });
                const aOptimizedFilters = [];
                Object.keys(mFiltersByPath).forEach((sPath) => {
                    const aFieldFilters = mFiltersByPath[sPath];
                    if (aFieldFilters.length === 1) {
                        aOptimizedFilters.push(aFieldFilters[0]);
                    } else if (aFieldFilters.length > 1) {
                        aOptimizedFilters.push(new sap.ui.model.Filter({
                            filters: aFieldFilters,
                            and: false
                        }));
                    }
                });
                aOtherFilters.forEach((oFilter) => aOptimizedFilters.push(oFilter));
                if (aOptimizedFilters.length === 0) return null;
                if (aOptimizedFilters.length === 1) return aOptimizedFilters[0];
                return new sap.ui.model.Filter({ filters: aOptimizedFilters, and: true });
            };
            const oOptimizedFilter = fnOptimizeFilters(oBindingInfo.filters);
            oBindingInfo.filters = oOptimizedFilter || null;
        }

    };

    DemandsTableDelegate.addItem = function (oTable, sPropertyName, mPropertyBag) {
        // ✅ Skip non-property fields like _actions, _columns, etc.
        if (sPropertyName.startsWith("_") || sPropertyName === "actions" || sPropertyName === "columns") {
            return Promise.reject("Skipping non-property field: " + sPropertyName);
        }

        return this.fetchProperties(oTable).then(function (aProperties) {
            const oProperty = aProperties.find(function (p) {
                return p.name === sPropertyName || p.path === sPropertyName;
            });

            if (!oProperty) {
                return Promise.reject("Property not found: " + sPropertyName);
            }

            // Format label
            // Custom header mapping - check table type first
            const sTableId = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Demands";
            let mCustomHeaders = {};
            
            if (sTableId === "Demands") {
                mCustomHeaders = {
                    "sapPId": "Project ID", // ✅ Changed from "Project Name" to "Project ID"
                    "skill": "Skill",
                    "band": "Band",
                    "quantity": "Quantity"
                    // ✅ Removed "demandId" - it's auto-generated and not needed in table display
                };
            } else {
                // Default headers for other tables
                mCustomHeaders = {
                    "sapPId": "SAP PID",
                    "sfdcPId": "SFDC PID",
                    "projectName": "Project Name",
                    "startDate": "Start Date",
                    "endDate": "End Date",
                    "gpm": "GPM",
                    "projectType": "Project Type",
                    "oppId": "Opp Name",
                    "status": "Project Status"
                };
            }

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

                // console.log(`[ProjectTableDelegate] New field detected: "${sPropertyName}" → "${sLabel}"`);
            }

            // Assign to property metadata
            oProperty.label = sLabel;
            oProperty.tooltip = sTooltip;


            // Load the Column module and create column
            return new Promise(function (resolve) {
                sap.ui.require(["sap/ui/mdc/table/Column"], function (Column) {
                    const sTableId = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Projects";
                    
                    const oEnumConfig = BaseTableDelegate._getEnumConfig(sTableId, sPropertyName);
                    const bIsEnum = !!oEnumConfig;
                    const oAssocPromise = BaseTableDelegate._detectAssociation(oTable, sPropertyName);
                    
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
                        // ✅ CRITICAL: For Demands table, sapPId should NOT be treated as association
                        // We want to display the ID directly, not the project name
                        const bIsAssoc = !!oAssocConfig && !(sTableId === "Demands" && sPropertyName === "sapPId");
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
                            } else if (sPropertyName === "sapPId") {
                                // ✅ REMOVED: Don't use association for sapPId - display ID directly
                                // sAssocPath = "to_Project/projectName"; // Display project name
                                sAssocPath = ""; // No association - display ID directly
                            } else {
                                // Fallback: try to construct association path
                                sAssocPath = sPropertyName.replace("Id", "").replace("OHR", "");
                                if (sAssocPath === "customer") {
                                    sAssocPath = "to_Customer/customerName";
                                } else if (sAssocPath === "opp") {
                                    sAssocPath = "to_Opportunity/opportunityName";
                                } else if (sAssocPath === "supervisor") {
                                    sAssocPath = "to_Supervisor/fullName";
                                } else if (sAssocPath === "sapP" || sAssocPath === "project") {
                                    // ✅ REMOVED: Don't use association for sapPId - display ID directly
                                    // sAssocPath = "to_Project/projectName";
                                    sAssocPath = ""; // No association - display ID directly
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
                            // ✅ Check if field is integer type - don't bind tooltip directly for integers
                            const sType = oProperty.dataType || "";
                            const bIsInteger = sType.includes("Int") || sType.includes("Integer") || sPropertyName === "demandId";
                            
                            oField = new Field({
                                value: "{" + sPropertyName + "}",
                                // ✅ Don't set tooltip for integer fields to avoid "not valid for aggregation" error
                                editMode: {
                                    parts: [{ path: `edit>/${sTableId}/editingPath` }],
                                    mode: "TwoWay",
                                    formatter: fnEditModeFormatter
                                }
                            });
                            
                            // ✅ Set tooltip only for non-integer fields
                            if (!bIsInteger) {
                                oField.setTooltip("{" + sPropertyName + "}");
                            }
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

    DemandsTableDelegate.removeItem = function (oTable, oColumn, mPropertyBag) {

        if (oColumn) {
            oColumn.destroy();
        }

        return Promise.resolve(true);
    };

    // Provide FilterField creation for Adaptation Filter panel in table p13n
    DemandsTableDelegate.getFilterDelegate = function () {
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

                // ✅ Use shared formatter to ensure label matches fetchProperties
                const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Customers";
                const sLabel = DemandsTableDelegate._formatPropertyLabel(sCollectionPath, sName);

                return Promise.resolve(new FilterField({
                    label: sLabel, // ✅ Use same formatter as fetchProperties
                    propertyKey: sName,
                    conditions: "{$filters>/conditions/" + sName + "}",
                    dataType: sDataType
                }));
            }
        };
    };

    return DemandsTableDelegate;
});
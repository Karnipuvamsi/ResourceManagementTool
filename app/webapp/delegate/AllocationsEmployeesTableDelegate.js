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
     * Allocations Employees Table Delegate
     * Extends BaseTableDelegate with Employees-specific logic for Allocations Overview
     * This is a separate delegate from EmployeesTableDelegate to avoid conflicts
     */
    const AllocationsEmployeesTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Allocations Employees
    AllocationsEmployeesTableDelegate._getDefaultTableId = function() {
        return "Employees";
    };

    // ✅ Override delegate name for logging
    AllocationsEmployeesTableDelegate._getDelegateName = function() {
        return "AllocationsEmployeesTableDelegate";
    };

    // ✅ fetchProperties is inherited from BaseTableDelegate
    // Only override if Allocations Employees-specific logic is needed

    // ✅ Allocations Employees-specific: Override updateBindingInfo to add Supervisor expansion and allocation filter
    AllocationsEmployeesTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call parent implementation first (handles common logic)
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);

        const sPath = oTable.getPayload()?.collectionPath || "Employees";
        const sCollectionPath = sPath.replace(/^\//, "");
        
        // ✅ Allocations Employees-specific: Expand Supervisor association
        if (sCollectionPath === "Employees") {
            // Expand Supervisor association for Employee table
            oBindingInfo.parameters.$expand = "to_Supervisor($select=fullName,ohrId)";
            
            // ✅ For Allocations Employees table, ALWAYS apply base allocation filter
            // Filter: empallocpercentage <= 95 AND status != "Resigned"
            const sTableId = oTable.getId ? oTable.getId() : "";
            
            // Allocations Employees table uses "Employees" collection and has "Res" in its ID
            const bIsAllocationsEmployeesTable = sTableId.includes("Res") || sTableId.includes("res") || sTableId.endsWith("Res") || sTableId === "Res";
            
            if (bIsAllocationsEmployeesTable) {
                const oPercentageFilter = new sap.ui.model.Filter("empallocpercentage", sap.ui.model.FilterOperator.LE, 95);
                const oStatusFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.NE, "Resigned");
                const oAllocationFilter = new sap.ui.model.Filter([oPercentageFilter, oStatusFilter], true); // true = AND
                
                // Initialize filters array if it doesn't exist
                if (!oBindingInfo.filters) {
                    oBindingInfo.filters = [];
                }
                
                // Convert to array if it's a single filter
                let aFilters = Array.isArray(oBindingInfo.filters) ? oBindingInfo.filters : (oBindingInfo.filters ? [oBindingInfo.filters] : []);
                
                // Check if allocation filter is already present (avoid duplicates)
                const bHasAllocationFilter = aFilters.some(f => {
                    if (!f || !f.getFilters) return false;
                    const aSubFilters = f.getFilters();
                    if (!aSubFilters || !Array.isArray(aSubFilters) || aSubFilters.length !== 2) return false;
                    return aSubFilters.some(sf => 
                        sf.getPath() === "empallocpercentage" && (sf.getOperator() === "LT" || sf.getOperator() === "LE") && sf.getValue1() === 95
                    ) && aSubFilters.some(sf => 
                        sf.getPath() === "status" && sf.getOperator() === "NE" && sf.getValue1() === "Resigned"
                    );
                });
                
                // Add allocation filter if not already present
                if (!bHasAllocationFilter) {
                    aFilters = aFilters.filter(f => f !== null && f !== undefined); // Remove null/undefined
                    aFilters.push(oAllocationFilter);
                    oBindingInfo.filters = aFilters.length === 1 ? aFilters[0] : aFilters;
                }
            }
        }

    };

    // ✅ Allocations Employees-specific: addItem method with custom headers
    AllocationsEmployeesTableDelegate.addItem = function (oTable, sPropertyName, mPropertyBag) {

        return this.fetchProperties(oTable).then(function (aProperties) {
            const oProperty = aProperties.find(function (p) {
                return p.name === sPropertyName || p.path === sPropertyName;
            });

            if (!oProperty) {
                return Promise.reject("Property not found: " + sPropertyName);
            }

            // Custom header mapping for Allocations Employees table
            const mCustomHeaders = {
                "ohrId": "OHR ID",
                "fullName": "Full Name",
                "mailid": "Email",
                "gender": "Gender",
                "employeeType": "Employee Type",
                "doj": "Date of Joining",
                "band": "Band",
                "role": "Role",
                "location": "Location",
                "supervisorOHR": "Supervisor",
                "skills": "Skills",
                "country": "Country",
                "city": "City",
                "lwd": "Last Working Date",
                "status": "Status",
                "empallocpercentage": "Allocation %"
            };

            // Smart header generation with better fallback
            let sLabel;
            let sTooltip;

            if (mCustomHeaders[sPropertyName]) {
                // Use custom header if available
                sLabel = mCustomHeaders[sPropertyName];
                sTooltip = sLabel; // Use same text for tooltip
            } else {
                // Smart fallback for new fields
                sLabel = sPropertyName
                    // Handle common patterns
                    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')  // "SAPId" → "SAP Id"
                    .replace(/([a-z])([A-Z])/g, '$1 $2')        // "customerName" → "customer Name"
                    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')   // "OHRId" → "OHR Id"
                    .replace(/^./, function (str) { return str.toUpperCase(); })
                    .trim();

                // Enhanced tooltip for new fields
                sTooltip = `${sLabel} (Field: ${sPropertyName})`;

                // Log new field for easy identification
                // console.log(`[AllocationsEmployeesTableDelegate] New field detected: "${sPropertyName}" → "${sLabel}"`);
            }

            // Load the Column module and create column
            return new Promise(function (resolve) {
                sap.ui.require(["sap/ui/mdc/table/Column"], function (Column) {
                    // ✅ FIXED: Get table ID from collectionPath for table-specific edit state
                    const sTableId = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Employees";
                    
                    // ✅ STEP 1: Check if enum field (fixed values)
                    const oEnumConfig = AllocationsEmployeesTableDelegate._getEnumConfig(sTableId, sPropertyName);
                    const bIsEnum = !!oEnumConfig;

                    // ✅ STEP 2: Check if association field (dynamic from OData)
                    const oAssocPromise = AllocationsEmployeesTableDelegate._detectAssociation(oTable, sPropertyName);
                    
                    // Helper function for edit mode formatter
                    const fnEditModeFormatter = function (sPath) {
                        var rowPath = this.getBindingContext() && this.getBindingContext().getPath();
                        if (sPath && sPath.includes(",")) {
                            const aEditingPaths = sPath.split(",");
                            return aEditingPaths.includes(rowPath) ? "Editable" : "Display";
                        }
                        return sPath === rowPath ? "Editable" : "Display";
                    };

                    // Helper function for editable binding
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
                            // ✅ METHOD 1: ENUM - ComboBox with static values
                            const aItems = oEnumConfig.values.map(function(sVal, iIndex) {
                                return new Item({
                                    key: sVal,
                                    text: oEnumConfig.labels[iIndex] || sVal
                                });
                            });

                            // ✅ Create formatter to display label instead of key in display mode
                            const fnEnumFormatter = function(sKey) {
                                if (!sKey) return "";
                                const iIndex = oEnumConfig.values.indexOf(sKey);
                                return iIndex >= 0 ? oEnumConfig.labels[iIndex] : sKey;
                            };

                            const oComboBox = new ComboBox({
                                value: "{" + sPropertyName + "}",
                                selectedKey: "{" + sPropertyName + "}",
                                items: aItems,
                                editable: oEditableBinding
                            });

                            oField = new Field({
                                value: {
                                    path: sPropertyName,
                                    formatter: fnEnumFormatter
                                },
                                contentEdit: oComboBox,
                                editMode: {
                                    parts: [{ path: `edit>/${sTableId}/editingPath` }],
                                    mode: "TwoWay",
                                    formatter: fnEditModeFormatter
                                }
                            });

                        } else if (bIsAssoc) {
                            // ✅ METHOD 2: ASSOCIATION - ComboBox bound to OData (compatible with UI5 1.141.1)
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
                            // ✅ Regular text field
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
                            template: oField,
                        });

                        resolve(oColumn);
                    }).catch(function(oError) {
                        // Fallback to regular field
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
                            template: oField,
                        });
                        resolve(oColumn);
                    });
                });
            });
        });
    };

    AllocationsEmployeesTableDelegate.removeItem = function (oTable, oColumn, mPropertyBag) {

        if (oColumn) {
            oColumn.destroy();
        }

        return Promise.resolve(true);
    };

    // Provide FilterField creation for Adaptation Filter panel in table p13n
    AllocationsEmployeesTableDelegate.getFilterDelegate = function () {
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
                        const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Employees";
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

                // ✅ Determine if property is a string type for case-insensitive filtering
                let bIsString = false;
                try {
                    const oModel = oTable.getModel();
                    const oMetaModel = oModel && oModel.getMetaModel && oModel.getMetaModel();
                    if (oMetaModel) {
                        const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Employees";
                        const oProp = oMetaModel.getObject(`/${sCollectionPath}/${sName}`);
                        const sEdmType = oProp && oProp.$Type;
                        if (sEdmType === "Edm.String") {
                            bIsString = true;
                        }
                    }
                } catch (e) {
                    // If metadata check fails, check dataType
                    if (sDataType === "sap.ui.model.type.String") {
                        bIsString = true;
                    }
                }
                
                const oFilterFieldConfig = {
                    label: String(sName)
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, function (str) { return str.toUpperCase(); })
                        .trim(),
                    propertyKey: sName,
                    conditions: "{$filters>/conditions/" + sName + "}",
                    dataType: sDataType
                };
                
                // ✅ Set caseSensitive: false for string fields to make filters case-insensitive
                if (bIsString) {
                    oFilterFieldConfig.caseSensitive = false;
                }
                
                return Promise.resolve(new FilterField(oFilterFieldConfig));
            }
        };
    };

    return AllocationsEmployeesTableDelegate;
});


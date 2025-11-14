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
     * Resources Table Delegate
     * Extends BaseTableDelegate with Resources-specific logic
     */
    const ResourcesTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Resources
    ResourcesTableDelegate._getDefaultTableId = function() {
        return "Resources";
    };

    // ✅ Override delegate name for logging
    ResourcesTableDelegate._getDelegateName = function() {
        return "ResourcesTableDelegate";
    };

    ResourcesTableDelegate.fetchProperties = function (oTable) {
        console.log("=== [GenericDelegate] fetchProperties called ===");

        const oModel = oTable.getModel();
        if (!oModel) {
            console.error("[GenericDelegate] No model found on table");
            return Promise.resolve([]);
        }

        const oMetaModel = oModel.getMetaModel();
        console.log("[GenericDelegate] MetaModel:", oMetaModel);

        // Get collection path from payload
        const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Customers";
        console.log("[GenericDelegate] Collection Path:", sCollectionPath);

        // Wait for metadata to be loaded
        return oMetaModel.requestObject(`/${sCollectionPath}/$Type`)
            .then(function (sEntityTypePath) {
                console.log("[GenericDelegate] Entity Type Path:", sEntityTypePath);

                // Request the entity type definition
                return oMetaModel.requestObject(`/${sEntityTypePath}/`);
            })
            .then(function (oEntityType) {
                console.log("[GenericDelegate] Entity Type loaded:", oEntityType);

                const aProperties = [];

                // Iterate through entity type properties
                Object.keys(oEntityType).forEach(function (sPropertyName) {
                    // Skip metadata properties that start with $
                    if (sPropertyName.startsWith("$")) {
                        return;
                    }

                    const oProperty = oEntityType[sPropertyName];
                    console.log("[GenericDelegate] Processing property:", sPropertyName, oProperty);

                    // Check if it's a property (not a navigation property)
                    if (oProperty.$kind === "Property" || !oProperty.$kind) {
                        const sType = oProperty.$Type || "Edm.String";

                        // Include all necessary attributes for sorting/filtering
                        aProperties.push({
                            name: sPropertyName,
                            path: sPropertyName,
                            label: sPropertyName,
                            dataType: sType,
                            sortable: true,
                            filterable: true,
                            groupable: true,
                            maxConditions: -1,
                            caseSensitive: sType === "Edm.String" ? false : undefined
                        });
                    }
                });

                console.log("[GenericDelegate] Final properties array:", aProperties);
                return aProperties;
            })
            .catch(function (oError) {
                console.error("[GenericDelegate] Error fetching properties:", oError);
                console.log("[GenericDelegate] Using fallback properties for", sCollectionPath);

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

    ResourcesTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call parent implementation first (handles common logic)
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);

        const sPath = oTable.getPayload()?.collectionPath || "Resources";
        const sCollectionPath = sPath.replace(/^\//, "");
        
        // ✅ Expand associations to load related entity names
        if (sCollectionPath === "Projects") {
            // Expand Opportunity association for Project table
            oBindingInfo.parameters.$expand = "to_Opportunity";
        }
        
        // ✅ NEW: For Res table (Employees in Allocation Overview), ALWAYS apply base allocation filter
        // Filter: empallocpercentage <= 95 AND status != "Resigned"
        // Check if this is the Res table by checking collection path and table ID or payload
        const sTableId = oTable.getId ? oTable.getId() : "";
        const oPayload = oTable.getPayload ? oTable.getPayload() : {};
        const sPayloadCollection = oPayload.collectionPath ? oPayload.collectionPath.replace(/^\//, "") : "";
        
        // Res table uses "Employees" collection and has "Res" in its ID
        const bIsResTable = (sCollectionPath === "Employees" || sPayloadCollection === "Employees") && 
                           (sTableId.includes("Res") || sTableId.includes("res") || sTableId.endsWith("Res"));
        
        if (bIsResTable) {
            const oPercentageFilter = new sap.ui.model.Filter("empallocpercentage", sap.ui.model.FilterOperator.LE, 95);
            const oStatusFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.NE, "Resigned");
            const oAllocationFilter = new sap.ui.model.Filter([oPercentageFilter, oStatusFilter], true); // true = AND
            
            // Initialize filters array if it doesn't exist
            if (!oBindingInfo.filters) {
                oBindingInfo.filters = [];
            }
            
            // Convert to array if it's a single filter
            let aFilters = Array.isArray(oBindingInfo.filters) ? oBindingInfo.filters : (oBindingInfo.filters ? [oBindingInfo.filters] : []);
            
            // Check if allocation filter is already present
            const bHasAllocationFilter = aFilters.some(f => {
                if (!f) return false;
                if (f.getFilters && f.getFilters().length === 2) {
                    const aSubFilters = f.getFilters();
                    return aSubFilters.some(sf => 
                        sf.getPath() === "empallocpercentage" && (sf.getOperator() === "LT" || sf.getOperator() === "LE") && sf.getValue1() === 95
                    ) && aSubFilters.some(sf => 
                        sf.getPath() === "status" && sf.getOperator() === "NE" && sf.getValue1() === "Resigned"
                    );
                }
                return false;
            });
            
            // Add allocation filter if not already present
            if (!bHasAllocationFilter) {
                aFilters = aFilters.filter(f => f !== null && f !== undefined); // Remove null/undefined
                aFilters.push(oAllocationFilter);
                oBindingInfo.filters = aFilters.length === 1 ? aFilters[0] : aFilters;
                console.log("[ResourcesTableDelegate] ✅ Applied base allocation filter (empallocpercentage <= 95% and status != Resigned)");
            }
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
                let oAllocationFilter = null; // Store allocation filter separately
                
                aProcessedFilters.forEach((oFilter) => {
                    if (!oFilter) return;
                    
                    // ✅ NEW: Preserve allocation filter (empallocpercentage <= 95 and status != "Resigned")
                    if (oFilter.getFilters && oFilter.getFilters().length === 2) {
                        const aSubFilters = oFilter.getFilters();
                        const bIsAllocationFilter = aSubFilters.some(sf => 
                            sf.getPath() === "empallocpercentage" && (sf.getOperator() === "LT" || sf.getOperator() === "LE") && sf.getValue1() === 95
                        ) && aSubFilters.some(sf => 
                            sf.getPath() === "status" && sf.getOperator() === "NE" && sf.getValue1() === "Resigned"
                        );
                        if (bIsAllocationFilter) {
                            oAllocationFilter = oFilter; // Preserve allocation filter
                            return; // Don't process it further
                        }
                    }
                    
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
                
                // ✅ NEW: Always add allocation filter at the end (if it exists)
                if (oAllocationFilter) {
                    aOptimizedFilters.push(oAllocationFilter);
                }
                
                if (aOptimizedFilters.length === 0) return null;
                if (aOptimizedFilters.length === 1) return aOptimizedFilters[0];
                return new sap.ui.model.Filter({ filters: aOptimizedFilters, and: true });
            };
            const oOptimizedFilter = fnOptimizeFilters(oBindingInfo.filters);
            oBindingInfo.filters = oOptimizedFilter || null;
        }

        console.log("[GenericDelegate] updateBindingInfo - path:", sPath, "bindingInfo:", oBindingInfo);
        console.log("[GenericDelegate] Table payload:", oTable.getPayload());
    };

    ResourcesTableDelegate.addItem = function (oTable, sPropertyName, mPropertyBag) {
        console.log("[GenericDelegate] addItem called for property:", sPropertyName);

        return this.fetchProperties(oTable).then(function (aProperties) {
            const oProperty = aProperties.find(function (p) {
                return p.name === sPropertyName || p.path === sPropertyName;
            });

            if (!oProperty) {
                console.error("[GenericDelegate] Property not found:", sPropertyName);
                return Promise.reject("Property not found: " + sPropertyName);
            }

            // Format label
            // const sLabel = sPropertyName
            //     // .replace(/([A-Z])/g, ' $1')
            //     .replace(/([a-z])([A-Z])/g, '$1 $2')
            //     .replace(/^./, function(str) { return str.toUpperCase(); })
            //     .trim();
            // Custom header mapping for Projects table
            const mCustomHeaders = {
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
                    
                    const oEnumConfig = GenericTableDelegate._getEnumConfig(sTableId, sPropertyName);
                    const bIsEnum = !!oEnumConfig;
                    const oAssocPromise = GenericTableDelegate._detectAssociation(oTable, sPropertyName);
                    
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
                            console.log("[GenericDelegate] Enum field detected:", sPropertyName, "→ ComboBox");
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

                            // Create a formatter to resolve association name with fallback
                            const fnAssocNameFormatter = function(sId) {
                                if (!sId) return "";
                                // Try to get from expanded association first
                                const oContext = this.getBindingContext();
                                if (oContext) {
                                    try {
                                        const oRowData = oContext.getObject();
                                        const sAssocEntity = sAssocPath.split("/")[0]; // e.g., "to_Opportunity"
                                        const sAssocField = sAssocPath.split("/")[1]; // e.g., "opportunityName"
                                        
                                        // Check if association is expanded
                                        if (oRowData[sAssocEntity] && oRowData[sAssocEntity][sAssocField]) {
                                            return oRowData[sAssocEntity][sAssocField];
                                        }
                                    } catch (e) {
                                        // Association not expanded, will use fallback
                                    }
                                }
                                // Fallback: return ID if name not available
                                return sId;
                            };
                            
                            // Display the name from association path with formatter fallback
                            oField = new Field({
                                value: {
                                    path: sPropertyName,
                                    formatter: fnAssocNameFormatter
                                },
                                // Also try direct association path binding as primary source
                                additionalValue: "{" + sAssocPath + "}", // Try association path
                                contentEdit: oComboBox,
                                editMode: {
                                    parts: [{ path: `edit>/${sTableId}/editingPath` }],
                                    mode: "TwoWay",
                                    formatter: fnEditModeFormatter
                                }
                            });
                            console.log("[GenericDelegate] Association field detected:", sPropertyName, "→ Displaying", sAssocPath, "from association");
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

                        console.log("[GenericDelegate] Column created via addItem:", sPropertyName);
                        resolve(oColumn);
                    }).catch(function(oError) {
                        console.warn("[GenericDelegate] Error, using regular field:", oError);
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

    ResourcesTableDelegate.removeItem = function (oTable, oColumn, mPropertyBag) {
        console.log("[GenericDelegate] removeItem called for column:", oColumn);

        if (oColumn) {
            oColumn.destroy();
        }

        return Promise.resolve(true);
    };

    // Provide FilterField creation for Adaptation Filter panel in table p13n
    ResourcesTableDelegate.getFilterDelegate = function () {
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

    return ResourcesTableDelegate;
});
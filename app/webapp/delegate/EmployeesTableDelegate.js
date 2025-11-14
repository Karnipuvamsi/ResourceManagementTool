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

    const GenericTableDelegate = Object.assign({}, ODataTableDelegate);

    // ✅ ENUM CONFIGURATION: Static values for enum fields
    GenericTableDelegate._getEnumConfig = function(sTableId, sPropertyName) {
        const mEnumFields = {
            "Customers": {
                "status": { values: ["Active", "Inactive", "Prospect"], labels: ["Active", "Inactive", "Prospect"] },
                "vertical": { 
                    values: ["BFS", "CapitalMarkets", "CPG", "Healthcare", "HighTech", "Insurance", "LifeSciences", "Manufacturing", "Retail", "Services"],
                    labels: ["BFS", "Capital Markets", "CPG", "Healthcare", "High Tech", "Insurance", "Life Sciences", "Manufacturing", "Retail", "Services"]
                }
            },
            "Opportunities": {
                "probability": { 
                    values: ["ProposalStage", "SoWSent", "SoWSigned", "PurchaseOrderReceived"],
                    labels: ["0%-ProposalStage", "33%-SoWSent", "85%-SoWSigned", "100%-PurchaseOrderReceived"]
                },
                "Stage": { 
                    values: ["Discover", "Define", "OnBid", "DownSelect", "SignedDeal"],
                    labels: ["Discover", "Define", "On Bid", "Down Select", "Signed Deal"]
                }
            },
            "Projects": {
                "projectType": { 
                    values: ["FixedPrice", "TransactionBased", "FixedMonthly", "PassThru", "Divine"],
                    labels: ["Fixed Price", "Transaction Based", "Fixed Monthly", "Pass Thru", "Divine"]
                },
                "status": { 
                    values: ["Active", "Closed", "Planned"],
                    labels: ["Active", "Closed", "Planned"]
                },
                "SOWReceived": { 
                    values: ["Yes", "No"],
                    labels: ["Yes", "No"]
                },
                "POReceived": { 
                    values: ["Yes", "No"],
                    labels: ["Yes", "No"]
                }
            },
            "Employees": {
                "gender": { 
                    values: ["Male", "Female", "Others"],
                    labels: ["Male", "Female", "Others"]
                },
                "employeeType": { 
                    values: ["FullTime", "SubCon", "Intern", "YTJ"],
                    labels: ["Full Time", "Subcon", "Intern", "Yet To Join"]
                },
                "band": { 
                    values: ["1", "2", "3", "Band4A", "Band4BC", "Band4BLC", "Band4C", "Band4D", "Band5A", "Band5B", "BandSubcon"],
                    labels: ["1", "2", "3", "4A", "4B-C", "4B-LC", "4C", "4D", "5A", "5B", "Subcon"]
                },
                "status": { 
                    values: ["PreAllocated", "Bench", "Resigned", "Allocated"],
                    labels: ["Pre Allocated", "Bench", "Resigned", "Allocated"]
                }
            },
            "Allocations": {
                "status": { 
                    values: ["Active", "Completed", "Cancelled"],
                    labels: ["Active", "Completed", "Cancelled"]
                }
            }
        };
        return mEnumFields[sTableId]?.[sPropertyName] || null;
    };

    // ✅ ASSOCIATION DETECTION: Dynamic detection from OData metadata
    GenericTableDelegate._detectAssociation = function(oTable, sPropertyName) {
        const oModel = oTable.getModel();
        if (!oModel || !oModel.getMetaModel) {
            return Promise.resolve(null);
        }

        // Simple fallback mapping for associations (can be enhanced with metadata later)
        const sTableId = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Customers";
        
        const mAssociationFields = {
            "Opportunities": {
                "customerId": { targetEntity: "Customers", displayField: "customerName", keyField: "SAPcustId" }
            },
            "Projects": {
                "oppId": { targetEntity: "Opportunities", displayField: "opportunityName", keyField: "sapOpportunityId" }
            },
            "Demands": {
                "skillId": { targetEntity: "Skills", displayField: "name", keyField: "id" },
                "sapPId": { targetEntity: "Projects", displayField: "projectName", keyField: "sapPId" }
            },
            "Employees": {
                "supervisorOHR": { targetEntity: "Employees", displayField: "fullName", keyField: "ohrId" }
            },
            "EmployeeSkills": {
                "employeeId": { targetEntity: "Employees", displayField: "fullName", keyField: "ohrId" },
                "skillId": { targetEntity: "Skills", displayField: "name", keyField: "id" }
            },
            "Allocations": {
                "employeeId": { targetEntity: "Employees", displayField: "fullName", keyField: "ohrId" },
                "projectId": { targetEntity: "Projects", displayField: "projectName", keyField: "sapPId" }
            }
        };

        const oAssocConfig = mAssociationFields[sTableId]?.[sPropertyName];
        return Promise.resolve(oAssocConfig || null);
    };

    // Ensure Table advertises support for all desired p13n panels
    GenericTableDelegate.getSupportedP13nModes = function () {
        return ["Column", "Sort", "Filter", "Group"];
    };

    GenericTableDelegate.fetchProperties = function (oTable) {
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

    GenericTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        ODataTableDelegate.updateBindingInfo.apply(this, arguments);

        const sPath = oTable.getPayload()?.collectionPath || "Customers";
        oBindingInfo.path = "/" + sPath;

        // Essential OData V4 parameters
        oBindingInfo.parameters = Object.assign(oBindingInfo.parameters || {}, {
            $count: true
        });
        
        // ✅ Employees-specific: Expand Supervisor association and handle Res table allocation filter
        const sCollectionPath = sPath.replace(/^\//, "");
        if (sCollectionPath === "Employees") {
            // Expand Supervisor association for Employee table
            oBindingInfo.parameters.$expand = "to_Supervisor($select=fullName,ohrId)";
            
            // ✅ For Res table (Employees in Allocation Overview), ALWAYS apply base allocation filter
            // Filter: empallocpercentage <= 95 AND status != "Resigned"
            const sTableId = oTable.getId ? oTable.getId() : "";
            
            // Res table uses "Employees" collection and has "Res" in its ID
            const bIsResTable = sTableId.includes("Res") || sTableId.includes("res") || sTableId.endsWith("Res") || sTableId === "Res";
            
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
        
        // ✅ Process filters: group by field, combine same field with OR, different fields with AND
        if (oBindingInfo.filters && Array.isArray(oBindingInfo.filters)) {
            const oModel = oTable.getModel();
            const oMetaModel = oModel && oModel.getMetaModel && oModel.getMetaModel();
            
            const fnMakeCaseInsensitive = (aFilters) => {
                if (!aFilters || !Array.isArray(aFilters)) return aFilters;
                
                return aFilters.map((oFilter) => {
                    if (!oFilter || !oFilter.getPath) return oFilter;
                    
                    const sFilterPath = oFilter.getPath();
                    // Check if this is a string property
                    let bIsString = false;
                    try {
                        if (oMetaModel) {
                            const oProp = oMetaModel.getObject(`/${sCollectionPath}/${sFilterPath}`);
                            if (oProp && oProp.$Type === "Edm.String") {
                                bIsString = true;
                            }
                        }
                    } catch (e) {
                        // If we can't determine, skip modification
                    }
                    
                    // Recreate filter with caseSensitive: false for string filters
                    if (bIsString) {
                        try {
                            const sOperator = oFilter.getOperator();
                            const vValue1 = oFilter.getValue1();
                            const vValue2 = oFilter.getValue2();
                            const aNestedFilters = oFilter.getFilters ? oFilter.getFilters() : null;
                            const bAnd = oFilter.getAnd ? oFilter.getAnd() : true;
                            
                            // Recreate the filter with caseSensitive: false
                            const oNewFilter = new sap.ui.model.Filter({
                                path: sFilterPath,
                                operator: sOperator,
                                value1: vValue1,
                                value2: vValue2,
                                caseSensitive: false,
                                filters: aNestedFilters ? fnMakeCaseInsensitive(aNestedFilters) : undefined,
                                and: aNestedFilters ? bAnd : undefined
                            });
                            
                            return oNewFilter;
                        } catch (e) {
                            console.warn("[CustomersTableDelegate] Could not recreate filter with caseSensitive:", e);
                            return oFilter;
                        }
                    }
                    
                    // Recursively process nested filters
                    if (oFilter.getFilters && oFilter.getFilters()) {
                        const aNestedFilters = oFilter.getFilters();
                        const aNewNestedFilters = fnMakeCaseInsensitive(aNestedFilters);
                        if (aNewNestedFilters !== aNestedFilters) {
                            // Recreate filter with updated nested filters
                            try {
                                return new sap.ui.model.Filter({
                                    path: sFilterPath,
                                    operator: oFilter.getOperator(),
                                    value1: oFilter.getValue1(),
                                    value2: oFilter.getValue2(),
                                    filters: aNewNestedFilters,
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
            
            // ✅ NEW: Group filters by path and combine same-field filters with OR
            const fnOptimizeFilters = (vFilters) => {
                if (!vFilters) return null;
                
                // Handle single Filter object
                if (!Array.isArray(vFilters)) {
                    // If it's a single filter with nested filters, process those
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
                
                // First, make filters case-insensitive
                let aProcessedFilters = fnMakeCaseInsensitive(vFilters);
                
                // Group filters by path (field name)
                const mFiltersByPath = {};
                const aOtherFilters = []; // Filters without a path (nested/complex filters)
                
                aProcessedFilters.forEach((oFilter) => {
                    if (!oFilter) return;
                    
                    // Handle nested filters recursively
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
                    if (!mFiltersByPath[sPath]) {
                        mFiltersByPath[sPath] = [];
                    }
                    
                    // Check for duplicates before adding
                    const sValue1 = String(oFilter.getValue1() || "");
                    const sValue2 = String(oFilter.getValue2() || "");
                    const sOperator = String(oFilter.getOperator() || "");
                    const sFilterKey = `${sOperator}|${sValue1}|${sValue2}`;
                    
                    // Check if this exact filter already exists
                    const bIsDuplicate = mFiltersByPath[sPath].some((oExistingFilter) => {
                        const sExistingValue1 = String(oExistingFilter.getValue1() || "");
                        const sExistingValue2 = String(oExistingFilter.getValue2() || "");
                        const sExistingOperator = String(oExistingFilter.getOperator() || "");
                        const sExistingKey = `${sExistingOperator}|${sExistingValue1}|${sExistingValue2}`;
                        return sFilterKey === sExistingKey;
                    });
                    
                    if (!bIsDuplicate) {
                        mFiltersByPath[sPath].push(oFilter);
                    }
                });
                
                // Build optimized filter array
                const aOptimizedFilters = [];
                
                // For each field, combine multiple values with OR
                Object.keys(mFiltersByPath).forEach((sPath) => {
                    const aFieldFilters = mFiltersByPath[sPath];
                    if (aFieldFilters.length === 1) {
                        // Single filter for this field, add as-is
                        aOptimizedFilters.push(aFieldFilters[0]);
                    } else if (aFieldFilters.length > 1) {
                        // Multiple filters for same field, combine with OR
                        const oOrFilter = new sap.ui.model.Filter({
                            filters: aFieldFilters,
                            and: false // OR logic
                        });
                        aOptimizedFilters.push(oOrFilter);
                    }
                });
                
                // Add other filters (nested/complex) as-is
                aOtherFilters.forEach((oFilter) => {
                    aOptimizedFilters.push(oFilter);
                });
                
                // Return optimized filters
                if (aOptimizedFilters.length === 0) {
                    return null;
                } else if (aOptimizedFilters.length === 1) {
                    return aOptimizedFilters[0];
                } else {
                    // Multiple field groups, combine them with AND
                    return new sap.ui.model.Filter({
                        filters: aOptimizedFilters,
                        and: true // AND logic between different fields
                    });
                }
            };
            
            const oOptimizedFilter = fnOptimizeFilters(oBindingInfo.filters);
            oBindingInfo.filters = oOptimizedFilter || null;
        }

        console.log("[GenericDelegate] updateBindingInfo - path:", sPath, "bindingInfo:", oBindingInfo);
        console.log("[GenericDelegate] Table payload:", oTable.getPayload());
    };

    GenericTableDelegate.addItem = function (oTable, sPropertyName, mPropertyBag) {
        console.log("[GenericDelegate] addItem called for property:", sPropertyName);

        return this.fetchProperties(oTable).then(function (aProperties) {
            const oProperty = aProperties.find(function (p) {
                return p.name === sPropertyName || p.path === sPropertyName;
            });

            if (!oProperty) {
                console.error("[GenericDelegate] Property not found:", sPropertyName);
                return Promise.reject("Property not found: " + sPropertyName);
            }

            // Custom header mapping for Customers table
            const mCustomHeaders = {
                "SAPcustId": "SAP Customer ID",
                "customerName": "Customer Name",
                "segment": "Segment",
                "state": "State",
                "country": "Country",
                "status": "Status",
                "vertical": "Vertical"  // ✅ UPDATED: Now using enum instead of verticalId
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
                // console.log(`[CustomersTableDelegate] New field detected: "${sPropertyName}" → "${sLabel}"`);
            }

            // Load the Column module and create column
            return new Promise(function (resolve) {
                sap.ui.require(["sap/ui/mdc/table/Column"], function (Column) {
                    // ✅ FIXED: Get table ID from collectionPath for table-specific edit state
                    const sTableId = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Customers";
                    
                    // ✅ STEP 1: Check if enum field (fixed values)
                    const oEnumConfig = GenericTableDelegate._getEnumConfig(sTableId, sPropertyName);
                    const bIsEnum = !!oEnumConfig;

                    // ✅ STEP 2: Check if association field (dynamic from OData)
                    const oAssocPromise = GenericTableDelegate._detectAssociation(oTable, sPropertyName);
                    
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

                            console.log("[GenericDelegate] Enum field detected:", sPropertyName, "→ ComboBox with formatter");
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

                            console.log("[GenericDelegate] Association field detected:", sPropertyName, "→ ComboBox bound to", oAssocConfig.targetEntity);
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
                            headerTooltip: sTooltip
                        });

                        console.log("[GenericDelegate] Column created via addItem:", sPropertyName);
                        resolve(oColumn);
                    }).catch(function(oError) {
                        console.warn("[GenericDelegate] Error detecting association, using regular field:", oError);
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
                            headerTooltip: sTooltip
                        });
                        resolve(oColumn);
                    });
                });
            });
        });
    };

    GenericTableDelegate.removeItem = function (oTable, oColumn, mPropertyBag) {
        console.log("[GenericDelegate] removeItem called for column:", oColumn);

        if (oColumn) {
            oColumn.destroy();
        }

        return Promise.resolve(true);
    };

    // Provide FilterField creation for Adaptation Filter panel in table p13n
    GenericTableDelegate.getFilterDelegate = function () {
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

                // ✅ Determine if property is a string type for case-insensitive filtering
                let bIsString = false;
                try {
                    const oModel = oTable.getModel();
                    const oMetaModel = oModel && oModel.getMetaModel && oModel.getMetaModel();
                    if (oMetaModel) {
                        const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Customers";
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

    return GenericTableDelegate;
});
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
     * Allocations Table Delegate
     * Extends BaseTableDelegate with Allocations-specific logic
     */
    const AllocationsTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Allocations
    AllocationsTableDelegate._getDefaultTableId = function() {
        return "Allocations";
    };

    // ✅ Override delegate name for logging
    AllocationsTableDelegate._getDelegateName = function() {
        return "AllocationsTableDelegate";
    };

    // ✅ SHARED LABEL FORMATTER: Ensures consistent labels across fetchProperties and getFilterDelegate
    AllocationsTableDelegate._formatPropertyLabel = function(sTableId, sPropertyName) {
        // Custom header mapping
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

        if (mCustomHeaders[sPropertyName]) {
            return mCustomHeaders[sPropertyName];
        }

        // Smart fallback formatting (same as in getFilterDelegate)
        return String(sPropertyName)
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, function (str) { return str.toUpperCase(); })
            .trim();
    };

    AllocationsTableDelegate.fetchProperties = function (oTable) {
        const oModel = oTable.getModel();
        if (!oModel) {
            return Promise.resolve([]);
        }

        const oMetaModel = oModel.getMetaModel();

        // Get collection path from payload
        const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Projects";

        // Wait for metadata to be loaded
        return oMetaModel.requestObject(`/${sCollectionPath}/$Type`)
            .then(function (sEntityTypePath) {
                // Request the entity type definition
                return oMetaModel.requestObject(`/${sEntityTypePath}/`);
            })
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
            })
            .catch(function (oError) {
                return [];
            });
    };

    AllocationsTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call parent implementation first (handles common logic)
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);

        const sPath = oTable.getPayload()?.collectionPath || "Allocations";
        const sCollectionPath = sPath.replace(/^\//, "");
        
        // ✅ Expand associations to load related entity names
        if (sCollectionPath === "Projects") {
            // Expand Opportunity and GPM associations for Project table
            oBindingInfo.parameters.$expand = "to_Opportunity,to_GPM";
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

    AllocationsTableDelegate.addItem = function (oTable, sPropertyName, mPropertyBag) {

        return this.fetchProperties(oTable).then(function (aProperties) {
            const oProperty = aProperties.find(function (p) {
                return p.name === sPropertyName || p.path === sPropertyName;
            });

            if (!oProperty) {
                return Promise.reject("Property not found: " + sPropertyName);
            }

            // Custom header mapping for Projects table
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
                sLabel = mCustomHeaders[sPropertyName];
                sTooltip = sLabel;
            } else {
                sLabel = sPropertyName
                    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
                    .replace(/^./, str => str.toUpperCase())
                    .trim();

                sTooltip = `${sLabel} (Field: ${sPropertyName})`;
            }

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
                            // ✅ ASSOCIATION: Display name from association
                            let sAssocPath = "";
                            if (sPropertyName === "oppId") {
                                sAssocPath = "to_Opportunity/opportunityName";
                            } else if (sPropertyName === "gpm") {
                                sAssocPath = "to_GPM/fullName";
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
                            
                            oComboBox.setModel(oModel);

                            const fnAssocNameFormatter = function(sId) {
                                if (!sId) return "";
                                const oContext = this.getBindingContext();
                                if (oContext) {
                                    try {
                                        const oRowData = oContext.getObject();
                                        const sAssocEntity = sAssocPath.split("/")[0];
                                        const sAssocField = sAssocPath.split("/")[1];
                                        
                                        if (oRowData[sAssocEntity] && oRowData[sAssocEntity][sAssocField]) {
                                            return oRowData[sAssocEntity][sAssocField];
                                        }
                                    } catch (e) {
                                        // Association not expanded, will use fallback
                                    }
                                }
                                return sId;
                            };
                            
                            oField = new Field({
                                value: {
                                    path: sPropertyName,
                                    formatter: fnAssocNameFormatter
                                },
                                additionalValue: "{" + sAssocPath + "}",
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

    AllocationsTableDelegate.removeItem = function (oTable, oColumn, mPropertyBag) {

        if (oColumn) {
            oColumn.destroy();
        }

        return Promise.resolve(true);
    };

    // Provide FilterField creation for Adaptation Filter panel in table p13n
    AllocationsTableDelegate.getFilterDelegate = function () {
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

                // ✅ Use shared formatter to ensure label matches fetchProperties
                const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Projects";
                const sLabel = AllocationsTableDelegate._formatPropertyLabel(sCollectionPath, sName);

                return Promise.resolve(new FilterField({
                    label: sLabel, // ✅ Use same formatter as fetchProperties
                    propertyKey: sName,
                    conditions: "{$filters>/conditions/" + sName + "}",
                    dataType: sDataType
                }));
            }
        };
    };
    AllocationsTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
    // Always call Base first
    BaseTableDelegate.updateBindingInfo.apply(this, arguments);

    // 1️⃣ Extract search text from ValueHelp Dialog
    let sSearch = "";
    try {
        const oVH = oTable?.getParent()?.getParent();   // MDCTable → Dialog → ValueHelp
        const aContent = oVH?.getContent?.();
        const oDialogContent = aContent && aContent[0];
        sSearch = oDialogContent?.getSearch?.() || "";
    } catch (e) {}

    // 2️⃣ Try main Allocation FilterBar search
    if (!sSearch) {
        const oFB = sap.ui.getCore().byId("allocationFilterBar");
        sSearch = oFB?.getSearch?.() || "";
    }

    // 3️⃣ If no search text → stop here
    if (!sSearch) return;

    // 4️⃣ Identify which Allocation VH table triggered this delegate
    const sTableId = oTable.getId();
    let aFilters = [];

    // ============================
    // 🔵 PROJECT NAME VH
    // ============================
    if (sTableId.includes("tblAllocProjectNameVH")) {
        aFilters = [
            new sap.ui.model.Filter({
                path: "projectName",
                operator: sap.ui.model.FilterOperator.Contains,
                value1: sSearch,
                caseSensitive: false
            }),
            new sap.ui.model.Filter({
                path: "projectType",
                operator: sap.ui.model.FilterOperator.Contains,
                value1: sSearch,
                caseSensitive: false
            }),
            new sap.ui.model.Filter({
                path: "SOWReceived",
                operator: sap.ui.model.FilterOperator.Contains,
                value1: sSearch,
                caseSensitive: false
            })
        ];
    }

    // ============================
    // 🔵 PROJECT TYPE VH
    // ============================
    else if (sTableId.includes("tblAllocProjectTypeVH")) {
        aFilters = [
            new sap.ui.model.Filter({
                path: "projectType",
                operator: sap.ui.model.FilterOperator.Contains,
                value1: sSearch,
                caseSensitive: false
            }),
            new sap.ui.model.Filter({
                path: "projectName",
                operator: sap.ui.model.FilterOperator.Contains,
                value1: sSearch,
                caseSensitive: false
            })
        ];
    }

    // ============================
    // 🔵 SOW RECEIVED VH
    // ============================
    else if (sTableId.includes("tblAllocSOWReceivedVH")) {
        aFilters = [
            new sap.ui.model.Filter({
                path: "SOWReceived",
                operator: sap.ui.model.FilterOperator.Contains,
                value1: sSearch,
                caseSensitive: false
            }),
            new sap.ui.model.Filter({
                path: "projectName",
                operator: sap.ui.model.FilterOperator.Contains,
                value1: sSearch,
                caseSensitive: false
            })
        ];
    }

    // ============================
    // ❗ SAFETY CHECK
    // ============================
    if (aFilters.length === 0) {
        console.warn("Allocations VH → No mapping for table:", sTableId);
        return;
    }

    // ============================
    // 🔥 APPLY ODATA FILTER (OR group)
    // ============================
    oBindingInfo.filters = [
        new sap.ui.model.Filter({
            filters: aFilters,
            and: false
        })
    ];

    console.log("ALLOCATIONS VH FILTER APPLIED:", sTableId, oBindingInfo.filters);
};


    return AllocationsTableDelegate;
});

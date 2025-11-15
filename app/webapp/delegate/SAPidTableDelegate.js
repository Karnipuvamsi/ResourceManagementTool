sap.ui.define([
    "sap/ui/mdc/odata/v4/TableDelegate",
    "sap/ui/model/Sorter",
    "sap/ui/mdc/FilterField",
    "sap/ui/mdc/Field",
    "sap/ui/mdc/library",
    "sap/m/HBox",
    "sap/m/Button",
    "sap/m/library"
], function (ODataTableDelegate, Sorter, FilterField, Field, mdcLibrary, HBox, Button, mLibrary) {
    "use strict";

    const GenericTableDelegate = Object.assign({}, ODataTableDelegate);

    // Ensure Table advertises support for all desired p13n panels
    GenericTableDelegate.getSupportedP13nModes = function() {
        return ["Column", "Sort", "Filter", "Group"];
    };

    GenericTableDelegate.fetchProperties = function (oTable) {

        const oModel = oTable.getModel();
        if (!oModel) {
            return Promise.resolve([]);
        }

        const oMetaModel = oModel.getMetaModel();

        // Get collection path from payload
        const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Customers";

        // Wait for metadata to be loaded
        return oMetaModel.requestObject(`/${sCollectionPath}/$Type`)
            .then(function (sEntityTypePath) {

                // Request the entity type definition
                return oMetaModel.requestObject(`/${sEntityTypePath}/`);
            })
            .then(function (oEntityType) {

                const aProperties = [];

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

                return aProperties;
            })
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

    GenericTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        ODataTableDelegate.updateBindingInfo.apply(this, arguments);

        const sPath = oTable.getPayload()?.collectionPath || "Customers";
        oBindingInfo.path = "/" + sPath;

        // Essential OData V4 parameters
        oBindingInfo.parameters = Object.assign(oBindingInfo.parameters || {}, {
            $count: true
        });
        
        // ✅ Process filters: group by field, combine same field with OR, different fields with AND
        if (oBindingInfo.filters && Array.isArray(oBindingInfo.filters)) {
            const sCollectionPath = sPath.replace(/^\//, "");
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

    GenericTableDelegate.addItem = function (oTable, sPropertyName, mPropertyBag) {

        return this.fetchProperties(oTable).then(function (aProperties) {
            const oProperty = aProperties.find(function (p) {
                return p.name === sPropertyName || p.path === sPropertyName;
            });

            if (!oProperty) {
                return Promise.reject("Property not found: " + sPropertyName);
            }

            // Format label
            const sLabel = sPropertyName
                // .replace(/([A-Z])/g, ' $1')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/^./, function(str) { return str.toUpperCase(); })
                .trim();

            // Load the Column module and create column
            return new Promise(function (resolve) {
                sap.ui.require(["sap/ui/mdc/table/Column"], function (Column) {
                    // ✅ FIXED: Get table ID from collectionPath for table-specific edit state
                    const sTableId = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "SAPIdStatuses";
                    const oField = new Field({
                        value: "{" + sPropertyName + "}",
                        tooltip: "{" + sPropertyName + "}",
                        editMode: {
                            // ✅ FIXED: Use table-specific editingPath
                            parts: [{ path: `edit>/${sTableId}/editingPath` }],
                            mode:"TwoWay",
                            formatter: function (sPath) {
                                var rowPath = this.getBindingContext() && this.getBindingContext().getPath();
                                
                                // 🚀 MULTI-ROW EDITING: Check if current row is in the editing paths
                                if (sPath && sPath.includes(",")) {
                                    // Multi-row editing: check if current row path is in the comma-separated list
                                    const aEditingPaths = sPath.split(",");
                                    return aEditingPaths.includes(rowPath) ? "Editable" : "Display";
                                } else {
                                    // Single row editing: exact match
                                    return sPath === rowPath ? "Editable" : "Display";
                                }
                            }
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
    };

    GenericTableDelegate.removeItem = function (oTable, oColumn, mPropertyBag) {

        if (oColumn) {
            oColumn.destroy();
        }

        return Promise.resolve(true);
    };

    // Provide FilterField creation for Adaptation Filter panel in table p13n
    GenericTableDelegate.getFilterDelegate = function() {
        return {
            addItem: function(vArg1, vArg2, vArg3) {
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
                        .replace(/^./, function(str) { return str.toUpperCase(); })
                        .trim(),
                    propertyKey: sName,
                    conditions: "{$filters>/conditions/" + sName + "}",
                    dataType: sDataType
                }));
            }
        };
    };

    return GenericTableDelegate;
});

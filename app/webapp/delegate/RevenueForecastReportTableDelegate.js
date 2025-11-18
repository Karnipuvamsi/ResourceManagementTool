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

    const RevenueForecastReportTableDelegate = Object.assign({}, ODataTableDelegate);

    RevenueForecastReportTableDelegate.getSupportedP13nModes = function () {
        return ["Column", "Sort", "Filter", "Group"];
    };

    // Format property labels
    RevenueForecastReportTableDelegate._formatPropertyLabel = function(sPropertyName) {
        // Custom header mapping for Revenue Forecast Report
        const mCustomHeaders = {
            "sapPId": "Internal PID",
            "projectName": "Project Name",
            "projectType": "Project Type",
            "startDate": "Start Date",
            "endDate": "End Date",
            "status": "Status",
            "totalRevenue": "Total Revenue",
            "probability": "Probability",
            "weightedRevenue": "Weighted Revenue",
            "customer": "Customer",
            "vertical": "Vertical",
            "startYear": "Start Year",
            "startMonth": "Start Month"
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

    RevenueForecastReportTableDelegate.fetchProperties = function (oTable) {

        const oModel = oTable.getModel();
        if (!oModel) {
            return Promise.resolve([]);
        }

        const oMetaModel = oModel.getMetaModel();
        const sCollectionPath = "RevenueForecastReport";

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
                        const sLabel = RevenueForecastReportTableDelegate._formatPropertyLabel(sPropertyName);

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
                return [];
            });
    };

    RevenueForecastReportTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        ODataTableDelegate.updateBindingInfo.apply(this, arguments);

        oBindingInfo.path = "/RevenueForecastReport";
        oBindingInfo.parameters = Object.assign(oBindingInfo.parameters || {}, {
            $count: true
        });
        
        // ✅ Process filters: group by field, combine same field with OR, different fields with AND
        if (oBindingInfo.filters && Array.isArray(oBindingInfo.filters)) {
            const sCollectionPath = "RevenueForecastReport";
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

    RevenueForecastReportTableDelegate.addItem = function (oTable, sPropertyName, mPropertyBag) {
        return this.fetchProperties(oTable).then(function (aProperties) {
            const oProperty = aProperties.find(function (p) {
                return p.name === sPropertyName || p.path === sPropertyName;
            });

            if (!oProperty) {
                return Promise.reject("Property not found: " + sPropertyName);
            }

            // Format label using the helper function
            const sLabel = RevenueForecastReportTableDelegate._formatPropertyLabel(sPropertyName);

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

    RevenueForecastReportTableDelegate.removeItem = function (oTable, oColumn, mPropertyBag) {
        if (oColumn) {
            oColumn.destroy();
        }
        return Promise.resolve(true);
    };

    RevenueForecastReportTableDelegate.getFilterDelegate = function () {
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
                        const oProp = oMetaModel.getObject(`/RevenueForecastReport/${sName}`);
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

    return RevenueForecastReportTableDelegate;
});


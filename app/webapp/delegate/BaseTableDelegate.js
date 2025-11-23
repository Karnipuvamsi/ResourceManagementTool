/**
 * Base Table Delegate
 * 
 * This is the base delegate that contains all common functionality shared across
 * all table delegates. Specific delegates should extend this base delegate and
 * only add their entity-specific logic.
 * 
 * Usage:
 *   const BaseTableDelegate = require("glassboard/delegate/BaseTableDelegate");
 *   const SpecificDelegate = Object.assign({}, BaseTableDelegate, {
 *       // Add specific logic here
 *   });
 */


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
    "sap/ui/core/Item",
    "glassboard/utility/EnumConfig",
    "glassboard/utility/AssociationConfig"
], function (ODataTableDelegate, Sorter, FilterField, Field, mdcLibrary, HBox, Button, mLibrary, ComboBox, Item, EnumConfig, AssociationConfig) {
    "use strict";

    /**
     * Base Table Delegate
     * Extends ODataTableDelegate with common functionality
     */
    const BaseTableDelegate = Object.assign({}, ODataTableDelegate);

    // ============================================
    // COMMON CONFIGURATION METHODS
    // ============================================

    /**
     * Get supported personalization modes
     * @returns {string[]} Array of supported p13n modes
     */
    BaseTableDelegate.getSupportedP13nModes = function () {
        return ["Column", "Sort", "Filter", "Group"];
    };

    /**
     * Get enum configuration for a property
     * Uses shared EnumConfig utility
     * 
     * @param {string} sTableId - Table/Entity ID
     * @param {string} sPropertyName - Property name
     * @returns {object|null} Enum config with values and labels, or null
     */
    BaseTableDelegate._getEnumConfig = function (sTableId, sPropertyName) {
        return EnumConfig.getEnumConfig(sTableId, sPropertyName);
    };

    /**
     * Detect association configuration for a property
     * Uses shared AssociationConfig utility
     * 
     * @param {object} oTable - MDC Table instance
     * @param {string} sPropertyName - Property name
     * @returns {Promise<object|null>} Association config or null
     */
    BaseTableDelegate._detectAssociation = function (oTable, sPropertyName) {
        const oModel = oTable.getModel();
        if (!oModel || !oModel.getMetaModel) {
            return Promise.resolve(null);
        }

        // Get table ID from payload
        const sTableId = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || this._getDefaultTableId();

        // Use shared AssociationConfig utility
        const oAssocConfig = AssociationConfig.getAssociationConfig(sTableId, sPropertyName);
        return Promise.resolve(oAssocConfig || null);
    };

    /**
     * Get default table ID (override in specific delegates if needed)
     * @returns {string} Default table ID
     */
    BaseTableDelegate._getDefaultTableId = function () {
        return "Customers"; // Default fallback
    };

    // ============================================
    // COMMON FETCH PROPERTIES METHOD
    // ============================================

    /**
     * Property cache to avoid re-fetching properties multiple times
     * Key: collectionPath, Value: Promise resolving to properties array
     */
    BaseTableDelegate._mPropertyCache = {};

    /**
     * Clear property cache for a specific collection or all collections
     * @param {string} sCollectionPath - Optional collection path to clear, or undefined to clear all
     */
    BaseTableDelegate.clearPropertyCache = function (sCollectionPath) {
        if (sCollectionPath) {
            delete BaseTableDelegate._mPropertyCache[sCollectionPath];
        } else {
            // Clear all cached properties
            BaseTableDelegate._mPropertyCache = {};
        }
    };

    /**
     * Fetch properties from OData metadata
     * This is a common implementation that works for most entities
     * Override in specific delegates if custom logic is needed
     * 
     * ✅ FIXED: Added caching and retry logic to prevent race conditions
     * 
     * @param {object} oTable - MDC Table instance
     * @returns {Promise<Array>} Promise resolving to array of property definitions
     */
    BaseTableDelegate.fetchProperties = function (oTable) {
        const oModel = oTable.getModel();
        if (!oModel) {
            return Promise.resolve([]);
        }

        const oMetaModel = oModel.getMetaModel();
        if (!oMetaModel) {
            return Promise.resolve([]);
        }

        // Get collection path from payload
        const sCollectionPath = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || this._getDefaultTableId();

        // ✅ CRITICAL: Check cache first - if properties are already fetched, return cached promise
        if (BaseTableDelegate._mPropertyCache[sCollectionPath]) {
            return BaseTableDelegate._mPropertyCache[sCollectionPath];
        }

        // ✅ CRITICAL: Create and cache the promise to prevent multiple simultaneous fetches
        const oPropertiesPromise = this._fetchPropertiesInternal(oMetaModel, sCollectionPath);
        BaseTableDelegate._mPropertyCache[sCollectionPath] = oPropertiesPromise;

        // ✅ CRITICAL: If promise fails, remove from cache so it can be retried
        oPropertiesPromise.catch(() => {
            delete BaseTableDelegate._mPropertyCache[sCollectionPath];
        });

        return oPropertiesPromise;
    };

    /**
     * Internal method to fetch properties with retry logic
     * @param {object} oMetaModel - OData metadata model
     * @param {string} sCollectionPath - Collection path
     * @param {number} iRetryCount - Current retry count
     * @returns {Promise<Array>} Promise resolving to properties array
     */
    BaseTableDelegate._fetchPropertiesInternal = function (oMetaModel, sCollectionPath, iRetryCount) {
        iRetryCount = iRetryCount || 0;
        const iMaxRetries = 5; // ✅ Increased retries for slower networks
        const iRetryDelay = 300; // ✅ Increased delay to 300ms for better reliability

        // ✅ CRITICAL: First ensure metadata is loaded - wait for metadata to be ready
        // Check if metadata is already loaded by trying to access a known path
        return Promise.resolve()
            .then(() => {
                // Try to check if metadata is ready
                if (oMetaModel && typeof oMetaModel.requestObject === "function") {
                    return oMetaModel.requestObject(`/${sCollectionPath}/$Type`);
                }
                throw new Error("MetaModel not ready");
            })
            .then(function (sEntityTypePath) {
                if (!sEntityTypePath) {
                    throw new Error("Entity type path not found");
                }
                // Request the entity type definition
                return oMetaModel.requestObject(`/${sEntityTypePath}/`);
            })
            .then(function (oEntityType) {
                if (!oEntityType) {
                    throw new Error("Entity type not found");
                }

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

                // ✅ CRITICAL: Only return if we have properties, otherwise retry
                if (aProperties.length === 0 && iRetryCount < iMaxRetries) {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            // Retry with incremented count
                            BaseTableDelegate._fetchPropertiesInternal(oMetaModel, sCollectionPath, iRetryCount + 1)
                                .then(resolve)
                                .catch(() => resolve([])); // Return empty on final failure
                        }, iRetryDelay);
                    });
                }

                return aProperties;
            })
            .catch(function (oError) {
                // ✅ CRITICAL: Retry if metadata not ready yet
                if (iRetryCount < iMaxRetries) {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            // Retry with incremented count
                            BaseTableDelegate._fetchPropertiesInternal(oMetaModel, sCollectionPath, iRetryCount + 1)
                                .then(resolve)
                                .catch(() => {
                                    // Try fallback properties on final failure
                                    const aFallbackProperties = this._getFallbackProperties ? this._getFallbackProperties(sCollectionPath) : [];
                                    resolve(aFallbackProperties);
                                });
                        }, iRetryDelay);
                    });
                } else {
                    // Final retry failed - try fallback properties
                    const aFallbackProperties = this._getFallbackProperties ? this._getFallbackProperties(sCollectionPath) : [];
                    return aFallbackProperties;
                }
            }.bind(this));
    };

    /**
     * Get fallback properties (override in specific delegates if needed)
     * @param {string} sCollectionPath - Collection path
     * @returns {Array} Fallback properties array
     */
    BaseTableDelegate._getFallbackProperties = function (sCollectionPath) {
        return []; // Default: no fallback properties
    };

    /**
     * Get delegate name for logging (override in specific delegates)
     * @returns {string} Delegate name
     */
    BaseTableDelegate._getDelegateName = function () {
        return "BaseTableDelegate";
    };

    // ============================================
    // COMMON BINDING INFO UPDATE METHOD
    // ============================================

    /**
     * Update binding info with common OData V4 parameters
     * Override in specific delegates if custom logic is needed
     * 
     * @param {object} oTable - MDC Table instance
     * @param {object} oBindingInfo - Binding info object
     */
    BaseTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call parent implementation
        ODataTableDelegate.updateBindingInfo.apply(this, arguments);
        

        

        // Get collection path from payload or use default
        const oPayload = oTable.getPayload();
        const sPath = oPayload?.collectionPath || this._getDefaultTableId();

        // Set path - ensure it starts with "/"
        oBindingInfo.path = sPath.startsWith("/") ? sPath : "/" + sPath;

        // Essential OData V4 parameters
        oBindingInfo.parameters = Object.assign(oBindingInfo.parameters || {}, {
            $count: true
        });

        // ✅ Expand associations for Customers entity to display names instead of IDs
        if (sPath === "/Customers" || sPath === "Customers") {
            oBindingInfo.parameters.$expand = "to_CustCountry,to_CustState,to_CustCity";
        }

        // ✅ Process filters: group by field, combine same field with OR, different fields with AND
        // This prevents duplicate filters and ensures case-insensitive filtering works correctly
        if (oBindingInfo.filters && Array.isArray(oBindingInfo.filters)) {
            const oModel = oTable.getModel();
            const oMetaModel = oModel && oModel.getMetaModel && oModel.getMetaModel();
            const sCollectionPath = sPath.replace(/^\//, "");

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
                            const aNestedFilters = (oFilter.getFilters && typeof oFilter.getFilters === "function") ? oFilter.getFilters() : null;
                            const bAnd = (oFilter.getAnd && typeof oFilter.getAnd === "function") ? oFilter.getAnd() : true;

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
                            return oFilter;
                        }
                    }

                    // Recursively process nested filters
                    if (oFilter.getFilters && typeof oFilter.getFilters === "function") {
                        const aNestedFilters = oFilter.getFilters();
                        if (aNestedFilters && Array.isArray(aNestedFilters) && aNestedFilters.length > 0) {
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
                                        and: (oFilter.getAnd && typeof oFilter.getAnd === "function") ? oFilter.getAnd() : true
                                    });
                                } catch (e) {
                                    return oFilter;
                                }
                            }
                        }
                    }

                    return oFilter;
                });
            };

            // ✅ Group filters by path and combine same-field filters with OR, remove duplicates
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

                    const sFilterPath = oFilter.getPath();
                    if (!mFiltersByPath[sFilterPath]) {
                        mFiltersByPath[sFilterPath] = [];
                    }

                    // Check for duplicates before adding
                    const sValue1 = String(oFilter.getValue1() || "");
                    const sValue2 = String(oFilter.getValue2() || "");
                    const sOperator = String(oFilter.getOperator() || "");
                    const sFilterKey = `${sOperator}|${sValue1}|${sValue2}`;

                    // Check if this exact filter already exists
                    const bIsDuplicate = mFiltersByPath[sFilterPath].some((oExistingFilter) => {
                        const sExistingValue1 = String(oExistingFilter.getValue1() || "");
                        const sExistingValue2 = String(oExistingFilter.getValue2() || "");
                        const sExistingOperator = String(oExistingFilter.getOperator() || "");
                        const sExistingKey = `${sExistingOperator}|${sExistingValue1}|${sExistingValue2}`;
                        return sFilterKey === sExistingKey;
                    });

                    if (!bIsDuplicate) {
                        mFiltersByPath[sFilterPath].push(oFilter);
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
    };

    // ============================================
    // COMMON FILTER DELEGATE METHOD
    // ============================================

    /**
     * Get filter delegate for MDC FilterBar
     * This provides common filter field creation logic
     * Override in specific delegates for custom filter fields
     * 
     * @returns {object} Object with addItem method for filter field creation
     */
    BaseTableDelegate.getFilterDelegate = function () {
        const oDelegate = this; // Store reference to delegate for use in nested functions

        return {
            addItem: function (vArg1, vArg2, vArg3) {
                // Normalize signature: MDC may call (oTable, vProperty, mBag) or (vProperty, oTable, mBag)
                var oTable = (vArg1 && typeof vArg1.isA === "function" && vArg1.isA("sap.ui.mdc.Table")) ? vArg1 : vArg2;
                var vProperty = (oTable === vArg1) ? vArg2 : vArg1;
                var mPropertyBag = vArg3;

                // Validate oTable
                if (!oTable) {
                    return Promise.reject("Table instance is required for filter delegate");
                }

                // Resolve property name from string, property object, or mPropertyBag
                const sPropertyName =
                    (typeof vProperty === "string" && vProperty) ||
                    (vProperty && (vProperty.name || vProperty.path || vProperty.key)) ||
                    (mPropertyBag && (mPropertyBag.name || mPropertyBag.propertyKey)) ||
                    (mPropertyBag && mPropertyBag.property && (mPropertyBag.property.name || mPropertyBag.property.path || mPropertyBag.property.key));

                if (!sPropertyName) {
                    return Promise.reject("Invalid property for filter item");
                }

                // Get table ID from payload or use default
                const sTableId = (oTable.getPayload && oTable.getPayload()?.collectionPath?.replace(/^\//, "")) || oDelegate._getDefaultTableId();

                // Determine data type from metadata
                let sDataType = "sap.ui.model.type.String";
                try {
                    const oModel = oTable.getModel();
                    const oMetaModel = oModel && oModel.getMetaModel && oModel.getMetaModel();
                    if (oMetaModel) {
                        const sCollectionPath = sTableId;
                        const oProp = oMetaModel.getObject(`/${sCollectionPath}/${sPropertyName}`);
                        const sEdmType = oProp && oProp.$Type;
                        if (sEdmType === "Edm.Int16" || sEdmType === "Edm.Int32" || sEdmType === "Edm.Int64" || sEdmType === "Edm.Decimal") {
                            sDataType = "sap.ui.model.type.Integer";
                        } else if (sEdmType === "Edm.Boolean") {
                            sDataType = "sap.ui.model.type.Boolean";
                        } else if (sEdmType === "Edm.Date" || sEdmType === "Edm.DateTimeOffset") {
                            sDataType = "sap.ui.model.type.Date";
                        }
                    }
                } catch (e) {
                    // Ignore metadata errors, use default String type
                }

                // Check if it's an enum field
                const oEnumConfig = oDelegate._getEnumConfig(sTableId, sPropertyName);
                if (oEnumConfig) {
                    return Promise.resolve(oDelegate._createEnumFilterField(oTable, sPropertyName, oEnumConfig, sDataType));
                }

                // Check if it's an association field
                return oDelegate._detectAssociation(oTable, sPropertyName)
                    .then((oAssocConfig) => {
                        if (oAssocConfig) {
                            return oDelegate._createAssociationFilterField(oTable, sPropertyName, oAssocConfig, sDataType);
                        }

                        // Default: create standard filter field
                        return oDelegate._createStandardFilterField(oTable, sPropertyName, sDataType);
                    });
            }
        };
    };

    /**
     * Create enum filter field
     * @param {object} oTable - MDC Table instance
     * @param {string} sPropertyName - Property name
     * @param {object} oEnumConfig - Enum configuration
     * @param {string} sDataType - Data type (optional, defaults to String)
     * @returns {object} Filter field configuration
     */
    BaseTableDelegate._createEnumFilterField = function (oTable, sPropertyName, oEnumConfig, sDataType) {
        const oComboBox = new ComboBox({
            showSecondaryValues: false,
            items: oEnumConfig.values.map((sValue, iIndex) => {
                return new Item({
                    key: sValue,
                    text: oEnumConfig.labels[iIndex] || sValue
                });
            })
        });

        // Format label
        const sLabel = sPropertyName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, function (str) { return str.toUpperCase(); })
            .trim();

        return new FilterField({
            label: sLabel,
            propertyKey: sPropertyName,
            dataType: sDataType || "sap.ui.model.type.String",
            conditions: "{$filters>/conditions/" + sPropertyName + "}",
            control: oComboBox
        });
    };

    /**
     * Create association filter field
     * @param {object} oTable - MDC Table instance
     * @param {string} sPropertyName - Property name
     * @param {object} oAssocConfig - Association configuration
     * @param {string} sDataType - Data type (optional, defaults to String)
     * @returns {object} Filter field configuration
     */
    BaseTableDelegate._createAssociationFilterField = function (oTable, sPropertyName, oAssocConfig, sDataType) {
        // Format label
        const sLabel = sPropertyName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, function (str) { return str.toUpperCase(); })
            .trim();

        // For associations, create a value help field
        // This is a simplified version - specific delegates can override for more complex scenarios
        return new FilterField({
            label: sLabel,
            propertyKey: sPropertyName,
            dataType: sDataType || "sap.ui.model.type.String",
            conditions: "{$filters>/conditions/" + sPropertyName + "}",
            // Value help would be configured here in specific delegates
        });
    };

    /**
     * Create standard filter field
     * @param {object} oTable - MDC Table instance
     * @param {string} sPropertyName - Property name
     * @param {string} sDataType - Data type (optional, defaults to String)
     * @returns {object} Filter field configuration
     */
    BaseTableDelegate._createStandardFilterField = function (oTable, sPropertyName, sDataType) {
        // Format label
        const sLabel = sPropertyName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, function (str) { return str.toUpperCase(); })
            .trim();

        return new FilterField({
            label: sLabel,
            propertyKey: sPropertyName,
            dataType: sDataType || "sap.ui.model.type.String",
            conditions: "{$filters>/conditions/" + sPropertyName + "}"
        });
    };

    // ============================================
    // COMMON ADD ITEM METHOD
    // ============================================

    /**
     * Get custom header mappings (override in specific delegates)
     * @param {string} sTableId - Table ID
     * @returns {object} Map of property names to header labels
     */
    BaseTableDelegate._getCustomHeaders = function (sTableId) {
        return {}; // Default: no custom headers
    };

    /**
     * Format property name to header label
     * @param {string} sPropertyName - Property name
     * @param {object} mCustomHeaders - Custom header mappings
     * @returns {object} Object with label and tooltip
     */
    BaseTableDelegate._formatHeaderLabel = function (sPropertyName, mCustomHeaders) {
        if (mCustomHeaders[sPropertyName]) {
            return {
                label: mCustomHeaders[sPropertyName],
                tooltip: mCustomHeaders[sPropertyName]
            };
        }

        // Smart fallback for new fields
        const sLabel = sPropertyName
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')  // "SAPId" → "SAP Id"
            .replace(/([a-z])([A-Z])/g, '$1 $2')        // "customerName" → "customer Name"
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')   // "OHRId" → "OHR Id"
            .replace(/^./, function (str) { return str.toUpperCase(); })
            .trim();

        return {
            label: sLabel,
            tooltip: `${sLabel} (Field: ${sPropertyName})`
        };
    };

    /**
     * Create edit mode formatter helper
     * @param {string} sTableId - Table ID
     * @returns {function} Formatter function
     */
    BaseTableDelegate._createEditModeFormatter = function (sTableId) {
        return function (sPath) {
            const rowPath = this.getBindingContext() && this.getBindingContext().getPath();
            if (sPath && sPath.includes(",")) {
                const aEditingPaths = sPath.split(",");
                return aEditingPaths.includes(rowPath) ? "Editable" : "Display";
            }
            return sPath === rowPath ? "Editable" : "Display";
        };
    };

    /**
     * Create editable binding helper
     * @param {string} sTableId - Table ID
     * @returns {object} Binding configuration
     */
    BaseTableDelegate._createEditableBinding = function (sTableId) {
        return {
            parts: [{ path: `edit>/${sTableId}/editingPath` }],
            mode: "TwoWay",
            formatter: function (sPath) {
                const rowPath = this.getBindingContext() && this.getBindingContext().getPath();
                if (sPath && sPath.includes(",")) {
                    const aEditingPaths = sPath.split(",");
                    return aEditingPaths.includes(rowPath);
                }
                return sPath === rowPath;
            }
        };
    };

    /**
     * Create enum field
     * @param {object} oTable - MDC Table instance
     * @param {string} sPropertyName - Property name
     * @param {object} oEnumConfig - Enum configuration
     * @param {string} sTableId - Table ID
     * @returns {object} Field instance
     */
    BaseTableDelegate._createEnumField = function (oTable, sPropertyName, oEnumConfig, sTableId) {
        const aItems = oEnumConfig.values.map((sVal, iIndex) => {
            return new Item({
                key: sVal,
                text: oEnumConfig.labels[iIndex] || sVal
            });
        });

        const fnEnumFormatter = function (sKey) {
            if (!sKey) return "";
            const iIndex = oEnumConfig.values.indexOf(sKey);
            return iIndex >= 0 ? oEnumConfig.labels[iIndex] : sKey;
        };

        const oComboBox = new ComboBox({
            value: "{" + sPropertyName + "}",
            selectedKey: "{" + sPropertyName + "}",
            items: aItems,
            editable: this._createEditableBinding(sTableId)
        });

        return new Field({
            value: {
                path: sPropertyName,
                formatter: fnEnumFormatter
            },
            contentEdit: oComboBox,
            editMode: {
                parts: [{ path: `edit>/${sTableId}/editingPath` }],
                mode: "TwoWay",
                formatter: this._createEditModeFormatter(sTableId)
            }
        });
    };

    /**
     * Create association field
     * @param {object} oTable - MDC Table instance
     * @param {string} sPropertyName - Property name
     * @param {object} oAssocConfig - Association configuration
     * @param {string} sTableId - Table ID
     * @returns {object} Field instance
     */
    BaseTableDelegate._createAssociationField = function (oTable, sPropertyName, oAssocConfig, sTableId) {
        const oModel = oTable.getModel();
        const sCollectionPath = "/" + oAssocConfig.targetEntity;

        // Determine association navigation property name
        // For Customer: custCountryId -> to_CustCountry, custStateId -> to_CustState, custCityId -> to_CustCity
        let sAssocNavProp = "";
        if (sTableId === "Customers") {
            if (sPropertyName === "custCountryId") {
                sAssocNavProp = "to_CustCountry";
            } else if (sPropertyName === "custStateId") {
                sAssocNavProp = "to_CustState";
            } else if (sPropertyName === "custCityId") {
                sAssocNavProp = "to_CustCity";
            }
        }
        // For other entities, try to infer from property name (e.g., customerId -> to_Customer)
        // This is a fallback - specific delegates can override if needed
        if (!sAssocNavProp) {
            // Try common patterns
            const sBaseName = sPropertyName.replace(/Id$/, "");
            sAssocNavProp = "to_" + sBaseName.charAt(0).toUpperCase() + sBaseName.slice(1);
        }

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
            editable: this._createEditableBinding(sTableId),
            showSecondaryValues: true,
            filterSecondaryValues: true,
            placeholder: "Select " + oAssocConfig.displayField
        });

        oComboBox.setModel(oModel);

        // Create formatter function to display association name
        const fnAssociationFormatter = function (sValue) {
            // In display mode, try to get the association name

            const oBindingContext = this.getBindingContext();
            if (oBindingContext && sAssocNavProp) {
                const oAssocContext = oBindingContext.getObject()[sAssocNavProp];
                if (oAssocContext && oAssocContext[oAssocConfig.displayField]) {
                    return oAssocContext[oAssocConfig.displayField];
                }
            }
            // Fallback: return the ID value
            return sValue || "";
        };

        return new Field({

            value: {
                path: sAssocNavProp
                    ? sAssocNavProp + "/" + oAssocConfig.displayField
                    : sPropertyName,
                formatter: fnAssociationFormatter
            },


            contentEdit: oComboBox,
            editMode: {
                parts: [{ path: `edit>/${sTableId}/editingPath` }],
                mode: "TwoWay",
                formatter: this._createEditModeFormatter(sTableId)
            }
        });
    };

    /**
     * Create standard field
     * @param {string} sPropertyName - Property name
     * @param {string} sTableId - Table ID
     * @returns {object} Field instance
     */
    BaseTableDelegate._createStandardField = function (sPropertyName, sTableId) {
        return new Field({
            value: "{" + sPropertyName + "}",
            tooltip: "{" + sPropertyName + "}",
            editMode: {
                parts: [{ path: `edit>/${sTableId}/editingPath` }],
                mode: "TwoWay",
                formatter: this._createEditModeFormatter(sTableId)
            }
        });
    };

    /**
     * Common addItem implementation
     * Override _getCustomHeaders in specific delegates for custom header mappings
     * 
     * @param {object} oTable - MDC Table instance
     * @param {string} sPropertyName - Property name
     * @param {object} mPropertyBag - Property bag
     * @returns {Promise<object>} Promise resolving to Column instance
     */
    BaseTableDelegate.addItem = function (oTable, sPropertyName, mPropertyBag) {
        const oDelegate = this; // Store reference to delegate for use in nested functions

        return this.fetchProperties(oTable).then(function (aProperties) {
            const oProperty = aProperties.find(function (p) {
                return p.name === sPropertyName || p.path === sPropertyName;
            });

            if (!oProperty) {
                return Promise.reject("Property not found: " + sPropertyName);
            }

            // Get table ID and custom headers
            const sTableId = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || oDelegate._getDefaultTableId();
            const mCustomHeaders = oDelegate._getCustomHeaders(sTableId);
            const oHeaderInfo = oDelegate._formatHeaderLabel(sPropertyName, mCustomHeaders);

            // Load the Column module and create column
            return new Promise(function (resolve) {
                sap.ui.require(["sap/ui/mdc/table/Column"], function (Column) {
                    // Check if enum or association field
                    const oEnumConfig = oDelegate._getEnumConfig(sTableId, sPropertyName);
                    const bIsEnum = !!oEnumConfig;
                    const oAssocPromise = oDelegate._detectAssociation(oTable, sPropertyName);

                    oAssocPromise.then(function (oAssocConfig) {
                        const bIsAssoc = !!oAssocConfig;
                        let oField;

                        if (bIsEnum) {
                            oField = oDelegate._createEnumField(oTable, sPropertyName, oEnumConfig, sTableId);
                        } else if (bIsAssoc) {
                            oField = oDelegate._createAssociationField(oTable, sPropertyName, oAssocConfig, sTableId);
                        } else {
                            oField = oDelegate._createStandardField(sPropertyName, sTableId);
                        }

                        const oColumn = new Column({
                            id: oTable.getId() + "--col-" + sPropertyName,
                            dataProperty: sPropertyName,
                            propertyKey: sPropertyName,
                            header: oHeaderInfo.label,
                            template: oField
                        });

                        resolve(oColumn);
                    }).catch(function () {
                        // Fallback to regular field
                        const oField = oDelegate._createStandardField(sPropertyName, sTableId);
                        const oColumn = new Column({
                            id: oTable.getId() + "--col-" + sPropertyName,
                            dataProperty: sPropertyName,
                            propertyKey: sPropertyName,
                            header: oHeaderInfo.label,
                            template: oField
                        });
                        resolve(oColumn);
                    });
                });
            });
        });
    };

    return BaseTableDelegate;
});


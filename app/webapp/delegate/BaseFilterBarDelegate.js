/**
 * Base FilterBar Delegate
 * 
 * This is the base delegate that contains all common functionality shared across
 * all FilterBar delegates. Specific delegates should extend this base delegate and
 * only add their entity-specific logic.
 * 
 * Usage:
 *   const BaseFilterBarDelegate = require("glassboard/delegate/BaseFilterBarDelegate");
 *   const SpecificDelegate = Object.assign({}, BaseFilterBarDelegate, {
 *       // Add specific logic here
 *   });
 */

sap.ui.define([
    "sap/ui/mdc/FilterBarDelegate",
    "sap/ui/mdc/FilterField",
    "sap/ui/core/Element"
], function (FilterBarDelegate, FilterField, Element) {
    "use strict";

    /**
     * Base FilterBar Delegate
     * Extends FilterBarDelegate with common functionality
     */
    const BaseFilterBarDelegate = Object.assign({}, FilterBarDelegate);

    // ============================================
    // COMMON CONFIGURATION METHODS
    // ============================================

    /**
     * Get fragment name from FilterBar ID
     * Override in specific delegates if custom mapping is needed
     * 
     * @param {string} sFilterBarId - FilterBar ID
     * @returns {string} Fragment name
     */
    BaseFilterBarDelegate._getFragmentName = function(sFilterBarId) {
        // Map FilterBar IDs to fragment names
        if (sFilterBarId.includes("customerFilterBar")) {
            return "Customers";
        } else if (sFilterBarId.includes("projectFilterBar")) {
            return "Projects";
        } else if (sFilterBarId.includes("opportunityFilterBar")) {
            return "Opportunities";
        } else if (sFilterBarId.includes("employeeFilterBar")) {
            return "Employees";
        } else if (sFilterBarId.includes("resFilterBar")) {
            return "Resources";
        } else if (sFilterBarId.includes("allocationFilterBar")) {
            return "Allocations";
        }
        // Default fallback
        return "Customers";
    };

    /**
     * Get excluded properties (override in specific delegates if needed)
     * @param {string} sEntitySet - Entity set name
     * @returns {Array<string>} Array of property names to exclude
     */
    BaseFilterBarDelegate._getExcludedProperties = function(sEntitySet) {
        // Default: exclude CustomerID
        if (sEntitySet === "Customers") {
            return ["CustomerID"];
        }
        return [];
    };

    // ============================================
    // COMMON FETCH PROPERTIES METHOD
    // ============================================

    /**
     * Fetch properties from OData metadata
     * This is a common implementation that works for most entities
     * Override in specific delegates if custom logic is needed
     * 
     * @param {object} oFilterBar - MDC FilterBar instance
     * @returns {Promise<Array>} Promise resolving to array of property definitions
     */
    BaseFilterBarDelegate.fetchProperties = async function (oFilterBar) {
        const oModel = oFilterBar.getModel("default");
        const sEntitySet = oFilterBar.getDelegate().payload.collectionPath;
        const oMetaModel = oModel.getMetaModel();

        await oMetaModel.requestObject("/"); // Ensure metadata is loaded
        const sEntityTypePath = "/" + oMetaModel.getObject("/$EntityContainer/" + sEntitySet).$Type;
        const oEntityType = oMetaModel.getObject(sEntityTypePath);

        const typeMap = {
            "Edm.String": "sap.ui.model.odata.type.String",
            "Edm.Int32": "sap.ui.model.odata.type.Int32",
            "Edm.Boolean": "sap.ui.model.odata.type.Boolean",
            "Edm.DateTimeOffset": "sap.ui.model.odata.type.DateTimeOffset",
            "Edm.Date": "sap.ui.model.odata.type.Date",
            "Edm.Decimal": "sap.ui.model.odata.type.Decimal",
            "Edm.Double": "sap.ui.model.odata.type.Double",
            "Edm.Guid": "sap.ui.model.odata.type.Guid"
        };

        const aExcludedProperties = this._getExcludedProperties(sEntitySet);
        const aProperties = [];

        for (const sKey in oEntityType) {
            if (sKey.startsWith("$")) continue;

            const oProp = oEntityType[sKey];

            // Skip excluded properties
            if (aExcludedProperties.includes(sKey)) {
                continue;
            }

            // Skip navigation properties
            if (oProp.$isCollection || oProp.$Type?.startsWith("MyService.")) continue;

            aProperties.push({
                name: sKey,
                label: sKey,
                dataType: typeMap[oProp.$Type] || "sap.ui.model.odata.type.String",
                maxConditions: -1,
                required: false
            });
        }

        return aProperties;
    };

    // ============================================
    // COMMON ADD ITEM METHOD
    // ============================================

    /**
     * Create FilterField dynamically
     * Override in specific delegates if custom logic is needed
     * 
     * @param {object} oFilterBar - MDC FilterBar instance
     * @param {string} sPropertyName - Property name
     * @returns {Promise<object>} Promise resolving to FilterField instance
     */
    BaseFilterBarDelegate.addItem = async function (oFilterBar, sPropertyName) {
        const sId = oFilterBar.getId() + "--filter--" + sPropertyName;

        if (Element.getElementById(sId)) {
            return Element.getElementById(sId);
        }

        // Get fragment name from FilterBar ID
        const sFilterBarId = oFilterBar.getId();
        const sFragmentName = this._getFragmentName(sFilterBarId);
        
        // Determine if property is a string type for case-insensitive filtering
        let bIsString = false;
        try {
            const oModel = oFilterBar.getModel("default");
            const sEntitySet = oFilterBar.getDelegate().payload.collectionPath;
            const oMetaModel = oModel && oModel.getMetaModel && oModel.getMetaModel();
            if (oMetaModel) {
                const sEntityTypePath = "/" + oMetaModel.getObject("/$EntityContainer/" + sEntitySet).$Type;
                const oEntityType = oMetaModel.getObject(sEntityTypePath);
                const oProp = oEntityType && oEntityType[sPropertyName];
                if (oProp && oProp.$Type === "Edm.String") {
                    bIsString = true;
                }
            }
        } catch (e) {
            // If metadata check fails, default to treating as string for safety
            bIsString = true;
        }
        
        const oFilterFieldConfig = {
            conditions: "{filterModel>/" + sFragmentName + "/conditions/" + sPropertyName + "}",
            propertyKey: sPropertyName,
            label: sPropertyName,
            maxConditions: -1,
            defaultOperator: "EQ",
            delegate: {
                name: "sap/ui/mdc/field/FieldBaseDelegate",
                payload: {}
            }
        };
        
        // Set caseSensitive: false for string fields to make filters case-insensitive
        if (bIsString) {
            oFilterFieldConfig.caseSensitive = false;
        }
        
        return new FilterField(sId, oFilterFieldConfig);
    };

    // ============================================
    // COMMON REMOVE ITEM METHOD
    // ============================================

    /**
     * Remove FilterField
     * @param {object} oFilterBar - MDC FilterBar instance
     * @param {object} oFilterField - FilterField to remove
     * @returns {Promise<boolean>} Promise resolving to true
     */
    BaseFilterBarDelegate.removeItem = async function (oFilterBar, oFilterField) {
        oFilterField.destroy();
        return true;
    };

    return BaseFilterBarDelegate;
});


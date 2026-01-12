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
    
    // Hook: specific delegates override this to map labels
    BaseFilterBarDelegate.getLabelForProperty = function (sEntitySet, sPropertyName) {
        return sPropertyName; // default fallback
    };

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
    BaseFilterBarDelegate._getFragmentName = function (sFilterBarId) {
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
        } else if (sFilterBarId.includes("employeeAllocationReportFilterBar")) {
            return "EmployeeAllocationReport";
        } else if (sFilterBarId.includes("employeeBenchReportFilterBar")) {
            return "EmployeeBenchReport";
        } else if (sFilterBarId.includes("employeeSkillReportFilterBar")) {
            return "EmployeeSkillReport";
        }
        // Default fallback
        return "Customers";
    };

    /**
     * Get excluded properties (override in specific delegates if needed)
     * @param {string} sEntitySet - Entity set name
     * @returns {Array<string>} Array of property names to exclude
     */
    BaseFilterBarDelegate._getExcludedProperties = function (sEntitySet) {
        // Default: exclude CustomerID
        if (sEntitySet === "Customers") {
            return ["CustomerID"];
        }
        return [];
    };
    
 


    // Fetch properties for MDC Table / FilterBar
    BaseFilterBarDelegate.fetchProperties = async function (oFilterBar) {
        const oModel = oFilterBar.getModel("default");
        const sEntitySet = oFilterBar.getDelegate().payload.collectionPath;
        const oMetaModel = oModel.getMetaModel();

        await oMetaModel.requestObject("/");
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

            if (aExcludedProperties.includes(sKey)) continue;
            if (oProp.$isCollection || oProp.$Type?.startsWith("MyService.")) continue;

            aProperties.push({
                name: sKey,
                label: this.getLabelForProperty(sEntitySet, sKey), // 🔑 use hook
                dataType: typeMap[oProp.$Type] || "sap.ui.model.odata.type.String",
                maxConditions: -1,
                required: false
            });
        }
        return aProperties;
    };

    // AddItem for FilterBar (still uses hook for labels)
    BaseFilterBarDelegate.addItem = async function (oFilterBar, sPropertyName) {
        const sId = oFilterBar.getId() + "--filter--" + sPropertyName;
        if (Element.getElementById(sId)) {
            return Element.getElementById(sId);
        }

        const sFilterBarId = oFilterBar.getId();
        const sFragmentName = this._getFragmentName(sFilterBarId);

        const sEntitySet = oFilterBar.getDelegate().payload.collectionPath;
        const sLabel = this.getLabelForProperty(sEntitySet, sPropertyName);

        const oFilterFieldConfig = {
            conditions: "{filterModel>/" + sFragmentName + "/conditions/" + sPropertyName + "}",
            propertyKey: sPropertyName,
            label: sLabel,
            maxConditions: -1,
            defaultOperator: "EQ",
            delegate: {
                name: "sap/ui/mdc/field/FieldBaseDelegate",
                payload: {}
            }
        };

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
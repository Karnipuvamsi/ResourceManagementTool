/**
 * Master Demands FilterBar Delegate
 * 
 * Extends BaseFilterBarDelegate with entity-specific configurations.
 * This delegate handles fragment name mapping and excluded properties for various filter bars.
 */

sap.ui.define([
    "glassboard/delegate/BaseFilterBarDelegate"
], function (BaseFilterBarDelegate) {
    "use strict";

    const MasterDemandsFilterBarDelegate = Object.assign({}, BaseFilterBarDelegate);

    // ============================================
    // ENTITY-SPECIFIC FRAGMENT NAME MAPPING
    // ============================================

    /**
     * Override fragment name mapping to support additional entities
     * @param {string} sFilterBarId - FilterBar ID
     * @returns {string} Fragment name
     */
    MasterDemandsFilterBarDelegate._getFragmentName = function(sFilterBarId) {
        // First try base delegate's mapping
        const sBaseFragmentName = BaseFilterBarDelegate._getFragmentName.call(this, sFilterBarId);
        if (sBaseFragmentName && sBaseFragmentName !== "Customers") {
            return sBaseFragmentName;
        }

        // Additional mappings for more entities
        if (sFilterBarId.includes("demandFilterBar") || 
            sFilterBarId.includes("masterDemandFilterBar") || 
            sFilterBarId.includes("masterDemandsFilterBar")) {
            return "Demands";
        } else if (sFilterBarId.includes("allocationFilterBar")) {
            return "Allocations";
        } else if (sFilterBarId.includes("employeeSkillFilterBar")) {
            return "EmployeeSkills";
        }

        // Fallback to base delegate's default
        return sBaseFragmentName || "Customers";
    };

    // ============================================
    // ENTITY-SPECIFIC EXCLUDED PROPERTIES
    // ============================================

    /**
     * Override excluded properties to support multiple entities
     * @param {string} sEntitySet - Entity set name
     * @returns {Array<string>} Array of property names to exclude
     */
    MasterDemandsFilterBarDelegate._getExcludedProperties = function(sEntitySet) {
        // Get base excluded properties
        const aBaseExcluded = BaseFilterBarDelegate._getExcludedProperties.call(this, sEntitySet);
        
        // Additional excluded properties for other entities
        const mExcludedByEntity = {
            "Customers": ["CustomerID"],
            "Demands": [], // Add any excluded properties for Demands here
            "Projects": [], // Add any excluded properties for Projects here
            "Opportunities": [], // Add any excluded properties for Opportunities here
            "Employees": [], // Add any excluded properties for Employees here
            "Allocations": [], // Add any excluded properties for Allocations here
            "EmployeeSkills": [] // Add any excluded properties for EmployeeSkills here
        };

        const aEntityExcluded = mExcludedByEntity[sEntitySet] || [];
        
        // Combine and return unique excluded properties
        return [...new Set([...aBaseExcluded, ...aEntityExcluded])];
    };

    // ============================================
    // ENTITY-SPECIFIC ADD ITEM (for custom labels)
    // ============================================

    /**
     * Override addItem to provide custom labels for Demands properties
     * This fixes the label mismatch warning and provides better labels
     * @param {object} oFilterBar - MDC FilterBar instance
     * @param {string} sPropertyName - Property name
     * @returns {Promise<object>} Promise resolving to FilterField instance
     */
    MasterDemandsFilterBarDelegate.addItem = async function (oFilterBar, sPropertyName) {
        // Call base implementation first
        const oFilterField = await BaseFilterBarDelegate.addItem.call(this, oFilterBar, sPropertyName);
        
        // ✅ Fix labels for Demands properties to match table headers
        const sFragmentName = this._getFragmentName(oFilterBar.getId());
        if (sFragmentName === "Demands") {
            const mCustomLabels = {
                "sapPId": "SAP PID",
                "band": "Band",
                "skill": "Skill",
                "quantity": "Quantity"
            };
            
            if (mCustomLabels[sPropertyName]) {
                oFilterField.setLabel(mCustomLabels[sPropertyName]);
            }
        }
        
        return oFilterField;
    };

    return MasterDemandsFilterBarDelegate;
});

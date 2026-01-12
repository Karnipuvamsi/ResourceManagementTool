sap.ui.define([
    "glassboard/delegate/BaseFilterBarDelegate"
], function (BaseFilterBarDelegate) {
    "use strict";

    /**
     * Opportunities FilterBar Delegate
     * Extends BaseFilterBarDelegate with Opportunities-specific logic
     */
    const OpportunitiesFilterBarDelegate = Object.assign({}, BaseFilterBarDelegate);

    // Excluded properties for Opportunities (if any)
    OpportunitiesFilterBarDelegate._getExcludedProperties = function (sEntitySet) {
        if (sEntitySet === "Opportunities") {
            return []; // add excluded property names here if needed
        }
        return [];
    };

    // Friendly labels for Opportunities table
    const FIELD_LABELS = {
        "sapOpportunityId": "SAP Opp. ID",
        "sfdcOpportunityId": "SFDC Opp. ID",
        "opportunityName": "Opp. Name",
        "businessUnit": "Business Unit",
        "probability": "Actual Probability %",
        "salesSPOC": "Sales SPOC",
        "deliverySPOC": "Delivery SPOC",
        "expectedStart": "Expected Start",
        "expectedEnd": "Expected End",
        "currency":"Currency",
        "tcv": "TCV",
        "Stage": "SFDC Probability %",
        "customerId": "Customer ID"
    };

    // Override label hook so Base can call into this
    OpportunitiesFilterBarDelegate.getLabelForProperty = function (sEntitySet, sPropertyName) {
        if (sEntitySet === "Opportunities" && FIELD_LABELS[sPropertyName]) {
            return FIELD_LABELS[sPropertyName];
        }
        return sPropertyName;
    };

    return OpportunitiesFilterBarDelegate;
});
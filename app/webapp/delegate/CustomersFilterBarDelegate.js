sap.ui.define([
    "glassboard/delegate/BaseFilterBarDelegate"
], function (BaseFilterBarDelegate) {
    "use strict";

    /**
     * Customers FilterBar Delegate
     * Extends BaseFilterBarDelegate with Customers-specific logic
     */
    const CustomersFilterBarDelegate = Object.assign({}, BaseFilterBarDelegate);

    // ✅ Customers-specific: Override excluded properties
    CustomersFilterBarDelegate._getExcludedProperties = function(sEntitySet) {
        if (sEntitySet === "Customers") {
            return ["CustomerID"];
        }
        return [];
    };

    return CustomersFilterBarDelegate;
});
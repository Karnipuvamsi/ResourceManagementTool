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
     * Customers Table Delegate
     * Extends BaseTableDelegate with Customers-specific logic
     */
    const CustomersTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Customers
    CustomersTableDelegate._getDefaultTableId = function() {
        return "Customers";
    };
        
    // ✅ Override delegate name for logging
    CustomersTableDelegate._getDelegateName = function() {
        return "CustomersTableDelegate";
    };

    // ✅ fetchProperties and updateBindingInfo are inherited from BaseTableDelegate
    // Only override if Customers-specific logic is needed

    // ✅ Customers-specific: Override _getCustomHeaders to provide custom header mappings
    CustomersTableDelegate._getCustomHeaders = function(sTableId) {
        if (sTableId === "Customers") {
            return {
                "SAPcustId": "SAP Customer ID",
                "customerName": "Customer Name",
                "segment": "Segment",
                "state": "State",
                "country": "Country",
                "status": "Status",
                "vertical": "Vertical"
            };
        }
        return {};
    };

    // ✅ removeItem and getFilterDelegate are inherited from BaseTableDelegate

    return CustomersTableDelegate;
});
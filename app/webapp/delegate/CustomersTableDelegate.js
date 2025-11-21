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
    CustomersTableDelegate._getDefaultTableId = function () {
        return "Customers";
    };

    // ✅ Override delegate name for logging
    CustomersTableDelegate._getDelegateName = function () {
        return "CustomersTableDelegate";
    };

    // ✅ fetchProperties and updateBindingInfo are inherited from BaseTableDelegate
    // Only override if Customers-specific logic is needed

    // ✅ Customers-specific: Override _getCustomHeaders to provide custom header mappings
    CustomersTableDelegate._getCustomHeaders = function (sTableId) {
        if (sTableId === "Customers") {
            return {
                "SAPcustId": "SAP Customer ID",
                "customerName": "Customer Name",
                "custCountryId": "Country",
                "custStateId": "State",
                "custCityId": "City",
                "status": "Status",
                "vertical": "Vertical",
                "startDate": "Start Date",
                "endDate": "End Date"
            };
        }
        return {};
    };
   CustomersTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
    // call Base first
    BaseTableDelegate.updateBindingInfo.apply(this, arguments);

    // get search text from the value help content
    let sSearch = "";
    try {
        const oVH = oTable.getParent().getParent(); // MDCTable → Dialog → ValueHelp
        const aContent = oVH && oVH.getContent && oVH.getContent();
        const oDialogContent = aContent && aContent[0];
        sSearch = oDialogContent && oDialogContent.getSearch && oDialogContent.getSearch();
    } catch (e) {}

    // fallback to FilterBar if needed
    if (!sSearch) {
        const oFilterBar = sap.ui.getCore().byId("fbCustomerVH");
        const bFilterBar = sap.ui.getCore().byId("tblVerticalVH");
        if (oFilterBar && oFilterBar.getSearch) sSearch = oFilterBar.getSearch();
    }

    // nothing typed → don't apply search
    if (!sSearch) return;

    // CASE-SENSITIVE FILTERS
    oBindingInfo.filters = [
        new sap.ui.model.Filter({
            filters: [
                new sap.ui.model.Filter({
                    path: "customerName",
                    operator: sap.ui.model.FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                }),
                new sap.ui.model.Filter({
                    path: "vertical",
                    operator: sap.ui.model.FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                })
            ],
            and: false
        })
    ];

    console.log("CUSTOM CASE-SENSITIVE SEARCH FILTER:", oBindingInfo.filters);
};



    // ✅ removeItem and getFilterDelegate are inherited from BaseTableDelegate

    return CustomersTableDelegate;
});
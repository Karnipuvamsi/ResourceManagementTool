sap.ui.define([
    "glassboard/delegate/BaseFilterBarDelegate"
], function (BaseFilterBarDelegate) {
    "use strict";

    const CustomersFilterBarDelegate = Object.assign({}, BaseFilterBarDelegate);

    // Excluded properties for Customers
    CustomersFilterBarDelegate._getExcludedProperties = function (sEntitySet) {
        if (sEntitySet === "Customers") {
            return ["CustomerID"];
        }
        return [];
    };

    // Friendly labels for Customers table
    const FIELD_LABELS = {
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

    // Override label hook so Base can call into this
    CustomersFilterBarDelegate.getLabelForProperty = function (sEntitySet, sPropertyName) {
        if (sEntitySet === "Customers" && FIELD_LABELS[sPropertyName]) {
            return FIELD_LABELS[sPropertyName];
        }
        //console.log(sPropertyName);
        return sPropertyName;
    };

    return CustomersFilterBarDelegate;
});

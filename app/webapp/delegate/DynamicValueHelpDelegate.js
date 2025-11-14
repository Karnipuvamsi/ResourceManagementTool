sap.ui.define([
    "sap/ui/mdc/ValueHelpDelegate",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/mdc/enums/RequestShowContainerReason"
], function (ValueHelpDelegate, Filter, FilterOperator, RequestShowContainerReason) {
    "use strict";

    const SearchValueHelpDelegate = Object.assign({}, ValueHelpDelegate);

    // Enable search
    SearchValueHelpDelegate.isSearchSupported = function (oValueHelp) {
        return !!oValueHelp.getPayload()?.searchKeys;
    };

    // Add search filters
    SearchValueHelpDelegate.getFilters = function (oValueHelp, oContent) {
        const aFilters = ValueHelpDelegate.getFilters.call(this, oValueHelp, oContent);
        const oPayload = oValueHelp.getPayload();

        if (oPayload.searchKeys && oContent.getSearch()) {
            const aSearchFilters = oPayload.searchKeys.map((sPath) =>
                new Filter({ path: sPath, operator: FilterOperator.Contains, value1: oContent.getSearch() })
            );
            if (aSearchFilters.length) {
                aFilters.push(new Filter(aSearchFilters, false));
            }
        }
        return aFilters;
    };

    // Ensure ValueHelp can show dialog/typeahead
    SearchValueHelpDelegate.retrieveContent = function (oValueHelp, oContainer) {
        return Promise.resolve(oContainer);
    };

    // Decide when to open ValueHelp
    SearchValueHelpDelegate.requestShowContainer = function (oValueHelp, oContainer, sRequestShowContainerReason) {
        // Always allow opening for now
        return true;
    };

    return SearchValueHelpDelegate;
});
sap.ui.define([
    "glassboard/delegate/BaseTableDelegate"
], function (BaseTableDelegate) {
    "use strict";

    /**
     * Employee Probable Release Report Table Delegate
     * Extends BaseTableDelegate with Employee Probable Release Report-specific logic
     */
    const EmployeeProbableReleaseReportTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Employee Probable Release Report
    EmployeeProbableReleaseReportTableDelegate._getDefaultTableId = function() {
        return "EmployeeProbableReleaseReport";
    };

    // ✅ Override delegate name for logging
    EmployeeProbableReleaseReportTableDelegate._getDelegateName = function() {
        return "EmployeeProbableReleaseReportTableDelegate";
    };

    // ✅ Custom header mappings for Employee Probable Release Report
    EmployeeProbableReleaseReportTableDelegate._getCustomHeaders = function(sTableId) {
        return {
            "ohrId": "OHR ID",
            "allocationId": "Allocation ID",
            "employeeName": "Employee Name",
            "band": "Band",
            "currentProject": "Current Project",
            "customer": "Customer",
            "releaseDate": "Release Date",
            "daysToRelease": "Days To Release",
            "skills": "Skills",
            "location": "Location",
            "allocationStatus": "Allocation Status"
        };
    };

    // ✅ Override updateBindingInfo to set correct path
    EmployeeProbableReleaseReportTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call base implementation first
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);
        
        // Override path for Employee Probable Release Report
        oBindingInfo.path = "/EmployeeProbableReleaseReport";
    };

  EmployeeProbableReleaseReportTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
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
        const oFilterBar = sap.ui.getCore().byId("vhProbableReleaseOHRID");
        const bFilterBar = sap.ui.getCore().byId("vhProbableReleaseCurrentProject");
        if (oFilterBar && oFilterBar.getSearch) sSearch = oFilterBar.getSearch();
    }

    // nothing typed → don't apply search
    if (!sSearch) return;

    // CASE-SENSITIVE FILTERS
    oBindingInfo.filters = [
        new sap.ui.model.Filter({
            filters: [
                new sap.ui.model.Filter({
                    path: "ohrId",
                    operator: sap.ui.model.FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                }),
                 new sap.ui.model.Filter({
                    path: "projectName",
                    operator: sap.ui.model.FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                })
              
            ],
            and: false
        })
    ];

    // console.log("CUSTOM CASE-SENSITIVE SEARCH FILTER:", oBindingInfo.filters);
};

    return EmployeeProbableReleaseReportTableDelegate;
});

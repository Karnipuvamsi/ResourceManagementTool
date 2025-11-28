sap.ui.define([
    "glassboard/delegate/BaseTableDelegate"
], function (BaseTableDelegate) {
    "use strict";

    /**
     * Employee Allocation Report Table Delegate
     * Extends BaseTableDelegate with Employee Allocation Report-specific logic
     */
    const EmployeeAllocationReportTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Employee Allocation Report
    EmployeeAllocationReportTableDelegate._getDefaultTableId = function () {
        return "EmployeeAllocationReport";
    };

    // ✅ Override delegate name for logging
    EmployeeAllocationReportTableDelegate._getDelegateName = function () {
        return "EmployeeAllocationReportTableDelegate";
    };

    // ✅ Custom header mappings for Employee Allocation Report
    EmployeeAllocationReportTableDelegate._getCustomHeaders = function (sTableId) {

        console.log("EmployeeAllocationReport", sTableId);

        if (sTableId === "EmployeeAllocationReport") {
            return {
                "employeeId": "Employee ID",
                "allocationId": "Allocation ID",
                "employeeName": "Employee Name",
                "band": "Band",
                "employeeType": "Employee Type",
                "status": "Status",
                "currentProject": "Current Project",
                "customer": "Customer",
                "allocationStartDate": "Allocation Start Date",
                "allocationEndDate": "Allocation End Date",
                "daysRemaining": "Days Remaining",
                "utilizationPercentage": "Utilization %"
            };
        }
        return {};
    };

    // ✅ Override updateBindingInfo to set correct path and handle value help search
    EmployeeAllocationReportTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call base implementation first
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

        const oFilterBar = sap.ui.getCore().byId("tblEmployeeVH");
        if (oFilterBar && oFilterBar.getSearch) sSearch = oFilterBar.getSearch();
    }

    // nothing typed → don't apply search
    if (!sSearch) return;

    // CASE-SENSITIVE FILTERS
    oBindingInfo.filters = [
        new sap.ui.model.Filter({
            filters: [
                new sap.ui.model.Filter({
                    path: "employeeName",
                    operator: sap.ui.model.FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                }),
                new sap.ui.model.Filter({
                    path: "currentProject",
                    operator: sap.ui.model.FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                }),
                new sap.ui.model.Filter({
                    path: "customer",
                    operator: sap.ui.model.FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                }),
            ],
            and: false
        })
    ];

    console.log("CUSTOM CASE-SENSITIVE SEARCH FILTER:", oBindingInfo.filters);


    };

    return EmployeeAllocationReportTableDelegate;
});


sap.ui.define([
    "glassboard/delegate/BaseTableDelegate",
    "sap/ui/core/Element",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseTableDelegate, Element, Filter, FilterOperator) {
    "use strict";

    /**
     * Employee Bench Report Table Delegate
     * Extends BaseTableDelegate with Employee Bench Report-specific logic
     */
    const EmployeeBenchReportTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Employee Bench Report
    EmployeeBenchReportTableDelegate._getDefaultTableId = function () {
        return "EmployeeBenchReport";
    };

    // ✅ Override delegate name for logging
    EmployeeBenchReportTableDelegate._getDelegateName = function () {
        return "EmployeeBenchReportTableDelegate";
    };

    // ✅ Custom header mappings for Employee Bench Report
    EmployeeBenchReportTableDelegate._getCustomHeaders = function (sTableId) {

        // console.log(sTableId, "EmployeeBenchReport");

        if (sTableId === "EmployeeBenchReport") {

            return {
                "ohrId": "OHR ID",
                "employeeName": "Employee Name",
                "band": "Band",
                "employeeType": "Employee Type",
                "location": "Location",
                "skills": "Skills",
                "supervisorOHR": "Supervisor OHR",
                "email": "Email",
                "status": "Status",
                "daysOnBench": "Bench Age"
            };
        }
        return {};
    };

    // ✅ Override updateBindingInfo to set correct path and handle value help search
    EmployeeBenchReportTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call base implementation first
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);

        let sSearch = "";
        try {
            const oVH = oTable.getParent().getParent(); // MDCTable → Dialog → ValueHelp
            const aContent = oVH && oVH.getContent && oVH.getContent();
            const oDialogContent = aContent && aContent[0];
            sSearch = oDialogContent && oDialogContent.getSearch && oDialogContent.getSearch();
        } catch (e) { }

        // fallback to FilterBar if needed
        if (!sSearch) {

            const oFilterBar = Element.getElementById("tblOHRIdVH");
            if (oFilterBar && oFilterBar.getSearch) sSearch = oFilterBar.getSearch();
        }

        // nothing typed → don't apply search
        if (!sSearch) return;

        // CASE-SENSITIVE FILTERS
        oBindingInfo.filters = [
            new Filter({
                filters: [
                    new Filter({
                        path: "ohrId",
                        operator: FilterOperator.Contains,
                        value1: sSearch,
                        caseSensitive: false
                    }),
                    new Filter({
                        path: "band",
                        operator: FilterOperator.Contains,
                        value1: sSearch,
                        caseSensitive: false
                    }),
                    new Filter({
                        path: "skills",
                        operator: FilterOperator.Contains,
                        value1: sSearch,
                        caseSensitive: false
                    }),
                ],
                and: false
            })
        ];

        // console.log("CUSTOM CASE-SENSITIVE SEARCH FILTER:", oBindingInfo.filters);



    };

    return EmployeeBenchReportTableDelegate;
});

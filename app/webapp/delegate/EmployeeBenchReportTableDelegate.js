sap.ui.define([
    "glassboard/delegate/BaseTableDelegate"
], function (BaseTableDelegate) {
    "use strict";

    /**
     * Employee Bench Report Table Delegate
     * Extends BaseTableDelegate with Employee Bench Report-specific logic
     */
    const EmployeeBenchReportTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Employee Bench Report
    EmployeeBenchReportTableDelegate._getDefaultTableId = function() {
        return "EmployeeBenchReport";
    };

    // ✅ Override delegate name for logging
    EmployeeBenchReportTableDelegate._getDelegateName = function() {
        return "EmployeeBenchReportTableDelegate";
    };

    // ✅ Custom header mappings for Employee Bench Report
    EmployeeBenchReportTableDelegate._getCustomHeaders = function(sTableId) {
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
    };

    // ✅ Override updateBindingInfo to set correct path and handle value help search
    EmployeeBenchReportTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call base implementation first
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);

        const sPath = oTable.getPayload()?.collectionPath || "EmployeeBenchReport";
        const sCollectionPath = sPath.replace(/^\//, "");
       
        oBindingInfo.path = "/" + sCollectionPath;

        // ✅ Handle value help search filtering (similar to CustomersTableDelegate)
        // Get search text from the value help content
        let sSearch = "";
        try {
            const oVH = oTable.getParent() && oTable.getParent().getParent && oTable.getParent().getParent(); // MDCTable → Dialog → ValueHelp
            const aContent = oVH && oVH.getContent && oVH.getContent();
            const oDialogContent = aContent && aContent[0];
            sSearch = oDialogContent && oDialogContent.getSearch && oDialogContent.getSearch();
        } catch (e) {
            // Ignore errors
        }

        // ✅ Apply search filters if search text exists and table is in value help context (Employees)
        // This must happen BEFORE filter processing to ensure search works in value help dialogs
        if (sSearch && sCollectionPath === "Employees") {
            // Get search keys from payload
            const aSearchKeys = oTable.getPayload()?.searchKeys || [];
           
            if (aSearchKeys.length > 0) {
                // Create case-insensitive search filters (similar to CustomersTableDelegate pattern)
                const aSearchFilters = aSearchKeys.map((sKey) => {
                    return new sap.ui.model.Filter({
                        path: sKey,
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: sSearch,
                        caseSensitive: false
                    });
                });

                // ✅ CRITICAL: Replace filters array directly (like CustomersTableDelegate) for value help context
                // This ensures search works properly in value help dialogs and Go button works
                oBindingInfo.filters = [
                    new sap.ui.model.Filter({
                        filters: aSearchFilters,
                        and: false
                    })
                ];

                console.log("✅ EmployeeBenchReport ValueHelp search filter applied:", sSearch, "on keys:", aSearchKeys);
                // ✅ Early return to prevent filter processing from interfering with value help search
                return;
            }
        }
    };

    return EmployeeBenchReportTableDelegate;
});

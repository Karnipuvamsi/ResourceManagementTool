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
    EmployeeAllocationReportTableDelegate._getDefaultTableId = function() {
        return "EmployeeAllocationReport";
    };

    // ✅ Override delegate name for logging
    EmployeeAllocationReportTableDelegate._getDelegateName = function() {
        return "EmployeeAllocationReportTableDelegate";
    };

    // ✅ Custom header mappings for Employee Allocation Report
    EmployeeAllocationReportTableDelegate._getCustomHeaders = function(sTableId) {
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
    };

    // ✅ Override updateBindingInfo to set correct path and handle value help search
    EmployeeAllocationReportTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call base implementation first
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);

        const sPath = oTable.getPayload()?.collectionPath || "EmployeeAllocationReport";
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

        // ✅ Apply search filters if search text exists and table is in value help context (Employees, Projects, or Customers)
        // This must happen BEFORE filter processing to ensure search works in value help dialogs
        if (sSearch && (sCollectionPath === "Employees" || sCollectionPath === "Projects" || sCollectionPath === "Customers")) {
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

                console.log("✅ EmployeeAllocationReport ValueHelp search filter applied:", sSearch, "on keys:", aSearchKeys);
                // ✅ Early return to prevent filter processing from interfering with value help search
                return;
            }
        }
    };

    return EmployeeAllocationReportTableDelegate;
});

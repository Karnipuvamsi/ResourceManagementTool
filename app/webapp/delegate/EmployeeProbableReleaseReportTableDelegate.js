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

    return EmployeeProbableReleaseReportTableDelegate;
});

sap.ui.define([
    "glassboard/delegate/BaseTableDelegate"
], function (BaseTableDelegate) {
    "use strict";

    /**
     * Projects Nearing Completion Report Table Delegate
     * Extends BaseTableDelegate with Projects Nearing Completion Report-specific logic
     */
    const ProjectsNearingCompletionReportTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Projects Nearing Completion Report
    ProjectsNearingCompletionReportTableDelegate._getDefaultTableId = function() {
        return "ProjectsNearingCompletionReport";
    };

    // ✅ Override delegate name for logging
    ProjectsNearingCompletionReportTableDelegate._getDelegateName = function() {
        return "ProjectsNearingCompletionReportTableDelegate";
    };

    // ✅ Custom header mappings for Projects Nearing Completion Report
    ProjectsNearingCompletionReportTableDelegate._getCustomHeaders = function(sTableId) {
        return {
            "sapPId": "Internal PID",
            "projectReference": "Project Reference",
            "projectName": "Project Name",
            "projectType": "Project Type",
            "completionDate": "Completion Date",
            "daysToCompletion": "Days To Completion",
            "status": "Status",
            "completionRisk": "Completion Risk",
            "employeeCount": "Employee Count",
            "projectManager": "Project Manager",
            "projectManagerEmail": "Project Manager Email",
            "customer": "Customer"
        };
    };

    // ✅ Override updateBindingInfo to set correct path
    ProjectsNearingCompletionReportTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call base implementation first
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);
        
        // Override path for Projects Nearing Completion Report
        oBindingInfo.path = "/ProjectsNearingCompletionReport";
    };

    return ProjectsNearingCompletionReportTableDelegate;
});

sap.ui.define([
    "glassboard/delegate/BaseTableDelegate",
    "sap/ui/mdc/Field"
], function (BaseTableDelegate, Field) {
    "use strict";

    /**
     * Revenue Forecast Report Table Delegate
     * Extends BaseTableDelegate with Revenue Forecast Report-specific logic
     */
    const RevenueForecastReportTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID for Revenue Forecast Report
    RevenueForecastReportTableDelegate._getDefaultTableId = function() {
        return "RevenueForecastReport";
    };

    // ✅ Override delegate name for logging
    RevenueForecastReportTableDelegate._getDelegateName = function() {
        return "RevenueForecastReportTableDelegate";
    };

    // ✅ Custom header mappings for Revenue Forecast Report
    RevenueForecastReportTableDelegate._getCustomHeaders = function(sTableId) {
        return {
            "sapPId": "Internal PID",
            "projectName": "Project Name",
            "projectType": "Project Type",
            "startDate": "Start Date",
            "endDate": "End Date",
            "status": "Status",
            "totalRevenue": "Total Revenue",
            "probability": "Probability",
            "weightedRevenue": "Weighted Revenue",
            "customer": "Customer",
            "vertical": "Vertical",
            "startYear": "Start Year",
            "startMonth": "Start Month"
        };
    };

    // ✅ Override updateBindingInfo to set correct path
    RevenueForecastReportTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call base implementation first
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);
        
        // Override path for Revenue Forecast Report
        oBindingInfo.path = "/RevenueForecastReport";
    };

    return RevenueForecastReportTableDelegate;
});

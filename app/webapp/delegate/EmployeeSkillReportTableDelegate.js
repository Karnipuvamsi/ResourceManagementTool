sap.ui.define([
    "glassboard/delegate/BaseTableDelegate",
    "sap/ui/core/Element",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseTableDelegate, Element, Filter, FilterOperator) {
    "use strict";
 
    /**
     * Employee Skill Report Table Delegate
     * Extends BaseTableDelegate with Employee Skill Report-specific logic
     */
    const EmployeeSkillReportTableDelegate = Object.assign({}, BaseTableDelegate);
 
    // ✅ Override default table ID for Employee Skill Report
    EmployeeSkillReportTableDelegate._getDefaultTableId = function() {
        return "EmployeeSkillReport";
    };
 
    // ✅ Override delegate name for logging
    EmployeeSkillReportTableDelegate._getDelegateName = function() {
        return "EmployeeSkillReportTableDelegate";
    };
 
    // ✅ Custom header mappings for Employee Skill Report
    EmployeeSkillReportTableDelegate._getCustomHeaders = function(sTableId) {
        if (sTableId === "EmployeeSkillReport") {
            return {
                "id": "Skill ID",
                "skillName": "Skill Name",
                "category": "Category",
                "totalEmployees": "Total Employees",
                "availableEmployees": "Available Employees",
                "allocatedEmployees": "Allocated Employees"
            };
        }
        return {};
    };
 
    // ✅ Override updateBindingInfo to handle custom search filtering
    EmployeeSkillReportTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call parent implementation first
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);
 
        // ✅ Get search text from the value help content
        let sSearch = "";
        try {
            const oVH = oTable.getParent().getParent(); // MDCTable → Dialog → ValueHelp
            const aContent = oVH && oVH.getContent && oVH.getContent();
            const oDialogContent = aContent && aContent[0];
            sSearch = oDialogContent && oDialogContent.getSearch && oDialogContent.getSearch();
        } catch (e) {}
 
        // ✅ Fallback to FilterBar if needed
        if (!sSearch) {
            const oFilterBar = Element.getElementById("vhSkill");
            if (oFilterBar && oFilterBar.getSearch) sSearch = oFilterBar.getSearch();
        }
 
        // ✅ Nothing typed → don't apply search
        if (!sSearch) return;
 
        // ✅ CASE-INSENSITIVE FILTERS for skillName and category
        oBindingInfo.filters = [
            new Filter({
                filters: [
                    new Filter({
                        path: "skillName",
                        operator: FilterOperator.Contains,
                        value1: sSearch,
                        caseSensitive: false
                    }),
                    new Filter({
                        path: "category",
                        operator: FilterOperator.Contains,
                        value1: sSearch,
                        caseSensitive: false
                    })
                ],
                and: false
            })
        ];
 
        console.log("✅ EmployeeSkillReport custom search filter applied:", sSearch);
    };
 
    return EmployeeSkillReportTableDelegate;
});

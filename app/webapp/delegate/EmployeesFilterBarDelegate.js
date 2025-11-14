sap.ui.define([
    "glassboard/delegate/BaseFilterBarDelegate"
], function (BaseFilterBarDelegate) {
    "use strict";

    /**
     * Employees FilterBar Delegate
     * Extends BaseFilterBarDelegate with Employees-specific logic
     */
    const EmployeesFilterBarDelegate = Object.assign({}, BaseFilterBarDelegate);

    return EmployeesFilterBarDelegate;
});

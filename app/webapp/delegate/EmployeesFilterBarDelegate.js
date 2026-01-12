sap.ui.define([
    "glassboard/delegate/BaseFilterBarDelegate"
], function (BaseFilterBarDelegate) {
    "use strict";

    /**
     * Employees FilterBar Delegate
     * Extends BaseFilterBarDelegate with Employees-specific logic
     */
    const EmployeesFilterBarDelegate = Object.assign({}, BaseFilterBarDelegate);

    // Excluded properties for Employees (if any)
    EmployeesFilterBarDelegate._getExcludedProperties = function (sEntitySet) {
        if (sEntitySet === "Employees") {
            return []; // add excluded property names here if needed
        }
        return [];
    };

    // Friendly labels for Employees table
    const FIELD_LABELS = {
        "ohrId": "OHR ID",
        "fullName": "Full Name",
        "mailid": "Email",
        "gender": "Gender",
        "employeeType": "Employee Type",
        "doj": "Date of Joining",
        "band": "Band",
        "unit": "Unit",
        "role": "Role",
        "location": "Location",
        "supervisorOHR": "Supervisor",
        "skills": "Skills",
        "country": "Country",
        "city": "City",
        "lwd": "Last Working Date",
        "status": "Status",
        "empallocpercentage": "Allocation %"
    };

    // Override label hook so Base can call into this
    EmployeesFilterBarDelegate.getLabelForProperty = function (sEntitySet, sPropertyName) {
        if (sEntitySet === "Employees" && FIELD_LABELS[sPropertyName]) {
            return FIELD_LABELS[sPropertyName];
        }
        return sPropertyName;
    };

    return EmployeesFilterBarDelegate;
});
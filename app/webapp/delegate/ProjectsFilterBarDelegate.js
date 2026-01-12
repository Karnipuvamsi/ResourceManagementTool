sap.ui.define([
    "glassboard/delegate/BaseFilterBarDelegate"
], function (BaseFilterBarDelegate) {
    "use strict";

    /**
     * Projects FilterBar Delegate
     * Extends BaseFilterBarDelegate with Projects-specific logic
     */
    const ProjectsFilterBarDelegate = Object.assign({}, BaseFilterBarDelegate);

    // ✅ Projects-specific: Override excluded properties
    ProjectsFilterBarDelegate._getExcludedProperties = function (sEntitySet) {
        const aExcluded = [];
        if (sEntitySet === "Customers") {
            aExcluded.push("CustomerID");
        }
        if (sEntitySet === "Projects") {
            aExcluded.push("status"); // exclude raw status field
        }
        return aExcluded;
    };

    // ✅ Friendly labels for Projects table
    const FIELD_LABELS = {
        "sapPId": "Internal PID",
        "sfdcPId": "Actual PID",
        "projectName": "Project Name",
        "startDate": "Start Date",
        "endDate": "End Date",
        "gpm": "GPM",
        "projectType": "Project Type",
        "oppId": "Opp Name",
        "status": "Project Status",
        "subVertical": "Sub-Vertical",
        "requiredResources":"Required Resources",
        "allocatedResources":"Allocated Resources",
        "toBeAllocated":"To Be Allocated",
        "unit":"Unit",
        "vertical":"Vertical",
        "segment":"Segment"

    };

    // ✅ Override label hook so Base can call into this
    ProjectsFilterBarDelegate.getLabelForProperty = function (sEntitySet, sPropertyName) {
        if (sEntitySet === "Projects" && FIELD_LABELS[sPropertyName]) {
            return FIELD_LABELS[sPropertyName];
        }
        return sPropertyName;
    };

    return ProjectsFilterBarDelegate;
});
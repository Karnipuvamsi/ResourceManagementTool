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
    ProjectsFilterBarDelegate._getExcludedProperties = function(sEntitySet) {
        const aExcluded = [];
        if (sEntitySet === "Customers") {
            aExcluded.push("CustomerID");
        }
        if (sEntitySet === "Projects") {
            aExcluded.push("status");
        }
        return aExcluded;
    };

    return ProjectsFilterBarDelegate;
});

sap.ui.define([
    "glassboard/delegate/BaseTableDelegate",
    "sap/ui/mdc/Field"
], function (BaseTableDelegate, Field) {
    "use strict";

    /**
     * SAP ID Table Delegate (Generic Table Delegate)
     * Extends BaseTableDelegate with generic table logic
     */
    const GenericTableDelegate = Object.assign({}, BaseTableDelegate);

    // ✅ Override default table ID (can be overridden by payload)
    GenericTableDelegate._getDefaultTableId = function() {
        return "Customers"; // Default fallback
    };

    // ✅ Override delegate name for logging
    GenericTableDelegate._getDelegateName = function() {
        return "GenericTableDelegate";
    };

    // ✅ Override updateBindingInfo to handle dynamic collection paths
    GenericTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call base implementation first
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);

        const sPath = oTable.getPayload()?.collectionPath || "Customers";
        oBindingInfo.path = "/" + sPath.replace(/^\//, "");
    };

    return GenericTableDelegate;
});

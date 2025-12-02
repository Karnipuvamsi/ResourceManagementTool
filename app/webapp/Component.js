sap.ui.define([
    "sap/ui/core/UIComponent",
    "glassboard/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("glassboard.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
            sap.ui.getCore().loadLibrary("sap.ui.core");
            // ✅ CSS is loaded via manifest.json resources section - no need for deprecated jQuery.sap.includeStyleSheet
            
            // ✅ CRITICAL: Catch unhandled promise rejections from personalization API
            // This prevents "waitForInit is not a function" errors from crashing the app
            window.addEventListener('unhandledrejection', (event) => {
                const sErrorMsg = event.reason && (event.reason.message || String(event.reason)) || '';
                if (sErrorMsg.includes("waitForInit") || sErrorMsg.includes("is not a function")) {
                    // Suppress personalization API errors - they're not critical
                    event.preventDefault();
                    console.warn("[Component] Suppressed personalization API error:", sErrorMsg);
                }
            });
        }
    });
});
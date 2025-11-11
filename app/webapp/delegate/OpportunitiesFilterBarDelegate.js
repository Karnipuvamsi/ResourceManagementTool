sap.ui.define([
    "sap/ui/mdc/FilterBarDelegate",
    "sap/ui/mdc/FilterField",
    "sap/ui/core/Element"
], function (FilterBarDelegate, FilterField, Element) {
    "use strict";

    const GenericFilterBarDelegate = Object.assign({}, FilterBarDelegate);

    // Dynamically fetch properties from metadata
    GenericFilterBarDelegate.fetchProperties = async function (oFilterBar) {
        const oModel = oFilterBar.getModel("default");
        const sEntitySet = oFilterBar.getDelegate().payload.collectionPath;
        const oMetaModel = oModel.getMetaModel();

        await oMetaModel.requestObject("/"); // Ensure metadata is loaded
        const sEntityTypePath = "/" + oMetaModel.getObject("/$EntityContainer/" + sEntitySet).$Type;
        const oEntityType = oMetaModel.getObject(sEntityTypePath);

        const typeMap = {
            "Edm.String": "sap.ui.model.odata.type.String",
            "Edm.Int32": "sap.ui.model.odata.type.Int32",
            "Edm.Boolean": "sap.ui.model.odata.type.Boolean",
            "Edm.DateTimeOffset": "sap.ui.model.odata.type.DateTimeOffset",
            "Edm.Date": "sap.ui.model.odata.type.Date",
            "Edm.Decimal": "sap.ui.model.odata.type.Decimal",
            "Edm.Double": "sap.ui.model.odata.type.Double",
            "Edm.Guid": "sap.ui.model.odata.type.Guid"
        };

        const aProperties = [];

        for (const sKey in oEntityType) {
            if (sKey.startsWith("$")) continue;

            const oProp = oEntityType[sKey];

            //  EXCLUDE "CustomerID" PROPERTY FROM FILTERS
            if (sKey === "CustomerID") {
                console.log(`[Delegate] Skipping excluded property: ${sKey}`);
                continue;
            }

            // Skip navigation properties
            if (oProp.$isCollection || oProp.$Type?.startsWith("MyService.")) continue;

            aProperties.push({
                name: sKey,
                label: sKey,
                dataType: typeMap[oProp.$Type] || "sap.ui.model.odata.type.String",
                maxConditions: -1,
                required: false // Already non-mandatory
            });
        }

        console.log("[Delegate] Properties fetched:", aProperties);
        return aProperties;
    };

    // Create FilterField dynamically
    GenericFilterBarDelegate.addItem = async function (oFilterBar, sPropertyName) {
        const sId = oFilterBar.getId() + "--filter--" + sPropertyName;

        if (Element.getElementById(sId)) {
            return Element.getElementById(sId);
        }

        // ✅ Get fragment name from FilterBar ID to use correct model path
        const sFilterBarId = oFilterBar.getId();
        let sFragmentName = "Opportunities"; // Default
        if (sFilterBarId.includes("customerFilterBar")) {
            sFragmentName = "Customers";
        } else if (sFilterBarId.includes("projectFilterBar")) {
            sFragmentName = "Projects";
        } else if (sFilterBarId.includes("opportunityFilterBar")) {
            sFragmentName = "Opportunities";
        } else if (sFilterBarId.includes("employeeFilterBar")) {
            sFragmentName = "Employees";
        }
        
        // ✅ Determine if property is a string type for case-insensitive filtering
        let bIsString = false;
        try {
            const oModel = oFilterBar.getModel("default");
            const sEntitySet = oFilterBar.getDelegate().payload.collectionPath;
            const oMetaModel = oModel && oModel.getMetaModel && oModel.getMetaModel();
            if (oMetaModel) {
                const sEntityTypePath = "/" + oMetaModel.getObject("/$EntityContainer/" + sEntitySet).$Type;
                const oEntityType = oMetaModel.getObject(sEntityTypePath);
                const oProp = oEntityType && oEntityType[sPropertyName];
                if (oProp && oProp.$Type === "Edm.String") {
                    bIsString = true;
                }
            }
        } catch (e) {
            // If metadata check fails, default to treating as string for safety
            bIsString = true;
        }
        
        const oFilterFieldConfig = {
            conditions: "{filterModel>/" + sFragmentName + "/conditions/" + sPropertyName + "}",
            propertyKey: sPropertyName,
            label: sPropertyName,
            maxConditions: -1,
            delegate: {
                name: "sap/ui/mdc/field/FieldBaseDelegate",
                payload: {}
            }
        };
        
        // ✅ Set caseSensitive: false for string fields to make filters case-insensitive
        if (bIsString) {
            oFilterFieldConfig.caseSensitive = false;
        }
        
        return new FilterField(sId, oFilterFieldConfig);
    };

    GenericFilterBarDelegate.removeItem = async function (oFilterBar, oFilterField) {
        oFilterField.destroy();
        return true;
    };

    return GenericFilterBarDelegate;
});
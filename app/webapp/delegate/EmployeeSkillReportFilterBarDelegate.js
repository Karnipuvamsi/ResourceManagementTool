sap.ui.define([
    "sap/ui/mdc/FilterBarDelegate",
    "sap/ui/mdc/FilterField",
    "sap/ui/core/Element"
], function (FilterBarDelegate, FilterField, Element) {
    "use strict";

    const EmployeeSkillReportFilterBarDelegate = Object.assign({}, FilterBarDelegate);

    EmployeeSkillReportFilterBarDelegate.fetchProperties = async function (oFilterBar) {
        const oModel = oFilterBar.getModel("default") || oFilterBar.getModel();
        const sEntitySet = "EmployeeSkillReport";
        const oMetaModel = oModel.getMetaModel();

        await oMetaModel.requestObject("/");
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

            const oProperty = oEntityType[sKey];
            if (oProperty.$kind === "Property") {
                const sType = oProperty.$Type || "Edm.String";
                aProperties.push({
                    name: sKey,
                    path: sKey,
                    label: sKey,
                    dataType: typeMap[sType] || "sap.ui.model.odata.type.String",
                    maxConditions: -1
                });
            }
        }

        return aProperties;
    };

    // Create FilterField dynamically
    EmployeeSkillReportFilterBarDelegate.addItem = function (oFilterBar, sPropertyName) {
        const sId = oFilterBar.getId() + "--filter--" + sPropertyName;
        const sFragmentName = "EmployeeSkillReport";
        
        let bIsString = false;
        try {
            const oModel = oFilterBar.getModel("default") || oFilterBar.getModel();
            const sEntitySet = "EmployeeSkillReport";
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
            bIsString = true;
        }
        
        const oFilterFieldConfig = {
            conditions: "{filterModel>/" + sFragmentName + "/conditions/" + sPropertyName + "}",
            propertyKey: sPropertyName,
            label: sPropertyName,
            maxConditions: -1,
            defaultOperator: "EQ",
            delegate: {
                name: "sap/ui/mdc/field/FieldBaseDelegate",
                payload: {}
            }
        };
        
        if (bIsString) {
            oFilterFieldConfig.caseSensitive = false;
        }
        
        return new FilterField(sId, oFilterFieldConfig);
    };

    EmployeeSkillReportFilterBarDelegate.removeItem = async function (oFilterBar, oFilterField) {
        oFilterField.destroy();
        return true;
    };

    return EmployeeSkillReportFilterBarDelegate;
});


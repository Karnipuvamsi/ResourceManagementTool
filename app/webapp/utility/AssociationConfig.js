/**
 * Shared Association Configuration Utility
 * 
 * This module provides centralized association field configurations that are used across all TableDelegates.
 * 
 * Usage:
 *   const AssociationConfig = require("glassboard/utility/AssociationConfig");
 *   const oConfig = AssociationConfig.getAssociationConfig("Opportunities", "customerId");
 */

sap.ui.define([
    "sap/ui/base/Object"
], function (BaseObject) {
    "use strict";

    /**
     * Association Configuration Singleton
     */
    const AssociationConfig = BaseObject.extend("glassboard.utility.AssociationConfig", {
        /**
         * Association configurations organized by entity and property
         * 
         * Structure:
         * {
         *   "EntityName": {
         *     "propertyName": {
         *       targetEntity: "TargetEntityName",
         *       displayField: "displayFieldName",
         *       keyField: "keyFieldName"
         *     }
         *   }
         * }
         */
        _mAssociationConfigs: {
            "Opportunities": {
                "customerId": {
                    targetEntity: "Customers",
                    displayField: "customerName",
                    keyField: "SAPcustId"
                }
            },
            "Projects": {
                "oppId": {
                    targetEntity: "Opportunities",
                    displayField: "opportunityName",
                    keyField: "sapOpportunityId"
                },
                "gpm": {
                    targetEntity: "Employees",
                    displayField: "fullName",
                    keyField: "ohrId"
                }
            },
            "Demands": {
                "sapPId": {
                    targetEntity: "Projects",
                    displayField: "projectName",
                    keyField: "sapPId"
                }
            },
            "Employees": {
                "supervisorOHR": {
                    targetEntity: "Employees",
                    displayField: "fullName",
                    keyField: "ohrId"
                }
            },
            "EmployeeSkills": {
                "employeeId": {
                    targetEntity: "Employees",
                    displayField: "fullName",
                    keyField: "ohrId"
                },
                "skillId": {
                    targetEntity: "Skills",
                    displayField: "name",
                    keyField: "id"
                }
            },
            "Allocations": {
                "employeeId": {
                    targetEntity: "Employees",
                    displayField: "fullName",
                    keyField: "ohrId"
                },
                "projectId": {
                    targetEntity: "Projects",
                    displayField: "projectName",
                    keyField: "sapPId"
                },
                "demandId": {
                    targetEntity: "Demands",
                    displayField: "demandId",
                    keyField: "demandId"
                }
            },
            "Customers": {
                "custCountryId": {
                    targetEntity: "CustomerCountries",
                    displayField: "name",
                    keyField: "id"
                },
                "custStateId": {
                    targetEntity: "CustomerStates",
                    displayField: "name",
                    keyField: "id"
                },
                "custCityId": {
                    targetEntity: "CustomerCities",
                    displayField: "name",
                    keyField: "id"
                }
            }
        },

        /**
         * Get association configuration for a specific entity and property
         * 
         * @param {string} sEntityName - Entity name
         * @param {string} sPropertyName - Property name
         * @returns {object|null} Association config or null if not found
         */
        getAssociationConfig: function(sEntityName, sPropertyName) {
            return this._mAssociationConfigs[sEntityName]?.[sPropertyName] || null;
        },

        /**
         * Get all association configurations for an entity
         * 
         * @param {string} sEntityName - Entity name
         * @returns {object|null} Object with all association configs for the entity
         */
        getEntityAssociationConfigs: function(sEntityName) {
            return this._mAssociationConfigs[sEntityName] || null;
        },

        /**
         * Check if a property is an association field
         * 
         * @param {string} sEntityName - Entity name
         * @param {string} sPropertyName - Property name
         * @returns {boolean} True if association config exists
         */
        isAssociationField: function(sEntityName, sPropertyName) {
            return !!this.getAssociationConfig(sEntityName, sPropertyName);
        }
    });

    // Return singleton instance
    return new AssociationConfig();
});


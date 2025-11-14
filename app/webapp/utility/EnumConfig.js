/**
 * Shared Enum Configuration Utility
 * 
 * This module provides centralized enum configurations that are used across all TableDelegates.
 * Enums are sourced from the backend schema to ensure consistency.
 * 
 * Usage:
 *   const EnumConfig = require("glassboard/utility/EnumConfig");
 *   const oConfig = EnumConfig.getEnumConfig("Customers", "status");
 */

sap.ui.define([
    "sap/ui/base/Object"
], function (BaseObject) {
    "use strict";

    /**
     * Enum Configuration Singleton
     * 
     * This object contains all enum configurations mapped by entity and property name.
     * Values and labels are synchronized with the backend schema (db/schema.cds).
     */
    const EnumConfig = BaseObject.extend("glassboard.utility.EnumConfig", {
        /**
         * Enum configurations organized by entity and property
         * 
         * Structure:
         * {
         *   "EntityName": {
         *     "propertyName": {
         *       values: ["Value1", "Value2", ...],  // Backend enum values
         *       labels: ["Label1", "Label2", ...]   // Display labels
         *     }
         *   }
         * }
         */
        _mEnumConfigs: {
            "Customers": {
                "status": {
                    values: ["Active", "Inactive", "Prospect"],
                    labels: ["Active", "Inactive", "Prospect"]
                },
                "vertical": {
                    values: ["BFS", "CapitalMarkets", "CPG", "Healthcare", "HighTech", "Insurance", "LifeSciences", "Manufacturing", "Retail", "Services"],
                    labels: ["BFS", "Capital Markets", "CPG", "Healthcare", "High Tech", "Insurance", "Life Sciences", "Manufacturing", "Retail", "Services"]
                }
            },
            "Opportunities": {
                "probability": {
                    values: ["0%-ProposalStage", "33%-SoWSent", "85%-SoWSigned", "100%-PurchaseOrderReceived"],
                    labels: ["0%-ProposalStage", "33%-SoWSent", "85%-SoWSigned", "100%-PurchaseOrderReceived"]
                },
                "Stage": {
                    values: ["Discover", "Define", "OnBid", "DownSelect", "SignedDeal"],
                    labels: ["Discover", "Define", "On Bid", "Down Select", "Signed Deal"]
                }
            },
            "Projects": {
                "projectType": {
                    values: ["FixedPrice", "TransactionBased", "FixedMonthly", "PassThru", "Divine"],
                    labels: ["Fixed Price", "Transaction Based", "Fixed Monthly", "Pass Thru", "Divine"]
                },
                "status": {
                    values: ["Active", "Closed", "Planned"],
                    labels: ["Active", "Closed", "Planned"]
                },
                "SOWReceived": {
                    values: ["Yes", "No"],
                    labels: ["Yes", "No"]
                },
                "POReceived": {
                    values: ["Yes", "No"],
                    labels: ["Yes", "No"]
                }
            },
            "Employees": {
                "gender": {
                    values: ["Male", "Female", "Others"],
                    labels: ["Male", "Female", "Others"]
                },
                "employeeType": {
                    values: ["FullTime", "SubCon", "Intern", "YTJ"],
                    labels: ["Full Time", "Subcon", "Intern", "Yet To Join"]
                },
                "band": {
                    values: ["1", "2", "3", "4A", "4B-C", "4B-LC", "4C", "4D", "5A", "5B", "Subcon"],
                    labels: ["1", "2", "3", "4A", "4B-C", "4B-LC", "4C", "4D", "5A", "5B", "Subcon"]
                },
                "status": {
                    values: ["PreAllocated", "Allocated", "Resigned", "UnproductiveBench", "InactiveBench"],
                    labels: ["Pre Allocated", "Allocated", "Resigned", "Unproductive Bench", "Inactive Bench"]
                }
            },
            "Allocations": {
                "status": {
                    values: ["Active", "Completed", "Cancelled"],
                    labels: ["Active", "Completed", "Cancelled"]
                }
            }
        },

        /**
         * Get enum configuration for a specific entity and property
         * 
         * @param {string} sEntityName - Entity name (e.g., "Customers", "Employees")
         * @param {string} sPropertyName - Property name (e.g., "status", "vertical")
         * @returns {object|null} Enum config with values and labels, or null if not found
         */
        getEnumConfig: function(sEntityName, sPropertyName) {
            return this._mEnumConfigs[sEntityName]?.[sPropertyName] || null;
        },

        /**
         * Get all enum configurations for an entity
         * 
         * @param {string} sEntityName - Entity name
         * @returns {object|null} Object with all enum configs for the entity, or null if not found
         */
        getEntityEnumConfigs: function(sEntityName) {
            return this._mEnumConfigs[sEntityName] || null;
        },

        /**
         * Check if a property is an enum field
         * 
         * @param {string} sEntityName - Entity name
         * @param {string} sPropertyName - Property name
         * @returns {boolean} True if enum config exists
         */
        isEnumField: function(sEntityName, sPropertyName) {
            return !!this.getEnumConfig(sEntityName, sPropertyName);
        }
    });

    // Return singleton instance
    return new EnumConfig();
});


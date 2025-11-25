/**
 * Master Demands Table Delegate
 *
 * Extends BaseTableDelegate with entity-specific configurations for multiple entities.
 * This delegate handles enum fields, associations, and custom headers for various tables.
 */
 
sap.ui.define([
    "glassboard/delegate/BaseTableDelegate"
], function (BaseTableDelegate) {
    "use strict";
 
    const MasterDemandsTableDelegate = Object.assign({}, BaseTableDelegate);
 
    // ============================================
    // ENTITY-SPECIFIC ENUM CONFIGURATION
    // ============================================
 
    /**
     * Override enum configuration to support multiple entities
     * @param {string} sTableId - Table ID
     * @param {string} sPropertyName - Property name
     * @returns {object|null} Enum config with values and labels, or null
     */
    MasterDemandsTableDelegate._getEnumConfig = function(sTableId, sPropertyName) {
        // First try base delegate's EnumConfig utility
        const oBaseConfig = BaseTableDelegate._getEnumConfig.call(this, sTableId, sPropertyName);
        if (oBaseConfig) {
            return oBaseConfig;
        }
 
        // Fallback to static enum configurations for multiple entities
        const mEnumFields = {
            "Customers": {
                "status": { values: ["Active", "Inactive", "Prospect"], labels: ["Active", "Inactive", "Prospect"] },
                "vertical": {
                    values: ["BFS", "CapitalMarkets", "CPG", "Healthcare", "HighTech", "Insurance", "LifeSciences", "Manufacturing", "Retail", "Services"],
                    labels: ["BFS", "Capital Markets", "CPG", "Healthcare", "High Tech", "Insurance", "Life Sciences", "Manufacturing", "Retail", "Services"]
                }
            },
            "Opportunities": {
                "probability": {
                    values: ["ProposalStage", "SoWSent", "SoWSigned", "PurchaseOrderReceived"],
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
                    values: ["1", "2", "3", "Band4A", "Band4BC", "Band4BLC", "Band4C", "Band4D", "Band5A", "Band5B", "BandSubcon"],
                    labels: ["1", "2", "3", "4A", "4B-C", "4B-LC", "4C", "4D", "5A", "5B", "Subcon"]
                },
                "status": {
                    values: ["PreAllocated", "Bench", "Resigned", "Allocated"],
                    labels: ["Pre Allocated", "Bench", "Resigned", "Allocated"]
                }
            },
            "Allocations": {
                "status": {
                    values: ["Active", "Completed", "Cancelled"],
                    labels: ["Active", "Completed", "Cancelled"]
                }
            }
        };
        return mEnumFields[sTableId]?.[sPropertyName] || null;
    };
 
    // ============================================
    // ENTITY-SPECIFIC ASSOCIATION DETECTION
    // ============================================
 
    /**
     * Override association detection to support multiple entities
     * @param {object} oTable - MDC Table instance
     * @param {string} sPropertyName - Property name
     * @returns {Promise<object|null>} Association config or null
     */
    MasterDemandsTableDelegate._detectAssociation = function(oTable, sPropertyName) {
        const sTableId = oTable.getPayload()?.collectionPath?.replace(/^\//, "") || "Customers";
       
        // ✅ CRITICAL: For Demands table, sapPId should NOT be treated as association
        // We want to display the ID directly, not the project name
        if (sTableId === "Demands" && sPropertyName === "sapPId") {
            return Promise.resolve(null);
        }
       
        // First try base delegate's AssociationConfig utility
        return BaseTableDelegate._detectAssociation.call(this, oTable, sPropertyName)
            .then((oBaseAssocConfig) => {
                if (oBaseAssocConfig) {
                    return oBaseAssocConfig;
                }
 
                // Fallback to static association mappings for multiple entities
                const oModel = oTable.getModel();
                if (!oModel || !oModel.getMetaModel) {
                    return null;
                }
 
                // Simple fallback mapping for associations (can be enhanced with metadata later)
                const mAssociationFields = {
                    "Opportunities": {
                        "customerId": { targetEntity: "Customers", displayField: "customerName", keyField: "SAPcustId" }
                    },
                    "Projects": {
                        "oppId": { targetEntity: "Opportunities", displayField: "opportunityName", keyField: "sapOpportunityId" }
                    },
                    "Demands": {
                        "skillId": { targetEntity: "Skills", displayField: "name", keyField: "id" }
                        // Note: sapPId is intentionally excluded - display ID directly
                    },
                    "Employees": {
                        "supervisorOHR": { targetEntity: "Employees", displayField: "fullName", keyField: "ohrId" }
                    },
                    "EmployeeSkills": {
                        "employeeId": { targetEntity: "Employees", displayField: "fullName", keyField: "ohrId" },
                        "skillId": { targetEntity: "Skills", displayField: "name", keyField: "id" }
                    },
                    "Allocations": {
                        "employeeId": { targetEntity: "Employees", displayField: "fullName", keyField: "ohrId" },
                        "projectId": { targetEntity: "Projects", displayField: "projectName", keyField: "sapPId" }
                    }
                };
 
                const oAssocConfig = mAssociationFields[sTableId]?.[sPropertyName];
                return oAssocConfig || null;
            });
    };
 
    // ============================================
    // ENTITY-SPECIFIC CUSTOM HEADERS
    // ============================================
 
    /**
     * Override custom headers for multiple entities
     * @param {string} sTableId - Table ID
     * @returns {object} Map of property names to header labels
     */
    MasterDemandsTableDelegate._getCustomHeaders = function(sTableId) {
        const mAllCustomHeaders = {
            "Customers": {
                "SAPcustId": "SAP Customer ID",
                "customerName": "Customer Name",
                "segment": "Segment",
                "state": "State",
                "country": "Country",
                "status": "Status",
                "vertical": "Vertical"
            },
            "Demands": {
                "sapPId": "SAP PID"
            }
        };
        return mAllCustomHeaders[sTableId] || {};
    };
 
    // ============================================
    // ENTITY-SPECIFIC FALLBACK PROPERTIES
    // ============================================
 
    /**
     * Override fallback properties for entities that may need them
     * @param {string} sCollectionPath - Collection path
     * @returns {Array} Fallback properties array
     */
    MasterDemandsTableDelegate._getFallbackProperties = function(sCollectionPath) {
        const mFallbackProperties = {
            "Opportunities": [
                { name: "sapOpportunityId", path: "sapOpportunityId", label: "SAP Opportunity ID", dataType: "Edm.Int32", sortable: true, filterable: true, groupable: true },
                { name: "sfdcOpportunityId", path: "sfdcOpportunityId", label: "SFDC Opportunity ID", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                { name: "probability", path: "probability", label: "Probability", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                { name: "salesSPOC", path: "salesSPOC", label: "Sales SPOC", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                { name: "deliverySPOC", path: "deliverySPOC", label: "Delivery SPOC", dataType: "Edm.String", sortable: true, filterable: true, groupable: true },
                { name: "expectedStart", path: "expectedStart", label: "Expected Start", dataType: "Edm.Date", sortable: true, filterable: true, groupable: true },
                { name: "expectedEnd", path: "expectedEnd", label: "Expected End", dataType: "Edm.Date", sortable: true, filterable: true, groupable: true },
                { name: "customerId", path: "customerId", label: "Customer ID", dataType: "Edm.Int32", sortable: true, filterable: true, groupable: true }
            ]
        };
        return mFallbackProperties[sCollectionPath] || [];
    };
 
    // ============================================
    // ENTITY-SPECIFIC BINDING INFO UPDATE
    // ============================================
 
    /**
     * Override updateBindingInfo to expand associations and handle value help search filtering
     * @param {object} oTable - MDC Table instance
     * @param {object} oBindingInfo - Binding info object
     */
    MasterDemandsTableDelegate.updateBindingInfo = function (oTable, oBindingInfo) {
        // Call parent implementation first (handles common logic)
        BaseTableDelegate.updateBindingInfo.apply(this, arguments);
 
        const sPath = oTable.getPayload()?.collectionPath || "Demands";
        const sCollectionPath = sPath.replace(/^\//, "");
       
        // ✅ Expand associations to load related entity data
        if (sCollectionPath === "Demands") {
            // Expand Project association for Demands table
            oBindingInfo.parameters.$expand = "to_Project";
        } else if (sCollectionPath === "Projects") {
            // Expand Opportunity association for Project table
            oBindingInfo.parameters.$expand = "to_Opportunity";
        }
 
        // ✅ Handle value help search filtering (similar to CustomersTableDelegate)
        // Get search text from the value help content
        let sSearch = "";
        try {
            const oVH = oTable.getParent() && oTable.getParent().getParent && oTable.getParent().getParent(); // MDCTable → Dialog → ValueHelp
            const aContent = oVH && oVH.getContent && oVH.getContent();
            const oDialogContent = aContent && aContent[0];
            sSearch = oDialogContent && oDialogContent.getSearch && oDialogContent.getSearch();
        } catch (e) {
            // Ignore errors
        }
 
        // ✅ Apply search filters if search text exists and table is in value help context
        if (sSearch && sCollectionPath === "Projects") {
            // Get search keys from payload
            const aSearchKeys = oTable.getPayload()?.searchKeys || ["sapPId", "projectName"];
           
            // Create case-insensitive search filters
            const aSearchFilters = aSearchKeys.map((sKey) => {
                return new sap.ui.model.Filter({
                    path: sKey,
                    operator: sap.ui.model.FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                });
            });
 
            // Combine search filters with OR logic
            const oSearchFilter = new sap.ui.model.Filter({
                filters: aSearchFilters,
                and: false
            });
 
            // Merge with existing filters
            if (oBindingInfo.filters) {
                oBindingInfo.filters = new sap.ui.model.Filter({
                    filters: [oBindingInfo.filters, oSearchFilter],
                    and: true
                });
            } else {
                oBindingInfo.filters = oSearchFilter;
            }
 
            console.log("✅ MasterDemands ValueHelp search filter applied:", sSearch, "on keys:", aSearchKeys);
        }
    };
 
 
    return MasterDemandsTableDelegate;
});
 
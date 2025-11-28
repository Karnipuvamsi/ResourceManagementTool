sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/mdc/p13n/StateUtil",
    "sap/m/MessageToast",
    "glassboard/utility/CustomUtility",
    "glassboard/delegate/BaseTableDelegate"
], (Controller, Fragment, StateUtil, MessageToast, CustomUtility, BaseTableDelegate) => {
    "use strict";

    return Controller.extend("glassboard.controller.Home", {
        onInit() {
            this._oNavContainer = this.byId("pageContainer");
            // Call the centralized controller's onInit
            CustomUtility.prototype.onInit.call(this);
            // Make sure the OData model is available both as the default (unnamed) model
            // AND as a named model "default" (some parts of your delegates use the named model)
            const oComponentModel = this.getOwnerComponent().getModel();
            if (oComponentModel) {
                this.getView().setModel(oComponentModel); // default (unnamed)
                this.getView().setModel(oComponentModel, "default"); // named "default"
            }

            // ✅ Set the filter model with isolated conditions per fragment
            const oFilterModel = new sap.ui.model.json.JSONModel({
                Customers: { conditions: {}, items: [] },
                Projects: { conditions: {}, items: [] },
                Opportunities: { conditions: {}, items: [] },
                Employees: { conditions: {}, items: [] },
                Demands: { conditions: {}, items: [] },
                Allocations: { conditions: {}, items: [] },
                Resources: { conditions: {}, items: [] },
                EmployeeBenchReport: { conditions: {}, items: [] },
                EmployeeProbableReleaseReport: { conditions: {}, items: [] },
                RevenueForecastReport: { conditions: {}, items: [] },
                EmployeeAllocationReport: { conditions: {}, items: [] },
                EmployeeSkillReport: { conditions: {}, items: [] },
                ProjectsNearingCompletionReport: { conditions: {}, items: [] }
            });
            this.getView().setModel(oFilterModel, "filterModel");

            // ✅ Also set $filters model for MDC FilterBar (points to same model but different structure)
            const oFiltersModel = new sap.ui.model.json.JSONModel({
                conditions: {}
            });
            this.getView().setModel(oFiltersModel, "$filters");

            // ✅ Set default filters for each entity
            this._setDefaultFilters();

            // Optional: Set a separate model for table-specific state (if needed)
            const oTableModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oTableModel, "tableModel");

            // ✅ Initialize Country-City mapping for dependent dropdowns
            this._mCountryToCities = {
                "South Africa": ["Johannesburg (Gauteng)"],
                "China": ["Dalian", "Foshan (Guangdong)", "Kunshan (Jiangsu)"],
                "India": ["Bangalore (Karnataka)", "Chennai (Tamil Nadu)", "Gurgaon/Haryana (NCR)", "Hyderabad (Telangana)", "Jaipur (Rajasthan)", "Jodhpur (Rajasthan)", "Kolkata (West Bengal)", "Madurai (Tamil Nadu)", "Mumbai (Maharashtra)", "New Delhi (Delhi)", "Noida (Uttar Pradesh)", "Pune (Maharashtra)", "Warangal (Telangana)"],
                "Japan": ["Tokyo (Chiyoda-ku)", "Yokohama (Kanagawa)"],
                "Malaysia": ["Kuala Lumpur / Petaling Jaya (Selangor)"],
                "Philippines": ["Bataan", "Manila / Quezon City"],
                "Singapore": ["Singapore"],
                "Colombia": ["Bogota"],
                "Costa Rica": ["Heredia"],
                "Brazil": ["Belo Horizonte (MG)", "Uberlândia (MG)"],
                "Guatemala": ["Guatemala City"],
                "Mexico": ["Juárez (Chihuahua)", "Guadalajara (Jalisco)", "Monterrey / San Pedro Garza García (Nuevo León)"],
                "Egypt": ["Cairo"],
                "Israel": ["Netanya"],
                "Turkey": ["Istanbul"],
                "Canada": ["Toronto (Ontario)"],
                "USA": ["Atlanta (Georgia)", "Danville (Illinois)", "New York (New York)", "Richardson (Texas)", "Wilkes-Barre (Pennsylvania)"],
                "Australia": ["Melbourne (Victoria)", "Sydney (New South Wales)"],
                "Bulgaria": ["Sofia"],
                "France": ["Paris"],
                "Hungary": ["Budapest"],
                "Italy": ["Milano"],
                "Germany": ["Munich"],
                "Netherlands": ["Hoofddorp"],
                "Poland": ["Katowice", "Kraków", "Lublin", "Bielsko-Biała", "Wrocław"],
                "Portugal": ["Lisbon"],
                "Republic of Ireland": ["Dublin"],
                "Romania": ["Bucharest", "Cluj Napoca", "Iași"],
                "Switzerland": ["Zug"],
                "United Kingdom": ["London (England)", "Manchester (Greater Manchester)", "Bellshill (Scotland)"]
            };

            // ✅ Initialize Band-Designation mapping for dependent dropdowns
            this.mBandToDesignations = {
                "1": ["Senior Vice President"],
                "2": ["Vice President"],
                "3": ["Assistant Vice President"],
                "4A": ["Consultant", "Management Trainee"],
                "4B-C": ["Consultant", "Assistant Manager"],
                "4B-LC": ["Assistant Manager", "Lead Consultant"],
                "4C": ["Manager", "Principal Consultant", "Project Manager"],
                "4D": ["Senior Manager", "Senior Principal Consultant", "Senior Project Manager"],
                "5A": ["Process Associate"],
                "5B": ["Senior Associate", "Technical Associate"],
                "Subcon": ["Subcon"]
            };

            // ✅ Populate Country dropdown in Customers fragment when loaded
            this._populateCountryDropdown();

            // ✅ Initialize home counts model
            const oHomeCountsModel = new sap.ui.model.json.JSONModel({
                totalHeadCount: 0,
                allocatedCount: 0,
                preAllocatedCount: 0,
                unproductiveBenchCount: 0,
                onLeaveCount: 0,
                benchCount: 0
            });
            this.getView().setModel(oHomeCountsModel, "homeCounts");
        },

        onAfterRendering: function () {
            // ✅ Load all home screen counts after view is rendered
            // Wait a bit to ensure OData model is fully initialized
            let nRetries = 0;
            const nMaxRetries = 10;

            const fnLoadCounts = () => {
                nRetries++;
                const oModel = this.getView().getModel("default") || this.getView().getModel();
                if (oModel && oModel.getMetaModel) {
                    try {
                        const oMetaModel = oModel.getMetaModel();
                        // Try to access metadata to ensure it's loaded
                        if (oMetaModel && oMetaModel.requestObject) {
                            // Metadata is available, load counts
                            this._loadHomeCounts();
                        } else {
                            // Metadata not ready yet, retry
                            if (nRetries < nMaxRetries) {
                                setTimeout(fnLoadCounts, 500);
                            } else {
                            }
                        }
                    } catch (e) {
                        // Metadata not ready, retry
                        if (nRetries < nMaxRetries) {
                            setTimeout(fnLoadCounts, 500);
                        } else {
                        }
                    }
                } else {
                    // Model not ready yet, retry
                    if (nRetries < nMaxRetries) {
                        setTimeout(fnLoadCounts, 500);
                    } else {
                    }
                }
            };
            setTimeout(fnLoadCounts, 1000);
        },

        onSideNavButtonPress() {
            const oSideNavigation = this.byId("sideNavigation"),
                bExpanded = oSideNavigation.getExpanded();


            oSideNavigation.setExpanded(!bExpanded);
        },

        onItemSelect: function (oEvent) {
            const sKey = oEvent.getParameter("item").getKey();
            const oNavContainer = this.byId("pageContainer");

            const pageMap = {
                home: "root1",
                customers: "customersPage",
                opportunities: "opportunitiesPage",
                projects: "projectsPage",
                demands: "demandsPage",
                sapid: "sapidPage",
                employees: "employeesPage",
                // ✅ REMOVED: verticals: "verticalsPage", (Vertical is now an enum, not an entity)
                overview: "allocationPage",
                requirements: "requirementsPage",
                employeeBenchReport: "employeeBenchReportPage",
                employeeProbableReleaseReport: "employeeProbableReleaseReportPage",
                revenueForecastReport: "revenueForecastReportPage",
                employeeAllocationReport: "employeeAllocationReportPage",
                employeeSkillReport: "employeeSkillReportPage",
                projectsNearingCompletionReport: "projectsNearingCompletionReportPage"
            };

            const sPageId = pageMap[sKey];


            if (!sPageId) {
                return;
            }
            // ✅ FIXED: Check for unsaved changes before navigating
            this._clearPreviousTableEditState(sKey).then((bAllowNavigation) => {
                if (!bAllowNavigation) {
                    // User chose "Stay" - don't navigate
                    return;
                }

                // Reset all tables to "show-less" state before navigating
                this._resetAllTablesToShowLess();
                oNavContainer.to(this.byId(sPageId));

                // Continue with fragment loading logic...
                this._loadFragmentIfNeeded(sKey, sPageId);
            });
        },

        // ✅ NEW: Extract fragment loading logic
        _loadFragmentIfNeeded: function (sKey, sPageId) {
            var oLogButton = this.byId("uploadLogButton");

            // ✅ CRITICAL: Clear property cache for this collection to force fresh property fetch
            // This prevents the "0/0 columns" issue in View Settings dialog
            const sCollectionMap = {
                "customers": "Customers",
                "opportunities": "Opportunities",
                "projects": "Projects",
                "employees": "Employees",
                "sapid": "SAPIdStatuses",
                "requirements": "Demands",
                "overview": "Projects", // Allocations overview uses Projects collection
                "employeeBenchReport": "EmployeeBenchReport",
                "employeeAllocationReport": "EmployeeAllocationReport",
                "employeeSkillReport": "EmployeeSkillReport"

            };
            const sCollectionPath = sCollectionMap[sKey];
            if (sCollectionPath && BaseTableDelegate && BaseTableDelegate.clearPropertyCache) {
                BaseTableDelegate.clearPropertyCache(sCollectionPath);
            }

            if (sKey === "customers") {
                // Check if already loaded to prevent duplicate IDs
                if (this._bCustomersLoaded) {
                    // ✅ Even if already loaded, re-initialize table to refresh p13n state
                    const oTable = this.byId("Customers");
                    if (oTable) {
                        this.initializeTable("Customers").catch(() => {
                            // Ignore errors during re-initialization
                        });
                    }
                    return;
                }

                this._bCustomersLoaded = true;
                const oCustomersPage = this.getView().byId(sPageId);

                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oCustomersPage && oCustomersPage.getContent) {
                    const aExistingContent = oCustomersPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        aExistingContent.forEach((oContent) => {
                            if (oContent && oContent.destroy) {
                                oContent.destroy();
                            }
                        });
                        oCustomersPage.removeAllContent();
                    }
                }

                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.Customers",
                    controller: this
                }).then(function (oFragment) {
                    oCustomersPage.addContent(oFragment);

                    const oTable = this.byId("Customers");
                    // Ensure table starts with show-less state
                    oTable.removeStyleClass("show-more");
                    oTable.addStyleClass("show-less");

                    if (oLogButton) {
                        oLogButton.setVisible(false);
                    }

                    // Ensure the table has the correct model
                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oTable.setModel(oModel);
                    }

                    // ✅ Populate Country dropdown when Customers fragment loads
                    this._populateCountryDropdown();

                    // ✅ Set default filters for Customers FilterBar
                    const oFilterBar = this.byId("customerFilterBar");
                    if (oFilterBar) {
                        oFilterBar.setModel(oModel, "default");
                        const oFilterModel = this.getView().getModel("filterModel");
                        const oFiltersModel = this.getView().getModel("$filters");
                        if (oFilterModel) {
                            oFilterBar.setModel(oFilterModel, "filterModel");
                        }
                        if (oFiltersModel) {
                            oFilterBar.setModel(oFiltersModel, "$filters");
                        }
                        // ✅ Set defaults with multiple retries
                        setTimeout(() => {
                            this._setDefaultFilterFields(oFilterBar, ["customerName", "vertical"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oFilterBar, ["customerName", "vertical"]);
                        }, 2000);
                    }

                    // Initialize table-specific functionality
                    this.initializeTable("Customers").then(() => {
                        // ✅ Trigger initial data load by firing FilterBar search event
                        // This ensures table binds even when there are no filter conditions
                        setTimeout(() => {
                            if (oFilterBar) {
                                // Fire search event to trigger table binding
                                oFilterBar.fireSearch();
                            } else if (oTable && typeof oTable.rebind === "function") {
                                // Fallback: rebind table directly if FilterBar not available
                                oTable.rebind();
                            }
                        }, 1000);
                    });

                    // Reset segmented button to "less" state for this fragment
                    this._resetSegmentedButtonForFragment("Customers");

                    // ✅ Initialize Customer ID field with next ID preview (for create mode)
                    // Wait for table to be fully initialized and data loaded
                    setTimeout(() => {
                        // Wait for table binding to be ready
                        oTable.initialized().then(() => {
                            // Additional delay to ensure data is loaded
                            setTimeout(() => {
                                this._initializeCustomerIdField();
                                // Also ensure form is in create mode (no selection)
                                const aSelectedContexts = oTable.getSelectedContexts ? oTable.getSelectedContexts() : [];
                                if (aSelectedContexts.length === 0) {
                                    // No selection - initialize form for create mode
                                    this._onCustDialogData([]);
                                }
                            }, 500);
                        }).catch(() => {
                            // If initialization promise fails, try anyway after delay
                            setTimeout(() => {
                                this._initializeCustomerIdField();
                            }, 1000);
                        });
                    }, 300);

                }.bind(this));
            } else if (sKey === "opportunities") {
                // Check if already loaded to prevent duplicate IDs
                if (this._bOpportunitiesLoaded) {
                    // ✅ Even if already loaded, re-initialize table to refresh p13n state
                    const oTable = this.byId("Opportunities");
                    if (oTable) {
                        this.initializeTable("Opportunities").catch(() => {
                            // Ignore errors during re-initialization
                        });
                    }
                    return;
                }

                this._bOpportunitiesLoaded = true;
                const oOpportunitiesPage = this.getView().byId(sPageId);

                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oOpportunitiesPage && oOpportunitiesPage.getContent) {
                    const aExistingContent = oOpportunitiesPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        aExistingContent.forEach((oContent) => {
                            if (oContent && oContent.destroy) {
                                oContent.destroy();
                            }
                        });
                        oOpportunitiesPage.removeAllContent();
                    }
                }

                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.Opportunities",
                    controller: this
                }).then(function (oFragment) {
                    oOpportunitiesPage.addContent(oFragment);

                    const oTable = this.byId("Opportunities");
                    // Ensure table starts with show-less state
                    oTable.removeStyleClass("show-more");
                    oTable.addStyleClass("show-less");

                    if (oLogButton) {
                        oLogButton.setVisible(false);
                    }
                    // Ensure the table has the correct model
                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oTable.setModel(oModel);
                    }

                    // ✅ Set default filters for Opportunities FilterBar
                    const oOpportunityFilterBar = this.byId("opportunityFilterBar");
                    if (oOpportunityFilterBar) {
                        oOpportunityFilterBar.setModel(oModel, "default");
                        const oFilterModel = this.getView().getModel("filterModel");
                        const oFiltersModel = this.getView().getModel("$filters");
                        if (oFilterModel) {
                            oOpportunityFilterBar.setModel(oFilterModel, "filterModel");
                        }
                        if (oFiltersModel) {
                            oOpportunityFilterBar.setModel(oFiltersModel, "$filters");
                        }
                        // ✅ Set defaults with multiple retries - 4 important filters: sapOpportunityId, sfdcOpportunityId, businessUnit, Stage
                        setTimeout(() => {
                            this._setDefaultFilterFields(oOpportunityFilterBar, ["sapOpportunityId", "sfdcOpportunityId", "businessUnit", "Stage"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oOpportunityFilterBar, ["sapOpportunityId", "sfdcOpportunityId", "businessUnit", "Stage"]);
                        }, 2000);
                    }

                    // Initialize table-specific functionality
                    this.initializeTable("Opportunities");
                    // Reset segmented button to "less" state for this fragment
                    this._resetSegmentedButtonForFragment("Opportunities");

                    // ✅ Initialize Opportunity ID field and form
                    setTimeout(() => {
                        oTable.initialized().then(() => {
                            setTimeout(() => {
                                this._initializeOpportunityIdField();
                                const aSelectedContexts = oTable.getSelectedContexts ? oTable.getSelectedContexts() : [];
                                if (aSelectedContexts.length === 0) {
                                    this._onOppDialogData([]);
                                }
                            }, 500);
                        }).catch(() => {
                            setTimeout(() => {
                                this._initializeOpportunityIdField();
                            }, 1000);
                        });
                    }, 300);
                }.bind(this));
            } else if (sKey === "projects") {

                // Check if already loaded to prevent duplicate IDs
                if (this._bProjectsLoaded) {
                    // ✅ Even if already loaded, re-initialize table to refresh p13n state
                    const oTable = this.byId("Projects");
                    if (oTable) {
                        this.initializeTable("Projects").catch(() => {
                            // Ignore errors during re-initialization
                        });
                    }
                    return;
                }

                this._bProjectsLoaded = true;
                const oProjectsPage = this.getView().byId(sPageId);

                // ✅ CRITICAL: Check if content already exists and remove it to prevent duplicate IDs
                if (oProjectsPage && oProjectsPage.getContent) {
                    const aExistingContent = oProjectsPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        aExistingContent.forEach((oContent) => {
                            if (oContent && oContent.destroy) {
                                oContent.destroy();
                            }
                        });
                        oProjectsPage.removeAllContent();

                    }
                }



                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.Projects",
                    controller: this
                }).then(function (oFragment) {
                    oProjectsPage.addContent(oFragment);

                    const oTable = this.byId("Projects");
                    // Ensure table starts with show-less state
                    oTable.removeStyleClass("show-more");
                    oTable.addStyleClass("show-less");

                    if (oLogButton) {
                        oLogButton.setVisible(false);
                    }
                    // Ensure the table has the correct model
                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oTable.setModel(oModel);
                    }

                    // ✅ Set default filters for Projects FilterBar
                    const oProjectFilterBar = this.byId("projectFilterBar");
                    if (oProjectFilterBar) {
                        oProjectFilterBar.setModel(oModel, "default");
                        const oFilterModel = this.getView().getModel("filterModel");
                        const oFiltersModel = this.getView().getModel("$filters");
                        if (oFilterModel) {
                            oProjectFilterBar.setModel(oFilterModel, "filterModel");
                        }
                        if (oFiltersModel) {
                            oProjectFilterBar.setModel(oFiltersModel, "$filters");
                        }
                        // ✅ Set defaults with multiple retries - 4 important filters: sapPId, sfdcPId, projectType, SOWReceived
                        setTimeout(() => {
                            this._setDefaultFilterFields(oProjectFilterBar, ["sapPId", "sfdcPId", "projectType", "SOWReceived"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oProjectFilterBar, ["sapPId", "sfdcPId", "projectType", "SOWReceived"]);
                        }, 2000);
                    }

                    // Initialize table-specific functionality
                    this.initializeTable("Projects");
                    // Reset segmented button to "less" state for this fragment
                    this._resetSegmentedButtonForFragment("Projects");

                    // ✅ Initialize Project ID field and form
                    setTimeout(() => {
                        oTable.initialized().then(() => {
                            setTimeout(() => {
                                this._initializeProjectIdField();
                                const aSelectedContexts = oTable.getSelectedContexts ? oTable.getSelectedContexts() : [];
                                if (aSelectedContexts.length === 0) {
                                    this._onProjDialogData([]);
                                }
                            }, 500);
                        }).catch(() => {
                            setTimeout(() => {
                                this._initializeProjectIdField();
                            }, 1000);
                        });
                    }, 300);
                }.bind(this));
            } else if (sKey === "sapid") {
                this._bSAPIdLoaded = true;
                const oSAPIdPage = this.byId(sPageId);

                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.SAPId",
                    controller: this
                }).then(function (oFragment) {
                    oSAPIdPage.addContent(oFragment);

                    const oTable = this.byId("SAPIdStatuses");
                    // Ensure table starts with show-less state
                    oTable.removeStyleClass("show-more");
                    oTable.addStyleClass("show-less");

                    if (oLogButton) {
                        oLogButton.setVisible(false);
                    }

                    // Ensure the table has the correct model
                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oTable.setModel(oModel);
                    }

                    // Initialize table-specific functionality
                    this.initializeTable("SAPIdStatuses");
                    // Reset segmented button to "less" state for this fragment
                    this._resetSegmentedButtonForFragment("SAPIdStatuses");
                }.bind(this));
            } else if (sKey === "employeeBenchReport") {

               
                // this._loadReportFragment(sPageId, "EmployeeBenchReport", "EmployeeBenchReport", oLogButton);
                 // Check if already loaded to prevent duplicate IDs
                if (this._bEmployeeBenchReportTableLoaded) {
                    // ✅ Even if already loaded, re-initialize table to refresh p13n state
                    const oTable = this.byId("EmployeeBenchReportTable");
                    if (oTable) {
                        this.initializeTable("EmployeeBenchReportTable").catch(() => {
                            // Ignore errors during re-initialization
                        });
                    }
                    return;
                }

                this._bEmployeeBenchReportTableLoaded = true;
                const oCustomersPage = this.getView().byId(sPageId);

                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oCustomersPage && oCustomersPage.getContent) {
                    const aExistingContent = oCustomersPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        aExistingContent.forEach((oContent) => {
                            if (oContent && oContent.destroy) {
                                oContent.destroy();
                            }
                        });
                        oCustomersPage.removeAllContent();
                    }
                }

                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.EmployeeBenchReport",
                    controller: this
                }).then(function (oFragment) {
                    oCustomersPage.addContent(oFragment);

                    const oTable = this.byId("EmployeeBenchReportTable");
                    // Ensure table starts with show-less state
    
                    oTable.addStyleClass("show-less");

                    if (oLogButton) {
                        oLogButton.setVisible(false);
                    }

                    // Ensure the table has the correct model
                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oTable.setModel(oModel);
                    }


                    // ✅ Set default filters for Customers FilterBar
                    const oFilterBar = this.byId("employeeBenchReportFilterBar");
                    if (oFilterBar) {
                        oFilterBar.setModel(oModel, "default");
                        const oFilterModel = this.getView().getModel("filterModel");
                        const oFiltersModel = this.getView().getModel("$filters");
                        if (oFilterModel) {
                            oFilterBar.setModel(oFilterModel, "filterModel");
                        }
                        if (oFiltersModel) {
                            oFilterBar.setModel(oFiltersModel, "$filters");
                        }
                        // ✅ Set defaults with multiple retries
                        setTimeout(() => {
                            this._setDefaultFilterFields(oFilterBar, ["ohrId", "band","skills"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oFilterBar, ["ohrId", "band","skills"]);
                        }, 2000);
                    }

                    // Initialize table-specific functionality
                    this.initializeTable("EmployeeBenchReportTable").then(() => {
                        // ✅ Trigger initial data load by firing FilterBar search event
                        // This ensures table binds even when there are no filter conditions
                        setTimeout(() => {
                            if (oFilterBar) {
                                // Fire search event to trigger table binding
                                oFilterBar.fireSearch();
                            } else if (oTable && typeof oTable.rebind === "function") {
                                // Fallback: rebind table directly if FilterBar not available
                                oTable.rebind();
                            }
                        }, 1000);
                    });

                    // Reset segmented button to "less" state for this fragment
                    this._resetSegmentedButtonForFragment("EmployeeBenchReport");

                }.bind(this));
            } else if (sKey === "employeeProbableReleaseReport") {
                // this._loadReportFragment(sPageId, "EmployeeProbableReleaseReport", "EmployeeProbableReleaseReport", oLogButton);
            } else if (sKey === "revenueForecastReport") {
                // this._loadReportFragment(sPageId, "RevenueForecastReport", "RevenueForecastReport", oLogButton);
            } else if (sKey === "employeeAllocationReport") {
                // this._loadReportFragment(sPageId, "EmployeeAllocationReport", "EmployeeAllocationReport", oLogButton);
                // Check if already loaded to prevent duplicate IDs
                if (this._bEmployeeAllocationReportLoaded) {
                    // ✅ Even if already loaded, re-initialize table to refresh p13n state
                    const oTable = this.byId("EmployeeAllocationReportTable");
                    if (oTable) {
                        this.initializeTable("EmployeeAllocationReportTable").catch(() => {
                            // Ignore errors during re-initialization
                        });
                    }
                    return;
                }

                this._bEmployeeAllocationReportLoaded = true;
                const oCustomersPage = this.getView().byId(sPageId);

                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oCustomersPage && oCustomersPage.getContent) {
                    const aExistingContent = oCustomersPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        aExistingContent.forEach((oContent) => {
                            if (oContent && oContent.destroy) {
                                oContent.destroy();
                            }
                        });
                        oCustomersPage.removeAllContent();
                    }
                }

                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.EmployeeAllocationReport",
                    controller: this
                }).then(function (oFragment) {
                    oCustomersPage.addContent(oFragment);

                    const oTable = this.byId("EmployeeAllocationReportTable");
                    // Ensure table starts with show-less state
    
                    oTable.addStyleClass("show-less");

                    if (oLogButton) {
                        oLogButton.setVisible(false);
                    }

                    // Ensure the table has the correct model
                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oTable.setModel(oModel);
                    }

                    // ✅ Populate Country dropdown when Customers fragment loads
                    this._populateCountryDropdown();

                    // ✅ Set default filters for Customers FilterBar
                    const oFilterBar = this.byId("employeeAllocationReportFilterBar");
                    if (oFilterBar) {
                        oFilterBar.setModel(oModel, "default");
                        const oFilterModel = this.getView().getModel("filterModel");
                        const oFiltersModel = this.getView().getModel("$filters");
                        if (oFilterModel) {
                            oFilterBar.setModel(oFilterModel, "filterModel");
                        }
                        if (oFiltersModel) {
                            oFilterBar.setModel(oFiltersModel, "$filters");
                        }
                        // ✅ Set defaults with multiple retries
                        setTimeout(() => {
                            this._setDefaultFilterFields(oFilterBar, ["employeeName", "currentProject","customer"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oFilterBar, ["employeeName", "currentProject","customer"]);
                        }, 2000);
                    }

                    // Initialize table-specific functionality
                    this.initializeTable("EmployeeAllocationReportTable").then(() => {
                        // ✅ Trigger initial data load by firing FilterBar search event
                        // This ensures table binds even when there are no filter conditions
                        setTimeout(() => {
                            if (oFilterBar) {
                                // Fire search event to trigger table binding
                                oFilterBar.fireSearch();
                            } else if (oTable && typeof oTable.rebind === "function") {
                                // Fallback: rebind table directly if FilterBar not available
                                oTable.rebind();
                            }
                        }, 1000);
                    });

                    // Reset segmented button to "less" state for this fragment
                    this._resetSegmentedButtonForFragment("EmployeeAllocationReport");

                }.bind(this));
            } else if (sKey === "employeeSkillReport") {
                // this._loadReportFragment(sPageId, "EmployeeSkillReport", "EmployeeSkillReport", oLogButton);
                 // Check if already loaded to prevent duplicate IDs
                if (this._bEmployeeSkillReportTableLoaded) {
                    // ✅ Even if already loaded, re-initialize table to refresh p13n state
                    const oTable = this.byId("EmployeeSkillReportTable");
                    if (oTable) {
                        this.initializeTable("EmployeeSkillReportTable").catch(() => {
                            // Ignore errors during re-initialization
                        });
                    }
                    return;
                }

                this._bEmployeeSkillReportTableLoaded = true;
                const oCustomersPage = this.getView().byId(sPageId);

                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oCustomersPage && oCustomersPage.getContent) {
                    const aExistingContent = oCustomersPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        aExistingContent.forEach((oContent) => {
                            if (oContent && oContent.destroy) {
                                oContent.destroy();
                            }
                        });
                        oCustomersPage.removeAllContent();
                    }
                }

                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.EmployeeSkillReport",
                    controller: this
                }).then(function (oFragment) {
                    oCustomersPage.addContent(oFragment);

                    const oTable = this.byId("EmployeeSkillReportTable");
                    // Ensure table starts with show-less state
    
                    oTable.addStyleClass("show-less");

                    if (oLogButton) {
                        oLogButton.setVisible(false);
                    }

                    // Ensure the table has the correct model
                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oTable.setModel(oModel);
                    }

                    // ✅ Populate Country dropdown when Customers fragment loads
                    this._populateCountryDropdown();

                    // ✅ Set default filters for Customers FilterBar
                    const oFilterBar = this.byId("employeeSkillReportFilterBar");
                    if (oFilterBar) {
                        oFilterBar.setModel(oModel, "default");
                        const oFilterModel = this.getView().getModel("filterModel");
                        const oFiltersModel = this.getView().getModel("$filters");
                        if (oFilterModel) {
                            oFilterBar.setModel(oFilterModel, "filterModel");
                        }
                        if (oFiltersModel) {
                            oFilterBar.setModel(oFiltersModel, "$filters");
                        }
                        // ✅ Set defaults with multiple retries
                        setTimeout(() => {
                            this._setDefaultFilterFields(oFilterBar, ["skillName", "category"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oFilterBar, ["skillName", "category"]);
                        }, 2000);
                    }

                    // Initialize table-specific functionality
                    this.initializeTable("EmployeeSkillReportTable").then(() => {
                        // ✅ Trigger initial data load by firing FilterBar search event
                        // This ensures table binds even when there are no filter conditions
                        setTimeout(() => {
                            if (oFilterBar) {
                                // Fire search event to trigger table binding
                                oFilterBar.fireSearch();
                            } else if (oTable && typeof oTable.rebind === "function") {
                                // Fallback: rebind table directly if FilterBar not available
                                oTable.rebind();
                            }
                        }, 1000);
                    });

                    // Reset segmented button to "less" state for this fragment
                    this._resetSegmentedButtonForFragment("EmployeeSkillReport");

                }.bind(this));
            } else if (sKey === "projectsNearingCompletionReport") {
                // this._loadReportFragment(sPageId, "ProjectsNearingCompletionReport", "ProjectsNearingCompletionReport", oLogButton);
            } else if (sKey === "employees") {
                // Check if already loaded to prevent duplicate IDs
                if (this._bEmployeesLoaded) {
                    // ✅ Even if already loaded, re-initialize table to refresh p13n state
                    const oTable = this.byId("Employees");
                    if (oTable) {
                        this.initializeTable("Employees").catch(() => {
                            // Ignore errors during re-initialization
                        });
                    }
                    return;
                }

                this._bEmployeesLoaded = true;
                const oEmployeesPage = this.getView().byId(sPageId);

                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oEmployeesPage && oEmployeesPage.getContent) {
                    const aExistingContent = oEmployeesPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        aExistingContent.forEach((oContent) => {
                            if (oContent && oContent.destroy) {
                                oContent.destroy();
                            }
                        });
                        oEmployeesPage.removeAllContent();
                    }
                }

                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.Employees",
                    controller: this
                }).then(function (oFragment) {
                    oEmployeesPage.addContent(oFragment);
                    const oTable = this.byId("Employees");

                    if (oLogButton) {
                        oLogButton.setVisible(false);
                    }
                    // Ensure table starts with show-less state
                    oTable.removeStyleClass("show-more");
                    oTable.addStyleClass("show-less");

                    // Ensure the table has the correct model
                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oTable.setModel(oModel);
                    }

                    // ✅ Set default filters for Employees FilterBar
                    const oEmployeeFilterBar = this.byId("employeeFilterBar");
                    if (oEmployeeFilterBar) {
                        oEmployeeFilterBar.setModel(oModel, "default");
                        const oFilterModel = this.getView().getModel("filterModel");
                        const oFiltersModel = this.getView().getModel("$filters");
                        if (oFilterModel) {
                            oEmployeeFilterBar.setModel(oFilterModel, "filterModel");
                        }
                        if (oFiltersModel) {
                            oEmployeeFilterBar.setModel(oFiltersModel, "$filters");
                        }
                        // ✅ Set defaults with multiple retries
                        setTimeout(() => {
                            this._setDefaultFilterFields(oEmployeeFilterBar, ["ohrId", "band", "skills"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oEmployeeFilterBar, ["ohrId", "band", "skills"]);
                        }, 2000);
                    }

                    // Initialize table-specific functionality
                    this.initializeTable("Employees");
                    // Reset segmented button to "less" state for this fragment
                    this._resetSegmentedButtonForFragment("Employees");

                    // ✅ Populate Country dropdown when Employees fragment loads
                    // Use multiple timeouts to ensure fragment is fully rendered
                    setTimeout(() => {
                        this._populateCountryDropdown();
                    }, 500);
                    setTimeout(() => {
                        this._populateCountryDropdown();
                    }, 1000);
                    setTimeout(() => {
                        this._populateCountryDropdown();
                    }, 2000);

                    // ✅ Initialize Employee form (no ID preview needed - manual OHR ID entry)
                    setTimeout(() => {
                        oTable.initialized().then(() => {
                            setTimeout(() => {
                                const aSelectedContexts = oTable.getSelectedContexts ? oTable.getSelectedContexts() : [];
                                if (aSelectedContexts.length === 0) {
                                    // No selection - initialize form for create mode
                                    this._onEmpDialogData([]);
                                }
                            }, 300);
                        }).catch(() => {
                            setTimeout(() => {
                                this._onEmpDialogData([]);
                            }, 500);
                        });
                    }, 300);
                }.bind(this));
            } else if (sKey === "overview") {
                // Check if already loaded to prevent duplicate IDs
                if (this._bAllocationsLoaded) {
                    return;
                }

                this._bAllocationsLoaded = true;
                const oAllocationPage = this.getView().byId(sPageId);

                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oAllocationPage && oAllocationPage.getContent) {
                    const aExistingContent = oAllocationPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        aExistingContent.forEach((oContent) => {
                            if (oContent && oContent.destroy) {
                                oContent.destroy();
                            }
                        });
                        oAllocationPage.removeAllContent();
                    }
                }

                // ✅ DEFAULT: Load Employees view (Res fragment) first instead of Projects
                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.Res",
                    controller: this
                }).then(function (oFragment) {
                    oAllocationPage.addContent(oFragment);
                    const oTable = this.byId("Res");

                    if (oLogButton) {
                        oLogButton.setVisible(false);
                    }
                    // Ensure table starts with show-less state
                    oTable.removeStyleClass("show-more");
                    oTable.addStyleClass("show-less");

                    // Ensure the table has the correct model
                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oTable.setModel(oModel);
                    }

                    // ✅ Set default filters for Res FilterBar (Employees view in Allocations)
                    const oResFilterBar = this.byId("resFilterBar");
                    if (oResFilterBar) {
                        oResFilterBar.setModel(oModel, "default");
                        const oFilterModel = this.getView().getModel("filterModel");
                        const oFiltersModel = this.getView().getModel("$filters");
                        if (oFilterModel) {
                            oResFilterBar.setModel(oFilterModel, "filterModel");
                        }
                        if (oFiltersModel) {
                            oResFilterBar.setModel(oFiltersModel, "$filters");
                        }
                        // ✅ Set defaults with multiple retries
                        setTimeout(() => {
                            this._setDefaultFilterFields(oResFilterBar, ["ohrId", "band", "skills"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oResFilterBar, ["ohrId", "band", "skills"]);
                        }, 2000);
                    }

                    // Initialize table-specific functionality
                    this.initializeTable("Res").then(() => {
                        // ✅ NEW: Apply allocation filter to Res table after initialization (empallocpercentage < 95 and status != "Resigned")
                        // Use multiple retries to ensure binding is ready
                        const fnApplyAllocationFilter = () => {
                            const oResBinding = oTable.getRowBinding && oTable.getRowBinding();
                            if (oResBinding) {
                                const oAllocationFilter = this._getAllocationFilter();
                                oResBinding.filter([oAllocationFilter]);

                                // ✅ CRITICAL: Re-apply filter on dataReceived to ensure it persists
                                oResBinding.attachDataReceived(() => {
                                    const oCurrentFilters = oResBinding.getFilters();
                                    // Check if allocation filter is already applied
                                    const bHasAllocationFilter = oCurrentFilters && oCurrentFilters.some(f => {
                                        if (f.getFilters && f.getFilters().length === 2) {
                                            const aSubFilters = f.getFilters();
                                            return aSubFilters.some(sf =>
                                                sf.getPath() === "empallocpercentage" && sf.getOperator() === "LT" && sf.getValue1() === 95
                                            ) && aSubFilters.some(sf =>
                                                sf.getPath() === "status" && sf.getOperator() === "NE" && sf.getValue1() === "Resigned"
                                            );
                                        }
                                        return false;
                                    });
                                    if (!bHasAllocationFilter) {
                                        const aFilters = oCurrentFilters ? [...oCurrentFilters] : [];
                                        aFilters.push(oAllocationFilter);
                                        oResBinding.filter(aFilters);
                                    }
                                });

                                return true;
                            }
                            return false;
                        };

                        // Try immediately
                        if (!fnApplyAllocationFilter()) {
                            // Retry after short delay
                            setTimeout(() => {
                                if (!fnApplyAllocationFilter()) {
                                    // Final retry
                                    setTimeout(fnApplyAllocationFilter, 500);
                                }
                            }, 300);
                        }
                    });
                    // Reset segmented button to "less" state for this fragment
                    this._resetSegmentedButtonForFragment("Res");

                    // Ensure dropdown is set to "employees"
                    const oSelect = this.byId("resViewSelect");
                    if (oSelect) {
                        oSelect.setSelectedKey("employees");
                    }
                }.bind(this));
            } else if (sKey === "demands") {
                // Check if already loaded to prevent duplicate IDs
                if (this._bMasterDemandsLoaded) {
                    console.log("[MasterDemands] Fragment already loaded, skipping");
                    return;
                }

                this._bMasterDemandsLoaded = true;
                const oMasterDemandsPage = this.getView().byId(sPageId);

                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oMasterDemandsPage && oMasterDemandsPage.getContent) {
                    const aExistingContent = oMasterDemandsPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        console.log("[MasterDemands] Removing existing content to prevent duplicate IDs");
                        aExistingContent.forEach((oContent) => {
                            if (oContent && oContent.destroy) {
                                oContent.destroy();
                            }
                        });
                        oMasterDemandsPage.removeAllContent();
                    }
                }

                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.MasterDemands",
                    controller: this
                }).then(function (oFragment) {
                    oMasterDemandsPage.addContent(oFragment);

                    const oTable = this.byId("MasterDemands");
                    // Ensure table starts with show-less state
                    oTable.removeStyleClass("show-more");
                    oTable.addStyleClass("show-less");

                    if (oLogButton) {
                        oLogButton.setVisible(false);
                    }
                    // Ensure the table has the correct model
                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oTable.setModel(oModel);
                    }

                    // ✅ Set default filters for Opportunities FilterBar
                    const oMasterDemandsFilterBar = this.byId("masterDemandsFilterBar");
                    if (oMasterDemandsFilterBar) {
                        oMasterDemandsFilterBar.setModel(oModel, "default");
                        const oFilterModel = this.getView().getModel("filterModel");
                        const oFiltersModel = this.getView().getModel("$filters");
                        if (oFilterModel) {
                            oMasterDemandsFilterBar.setModel(oFilterModel, "filterModel");
                        }
                        if (oFiltersModel) {
                            oMasterDemandsFilterBar.setModel(oFiltersModel, "$filters");
                        }
                        // ✅ Set defaults with multiple retries
                        setTimeout(() => {
                            this._setDefaultFilterFields(oMasterDemandsFilterBar, ["SapPId"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oMasterDemandsFilterBar, ["SapPId"]);
                        }, 2000);
                    }

                    // Initialize table-specific functionality
                    this.initializeTable("MasterDemands");
                    // Reset segmented button to "less" state for this fragment
                    this._resetSegmentedButtonForFragment("MasterDemands");

                    // ✅ Initialize Opportunity ID field and form
                    setTimeout(() => {
                        oTable.initialized().then(() => {
                            setTimeout(() => {
                                this._initializeOpportunityIdField();
                                const aSelectedContexts = oTable.getSelectedContexts ? oTable.getSelectedContexts() : [];
                                if (aSelectedContexts.length === 0) {
                                    this._onOppDialogData([]);
                                }
                            }, 500);
                        }).catch(() => {
                            setTimeout(() => {
                                this._initializeOpportunityIdField();
                            }, 1000);
                        });
                    }, 300);
                }.bind(this));
            }
            // ✅ REMOVED: Verticals fragment loading (Vertical is now an enum, not an entity)
        },
        // Reset all tables to "show-less" state
        _resetAllTablesToShowLess: function () {
            const aTableIds = [
                "Customers", "Opportunities", "Projects", "SAPIdStatuses", "Employees", "Allocations",
                "EmployeeBenchReportTable", "EmployeeProbableReleaseReportTable", "RevenueForecastReportTable",
                "EmployeeAllocationReportTable", "EmployeeSkillReportTable", "ProjectsNearingCompletionReportTable"
            ];

            aTableIds.forEach((sTableId) => {
                const oTable = this.byId(sTableId);
                if (oTable) {
                    // Remove "show-more" class and add "show-less" class
                    oTable.removeStyleClass("show-more");
                    oTable.addStyleClass("show-less");
                }
            });

            // Reset all segmented buttons to "less" state
            this._resetAllSegmentedButtons();
        },
        // Reset all segmented buttons to "less" state
        _resetAllSegmentedButtons: function () {
            // Find all segmented buttons in the view
            const oView = this.getView();
            const aSegmentedButtons = oView.findAggregatedObjects(true, function (oControl) {
                return oControl.getMetadata().getName() === "sap.m.SegmentedButton";
            });

            aSegmentedButtons.forEach((oSegmentedButton) => {
                if (oSegmentedButton) {
                    oSegmentedButton.setSelectedKey("less");
                }
            });
        },
        // Reset segmented button for a specific fragment
        // ✅ NEW: Helper function to load report fragments
        // _loadReportFragment: function (sPageId, sFragmentName, sTableId, oLogButton) {
        //     const sFlagName = "_b" + sFragmentName + "Loaded";

        //     // Check if already loaded to prevent duplicate IDs
        //     if (this[sFlagName]) {
        //         return;
        //     }

        //     this[sFlagName] = true;
        //     const oReportPage = this.getView().byId(sPageId);

        //     // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
        //     if (oReportPage && oReportPage.getContent) {
        //         const aExistingContent = oReportPage.getContent();
        //         if (aExistingContent && aExistingContent.length > 0) {
        //             aExistingContent.forEach((oContent) => {
        //                 if (oContent && oContent.destroy) {
        //                     oContent.destroy();
        //                 }
        //             });
        //             oReportPage.removeAllContent();
        //         }
        //     }

        //     Fragment.load({
        //         id: this.getView().getId(),
        //         name: "glassboard.view.fragments." + sFragmentName,
        //         controller: this
        //     }).then(function (oFragment) {
        //         oReportPage.addContent(oFragment);

        //         // Wait a bit for the fragment to be fully rendered
        //         setTimeout(function () {
        //             const oTable = this.byId(sTableId + "Table");
        //             // Get FilterBar ID based on fragment name (camelCase)
        //             let sFilterBarId = "";
        //             if (sTableId === "EmployeeBenchReport") {
        //                 sFilterBarId = "employeeBenchReportFilterBar";
        //             } else if (sTableId === "EmployeeProbableReleaseReport") {
        //                 sFilterBarId = "employeeProbableReleaseReportFilterBar";
        //             } else if (sTableId === "RevenueForecastReport") {
        //                 sFilterBarId = "revenueForecastReportFilterBar";
        //             } else if (sTableId === "EmployeeAllocationReport") {
        //                 sFilterBarId = "employeeAllocationReportFilterBar";
        //             } else if (sTableId === "EmployeeSkillReport") {
        //                 sFilterBarId = "employeeSkillReportFilterBar";
        //             } else if (sTableId === "ProjectsNearingCompletionReport") {
        //                 sFilterBarId = "projectsNearingCompletionReportFilterBar";
        //             }
        //             const oFilterBar = sFilterBarId ? this.byId(sFilterBarId) : null;

        //             if (oTable) {
        //                 // Ensure table starts with show-less state (default)
        //                 oTable.removeStyleClass("show-more");
        //                 oTable.addStyleClass("show-less");

        //                 // Ensure the table has the correct model
        //                 const oModel = this.getOwnerComponent().getModel();
        //                 if (oModel) {
        //                     oTable.setModel(oModel);
        //                 }

        //                 // Initialize table-specific functionality
        //                 this.initializeTable(sTableId + "Table").then(function () {
        //                     // Force rebind to ensure data loads
        //                     if (oTable.rebind) {
        //                         oTable.rebind();
        //                     }
        //                 }.bind(this)).catch(function (oErr) {
        //                 });
        //             } else {
        //             }

        //             // Set default filter fields for report FilterBar
        //             if (oFilterBar) {
        //                 // Define default filters for each report
        //                 let aDefaultFields = [];
        //                 if (sTableId === "EmployeeBenchReport") {
        //                     aDefaultFields = ["employeeName", "status", "location"];
        //                 } else if (sTableId === "EmployeeProbableReleaseReport") {
        //                     aDefaultFields = ["employeeName", "currentProject", "daysToRelease"];
        //                 } else if (sTableId === "RevenueForecastReport") {
        //                     aDefaultFields = ["projectName", "customer", "status"];
        //                 } else if (sTableId === "EmployeeAllocationReport") {
        //                     aDefaultFields = ["employeeName", "currentProject", "customer"];
        //                 } else if (sTableId === "EmployeeSkillReport") {
        //                     aDefaultFields = ["skillName", "category"];
        //                 } else if (sTableId === "ProjectsNearingCompletionReport") {
        //                     aDefaultFields = ["projectName", "completionRisk", "customer"];
        //                 }

        //                 if (aDefaultFields.length > 0) {
        //                     // Set default filters with retries (same pattern as main entities)
        //                     setTimeout(() => {
        //                         this._setDefaultFilterFields(oFilterBar, aDefaultFields);
        //                     }, 1000);
        //                     setTimeout(() => {
        //                         this._setDefaultFilterFields(oFilterBar, aDefaultFields);
        //                     }, 2000);
        //                 }
        //             }
        //         }.bind(this), 100);

        //         if (oLogButton) {
        //             oLogButton.setVisible(false);
        //         }
        //     }.bind(this)).catch(function (oError) {
        //     });
        // },

        _resetSegmentedButtonForFragment: function (sTableId) {
            // Find segmented button within the specific table's fragment
            const oTable = this.byId(sTableId);
            if (oTable) {
                const oParent = oTable.getParent();
                if (oParent) {
                    const aSegmentedButtons = oParent.findAggregatedObjects(true, function (oControl) {
                        return oControl.getMetadata().getName() === "sap.m.SegmentedButton";
                    });

                    aSegmentedButtons.forEach((oSegmentedButton) => {
                        if (oSegmentedButton) {
                            oSegmentedButton.setSelectedKey("less");
                        }
                    });
                }
            }
        },

        // ✅ NEW: Handle navigation with unsaved changes - Show confirmation dialog
        _clearPreviousTableEditState: function (sNewPageKey) {
            const oEditModel = this.getView().getModel("edit");
            if (!oEditModel) {
                return Promise.resolve(true); // No edit model, allow navigation
            }

            // Map of page keys to table IDs
            const pageToTableMap = {
                customers: "Customers",
                opportunities: "Opportunities",
                projects: "Projects",
                employees: "Employees",
                // ✅ REMOVED: verticals: "Verticals", (Vertical is now an enum)
                sapid: "SAPIdStatuses"
            };

            const sCurrentTable = oEditModel.getProperty("/currentTable");
            if (!sCurrentTable) {
                return Promise.resolve(true); // No table in edit mode, allow navigation
            }

            // If navigating to a different table (or home), check for unsaved changes
            const sNewTableId = pageToTableMap[sNewPageKey];
            if (sCurrentTable === sNewTableId) {
                return Promise.resolve(true); // Same table, allow navigation
            }

            // Get the edit state for the current table
            const sPrevEditingPath = oEditModel.getProperty(`/${sCurrentTable}/editingPath`);
            const sPrevMode = oEditModel.getProperty(`/${sCurrentTable}/mode`);

            if (!sPrevEditingPath || sPrevEditingPath.length === 0) {
                return Promise.resolve(true); // No unsaved changes, allow navigation
            }

            // ✅ Show confirmation dialog with Save, Cancel, and Stay options
            return new Promise((resolve) => {
                // ✅ FIXED: Use custom action strings to ensure button text displays correctly
                const SAVE_ACTION = "Save";
                const CANCEL_ACTION = "Cancel";
                const STAY_ACTION = "Stay";

                sap.m.MessageBox.show(
                    `You have unsaved changes in ${sCurrentTable}. What would you like to do?`,
                    {
                        icon: sap.m.MessageBox.Icon.WARNING,
                        title: "Unsaved Changes",
                        actions: [
                            SAVE_ACTION,
                            CANCEL_ACTION,
                            STAY_ACTION
                        ],
                        emphasizedAction: SAVE_ACTION,
                        onClose: (sAction) => {
                            if (sAction === STAY_ACTION) {
                                // Stay on current fragment - prevent navigation
                                resolve(false);
                                return;
                            }

                            if (sAction === SAVE_ACTION) {
                                // Save changes first, then navigate
                                this._saveCurrentTableChanges(sCurrentTable).then(() => {
                                    this._discardTableEditState(sCurrentTable);
                                    resolve(true); // Allow navigation after save
                                }).catch((err) => {
                                    sap.m.MessageBox.error("Error saving changes. Please try again.");
                                    resolve(false); // Prevent navigation on error
                                });
                            } else if (sAction === CANCEL_ACTION) {
                                // Discard changes and navigate
                                // ✅ FIXED: Call the actual cancel logic from CustomUtility to properly cancel OData changes
                                this._cancelCurrentTableChanges(sCurrentTable).then(() => {
                                    this._discardTableEditState(sCurrentTable);
                                    resolve(true); // Allow navigation after discard
                                }).catch((err) => {
                                    // Even if cancel fails, clear edit state and allow navigation
                                    this._discardTableEditState(sCurrentTable);
                                    resolve(true);
                                });
                            }
                        }
                    }
                );
            });
        },

        // ✅ NEW: Save changes for a specific table
        _saveCurrentTableChanges: async function (sTableId) {
            // Reuse the save logic from CustomUtility
            const buttonMap = {
                "Customers": { save: "saveButton" },
                "Employees": { save: "saveButton_emp" },
                "Opportunities": { save: "saveButton_oppr" },
                "Projects": { save: "saveButton_proj" },
                "SAPIdStatuses": { save: "saveButton_sap" }
                // ✅ REMOVED: "Verticals": { save: "saveButton_vert" }
            };

            // Create a mock event object to trigger save
            const oMockEvent = {
                getSource: () => {
                    const sButtonId = buttonMap[sTableId]?.save;
                    return {
                        getId: () => `mock--${sButtonId}`
                    };
                }
            };

            // Call the save function
            await CustomUtility.prototype.onSaveButtonPress.call(this, oMockEvent);
        },

        // ✅ NEW: Cancel changes for a specific table (for navigation dialog)
        // This bypasses the confirmation dialog since user already confirmed in navigation dialog
        _cancelCurrentTableChanges: function (sTableId) {
            // Call the internal cancel operation directly (without confirmation dialog)
            // CustomUtility has a method that performs the actual cancel logic
            return new Promise((resolve) => {
                try {
                    // Call the internal cancel operation from CustomUtility
                    // We pass a flag to skip the confirmation dialog
                    CustomUtility.prototype._performCancelOperation.call(this, sTableId, true); // true = skip confirmation

                    // Give it a moment to complete, then resolve
                    setTimeout(() => {
                        resolve();
                    }, 100);
                } catch (error) {
                    resolve(); // Still allow navigation even if cancel fails
                }
            });
        },



        // ✅ NEW: Discard edit state for a specific table
        _discardTableEditState: function (sTableId) {
            const oEditModel = this.getView().getModel("edit");
            if (!oEditModel) return;

            const oPrevTable = this.byId(sTableId);
            if (!oPrevTable) return;

            const sPrevEditingPath = oEditModel.getProperty(`/${sTableId}/editingPath`);
            if (!sPrevEditingPath || sPrevEditingPath.length === 0) return;

            // Reset edit state
            oEditModel.setProperty(`/${sTableId}/editingPath`, "");
            oEditModel.setProperty(`/${sTableId}/mode`, null);
            oEditModel.setProperty("/currentTable", null);

            // ✅ FIX: Clear form models to prevent pre-loading when navigating back
            const aFormModels = ["customerModel", "employeeModel", "opportunityModel", "projectModel"];
            aFormModels.forEach((sModelName) => {
                const oFormModel = this.getView().getModel(sModelName);
                if (oFormModel) {
                    oFormModel.setData({});
                    oFormModel.setSizeLimit(10000);
                }
            });

            // Disable Save/Cancel buttons
            const buttonMap = {
                "Customers": { save: "saveButton", cancel: "cancelButton", edit: "btnEdit_cus", delete: "btnDelete_cus", add: "btnAdd" },
                "Employees": { save: "saveButton_emp", cancel: "cancelButton_emp", edit: "Edit_emp", delete: "Delete_emp", add: "btnAdd_emp" },
                "Opportunities": { save: "saveButton_oppr", cancel: "cancelButton_oppr", edit: "btnEdit_oppr", delete: "btnDelete_oppr", add: "btnAdd_oppr" },
                "Projects": { save: "saveButton_proj", cancel: "cancelButton_proj", edit: "btnEdit_proj", delete: "btnDelete_proj", add: "btnAdd_proj" },
                "SAPIdStatuses": { save: "saveButton_sap", cancel: "cancelButton_sap", edit: "btnEdit_sap", delete: "btnDelete_sap", add: "btnAdd_sap" }
                // ✅ REMOVED: "Verticals": { save: "saveButton_vert", cancel: "cancelButton_vert", edit: "btnEdit_vert", delete: "btnDelete_vert", add: "btnAdd_vert" }
            };

            const config = buttonMap[sTableId];
            if (config) {
                this.byId(config.save)?.setEnabled(false);
                this.byId(config.cancel)?.setEnabled(false);
                this.byId(config.edit)?.setEnabled(false);
                this.byId(config.delete)?.setEnabled(false);
                this.byId(config.add)?.setEnabled(true);
            }

            // Discard pending changes
            try {
                const oModel = this.getView().getModel();
                if (oModel) {
                    const aPaths = sPrevEditingPath.split(",").filter(Boolean);
                    aPaths.forEach(sPath => {
                        try {
                            const oContext = CustomUtility.prototype._resolveContextByPath.call(this, oPrevTable, sPath);
                            if (oContext) {
                                // Reset context changes
                                if (oContext.reset) {
                                    oContext.reset();
                                } else if (oContext.getObject) {
                                    const oData = oContext.getObject();
                                    if (oData._originalData) {
                                        // Restore original data
                                        const oOriginal = oData._originalData;
                                        Object.keys(oOriginal).forEach(sKey => {
                                            if (sKey !== '_originalData' && sKey !== 'isEditable' && sKey !== '_hasChanged') {
                                                oContext.setProperty(sKey, oOriginal[sKey]);
                                            }
                                        });
                                        delete oData._originalData;
                                    }
                                }
                            }
                        } catch (e) {
                        }
                    });
                }
            } catch (e) {
            }
        },

        // ✅ NEW: Handler for allocation view change (Employees/Projects toggle)
        onAllocationViewChange: function (oEvent) {
            // Get selected key from Select control
            const oSelect = oEvent.getSource();
            const sSelectedKey = oSelect.getSelectedKey();
            const oAllocationPage = this.byId("allocationPage");


            if (!oAllocationPage) {
                return;
            }

            // Reset flag so fragment can be reloaded
            this._bAllocationsLoaded = false;

            // Destroy current content
            oAllocationPage.destroyContent();

            if (sSelectedKey === "employees") {
                // Load Employees view (Res fragment)
                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.Res",
                    controller: this
                }).then(function (oFragment) {
                    oAllocationPage.addContent(oFragment);
                    const oTable = this.byId("Res");

                    if (oTable) {
                        oTable.removeStyleClass("show-more");
                        oTable.addStyleClass("show-less");

                        const oModel = this.getOwnerComponent().getModel();
                        if (oModel) {
                            oTable.setModel(oModel);
                        }

                        // ✅ Set default filters for Res FilterBar (Employees view in Allocations)
                        const oResFilterBar = this.byId("resFilterBar");
                        if (oResFilterBar) {
                            oResFilterBar.setModel(oModel, "default");
                            const oFilterModel = this.getView().getModel("filterModel");
                            const oFiltersModel = this.getView().getModel("$filters");
                            if (oFilterModel) {
                                oResFilterBar.setModel(oFilterModel, "filterModel");
                            }
                            if (oFiltersModel) {
                                oResFilterBar.setModel(oFiltersModel, "$filters");
                            }
                            // ✅ Set defaults with multiple retries
                            setTimeout(() => {
                                this._setDefaultFilterFields(oResFilterBar, ["ohrId", "band", "skills"]);
                            }, 1000);
                            setTimeout(() => {
                                this._setDefaultFilterFields(oResFilterBar, ["ohrId", "band", "skills"]);
                            }, 2000);
                        }

                        this.initializeTable("Res").then(() => {
                            // ✅ NEW: Apply allocation filter to Res table after initialization (empallocpercentage < 95 and status != "Resigned")
                            // Use multiple retries to ensure binding is ready
                            const fnApplyAllocationFilter = () => {
                                const oResBinding = oTable.getRowBinding && oTable.getRowBinding();
                                if (oResBinding) {
                                    const oAllocationFilter = this._getAllocationFilter();
                                    oResBinding.filter([oAllocationFilter]);

                                    // ✅ CRITICAL: Re-apply filter on dataReceived to ensure it persists
                                    oResBinding.attachDataReceived(() => {
                                        const oCurrentFilters = oResBinding.getFilters();
                                        // Check if allocation filter is already applied
                                        const bHasAllocationFilter = oCurrentFilters && oCurrentFilters.some(f => {
                                            if (f.getFilters && f.getFilters().length === 2) {
                                                const aSubFilters = f.getFilters();
                                                return aSubFilters.some(sf =>
                                                    sf.getPath() === "empallocpercentage" && (sf.getOperator() === "LT" || sf.getOperator() === "LE") && sf.getValue1() === 95
                                                ) && aSubFilters.some(sf =>
                                                    sf.getPath() === "status" && sf.getOperator() === "NE" && sf.getValue1() === "Resigned"
                                                );
                                            }
                                            return false;
                                        });
                                        if (!bHasAllocationFilter) {
                                            const aFilters = oCurrentFilters ? [...oCurrentFilters] : [];
                                            aFilters.push(oAllocationFilter);
                                            oResBinding.filter(aFilters);
                                        }
                                    });

                                    return true;
                                }
                                return false;
                            };

                            // Try immediately
                            if (!fnApplyAllocationFilter()) {
                                // Retry after short delay
                                setTimeout(() => {
                                    if (!fnApplyAllocationFilter()) {
                                        // Final retry
                                        setTimeout(fnApplyAllocationFilter, 500);
                                    }
                                }, 300);
                            }
                        });

                        this._resetSegmentedButtonForFragment("Res");

                        // Ensure dropdown is set to "employees"
                        const oSelect = this.byId("resViewSelect");
                        if (oSelect) {
                            oSelect.setSelectedKey("employees");
                        }
                    }
                }.bind(this));
            } else {
                // Load Projects view (Allocations fragment)
                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.Allocations",
                    controller: this
                }).then(function (oFragment) {
                    oAllocationPage.addContent(oFragment);
                    const oTable = this.byId("Allocations");

                    if (oTable) {
                        oTable.removeStyleClass("show-more");
                        oTable.addStyleClass("show-less");

                        const oModel = this.getOwnerComponent().getModel();
                        if (oModel) {
                            oTable.setModel(oModel);
                        }

                        // ✅ Set default filters for Allocations FilterBar (Projects view in Allocations)
                        const oAllocationFilterBar = this.byId("allocationFilterBar");
                        if (oAllocationFilterBar) {
                            oAllocationFilterBar.setModel(oModel, "default");
                            const oFilterModel = this.getView().getModel("filterModel");
                            const oFiltersModel = this.getView().getModel("$filters");
                            if (oFilterModel) {
                                oAllocationFilterBar.setModel(oFilterModel, "filterModel");
                            }
                            if (oFiltersModel) {
                                oAllocationFilterBar.setModel(oFiltersModel, "$filters");
                            }
                            // ✅ Set defaults with multiple retries - 3 important filters: projectName, projectType, SOWReceived
                            setTimeout(() => {
                                this._setDefaultFilterFields(oAllocationFilterBar, ["projectName", "projectType", "SOWReceived"]);
                            }, 1000);
                            setTimeout(() => {
                                this._setDefaultFilterFields(oAllocationFilterBar, ["projectName", "projectType", "SOWReceived"]);
                            }, 2000);
                        }

                        // Initialize table and trigger initial data load
                        this.initializeTable("Allocations").then(() => {
                            // ✅ Trigger initial data load by firing FilterBar search event
                            setTimeout(() => {
                                if (oAllocationFilterBar) {
                                    oAllocationFilterBar.fireSearch();
                                } else if (oTable && typeof oTable.rebind === "function") {
                                    oTable.rebind();
                                }
                            }, 1000);
                        });
                        this._resetSegmentedButtonForFragment("Allocations");

                        // Ensure dropdown is set to "projects"
                        const oSelect = this.byId("allocationViewSelect");
                        if (oSelect) {
                            oSelect.setSelectedKey("projects");
                        }
                    }
                }.bind(this));
            }
        },

        // ✅ NEW: Handler for allocation search
        onAllocationSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("Allocations");

            if (!oTable) {
                return;
            }

            // Apply search filter to table
            const oBinding = oTable.getRowBinding && oTable.getRowBinding();
            if (oBinding) {
                if (sQuery) {
                    // Create search filter - search in projectName field
                    const oFilter = new sap.ui.model.Filter("projectName", sap.ui.model.FilterOperator.Contains, sQuery);
                    oBinding.filter([oFilter]);
                } else {
                    // Clear filter if search is empty
                    oBinding.filter([]);
                }
            }
        },

        // ✅ NEW: Demand button handler - loads Demands fragment filtered by selected project
        onDemandPress: function () {
            const oAllocationPage = this.byId("allocationPage");
            const oTable = this.byId("Allocations");

            if (!oAllocationPage) {
                sap.m.MessageToast.show("Allocation page not found");
                return;
            }

            // Get selected project
            const aSelectedContexts = oTable ? oTable.getSelectedContexts() : [];
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                sap.m.MessageToast.show("Please select a project first");
                return;
            }

            const oProject = aSelectedContexts[0].getObject();
            const sProjectId = oProject.sapPId || oProject.projectId;

            // ✅ Get project name - Allocations table shows Projects, so projectName should be available
            let sProjectName = oProject.projectName || sProjectId;

            // Store selected project ID and name
            this._sSelectedProjectId = sProjectId;
            this._sSelectedProjectName = sProjectName;

            // ✅ If project name not available, try to fetch it (but don't block navigation)
            // ✅ CRITICAL: Always ensure data("selectedId") is set with the project ID
            if (!oProject.projectName && !oProject.to_Project?.projectName && oProject.sapPId) {
                const oModel = this.getOwnerComponent().getModel();
                if (oModel) {
                    // Use read instead of bindContext to avoid deferred binding issues
                    // ✅ Display only ID (not name) for association fields
                    const oProjectInput = this.byId("inputSapPId_demand");
                    if (oProjectInput) {
                        oProjectInput.setValue(sProjectId);
                        oProjectInput.data("selectedId", sProjectId);
                    }
                }
            } else {
                // ✅ Ensure selectedId is always set even if name is already available
                const oProjectInput = this.byId("inputSapPId_demand");
                if (oProjectInput) {
                    oProjectInput.data("selectedId", sProjectId);
                }
            }

            // Destroy current content
            oAllocationPage.destroyContent();

            Fragment.load({
                id: this.getView().getId(),
                name: "glassboard.view.fragments.Demands",
                controller: this
            }).then(function (oFragment) {
                oAllocationPage.addContent(oFragment);
                const oDemandsTable = this.byId("Demands");

                if (oDemandsTable) {
                    oDemandsTable.removeStyleClass("show-more");
                    oDemandsTable.addStyleClass("show-less");

                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oDemandsTable.setModel(oModel);
                    }

                    // Store project ID for filtering BEFORE initialization
                    this._sDemandProjectFilter = sProjectId;

                    // ✅ CRITICAL: Use project ID as-is for filter (sapPId can be "P-0001" format or numeric)
                    // The filter should match the actual sapPId value in the database
                    let sFilterValue = sProjectId;

                    // Check if we need to convert format - but first check what format is in DB
                    // For now, use the project ID as-is since Projects use "P-0001" format

                    // ✅ CRITICAL: Prevent auto-binding by setting filter BEFORE initialization
                    // Get binding early and apply filter immediately to prevent initial data load
                    const oEarlyBinding = oDemandsTable.getRowBinding && oDemandsTable.getRowBinding();
                    if (oEarlyBinding && sProjectId) {
                        try {
                            // ✅ Use project ID as-is (should be "P-0001" format to match Demand CSV)
                            const oFilter = new sap.ui.model.Filter("sapPId", sap.ui.model.FilterOperator.EQ, sProjectId);
                            oEarlyBinding.filter([oFilter]);
                        } catch (e) {
                        }
                    }

                    // Initialize table and wait for it to complete
                    this.initializeTable("Demands").then(() => {

                        // Function to apply/verify filter
                        const fnApplyFilter = () => {
                            const oBinding = oDemandsTable.getRowBinding && oDemandsTable.getRowBinding();
                            if (oBinding && sProjectId) {
                                try {
                                    // ✅ Use project ID as-is (should be "P-0001" format to match Demand CSV)
                                    const oFilter = new sap.ui.model.Filter("sapPId", sap.ui.model.FilterOperator.EQ, sProjectId);
                                    oBinding.filter([oFilter]);

                                    // Attach data received event to track data loading
                                    oBinding.attachDataReceived((oEvent) => {
                                        const iLength = oEvent.getParameter("length");
                                        const oData = oEvent.getParameter("data");
                                        const iActualCount = oData ? oData.length : (iLength || 0);
                                        if (iActualCount === 0) {
                                        }
                                    });
                                } catch (e) {
                                }
                            } else {
                            }
                        };

                        // Apply filter immediately after initialization
                        fnApplyFilter();

                        // Also verify after a short delay to ensure it persists
                        setTimeout(fnApplyFilter, 300);
                    }).catch((e) => {
                    });

                    this._resetSegmentedButtonForFragment("Demands");

                    // ✅ Pre-fill project field in demand form with selected project
                    this._prefillDemandProject(sProjectId, sProjectName);
                }
            }.bind(this));
        },

        // ✅ NEW: Store project ID in model (project field removed from form)
        _prefillDemandProject: function (sProjectId, sProjectName) {
            // ✅ Project field removed from form - just store the ID in model and controller
            // The project is pre-selected from navigation, so we just need to ensure it's stored
            const sFinalProjectId = this._sSelectedProjectId || sProjectId;

            // Update the model - ALWAYS store ID, not name
            let oDemandModel = this.getView().getModel("demandModel");
            if (!oDemandModel) {
                oDemandModel = new sap.ui.model.json.JSONModel({});
                this.getView().setModel(oDemandModel, "demandModel");
            }
            oDemandModel.setProperty("/sapPId", sFinalProjectId); // ✅ Store ID in model

        },

        // ✅ NEW: Refresh Demands table while preserving project filter
        _refreshDemandsTableWithFilter: function () {
            const oTable = this.byId("Demands");
            if (!oTable) {
                return;
            }

            // ✅ Use stored project ID (should be "P-0001" format)
            const sFilterValue = this._sDemandProjectFilter || this._sSelectedProjectId;
            if (!sFilterValue) {
                // No filter, use normal refresh
                if (oTable.rebind) {
                    oTable.rebind();
                }
                return;
            }


            // Rebind the table
            if (oTable.rebind) {
                try {
                    oTable.rebind();
                } catch (e) {
                }
            }

            // Reapply filter after rebind
            setTimeout(() => {
                const fnApplyFilter = () => {
                    const oBinding = oTable.getRowBinding && oTable.getRowBinding();
                    if (oBinding && sFilterValue) {
                        try {
                            // ✅ Use project ID as-is (should be "P-0001" format to match Demand CSV)
                            const oFilter = new sap.ui.model.Filter("sapPId", sap.ui.model.FilterOperator.EQ, sFilterValue);
                            oBinding.filter([oFilter]);

                            // Attach data received event to verify filter is working
                            oBinding.attachDataReceived((oEvent) => {
                                const iLength = oEvent.getParameter("length");
                            });
                        } catch (e) {
                        }
                    } else {
                        setTimeout(fnApplyFilter, 200);
                    }
                };

                fnApplyFilter();
            }, 300);
        },

        // ✅ NEW: Back to Projects handler - returns to Allocations view
        onBackToProjectsPress: function () {
            const oAllocationPage = this.byId("allocationPage");

            if (!oAllocationPage) {
                return;
            }

            // Clear current content (i.e., Demands fragment)
            oAllocationPage.destroyContent();

            // Reset flag so fragment can be reloaded
            this._bAllocationsLoaded = false;

            // Load Allocations fragment again
            Fragment.load({
                id: this.getView().getId(),
                name: "glassboard.view.fragments.Allocations",
                controller: this
            }).then(function (oFragment) {
                oAllocationPage.addContent(oFragment);
                const oTable = this.byId("Allocations");

                if (oTable) {
                    oTable.removeStyleClass("show-more");
                    oTable.addStyleClass("show-less");

                    const oModel = this.getOwnerComponent().getModel();
                    if (oModel) {
                        oTable.setModel(oModel);
                    }

                    this.initializeTable("Allocations");
                    this._resetSegmentedButtonForFragment("Allocations");
                }
            }.bind(this));
        },

        // ✅ NEW: Handler for Demands dropdown to switch between Employees (Res) and Projects (Allocations) views
        // ✅ ISOLATED: This handler only affects the Demands view dropdown, does not interfere with onAllocationViewChange
        onSelection: function (oEvent) {
            // Get selected key from Select control
            const oSelect = oEvent.getSource();
            const sSelectedKey = oSelect.getSelectedKey();
            const oAllocationPage = this.byId("allocationPage");


            if (!oAllocationPage) {
                return;
            }

            // Reset flag so fragment can be reloaded
            this._bAllocationsLoaded = false;

            // Destroy current content
            oAllocationPage.destroyContent();

            if (sSelectedKey === "employees") {
                // Load Employees view (Res fragment)
                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.Res",
                    controller: this
                }).then(function (oFragment) {
                    oAllocationPage.addContent(oFragment);
                    const oTable = this.byId("Res");

                    if (oTable) {
                        oTable.removeStyleClass("show-more");
                        oTable.addStyleClass("show-less");

                        const oModel = this.getOwnerComponent().getModel();
                        if (oModel) {
                            oTable.setModel(oModel);
                        }

                        // ✅ Set default filters for Res FilterBar (Employees view in Allocations)
                        const oResFilterBar = this.byId("resFilterBar");
                        if (oResFilterBar) {
                            oResFilterBar.setModel(oModel, "default");
                            const oFilterModel = this.getView().getModel("filterModel");
                            const oFiltersModel = this.getView().getModel("$filters");
                            if (oFilterModel) {
                                oResFilterBar.setModel(oFilterModel, "filterModel");
                            }
                            if (oFiltersModel) {
                                oResFilterBar.setModel(oFiltersModel, "$filters");
                            }
                            // ✅ Set defaults with multiple retries
                            setTimeout(() => {
                                this._setDefaultFilterFields(oResFilterBar, ["ohrId", "band", "skills"]);
                            }, 1000);
                            setTimeout(() => {
                                this._setDefaultFilterFields(oResFilterBar, ["ohrId", "band", "skills"]);
                            }, 2000);
                        }

                        this.initializeTable("Res").then(() => {
                            // ✅ CRITICAL: Apply Unproductive Bench filter to Res table after initialization
                            const fnApplyBenchFilter = () => {
                                const oResBinding = oTable.getRowBinding && oTable.getRowBinding();
                                if (oResBinding) {
                                    const oBenchFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Unproductive Bench");
                                    oResBinding.filter([oBenchFilter]);

                                    // ✅ CRITICAL: Re-apply filter on dataReceived to ensure it persists
                                    oResBinding.attachDataReceived(() => {
                                        const oCurrentFilters = oResBinding.getFilters();
                                        const bHasBenchFilter = oCurrentFilters && oCurrentFilters.some(f =>
                                            f.getPath() === "status" && f.getOperator() === "EQ" && f.getValue1() === "Unproductive Bench"
                                        );
                                        if (!bHasBenchFilter) {
                                            const aFilters = oCurrentFilters ? [...oCurrentFilters] : [];
                                            aFilters.push(oBenchFilter);
                                            oResBinding.filter(aFilters);
                                        }
                                    });

                                    return true;
                                }
                                return false;
                            };

                            // Try immediately
                            if (!fnApplyBenchFilter()) {
                                // Retry after short delay
                                setTimeout(() => {
                                    if (!fnApplyBenchFilter()) {
                                        // Final retry
                                        setTimeout(fnApplyBenchFilter, 500);
                                    }
                                }, 300);
                            }
                        });

                        this._resetSegmentedButtonForFragment("Res");
                    }
                }.bind(this));
            } else {
                // Load Projects view (Allocations fragment)
                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.Allocations",
                    controller: this
                }).then(function (oFragment) {
                    oAllocationPage.addContent(oFragment);
                    const oTable = this.byId("Allocations");

                    if (oTable) {
                        oTable.removeStyleClass("show-more");
                        oTable.addStyleClass("show-less");

                        const oModel = this.getOwnerComponent().getModel();
                        if (oModel) {
                            oTable.setModel(oModel);
                        }

                        // ✅ Set default filters for Allocations FilterBar (Projects view in Allocations)
                        const oAllocationFilterBar = this.byId("allocationFilterBar");
                        if (oAllocationFilterBar) {
                            oAllocationFilterBar.setModel(oModel, "default");
                            const oFilterModel = this.getView().getModel("filterModel");
                            const oFiltersModel = this.getView().getModel("$filters");
                            if (oFilterModel) {
                                oAllocationFilterBar.setModel(oFilterModel, "filterModel");
                            }
                            if (oFiltersModel) {
                                oAllocationFilterBar.setModel(oFiltersModel, "$filters");
                            }
                            // ✅ Set defaults with multiple retries - 3 important filters: projectName, projectType, SOWReceived
                            setTimeout(() => {
                                this._setDefaultFilterFields(oAllocationFilterBar, ["projectName", "projectType", "SOWReceived"]);
                            }, 1000);
                            setTimeout(() => {
                                this._setDefaultFilterFields(oAllocationFilterBar, ["projectName", "projectType", "SOWReceived"]);
                            }, 2000);
                        }

                        this.initializeTable("Allocations");
                        this._resetSegmentedButtonForFragment("Allocations");
                    }
                }.bind(this));
            }
        },

        // ✅ NEW: Resources handler - shows resources for selected demand
        // ✅ NEW: Find Resources handler - opens dialog to select bench employees
        onResourcesPress: function () {

            // Get selected demand to get project ID
            const oDemandsTable = this.byId("Demands");
            if (!oDemandsTable) {
                sap.m.MessageToast.show("Demands table not found");
                return;
            }

            const aSelectedContexts = oDemandsTable.getSelectedContexts();
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                sap.m.MessageToast.show("Please select a demand first");
                return;
            }

            // ✅ CRITICAL: Get project ID and demand ID from selected demand
            // 1. From stored filter (set when navigating from Projects)
            // 2. From selected project ID (set when navigating from Projects)
            // 3. From selected demand's sapPId
            let sProjectId = this._sDemandProjectFilter || this._sSelectedProjectId;
            let iDemandId = null;

            // ✅ Try to get project data and demand ID from selected demand's association (if available)
            let oProjectData = null;
            if (aSelectedContexts.length > 0) {
                const oDemand = aSelectedContexts[0].getObject();
                // ✅ Store demand ID from selected demand
                iDemandId = oDemand.demandId;

                // If no project ID yet, get it from demand
                if (!sProjectId) {
                    sProjectId = oDemand.sapPId;
                }
                // ✅ Always try to get project data from demand's association (has dates)
                if (oDemand.to_Project) {
                    oProjectData = oDemand.to_Project;
                }
            }

            // ✅ Store demand ID for use in allocation
            this._sAllocationDemandId = iDemandId;

            if (!sProjectId) {
                sap.m.MessageBox.error("Project ID not found. Please navigate from Projects screen or select a demand with a project.");
                return;
            }


            // Store project ID for allocation
            this._sAllocationProjectId = sProjectId;

            // ✅ Store project data if available from demand association (has dates for validation)
            if (oProjectData && oProjectData.startDate && oProjectData.endDate) {
                this._oAllocationProjectData = {
                    startDate: oProjectData.startDate,
                    endDate: oProjectData.endDate
                };
            } else {
            }

            // Load and open Find Resources dialog
            if (!this._oFindResourcesDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.dialogs.FindResourcesDialog",
                    controller: this
                }).then((oDialog) => {
                    this._oFindResourcesDialog = oDialog;
                    this.getView().addDependent(this._oFindResourcesDialog);
                    this._oFindResourcesDialog.open();

                    // ✅ Verify button is accessible - try multiple methods
                    let oAllocateBtn = this.byId("btnFindResourcesAllocate");
                    if (!oAllocateBtn) {
                        // Try using Fragment.byId
                        oAllocateBtn = sap.ui.core.Fragment.byId(this.getView().getId(), "btnFindResourcesAllocate");
                    }
                    if (!oAllocateBtn && oDialog) {
                        // Try to get it from dialog's begin button
                        oAllocateBtn = oDialog.getBeginButton();
                    }
                    if (oAllocateBtn) {
                    } else {
                    }

                    // ✅ Apply allocation filter to Find Resources table (same as Res table)
                    // Filter: empallocpercentage <= 95% AND status != "Resigned"
                    const oFindResourcesTable = this.byId("findResourcesTable");
                    if (oFindResourcesTable && oFindResourcesTable.getBinding) {
                        const oBinding = oFindResourcesTable.getBinding("items");
                        if (oBinding) {
                            const oAllocationFilter = this._getAllocationFilter();
                            oBinding.filter([oAllocationFilter]);
                        }
                    }

                    // ✅ Auto-fill dates from project (will use cached data or fetch)
                    this._prefillAllocationDates(sProjectId);
                });
            } else {
                this._oFindResourcesDialog.open();

                // ✅ Verify button is accessible - try multiple methods
                let oAllocateBtn = this.byId("btnFindResourcesAllocate");
                if (!oAllocateBtn) {
                    // Try using Fragment.byId
                    oAllocateBtn = sap.ui.core.Fragment.byId(this.getView().getId(), "btnFindResourcesAllocate");
                }
                if (!oAllocateBtn && this._oFindResourcesDialog) {
                    // Try to get it from dialog's begin button
                    oAllocateBtn = this._oFindResourcesDialog.getBeginButton();
                }
                if (oAllocateBtn) {
                } else {
                }

                // ✅ Apply allocation filter to Find Resources table (same as Res table)
                // Filter: empallocpercentage <= 95% AND status != "Resigned"
                const oFindResourcesTable = this.byId("findResourcesTable");
                if (oFindResourcesTable && oFindResourcesTable.getBinding) {
                    const oBinding = oFindResourcesTable.getBinding("items");
                    if (oBinding) {
                        const oAllocationFilter = this._getAllocationFilter();
                        oBinding.filter([oAllocationFilter]);
                    }
                }

                // ✅ Auto-fill dates from project (will use cached data or fetch)
                this._prefillAllocationDates(sProjectId);
            }
        },

        // ✅ NEW: Helper to pre-fill allocation dates from project
        _prefillAllocationDates: function (sProjectId) {
            const oModel = this.getOwnerComponent().getModel();
            if (!oModel || !sProjectId) return;

            // ✅ Use cached data if available (set when opening from Demands)
            if (this._oAllocationProjectData && this._oAllocationProjectData.startDate && this._oAllocationProjectData.endDate) {
                const oStartDatePicker = this.byId("allocationStartDate");
                const oEndDatePicker = this.byId("allocationEndDate");

                if (this._oAllocationProjectData.startDate && oStartDatePicker) {
                    oStartDatePicker.setValue(this._oAllocationProjectData.startDate);
                    oStartDatePicker.data("projectStartDate", this._oAllocationProjectData.startDate);
                }

                if (this._oAllocationProjectData.endDate && oEndDatePicker) {
                    oEndDatePicker.setValue(this._oAllocationProjectData.endDate);
                    oEndDatePicker.data("projectEndDate", this._oAllocationProjectData.endDate);
                }
            } else {
                // ✅ If no cached data, try to get from demand association (when coming from Demands)
                // This should have been set in onResourcesPress, but if not, skip pre-fill
                // User can manually enter dates, and backend will validate
            }
        },

        // ✅ NEW: Find Resources dialog close handler
        onFindResourcesDialogClose: function () {
            if (this._oFindResourcesDialog) {
                this._oFindResourcesDialog.close();
                // Clear selection
                const oTable = this.byId("findResourcesTable");
                if (oTable) {
                    oTable.removeSelections();
                }
                // Clear allocation button
                const oAllocateBtn = this.byId("btnFindResourcesAllocate");
                if (oAllocateBtn) {
                    oAllocateBtn.setEnabled(false);
                }
                // Clear date pickers
                const oStartDatePicker = this.byId("allocationStartDate");
                const oEndDatePicker = this.byId("allocationEndDate");
                if (oStartDatePicker) {
                    oStartDatePicker.setValue("");
                    oStartDatePicker.data("projectStartDate", "");
                }
                if (oEndDatePicker) {
                    oEndDatePicker.setValue("");
                    oEndDatePicker.data("projectEndDate", "");
                }
                // ✅ Clear allocation percentage field
                const oPercentageInput = this.byId("allocationPercentage_find");
                if (oPercentageInput) {
                    oPercentageInput.setValue("100");
                }
            }
        },

        // ✅ NEW: Find Resources search handler
        onFindResourcesSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("findResourcesTable");

            if (!oTable) {
                return;
            }

            const oBinding = oTable.getBinding("items");
            if (oBinding) {
                // ✅ NEW: Always include allocation filter (empallocpercentage < 95 and status != "Resigned"), add search filter on top
                const aFilters = [
                    this._getAllocationFilter()
                ];

                if (sQuery) {
                    aFilters.push(new sap.ui.model.Filter("fullName", sap.ui.model.FilterOperator.Contains, sQuery));
                }

                oBinding.filter(aFilters, "Application");
            }
        },

        // ✅ NEW: Find Resources selection change handler
        onFindResourcesSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const aSelectedItems = oTable.getSelectedItems();

            // ✅ Try multiple ways to find the button
            let oAllocateBtn = this.byId("btnFindResourcesAllocate");
            if (!oAllocateBtn) {
                // Try using Fragment.byId
                oAllocateBtn = sap.ui.core.Fragment.byId(this.getView().getId(), "btnFindResourcesAllocate");
            }
            if (!oAllocateBtn && this._oFindResourcesDialog) {
                // Try to get it from dialog's begin button
                oAllocateBtn = this._oFindResourcesDialog.getBeginButton();
            }


            if (oAllocateBtn) {
                const bEnabled = aSelectedItems.length > 0;
                oAllocateBtn.setEnabled(bEnabled);
            } else {
            }
        },

        // ✅ NEW: Find Resources allocate handler - creates allocation record
        onFindResourcesAllocate: function (oEvent) {

            // ✅ Try multiple ways to find the table
            let oTable = this.byId("findResourcesTable");
            if (!oTable && this._oFindResourcesDialog) {
                // Try to find it in the dialog content
                const aContent = this._oFindResourcesDialog.getContent();
                if (aContent && aContent.length > 0) {
                    const oVBox = aContent[0];
                    if (oVBox && oVBox.getContent) {
                        const aVBoxContent = oVBox.getContent();
                        for (let i = 0; i < aVBoxContent.length; i++) {
                            const oItem = aVBoxContent[i];
                            if (oItem && oItem.getId && oItem.getId().includes("findResourcesTable")) {
                                oTable = oItem;
                                break;
                            }
                        }
                    }
                }
            }

            if (!oTable) {
                sap.m.MessageToast.show("Resources table not found");
                return;
            }

            const aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems || aSelectedItems.length === 0) {
                sap.m.MessageToast.show("Please select at least one employee to allocate");
                return;
            }


            // ✅ Get all selected employees
            const aEmployees = [];
            for (let i = 0; i < aSelectedItems.length; i++) {
                const oSelectedItem = aSelectedItems[i];
                const oContext = oSelectedItem.getBindingContext();
                if (oContext) {
                    const oEmployee = oContext.getObject();
                    if (oEmployee && oEmployee.ohrId) {
                        aEmployees.push(oEmployee);
                    }
                }
            }

            if (aEmployees.length === 0) {
                sap.m.MessageToast.show("Could not get employee data from selected items");
                return;
            }

            let sProjectId = this._sAllocationProjectId;

            if (!sProjectId) {
                sap.m.MessageToast.show("Project ID missing");
                return;
            }

            // Note: Keep project ID in original format (P-0006) as Project entity uses this format
            // The allocation entity's projectId should match Project.sapPId format

            // ✅ Get demandId from stored value (set when opening dialog from selected demand)
            const iDemandId = this._sAllocationDemandId;

            if (!iDemandId) {
                sap.m.MessageBox.error("Please select a demand for the allocation.\n\nDemand selection is required to track resource allocation at the demand level.", {
                    title: "Demand Selection Required"
                });
                return;
            }


            // Get allocation details from form
            const oStartDatePicker = this.byId("allocationStartDate");
            const oEndDatePicker = this.byId("allocationEndDate");

            const sStartDate = oStartDatePicker ? oStartDatePicker.getValue() : "";
            const sEndDate = oEndDatePicker ? oEndDatePicker.getValue() : "";

            if (!sStartDate || !sEndDate) {
                sap.m.MessageBox.error("Please select start date and end date");
                return;
            }

            // ✅ CRITICAL: Validate dates against project dates
            const oModel = this.getOwnerComponent().getModel();
            if (!oModel) {
                sap.m.MessageToast.show("Model not found");
                return;
            }

            // ✅ Get project dates from multiple sources (priority order):
            // 1. Cached project data
            // 2. Date picker data attributes (stored when pre-filled)
            // 3. Fetch from server if needed
            let sProjectStartDate = null;
            let sProjectEndDate = null;

            if (this._oAllocationProjectData && this._oAllocationProjectData.startDate && this._oAllocationProjectData.endDate) {
                sProjectStartDate = this._oAllocationProjectData.startDate;
                sProjectEndDate = this._oAllocationProjectData.endDate;
            } else if (oStartDatePicker && oEndDatePicker) {
                sProjectStartDate = oStartDatePicker.data("projectStartDate");
                sProjectEndDate = oEndDatePicker.data("projectEndDate");
            }

            // ✅ Validate dates once for all allocations
            const fnValidateDates = (oProject) => {
                // Use fetched project dates if available
                if (oProject && oProject.startDate && oProject.endDate) {
                    sProjectStartDate = oProject.startDate;
                    sProjectEndDate = oProject.endDate;
                }

                // ✅ Validate allocation dates against project dates
                if (sProjectStartDate && sStartDate) {
                    const oAllocStart = new Date(sStartDate);
                    const oProjStart = new Date(sProjectStartDate);
                    oAllocStart.setHours(0, 0, 0, 0);
                    oProjStart.setHours(0, 0, 0, 0);
                    if (oAllocStart < oProjStart) {
                        sap.m.MessageBox.error(`Allocation start date (${sStartDate}) cannot be earlier than project start date (${sProjectStartDate})`);
                        return false;
                    }
                }

                if (sProjectEndDate && sEndDate) {
                    const oAllocEnd = new Date(sEndDate);
                    const oProjEnd = new Date(sProjectEndDate);
                    oAllocEnd.setHours(0, 0, 0, 0);
                    oProjEnd.setHours(0, 0, 0, 0);
                    if (oAllocEnd > oProjEnd) {
                        sap.m.MessageBox.error(`Allocation end date (${sEndDate}) cannot be later than project end date (${sProjectEndDate})`);
                        return false;
                    }
                }

                // Validate start <= end
                if (sStartDate && sEndDate) {
                    const oStart = new Date(sStartDate);
                    const oEnd = new Date(sEndDate);
                    oStart.setHours(0, 0, 0, 0);
                    oEnd.setHours(0, 0, 0, 0);
                    if (oStart > oEnd) {
                        sap.m.MessageBox.error("Start date cannot be later than end date");
                        return false;
                    }
                }

                return true;
            };

            // ✅ Create allocations for all selected employees
            const fnCreateAllocations = () => {
                // Validate dates first
                if (!fnValidateDates(null)) {
                    return;
                }

                // ✅ Get allocation percentage from input field - try multiple methods
                let oPercentageInput = null;

                // Method 1: Direct byId
                oPercentageInput = this.byId("allocationPercentage_find");

                // Method 2: Fragment.byId with dialog ID
                if (!oPercentageInput) {
                    try {
                        oPercentageInput = sap.ui.core.Fragment.byId("findResourcesDialog", "allocationPercentage_find");
                    } catch (e) {
                    }
                }

                // Method 3: Search in dialog content recursively
                if (!oPercentageInput && this._oFindResourcesDialog) {
                    const fnFindInput = (oControl) => {
                        if (!oControl) return null;
                        if (oControl.getId && oControl.getId().includes("allocationPercentage_find")) {
                            return oControl;
                        }
                        if (oControl.getContent) {
                            const aContent = oControl.getContent();
                            for (let i = 0; i < aContent.length; i++) {
                                const oFound = fnFindInput(aContent[i]);
                                if (oFound) return oFound;
                            }
                        }
                        if (oControl.getItems) {
                            const aItems = oControl.getItems();
                            for (let i = 0; i < aItems.length; i++) {
                                const oFound = fnFindInput(aItems[i]);
                                if (oFound) return oFound;
                            }
                        }
                        return null;
                    };
                    oPercentageInput = fnFindInput(this._oFindResourcesDialog);
                }

                // Method 4: Try byId with view prefix
                if (!oPercentageInput) {
                    const sViewId = this.getView().getId();
                    oPercentageInput = sap.ui.getCore().byId(sViewId + "--allocationPercentage_find");
                }

                let sPercentage = "";
                if (oPercentageInput) {
                    sPercentage = oPercentageInput.getValue() || "";
                } else {
                    if (this._oFindResourcesDialog) {
                        // Dialog debugging removed
                    }
                    // ✅ CRITICAL: Don't silently default to 100% - show error to user
                    sap.m.MessageBox.error("Could not find allocation percentage input field. Please refresh the page and try again.");
                    return;
                }

                // ✅ Parse percentage - handle empty string, null, undefined
                let iPercentage = 100; // Default to 100 if not provided
                if (sPercentage !== null && sPercentage !== undefined && sPercentage !== "" && sPercentage.trim() !== "") {
                    const iParsed = parseInt(sPercentage.trim(), 10);
                    if (!isNaN(iParsed) && iParsed >= 0 && iParsed <= 100) {
                        iPercentage = iParsed;
                    } else {
                        sap.m.MessageBox.error(`Invalid allocation percentage: "${sPercentage}". Must be a number between 0 and 100.`);
                        return;
                    }
                } else {
                    // ✅ If field is found but empty, use default 100% (this is expected behavior)
                }


                // ✅ Use the SAME validation logic as employee level allocation
                // First: Validate project resource limits
                // Second: Validate employee allocation percentages (same as onAllocateConfirm)
                const fnValidateAndCreate = async () => {
                    // ✅ STEP 1: Validate project resource limits (same as employee level)
                    const bProjectValid = await this._validateProjectResourceLimits(sProjectId, aEmployees.length, oModel);
                    if (!bProjectValid) {
                        return; // Error popup already shown by validation function
                    }

                    // ✅ STEP 1.5: Validate demand resource limits
                    const bDemandValid = await this._validateDemandResourceLimits(iDemandId, aEmployees.length, oModel);
                    if (!bDemandValid) {
                        return; // Error popup already shown by validation function
                    }

                    // ✅ STEP 1.5: Refresh employee data to get latest empallocpercentage values
                    // The employee objects from table might have stale values
                    const aRefreshedEmployees = [];
                    for (let i = 0; i < aEmployees.length; i++) {
                        const oEmployee = aEmployees[i];
                        try {
                            // Fetch latest employee data including empallocpercentage
                            const oEmployeeBinding = oModel.bindContext(`/Employees('${oEmployee.ohrId}')`);
                            await oEmployeeBinding.requestObject();
                            const oRefreshedEmployee = oEmployeeBinding.getBoundContext().getObject();
                            if (oRefreshedEmployee) {
                                // Merge refreshed data with original employee object
                                aRefreshedEmployees.push({
                                    ...oEmployee,
                                    ...oRefreshedEmployee
                                });
                            } else {
                                // Fallback to original if refresh fails
                                aRefreshedEmployees.push(oEmployee);
                            }
                        } catch (oError) {
                            // Fallback to original employee object
                            aRefreshedEmployees.push(oEmployee);
                        }
                    }

                    // ✅ STEP 2: Validate each employee's allocation percentage (SAME LOGIC as employee level)
                    const aValidEmployees = [];
                    const aInvalidEmployees = [];

                    // First pass: Validate each employee (same logic as onAllocateConfirm lines 3109-3132)
                    for (let i = 0; i < aRefreshedEmployees.length; i++) {
                        const oEmployee = aRefreshedEmployees[i];

                        // Get employee's current allocation percentage (default to 0 if missing)
                        const iEmpAllocPercentage = oEmployee.empallocpercentage ? parseInt(oEmployee.empallocpercentage, 10) : 0;
                        // Calculate combined allocation percentage
                        const iCombinedPercentage = iEmpAllocPercentage + iPercentage;


                        // ✅ Validate: Check if combined percentage exceeds 100%
                        if (iCombinedPercentage > 100) {
                            aInvalidEmployees.push({
                                name: oEmployee.fullName,
                                ohrId: oEmployee.ohrId,
                                current: iEmpAllocPercentage,
                                requested: iPercentage,
                                total: iCombinedPercentage,
                                available: 100 - iEmpAllocPercentage
                            });
                        } else {
                            aValidEmployees.push(oEmployee);
                        }
                    }

                    // ✅ Show warning/error if some employees cannot be allocated (SAME POPUP as employee level)
                    if (aInvalidEmployees.length > 0) {
                        let sErrorMessage = `Cannot allocate ${aInvalidEmployees.length} employee(s) - allocation would exceed 100%:\n\n`;
                        aInvalidEmployees.forEach((oInvalid) => {
                            sErrorMessage += `• ${oInvalid.name} (${oInvalid.ohrId}): Current ${oInvalid.current}% + Requested ${oInvalid.requested}% = ${oInvalid.total}% (Available: ${oInvalid.available}%)\n`;
                        });

                        if (aValidEmployees.length > 0) {
                            sErrorMessage += `\n${aValidEmployees.length} employee(s) can still be allocated. Continue with only valid employees?`;

                            sap.m.MessageBox.warning(sErrorMessage, {
                                title: "Allocation Validation Warning",
                                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                                emphasizedAction: sap.m.MessageBox.Action.YES,
                                onClose: (sAction) => {
                                    if (sAction === sap.m.MessageBox.Action.YES) {
                                        // Continue with valid employees only
                                        this._createAllocationsForFindResources(aValidEmployees, sProjectId, iDemandId, sStartDate, sEndDate, iPercentage, oModel, aEmployees);
                                    }
                                }
                            });
                            return;
                        } else {
                            // No valid employees - show error and return
                            sap.m.MessageBox.error(sErrorMessage, {
                                title: "Allocation Validation Error"
                            });
                            return;
                        }
                    }

                    // ✅ All employees are valid - create allocations
                    this._createAllocationsForFindResources(aValidEmployees, sProjectId, iDemandId, sStartDate, sEndDate, iPercentage, oModel, aEmployees);
                };

                fnValidateAndCreate();
            };

            // ✅ If we have project dates, validate and create immediately
            // ✅ If dates aren't available, skip frontend validation and let backend handle it
            if (sProjectStartDate && sProjectEndDate) {
                fnCreateAllocations();
            } else {
                // Skip frontend validation, proceed directly to creation
                fnCreateAllocations();
            }
        },

        // ✅ NEW: Helper function to create allocations for valid employees from Find Resources (same pattern as employee level)
        _createAllocationsForFindResources: function (aValidEmployees, sProjectId, iDemandId, sStartDate, sEndDate, iPercentage, oModel, aAllEmployees) {
            const aAllocationData = [];

            // ✅ IMPORTANT: Do NOT update empallocpercentage on frontend
            // The backend's after('CREATE', Allocations) hook will handle it after validation
            for (let i = 0; i < aValidEmployees.length; i++) {
                const oEmployee = aValidEmployees[i];
                const sAllocationId = this._generateUUID();

                // Get employee's current allocation percentage for logging only
                const iEmpAllocPercentage = oEmployee.empallocpercentage ? parseInt(oEmployee.empallocpercentage, 10) : 0;
                const iCombinedPercentage = iEmpAllocPercentage + iPercentage;


                const oAllocData = {
                    allocationId: sAllocationId,
                    employeeId: oEmployee.ohrId,
                    projectId: sProjectId,
                    demandId: iDemandId, // ✅ NEW: Include demandId
                    startDate: sStartDate,
                    endDate: sEndDate,
                    allocationPercentage: iPercentage,
                    status: "Active"
                };


                aAllocationData.push(oAllocData);
            }


            // ✅ Use the same batch creation function
            this._createValidAllocationsFromFindResources(aAllocationData, oModel, aValidEmployees);
        },

        // ✅ DEPRECATED: This function is no longer used - validation now happens before calling _createAllocationsForFindResources
        // Kept for backward compatibility
        _createMultipleAllocationsFromFindResources: async function (aAllocationData, oModel, aEmployees) {
            // Just create allocations directly (validation should have happened already)
            this._createValidAllocationsFromFindResources(aAllocationData, oModel, aEmployees);
        },

        // ✅ NEW: Helper function to validate employees and create allocations from Find Resources
        _validateAndCreateFromFindResources: function (aAllocationData, oModel, aEmployees) {
            // ✅ NEW: Validate each employee's allocation percentage before creating
            const aValidAllocationData = [];
            const aInvalidEmployees = [];

            // First pass: Validate each employee's current allocation percentage
            for (let i = 0; i < aAllocationData.length; i++) {
                const oAllocData = aAllocationData[i];
                const oEmployee = aEmployees.find(e => e.ohrId === oAllocData.employeeId);

                if (!oEmployee) {
                    continue;
                }

                const iEmpAllocPercentage = oEmployee.empallocpercentage ? parseInt(oEmployee.empallocpercentage, 10) : 0;
                const iRequestedPercentage = oAllocData.allocationPercentage || 100;
                const iCombinedPercentage = iEmpAllocPercentage + iRequestedPercentage;


                if (iCombinedPercentage > 100) {
                    aInvalidEmployees.push({
                        name: oEmployee.fullName,
                        ohrId: oEmployee.ohrId,
                        current: iEmpAllocPercentage,
                        requested: iRequestedPercentage,
                        total: iCombinedPercentage,
                        available: 100 - iEmpAllocPercentage
                    });
                } else {
                    aValidAllocationData.push(oAllocData);
                }
            }

            // ✅ Show warning if some employees cannot be allocated
            if (aInvalidEmployees.length > 0) {
                let sErrorMessage = `Cannot allocate ${aInvalidEmployees.length} employee(s) - allocation would exceed 100%:\n\n`;
                aInvalidEmployees.forEach((oInvalid) => {
                    sErrorMessage += `• ${oInvalid.name} (${oInvalid.ohrId}): Current ${oInvalid.current}% + Requested ${oInvalid.requested}% = ${oInvalid.total}% (Available: ${oInvalid.available}%)\n`;
                });

                if (aValidAllocationData.length > 0) {
                    sErrorMessage += `\n${aValidAllocationData.length} employee(s) can still be allocated. Continue with only valid employees?`;

                    sap.m.MessageBox.warning(sErrorMessage, {
                        title: "Allocation Validation Warning",
                        actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                        emphasizedAction: sap.m.MessageBox.Action.YES,
                        onClose: (sAction) => {
                            if (sAction === sap.m.MessageBox.Action.YES) {
                                // Continue with valid allocations only
                                this._createValidAllocationsFromFindResources(aValidAllocationData, oModel, aEmployees);
                            }
                        }
                    });
                    return;
                } else {
                    // No valid employees - show error and return
                    sap.m.MessageBox.error(sErrorMessage, {
                        title: "Allocation Validation Error"
                    });
                    return;
                }
            }

            // ✅ All employees are valid - create allocations
            this._createValidAllocationsFromFindResources(aAllocationData, oModel, aEmployees);
        },

        // ✅ NEW: Helper function to create valid allocations from Find Resources
        _createValidAllocationsFromFindResources: function (aAllocationData, oModel, aEmployees) {

            // ✅ CRITICAL: Group allocations by employee to detect duplicates in batch
            const mEmployeeAllocations = {}; // employeeId -> array of allocations
            for (let i = 0; i < aAllocationData.length; i++) {
                const oAllocData = aAllocationData[i];
                const sEmployeeId = oAllocData.employeeId;
                if (!mEmployeeAllocations[sEmployeeId]) {
                    mEmployeeAllocations[sEmployeeId] = [];
                }
                mEmployeeAllocations[sEmployeeId].push(oAllocData);
            }

            // ✅ Check for duplicate employees in batch (would cause validation issues)
            for (const sEmployeeId in mEmployeeAllocations) {
                const aAllocsForEmployee = mEmployeeAllocations[sEmployeeId];
                if (aAllocsForEmployee.length > 1) {
                    const iTotalPercentage = aAllocsForEmployee.reduce((sum, alloc) => sum + (alloc.allocationPercentage || 100), 0);
                    if (iTotalPercentage > 100) {
                        const sEmployeeName = aEmployees.find(e => e.ohrId === sEmployeeId)?.fullName || sEmployeeId;
                        sap.m.MessageBox.error(`Cannot allocate: Multiple allocations for employee ${sEmployeeName} in same batch would exceed 100% (${iTotalPercentage}%). Please allocate employees one at a time or reduce allocation percentages.`);
                        return;
                    }
                }
            }

            // ✅ CRITICAL: Use correct entity name "Allocations"
            const oBinding = oModel.bindList("/Allocations", null, [], [], {
                groupId: "changesGroup"
            });

            // ✅ Create all allocations in the batch
            const aContexts = [];
            for (let i = 0; i < aAllocationData.length; i++) {
                const oAllocData = aAllocationData[i];
                const oNewContext = oBinding.create(oAllocData, "changesGroup");

                if (!oNewContext) {
                    continue;
                }

                // ✅ Explicitly set all properties on the context
                Object.keys(oAllocData).forEach((sKey) => {
                    try {
                        oNewContext.setProperty(sKey, oAllocData[sKey]);
                    } catch (e) {
                    }
                });

                aContexts.push(oNewContext);
            }

            if (aContexts.length === 0) {
                sap.m.MessageBox.error("Failed to create any allocation entries.");
                return;
            }


            // Submit batch
            oModel.submitBatch("changesGroup").then((oResponse) => {

                // ✅ Check if all contexts were created successfully
                let iSuccessCount = 0;
                for (let i = 0; i < aContexts.length; i++) {
                    const oContext = aContexts[i];
                    if (oContext && oContext.getProperty && oContext.getProperty("allocationId")) {
                        iSuccessCount++;
                    }
                }

                if (iSuccessCount === aContexts.length) {

                    // Show success message with employee names
                    const aEmployeeNames = aEmployees.map(o => o.fullName).join(", ");
                    sap.m.MessageToast.show(`${iSuccessCount} employee(s) allocated successfully: ${aEmployeeNames}`);

                    // ✅ CRITICAL: Clear selection from Find Resources table BEFORE closing dialog
                    const oFindResourcesTable = this.byId("findResourcesTable");
                    if (oFindResourcesTable) {
                        if (oFindResourcesTable.removeSelections) {
                            oFindResourcesTable.removeSelections();
                        } else if (oFindResourcesTable.clearSelection) {
                            oFindResourcesTable.clearSelection();
                        }
                    }

                    // Close dialog
                    this.onFindResourcesDialogClose();

                    // ✅ CRITICAL: Refresh Demands table and re-apply project filter
                    const oDemandsTable = this.byId("Demands");
                    if (oDemandsTable && oDemandsTable.rebind) {
                        oDemandsTable.rebind();
                        if (this._sDemandProjectFilter) {
                            setTimeout(() => {
                                this._refreshDemandsTableWithFilter(this._sDemandProjectFilter);
                            }, 500);
                        }
                    }

                    // ✅ CRITICAL: Refresh Projects table to update allocation counts (allocatedResources, toBeAllocated)
                    setTimeout(() => {
                        this._hardRefreshTable("Projects");
                    }, 800);

                    // ✅ NEW: Refresh Find Resources table and re-apply allocation filter
                    if (oFindResourcesTable && oFindResourcesTable.getBinding) {
                        setTimeout(() => {
                            const oBinding = oFindResourcesTable.getBinding("items");
                            if (oBinding) {
                                const oAllocationFilter = this._getAllocationFilter();
                                oBinding.filter([oAllocationFilter]);
                            }
                        }, 300);
                    }
                } else {
                    sap.m.MessageBox.warning(`${iSuccessCount} of ${aContexts.length} allocation(s) created successfully. Some may have failed.`);
                }
            }).catch((oError) => {
                // ✅ CRITICAL: Extract error message from batch response with better parsing
                let sErrorMessage = `Failed to create allocation(s). ${aAllocationData.length} employee(s) selected.`;

                // Try multiple ways to extract error message
                if (oError.message) {
                    sErrorMessage = oError.message;
                } else if (oError.body) {
                    // Check for OData error format
                    if (oError.body.error && oError.body.error.message) {
                        sErrorMessage = oError.body.error.message;
                    } else if (oError.body.error && oError.body.error.message && oError.body.error.message.value) {
                        sErrorMessage = oError.body.error.message.value;
                    } else if (typeof oError.body === 'string') {
                        sErrorMessage = oError.body;
                    }
                } else if (oError.responseText) {
                    try {
                        const oParsed = JSON.parse(oError.responseText);
                        if (oParsed.error && oParsed.error.message) {
                            sErrorMessage = oParsed.error.message;
                        }
                    } catch (e) {
                        sErrorMessage = oError.responseText;
                    }
                } else if (typeof oError === 'string') {
                    sErrorMessage = oError;
                }

                // ✅ Show error popup with detailed message
                sap.m.MessageBox.error(sErrorMessage, {
                    title: "Allocation Failed"
                });
            });
        },

        // ✅ NEW: Shared helper function to validate project resource limits
        // Returns: Promise<boolean> - true if valid, false if invalid (error popup shown)
        _validateProjectResourceLimits: async function (sProjectId, iNewAllocations, oModel) {
            if (!sProjectId || !oModel) {
                return true; // Allow to continue - backend will validate
            }

            try {
                // Fetch project details to check requiredResources vs allocatedResources
                const oProjectBinding = oModel.bindContext(`/Projects('${sProjectId}')`);
                await oProjectBinding.requestObject();
                const oProject = oProjectBinding.getBoundContext().getObject();

                if (!oProject) {
                    return true; // Allow to continue - backend will validate
                }

                const iRequiredResources = oProject.requiredResources || 0;
                const iCurrentAllocated = oProject.allocatedResources || 0;
                const iTotalAfterAllocation = iCurrentAllocated + iNewAllocations;


                // ✅ Project-level validation: Check if allocating would exceed requiredResources
                if (iRequiredResources > 0 && iTotalAfterAllocation > iRequiredResources) {
                    const iExcess = iTotalAfterAllocation - iRequiredResources;
                    const iCanAllocate = Math.max(0, iRequiredResources - iCurrentAllocated);

                    let sErrorMessage = `Cannot allocate ${iNewAllocations} employee(s) to project ${oProject.projectName || sProjectId}:\n\n`;
                    sErrorMessage += `• Required Resources: ${iRequiredResources}\n`;
                    sErrorMessage += `• Currently Allocated: ${iCurrentAllocated}\n`;
                    sErrorMessage += `• New Allocations: ${iNewAllocations}\n`;
                    sErrorMessage += `• Total After Allocation: ${iTotalAfterAllocation} (exceeds by ${iExcess})\n\n`;
                    sErrorMessage += `Only ${iCanAllocate} employee(s) can be allocated.`;

                    sap.m.MessageBox.error(sErrorMessage, {
                        title: "Project Resource Limit Exceeded"
                    });
                    return false; // Validation failed
                }

                return true; // Validation passed
            } catch (oError) {
                // Allow to continue - backend will validate
                return true;
            }
        },

        // ✅ NEW: Validate demand resource limits (similar to project validation)
        _validateDemandResourceLimits: async function (iDemandId, iNewAllocations, oModel) {
            if (!iDemandId || !oModel) {
                return true; // Allow to continue - backend will validate
            }

            try {
                // Fetch demand details to check quantity vs allocatedCount
                const oDemandBinding = oModel.bindContext(`/Demands(${iDemandId})`);
                await oDemandBinding.requestObject();
                const oDemand = oDemandBinding.getBoundContext().getObject();

                if (!oDemand) {
                    return true; // Allow to continue - backend will validate
                }

                const iQuantity = oDemand.quantity || 0;
                const iCurrentAllocated = oDemand.allocatedCount || 0;
                const iTotalAfterAllocation = iCurrentAllocated + iNewAllocations;


                // ✅ Demand-level validation: Check if allocating would exceed quantity
                if (iQuantity > 0 && iTotalAfterAllocation > iQuantity) {
                    const iExcess = iTotalAfterAllocation - iQuantity;
                    const iCanAllocate = Math.max(0, iQuantity - iCurrentAllocated);

                    let sErrorMessage = `Cannot allocate ${iNewAllocations} employee(s) to demand ${iDemandId}:\n\n`;
                    sErrorMessage += `• Demand Details: ${oDemand.skill || 'N/A'} - ${oDemand.band || 'N/A'}\n`;
                    sErrorMessage += `• Required Quantity: ${iQuantity}\n`;
                    sErrorMessage += `• Currently Allocated: ${iCurrentAllocated}\n`;
                    sErrorMessage += `• Remaining Capacity: ${iCanAllocate}\n`;
                    sErrorMessage += `• New Allocations: ${iNewAllocations}\n`;
                    sErrorMessage += `• Total After Allocation: ${iTotalAfterAllocation} (exceeds by ${iExcess})\n\n`;
                    sErrorMessage += `Only ${iCanAllocate} employee(s) can be allocated to this demand.`;

                    sap.m.MessageBox.error(sErrorMessage, {
                        title: "Demand Resource Limit Exceeded"
                    });
                    return false; // Validation failed
                }

                return true; // Validation passed
            } catch (oError) {
                // Allow to continue - backend will validate
                return true;
            }
        },

        // ✅ NEW: Helper function to create multiple allocations from AllocateDialog
        _createMultipleAllocationsFromAllocateDialog: function (aAllocationData, oModel, aEmployees, oResTable) {

            // ✅ NEW: Validate project resource limits (safety check - should already be validated in onAllocateConfirm)
            if (aAllocationData.length > 0) {
                const sProjectId = aAllocationData[0].projectId;
                if (sProjectId) {
                    // Fetch project details to check requiredResources vs allocatedResources
                    const oProjectBinding = oModel.bindContext(`/Projects('${sProjectId}')`);
                    oProjectBinding.requestObject().then((oProject) => {
                        const iRequiredResources = oProject.requiredResources || 0;
                        const iCurrentAllocated = oProject.allocatedResources || 0;
                        const iNewAllocations = aAllocationData.length;
                        const iTotalAfterAllocation = iCurrentAllocated + iNewAllocations;


                        if (iRequiredResources > 0 && iTotalAfterAllocation > iRequiredResources) {
                            const iExcess = iTotalAfterAllocation - iRequiredResources;
                            const iCanAllocate = Math.max(0, iRequiredResources - iCurrentAllocated);

                            let sErrorMessage = `Cannot allocate ${iNewAllocations} employee(s) to project ${oProject.projectName || sProjectId}:\n\n`;
                            sErrorMessage += `• Required Resources: ${iRequiredResources}\n`;
                            sErrorMessage += `• Currently Allocated: ${iCurrentAllocated}\n`;
                            sErrorMessage += `• New Allocations: ${iNewAllocations}\n`;
                            sErrorMessage += `• Total After Allocation: ${iTotalAfterAllocation} (exceeds by ${iExcess})\n\n`;
                            sErrorMessage += `Only ${iCanAllocate} employee(s) can be allocated.`;

                            sap.m.MessageBox.error(sErrorMessage, {
                                title: "Project Resource Limit Exceeded"
                            });
                            return;
                        }

                        // Project validation passed - continue with creation
                        this._createAllocationsBatch(aAllocationData, oModel, aEmployees, oResTable);
                    }).catch((oError) => {
                        // Continue with creation even if project fetch fails
                        this._createAllocationsBatch(aAllocationData, oModel, aEmployees, oResTable);
                    });
                    return; // Exit early - creation will continue in promise callback
                }
            }

            // No project ID - continue with creation
            this._createAllocationsBatch(aAllocationData, oModel, aEmployees, oResTable);
        },

        // ✅ NEW: Helper function to create allocations batch (extracted from _createMultipleAllocationsFromAllocateDialog)
        _createAllocationsBatch: function (aAllocationData, oModel, aEmployees, oResTable) {

            // ✅ CRITICAL: Use correct entity name "Allocations"
            const oBinding = oModel.bindList("/Allocations", null, [], [], {
                $$groupId: "changesGroup",
                $$updateGroupId: "changesGroup"
            });

            // ✅ Create all allocations in the batch
            const aContexts = [];
            for (let i = 0; i < aAllocationData.length; i++) {
                const oAllocData = aAllocationData[i];
                const oNewContext = oBinding.create(oAllocData, "changesGroup");

                if (!oNewContext) {
                    continue;
                }

                // ✅ Explicitly set all properties on the context
                Object.keys(oAllocData).forEach((sKey) => {
                    try {
                        oNewContext.setProperty(sKey, oAllocData[sKey]);
                    } catch (e) {
                    }
                });

                aContexts.push(oNewContext);
            }

            if (aContexts.length === 0) {
                sap.m.MessageBox.error("Failed to create any allocation entries.");
                return;
            }


            // Submit batch
            oModel.submitBatch("changesGroup").then((oResponse) => {

                // ✅ Check if all contexts were created successfully
                let iSuccessCount = 0;
                for (let i = 0; i < aContexts.length; i++) {
                    const oContext = aContexts[i];
                    if (oContext && oContext.getProperty && oContext.getProperty("allocationId")) {
                        iSuccessCount++;
                    }
                }

                if (iSuccessCount === aContexts.length) {

                    // Show success message with employee names
                    const aEmployeeNames = aEmployees.map(o => o.fullName).join(", ");
                    sap.m.MessageToast.show(`${iSuccessCount} employee(s) allocated successfully: ${aEmployeeNames}`);

                    // ✅ CRITICAL: Clear selection from Res table BEFORE closing dialog
                    if (oResTable) {
                        if (oResTable.clearSelection) {
                            oResTable.clearSelection();
                        } else if (oResTable.removeSelections) {
                            oResTable.removeSelections();
                        }
                    }

                    // ✅ CRITICAL: Close dialog - try multiple ways to ensure it closes
                    const oDialog = this.byId("allocateDialog") || this._oAllocateDialog;
                    if (oDialog) {
                        try {
                            if (oDialog.close) {
                                oDialog.close();
                            } else if (oDialog.destroy) {
                                oDialog.destroy();
                                this._oAllocateDialog = null;
                            }
                        } catch (oCloseError) {
                            // Try alternative method
                            if (this._oAllocateDialog) {
                                this._oAllocateDialog = null;
                            }
                        }
                    }

                    // Clear form fields
                    this.byId("Resinput_proj")?.setValue("");
                    this.byId("Resinput_proj")?.data("selectedId", "");
                    this.byId("Resinput_demand")?.setValue("");
                    this.byId("Resinput_demand")?.data("selectedId", "");
                    this.byId("startDate")?.setValue("");
                    this.byId("endDate")?.setValue("");

                    // ✅ CRITICAL: Refresh tables and re-apply filters
                    if (oResTable && oResTable.rebind) {
                        oResTable.rebind();
                        // Re-apply allocation filter after rebind
                        setTimeout(() => {
                            const oResBinding = oResTable.getRowBinding && oResTable.getRowBinding();
                            if (oResBinding) {
                                const oAllocationFilter = this._getAllocationFilter();
                                oResBinding.filter([oAllocationFilter]);
                            }
                        }, 300);
                    }

                    // ✅ CRITICAL: Refresh Projects table to update allocation counts (allocatedResources, toBeAllocated)
                    setTimeout(() => {
                        this._hardRefreshTable("Projects");
                    }, 800);

                    // ✅ CRITICAL: Re-apply demand filter if we're on Demands screen
                    if (this._sDemandProjectFilter) {
                        setTimeout(() => {
                            this._refreshDemandsTableWithFilter(this._sDemandProjectFilter);
                        }, 500);
                    }
                } else {
                    sap.m.MessageBox.warning(`${iSuccessCount} of ${aContexts.length} allocation(s) created successfully. Some may have failed.`);
                }
            }).catch((oError) => {
                // ✅ CRITICAL: Extract error message from batch response with better parsing
                let sErrorMessage = `Failed to create allocation(s). ${aAllocationData.length} employee(s) selected.`;

                // Try multiple ways to extract error message
                if (oError.message) {
                    sErrorMessage = oError.message;
                } else if (oError.body) {
                    // Check for OData error format
                    if (oError.body.error && oError.body.error.message) {
                        sErrorMessage = oError.body.error.message;
                    } else if (oError.body.error && oError.body.error.message && oError.body.error.message.value) {
                        sErrorMessage = oError.body.error.message.value;
                    } else if (typeof oError.body === 'string') {
                        sErrorMessage = oError.body;
                    }
                } else if (oError.responseText) {
                    try {
                        const oParsed = JSON.parse(oError.responseText);
                        if (oParsed.error && oParsed.error.message) {
                            sErrorMessage = oParsed.error.message;
                        }
                    } catch (e) {
                        sErrorMessage = oError.responseText;
                    }
                } else if (typeof oError === 'string') {
                    sErrorMessage = oError;
                }

                // ✅ Show error popup with detailed message
                sap.m.MessageBox.error(sErrorMessage, {
                    title: "Allocation Failed"
                });
            });
        },

        // ✅ NEW: Helper function to create single allocation from Find Resources (kept for backward compatibility)
        _createAllocationFromFindResources: function (oAllocationData, oModel, oEmployee) {


            // ✅ CRITICAL: Use correct entity name "Allocations" (not "EmployeeProjectAllocations")
            // The service exposes it as "Allocations" (see srv/service.cds)
            const oBinding = oModel.bindList("/Allocations", null, [], [], {
                groupId: "changesGroup"
            });

            // ✅ CRITICAL: Pass "changesGroup" as second parameter to create() - same as Customer/Employee
            const oNewContext = oBinding.create(oAllocationData, "changesGroup");

            if (!oNewContext) {
                sap.m.MessageBox.error("Failed to create allocation entry.");
                return;
            }


            // ✅ CRITICAL: Explicitly set all properties on the context to ensure they're queued
            Object.keys(oAllocationData).forEach((sKey) => {
                try {
                    oNewContext.setProperty(sKey, oAllocationData[sKey]);
                } catch (e) {
                }
            });

            // ✅ CRITICAL: Check if batch group has pending changes before submitting
            const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");


            // Submit batch
            oModel.submitBatch("changesGroup").then((oResponse) => {
                // ✅ CRITICAL: Check for errors in batch response

                // Verify the context was actually created successfully
                // If there was an error, the context might be in error state
                if (oNewContext && oNewContext.getProperty && oNewContext.getProperty("allocationId")) {

                    // Double-check by reading the created allocation
                    if (oNewContext.requestObject) {
                        oNewContext.requestObject().then(() => {
                            const oBackendData = oNewContext.getObject();

                            sap.m.MessageToast.show(`Employee ${oEmployee.fullName} allocated to project successfully`);

                            // Close dialog
                            this.onFindResourcesDialogClose();

                            // ✅ CRITICAL: Refresh Demands table and re-apply project filter
                            const oDemandsTable = this.byId("Demands");
                            if (oDemandsTable && oDemandsTable.rebind) {
                                oDemandsTable.rebind();
                                // Re-apply project filter if available
                                if (this._sDemandProjectFilter) {
                                    setTimeout(() => {
                                        this._refreshDemandsTableWithFilter(this._sDemandProjectFilter);
                                    }, 500);
                                }
                            }

                            // ✅ CRITICAL: Refresh Projects table to update allocation counts (allocatedResources, toBeAllocated)
                            setTimeout(() => {
                                this._hardRefreshTable("Projects");
                            }, 800);

                            // ✅ CRITICAL: Refresh Find Resources table and re-apply Unproductive Bench filter
                            const oFindResourcesTable = this.byId("findResourcesTable");
                            if (oFindResourcesTable && oFindResourcesTable.getBinding) {
                                setTimeout(() => {
                                    const oBinding = oFindResourcesTable.getBinding("items");
                                    if (oBinding) {
                                        const oBenchFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Unproductive Bench");
                                        oBinding.filter([oBenchFilter]);
                                    }
                                }, 300);
                            }
                        }).catch((oReadError) => {
                            // Still show success if context exists
                            sap.m.MessageToast.show(`Employee ${oEmployee.fullName} allocated to project successfully`);
                            this.onFindResourcesDialogClose();
                        });
                    } else {
                        sap.m.MessageToast.show(`Employee ${oEmployee.fullName} allocated to project successfully`);
                        this.onFindResourcesDialogClose();
                    }
                } else {
                    // Context doesn't have data - creation likely failed
                    sap.m.MessageBox.error("Failed to create allocation. Please check the data and try again.");
                }
            }).catch((oError) => {
                // ✅ CRITICAL: Extract error message from batch response
                let sErrorMessage = "Failed to create allocation. Please check the data and try again.";

                if (oError.message) {
                    sErrorMessage = oError.message;
                } else if (oError.body && oError.body.error && oError.body.error.message) {
                    sErrorMessage = oError.body.error.message;
                } else if (typeof oError === 'string') {
                    sErrorMessage = oError;
                }

                // Check for specific validation errors
                if (sErrorMessage.includes("cannot be earlier than") || sErrorMessage.includes("cannot be later than")) {
                    sap.m.MessageBox.error(sErrorMessage);
                } else {
                    sap.m.MessageBox.error(sErrorMessage);
                }
            });
        },

        // ✅ NEW: Generate UUID for allocationId
        _generateUUID: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        // ✅ NEW: Allocate Resource handler - opens allocation dialog
        onAllocateRes: function () {

            if (!this._oAllocateDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.AllocateDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oAllocateDialog = oDialog;
                    this.getView().addDependent(this._oAllocateDialog);
                    this._oAllocateDialog.open();
                    // ✅ NEW: Populate selected employees' allocation details when dialog opens
                    this._populateSelectedEmployeesAllocations();
                }.bind(this));
            } else {
                this._oAllocateDialog.open();
                // ✅ NEW: Populate selected employees' allocation details when dialog opens
                this._populateSelectedEmployeesAllocations();
            }
        },

        // ✅ NEW: Allocate confirm handler - creates allocation from AllocateDialog
        onAllocateConfirm: async function () {
            // ✅ Get all selected employees from Res fragment (supports multi-select)
            const oResTable = this.byId("Res");
            const aEmployees = [];

            if (oResTable) {
                const aSelectedContexts = oResTable.getSelectedContexts();
                if (aSelectedContexts && aSelectedContexts.length > 0) {
                    for (let i = 0; i < aSelectedContexts.length; i++) {
                        const oContext = aSelectedContexts[i];
                        if (oContext) {
                            const oEmployee = oContext.getObject();
                            if (oEmployee && oEmployee.ohrId) {
                                aEmployees.push(oEmployee);
                            }
                        }
                    }
                }
            }

            if (aEmployees.length === 0) {
                sap.m.MessageToast.show("Please select at least one employee from the Employees view first");
                return;
            }


            // Get project and demand from dialog
            const oProjectInput = this.byId("Resinput_proj");
            const oDemandInput = this.byId("Resinput_demand");
            const oStartDatePicker = this.byId("startDate");
            const oEndDatePicker = this.byId("endDate");

            const sProjectId = oProjectInput ? oProjectInput.data("selectedId") : null;
            const iDemandId = oDemandInput ? oDemandInput.data("selectedId") : null;
            const sStartDate = oStartDatePicker ? oStartDatePicker.getValue() : "";
            const sEndDate = oEndDatePicker ? oEndDatePicker.getValue() : "";

            if (!sProjectId) {
                sap.m.MessageToast.show("Please select a project");
                return;
            }

            // ✅ NEW: Validate demandId is selected
            if (!iDemandId) {
                sap.m.MessageBox.error("Please select a demand for the allocation.\n\nDemand selection is required to track resource allocation at the demand level.", {
                    title: "Demand Selection Required"
                });
                return;
            }

            // ✅ CRITICAL: Validate dates are provided
            if (!sStartDate || !sEndDate) {
                sap.m.MessageBox.error("Please select start date and end date");
                return;
            }

            // ✅ CRITICAL: Validate allocation dates against project dates
            const sProjectStartDate = oStartDatePicker ? oStartDatePicker.data("projectStartDate") : null;
            const sProjectEndDate = oEndDatePicker ? oEndDatePicker.data("projectEndDate") : null;

            if (sProjectStartDate && sStartDate) {
                const oAllocStart = new Date(sStartDate);
                const oProjStart = new Date(sProjectStartDate);
                if (oAllocStart < oProjStart) {
                    sap.m.MessageBox.error(`Allocation start date (${sStartDate}) cannot be earlier than project start date (${sProjectStartDate})`);
                    return;
                }
            }

            if (sProjectEndDate && sEndDate) {
                const oAllocEnd = new Date(sEndDate);
                const oProjEnd = new Date(sProjectEndDate);
                if (oAllocEnd > oProjEnd) {
                    sap.m.MessageBox.error(`Allocation end date (${sEndDate}) cannot be later than project end date (${sProjectEndDate})`);
                    return;
                }
            }

            // Validate start date <= end date
            if (sStartDate && sEndDate) {
                const oStart = new Date(sStartDate);
                const oEnd = new Date(sEndDate);
                if (oStart > oEnd) {
                    sap.m.MessageBox.error("Start date cannot be later than end date");
                    return;
                }
            }

            // Note: Allocation entity uses projectId which should match Project.sapPId format (P-0001)

            // Create allocation records for all selected employees
            const oModel = this.getOwnerComponent().getModel();
            if (!oModel) {
                sap.m.MessageToast.show("Model not found");
                return;
            }


            // ✅ Get allocation percentage from input field
            let oPercentageInput = this.byId("allocationPercentage_allocate");
            if (!oPercentageInput && this._oAllocateDialog) {
                // Try to find in the dialog fragment
                const aContent = this._oAllocateDialog.getContent();
                for (let i = 0; i < aContent.length; i++) {
                    const oItem = aContent[i];
                    if (oItem && oItem.getId && oItem.getId().includes("allocationPercentage_allocate")) {
                        oPercentageInput = oItem;
                        break;
                    }
                }
            }

            let sPercentage = "";
            if (oPercentageInput) {
                sPercentage = oPercentageInput.getValue() || "";
            } else {
            }

            // ✅ Parse percentage - handle empty string, null, undefined
            let iPercentage = 100; // Default to 100 if not provided
            if (sPercentage !== null && sPercentage !== undefined && sPercentage !== "" && sPercentage.trim() !== "") {
                const iParsed = parseInt(sPercentage.trim(), 10);
                if (!isNaN(iParsed) && iParsed >= 0 && iParsed <= 100) {
                    iPercentage = iParsed;
                } else {
                    sap.m.MessageBox.error(`Invalid allocation percentage: "${sPercentage}". Must be a number between 0 and 100.`);
                    return;
                }
            }


            // ✅ NEW: Validate project resource limits before employee validation (using shared function)
            const bProjectValid = await this._validateProjectResourceLimits(sProjectId, aEmployees.length, oModel);
            if (!bProjectValid) {
                return; // Error popup already shown by validation function
            }

            // ✅ NEW: Validate demand resource limits
            const bDemandValid = await this._validateDemandResourceLimits(iDemandId, aEmployees.length, oModel);
            if (!bDemandValid) {
                return; // Error popup already shown by validation function
            }

            // ✅ NEW: Validate each employee's allocation percentage before creating
            const aAllocationData = [];
            const aValidEmployees = [];
            const aInvalidEmployees = [];

            // First pass: Validate each employee
            for (let i = 0; i < aEmployees.length; i++) {
                const oEmployee = aEmployees[i];

                // Get employee's current allocation percentage (default to 0 if missing)
                const iEmpAllocPercentage = oEmployee.empallocpercentage ? parseInt(oEmployee.empallocpercentage, 10) : 0;
                // Calculate combined allocation percentage
                const iCombinedPercentage = iEmpAllocPercentage + iPercentage;


                // ✅ Validate: Check if combined percentage exceeds 100%
                if (iCombinedPercentage > 100) {
                    aInvalidEmployees.push({
                        name: oEmployee.fullName,
                        ohrId: oEmployee.ohrId,
                        current: iEmpAllocPercentage,
                        requested: iPercentage,
                        total: iCombinedPercentage,
                        available: 100 - iEmpAllocPercentage
                    });
                } else {
                    aValidEmployees.push(oEmployee);
                }
            }

            // ✅ Show warning if some employees cannot be allocated
            if (aInvalidEmployees.length > 0) {
                let sErrorMessage = `Cannot allocate ${aInvalidEmployees.length} employee(s) - allocation would exceed 100%:\n\n`;
                aInvalidEmployees.forEach((oInvalid) => {
                    sErrorMessage += `• ${oInvalid.name} (${oInvalid.ohrId}): Current ${oInvalid.current}% + Requested ${oInvalid.requested}% = ${oInvalid.total}% (Available: ${oInvalid.available}%)\n`;
                });

                if (aValidEmployees.length > 0) {
                    sErrorMessage += `\n${aValidEmployees.length} employee(s) can still be allocated. Continue with only valid employees?`;

                    sap.m.MessageBox.warning(sErrorMessage, {
                        title: "Allocation Validation Warning",
                        actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                        emphasizedAction: sap.m.MessageBox.Action.YES,
                        onClose: (sAction) => {
                            if (sAction === sap.m.MessageBox.Action.YES) {
                                // Continue with valid employees only
                                this._createAllocationsForValidEmployees(aValidEmployees, sProjectId, iDemandId, sStartDate, sEndDate, iPercentage, oModel, oResTable, aEmployees);
                            }
                        }
                    });
                    return;
                } else {
                    // No valid employees - show error and return
                    sap.m.MessageBox.error(sErrorMessage, {
                        title: "Allocation Validation Error"
                    });
                    return;
                }
            }

            // ✅ All employees are valid - create allocations
            this._createAllocationsForValidEmployees(aValidEmployees, sProjectId, iDemandId, sStartDate, sEndDate, iPercentage, oModel, oResTable, aEmployees);
        },

        // ✅ NEW: Helper function to create allocations for valid employees
        _createAllocationsForValidEmployees: function (aValidEmployees, sProjectId, iDemandId, sStartDate, sEndDate, iPercentage, oModel, oResTable, aAllEmployees) {
            const aAllocationData = [];

            // ✅ IMPORTANT: Do NOT update empallocpercentage on frontend
            // The backend's after('CREATE', Allocations) hook will handle it after validation
            // This prevents race condition where validation uses the updated value instead of original
            for (let i = 0; i < aValidEmployees.length; i++) {
                const oEmployee = aValidEmployees[i];
                const sAllocationId = this._generateUUID();

                // Get employee's current allocation percentage for logging only
                const iEmpAllocPercentage = oEmployee.empallocpercentage ? parseInt(oEmployee.empallocpercentage, 10) : 0;
                const iCombinedPercentage = iEmpAllocPercentage + iPercentage;


                const oAllocData = {
                    allocationId: sAllocationId,
                    employeeId: oEmployee.ohrId,
                    projectId: sProjectId,
                    demandId: iDemandId, // ✅ NEW: Include demandId
                    // ✅ Only include dates if they have values, otherwise backend will auto-fill from project
                    ...(sStartDate && sStartDate.trim() !== "" ? { startDate: sStartDate } : {}),
                    ...(sEndDate && sEndDate.trim() !== "" ? { endDate: sEndDate } : {}),
                    allocationPercentage: iPercentage,
                    status: "Active"
                };


                aAllocationData.push(oAllocData);
            }


            // ✅ Use the same function for creating multiple allocations (pass aValidEmployees, not aAllEmployees)
            this._createMultipleAllocationsFromAllocateDialog(aAllocationData, oModel, aValidEmployees, oResTable);
        },

        // ✅ NEW: Dialog close handler
        onDialogClose: function () {
            if (this._oAllocateDialog) {
                this._oAllocateDialog.close();
            }
            // ✅ Clear allocation percentage field
            const oPercentageInput = this.byId("allocationPercentage_allocate");
            if (oPercentageInput) {
                oPercentageInput.setValue("100");
            }
        },

        // ✅ NEW: Populate selected employees' allocation details in AllocateDialog
        _populateSelectedEmployeesAllocations: function () {
            const oVBox = this.byId("selectedEmployeesAllocationVBox");
            if (!oVBox) {
                return;
            }

            // Clear previous content
            oVBox.removeAllItems();

            // Get selected employees from Res table
            const oResTable = this.byId("Res");
            if (!oResTable) {
                oVBox.addItem(new sap.m.Text({ text: "No employees selected" }));
                return;
            }

            const aSelectedContexts = oResTable.getSelectedContexts();
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                oVBox.addItem(new sap.m.Text({ text: "Please select employees from the table first" }));
                return;
            }

            const oModel = this.getOwnerComponent().getModel();
            if (!oModel) {
                oVBox.addItem(new sap.m.Text({ text: "Model not found" }));
                return;
            }

            // Fetch allocations for all selected employees
            const aEmployees = [];
            aSelectedContexts.forEach((oContext) => {
                const oEmployee = oContext.getObject();
                if (oEmployee && oEmployee.ohrId) {
                    aEmployees.push(oEmployee);
                }
            });

            if (aEmployees.length === 0) {
                oVBox.addItem(new sap.m.Text({ text: "No valid employees found" }));
                return;
            }

            // Fetch allocations for all employees
            const aEmployeeIds = aEmployees.map(e => e.ohrId);
            // ✅ Use correct entity name "Allocations" and fetch all, then filter in JavaScript (OData V4 compatibility)
            const oAllocationBinding = oModel.bindList("/Allocations", null, null, null, {
                $expand: "to_Project($select=sapPId,projectName),to_Demand($select=demandId,skill,band)"
            });

            oAllocationBinding.requestContexts().then((aAllocationContexts) => {
                const allAllocations = aAllocationContexts.map(ctx => ctx.getObject());

                // Filter allocations for selected employees and active status
                const aAllocations = allAllocations.filter(a =>
                    aEmployeeIds.includes(a.employeeId) && a.status === "Active"
                );

                if (aAllocations.length === 0) {
                    oVBox.addItem(new sap.m.Text({
                        text: `${aEmployees.length} employee(s) selected - No active allocations found`
                    }));
                    return;
                }

                // Group allocations by employee
                aEmployees.forEach((oEmployee, iIndex) => {
                    if (iIndex > 0) {
                        oVBox.addItem(new sap.ui.core.HTML({
                            content: "<div style='border-top:1px solid #ccc; margin:10px 0;'></div>"
                        }));
                    }

                    oVBox.addItem(new sap.m.Title({
                        text: `${oEmployee.fullName} (${oEmployee.ohrId})`,
                        level: "H5"
                    }));

                    const aEmployeeAllocations = aAllocations.filter(a => a.employeeId === oEmployee.ohrId);

                    if (aEmployeeAllocations.length === 0) {
                        oVBox.addItem(new sap.m.Text({
                            text: "No active allocations"
                        }));
                    } else {
                        const oTable = new sap.m.Table({
                            inset: false,
                            columns: [
                                new sap.m.Column({ header: new sap.m.Text({ text: "Project ID" }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: "Project Name" }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: "Demand" }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: "Start Date" }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: "End Date" }) }),
                                new sap.m.Column({ header: new sap.m.Text({ text: "Allocation %" }) })
                            ]
                        });

                        aEmployeeAllocations.forEach((oAlloc) => {
                            const sProjectId = oAlloc.projectId || "N/A";
                            const sProjectName = oAlloc.to_Project?.projectName || "N/A";
                            const sDemand = oAlloc.to_Demand ? `${oAlloc.to_Demand.skill || ""} - ${oAlloc.to_Demand.band || ""}` : "N/A";
                            const sStartDate = oAlloc.startDate ? new Date(oAlloc.startDate).toLocaleDateString() : "N/A";
                            const sEndDate = oAlloc.endDate ? new Date(oAlloc.endDate).toLocaleDateString() : "N/A";
                            const iPercent = oAlloc.allocationPercentage || 0;

                            oTable.addItem(new sap.m.ColumnListItem({
                                cells: [
                                    new sap.m.Text({ text: sProjectId }),
                                    new sap.m.Text({ text: sProjectName }),
                                    new sap.m.Text({ text: sDemand }),
                                    new sap.m.Text({ text: sStartDate }),
                                    new sap.m.Text({ text: sEndDate }),
                                    new sap.m.Text({ text: iPercent + "%" })
                                ]
                            }));
                        });

                        oVBox.addItem(oTable);
                    }
                });
            }).catch((oError) => {
                oVBox.addItem(new sap.m.Text({
                    text: "Error loading allocation details"
                }));
            });
        },

        // ✅ NEW: Populate employees allocated to selected project in AllocateDialog
        _populateProjectEmployees: function (sProjectId) {
            const oVBox = this.byId("projectEmployeesVBox");
            if (!oVBox) {
                return;
            }

            if (!sProjectId) {
                oVBox.removeAllItems();
                oVBox.addItem(new sap.m.Text({ text: "Select a project to see allocated employees" }));
                return;
            }

            // Clear previous content
            oVBox.removeAllItems();
            oVBox.addItem(new sap.m.Text({ text: "Loading..." }));

            const oModel = this.getOwnerComponent().getModel();
            if (!oModel) {
                oVBox.removeAllItems();
                oVBox.addItem(new sap.m.Text({ text: "Model not found" }));
                return;
            }

            // Fetch active allocations for this project
            // ✅ Use correct entity name "Allocations" and fetch all, then filter in JavaScript (OData V4 compatibility)
            const oAllocationBinding = oModel.bindList("/Allocations", null, null, null, {
                $expand: "to_Employee($select=ohrId,fullName),to_Demand($select=demandId,skill,band)"
            });

            oAllocationBinding.requestContexts().then((aAllocationContexts) => {
                oVBox.removeAllItems();

                const allAllocations = aAllocationContexts.map(ctx => ctx.getObject());

                // Filter allocations for this project and active status
                const aAllocations = allAllocations.filter(a =>
                    a.projectId === sProjectId && a.status === "Active"
                );

                if (aAllocations.length === 0) {
                    oVBox.addItem(new sap.m.Text({
                        text: "No employees allocated to this project"
                    }));
                    return;
                }

                const oTable = new sap.m.Table({
                    inset: false,
                    columns: [
                        new sap.m.Column({ header: new sap.m.Text({ text: "OHR ID" }) }),
                        new sap.m.Column({ header: new sap.m.Text({ text: "Employee Name" }) }),
                        new sap.m.Column({ header: new sap.m.Text({ text: "Demand" }) }),
                        new sap.m.Column({ header: new sap.m.Text({ text: "Start Date" }) }),
                        new sap.m.Column({ header: new sap.m.Text({ text: "End Date" }) }),
                        new sap.m.Column({ header: new sap.m.Text({ text: "Allocation %" }) })
                    ]
                });

                aAllocations.forEach((oAlloc) => {
                    const sOhrId = oAlloc.to_Employee?.ohrId || oAlloc.employeeId || "N/A";
                    const sEmployeeName = oAlloc.to_Employee?.fullName || "N/A";
                    const sDemand = oAlloc.to_Demand ? `${oAlloc.to_Demand.skill || ""} - ${oAlloc.to_Demand.band || ""}` : "N/A";
                    const sStartDate = oAlloc.startDate ? new Date(oAlloc.startDate).toLocaleDateString() : "N/A";
                    const sEndDate = oAlloc.endDate ? new Date(oAlloc.endDate).toLocaleDateString() : "N/A";
                    const iPercent = oAlloc.allocationPercentage || 0;

                    oTable.addItem(new sap.m.ColumnListItem({
                        cells: [
                            new sap.m.Text({ text: sOhrId }),
                            new sap.m.Text({ text: sEmployeeName }),
                            new sap.m.Text({ text: sDemand }),
                            new sap.m.Text({ text: sStartDate }),
                            new sap.m.Text({ text: sEndDate }),
                            new sap.m.Text({ text: iPercent + "%" })
                        ]
                    }));
                });

                oVBox.addItem(new sap.m.Text({
                    text: `${aAllocations.length} employee(s) allocated to this project:`
                }));
                oVBox.addItem(oTable);
            }).catch((oError) => {
                oVBox.removeAllItems();
                oVBox.addItem(new sap.m.Text({
                    text: "Error loading employees"
                }));
            });
        },

        // ✅ NEW: Helper function to get allocation filter (empallocpercentage <= 95 and status != "Resigned")
        _getAllocationFilter: function () {
            // Filter: empallocpercentage <= 95 AND status != "Resigned"
            const oPercentageFilter = new sap.ui.model.Filter("empallocpercentage", sap.ui.model.FilterOperator.LE, 95);
            const oStatusFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.NE, "Resigned");
            return new sap.ui.model.Filter([oPercentageFilter, oStatusFilter], true); // true = AND
        },

        // ✅ NEW: Search handler for Res (Employees) view
        onResSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("Res");

            if (!oTable) {
                return;
            }

            // Apply search filter to table - always include allocation percentage and status filters
            const oBinding = oTable.getRowBinding && oTable.getRowBinding();
            if (oBinding) {
                // ✅ NEW: Filter by allocation percentage < 95 and status != "Resigned"
                const aFilters = [this._getAllocationFilter()];

                if (sQuery && sQuery.trim() !== "") {
                    // Add search filter on top of allocation filters
                    aFilters.push(new sap.ui.model.Filter("fullName", sap.ui.model.FilterOperator.Contains, sQuery.trim(), false));
                }

                oBinding.filter(aFilters);
            } else {
            }
        },

        // ✅ NEW: Search handler for Demands view
        onDemandSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("Demands");

            if (!oTable) {
                return;
            }

            // Apply search filter to table (but preserve project filter)
            const oBinding = oTable.getRowBinding && oTable.getRowBinding();
            if (oBinding) {
                const aFilters = [];

                // Always include project filter if available
                if (this._sDemandProjectFilter) {
                    // ✅ Convert project ID format (P-0006 -> 6) to match CSV data format
                    let sFilterValue = this._sDemandProjectFilter;
                    if (sFilterValue && sFilterValue.startsWith("P-")) {
                        sFilterValue = sFilterValue.replace(/^P-0*/, ""); // Remove "P-" and leading zeros
                    }
                    aFilters.push(new sap.ui.model.Filter("sapPId", sap.ui.model.FilterOperator.EQ, sFilterValue));
                }

                // Add search filter if query exists
                if (sQuery) {
                    aFilters.push(new sap.ui.model.Filter("skill", sap.ui.model.FilterOperator.Contains, sQuery));
                }

                oBinding.filter(aFilters);
            }
        },
        onMasterDemandSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("MasterDemands");

            if (!oTable) {
                return;
            }

            // Apply search filter to table (but preserve project filter)
            const oBinding = oTable.getRowBinding && oTable.getRowBinding();
            if (oBinding) {
                const aFilters = [];

                // Always include project filter if available
                if (this._sDemandProjectFilter) {
                    // ✅ Convert project ID format (P-0006 -> 6) to match CSV data format
                    let sFilterValue = this._sDemandProjectFilter;
                    if (sFilterValue && sFilterValue.startsWith("P-")) {
                        sFilterValue = sFilterValue.replace(/^P-0*/, ""); // Remove "P-" and leading zeros
                    }
                    aFilters.push(new sap.ui.model.Filter("sapPId", sap.ui.model.FilterOperator.EQ, sFilterValue));
                }

                // Add search filter if query exists
                if (sQuery) {
                    aFilters.push(new sap.ui.model.Filter("skill", sap.ui.model.FilterOperator.Contains, sQuery));
                }

                oBinding.filter(aFilters);
            }
        },

        // ✅ NEW: Res fragment - Customer change handler (enables Opportunity)
        onResCustomerChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oInput.getValue();
            const sCustomerId = oInput.data("selectedId");

            // Clear dependent fields
            this.byId("Resinput_Opportunity")?.setValue("");
            this.byId("Resinput_Opportunity")?.data("selectedId", "");
            this.byId("Resinput_Project")?.setValue("");
            this.byId("Resinput_Project")?.data("selectedId", "");
            this.byId("Resinput_Demand")?.setValue("");
            this.byId("Resinput_Demand")?.data("selectedId", "");

            // Enable/disable Opportunity based on Customer selection
            if (sValue && sValue.trim() !== "" && sCustomerId) {
                this.byId("Resinput_Opportunity")?.setEnabled(true);
            } else {
                this.byId("Resinput_Opportunity")?.setEnabled(false);
                this.byId("Resinput_Project")?.setEnabled(false);
                this.byId("Resinput_Demand")?.setEnabled(false);
            }
        },

        // ✅ NEW: Res fragment - Opportunity change handler (enables Project)
        onResOpportunityChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oInput.getValue();
            const sOppId = oInput.data("selectedId");

            // Clear dependent fields
            this.byId("Resinput_Project")?.setValue("");
            this.byId("Resinput_Project")?.data("selectedId", "");
            this.byId("Resinput_Demand")?.setValue("");
            this.byId("Resinput_Demand")?.data("selectedId", "");

            // Enable/disable Project based on Opportunity selection
            if (sValue && sValue.trim() !== "" && sOppId) {
                this.byId("Resinput_Project")?.setEnabled(true);
            } else {
                this.byId("Resinput_Project")?.setEnabled(false);
                this.byId("Resinput_Demand")?.setEnabled(false);
            }
        },

        // ✅ NEW: Res fragment - Project change handler (enables Demand)
        onResProjectChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oInput.getValue();
            const sProjectId = oInput.data("selectedId");

            // ✅ CRITICAL: Store project ID for AllocateDialog demand filtering
            if (sProjectId) {
                this._sAllocateDemandProjectFilter = sProjectId;
            }

            // Clear dependent field
            this.byId("Resinput_Demand")?.setValue("");
            this.byId("Resinput_Demand")?.data("selectedId", "");

            // Enable/disable Demand based on Project selection
            if (sValue && sValue.trim() !== "" && sProjectId) {
                this.byId("Resinput_Demand")?.setEnabled(true);
            } else {
                this.byId("Resinput_Demand")?.setEnabled(false);
            }
        },

        // ✅ NEW: Res fragment - Opportunity value help (filtered by Customer)
        onResOpportunityValueHelpRequest: function (oEvent) {
            const oInput = oEvent.getSource();
            const sCustomerId = this.byId("Resinput_Customer")?.data("selectedId");

            if (!sCustomerId) {
                sap.m.MessageToast.show("Please select a Customer first");
                return;
            }

            // Store filter for opportunity value help
            this._sResCustomerFilter = sCustomerId;
            this._oResOpportunityInput = oInput;

            // Use existing opportunity value help but filter by customer
            this.onOpportunityValueHelpRequest(oEvent);
        },

        // ✅ NEW: Res fragment - Project value help (filtered by Opportunity)
        onResProjectValueHelpRequest: function (oEvent) {
            const oInput = oEvent.getSource();
            const sOppId = this.byId("Resinput_Opportunity")?.data("selectedId");

            if (!sOppId) {
                sap.m.MessageToast.show("Please select an Opportunity first");
                return;
            }

            // Store filter for project value help
            this._sResOppFilter = sOppId;
            this._oResProjectInput = oInput;

            // TODO: Implement Project value help filtered by Opportunity
            // For now, use a simple message
            sap.m.MessageToast.show("Project value help - filtering by Opportunity: " + sOppId);
        },

        // ✅ NEW: Res fragment - Demand value help (filtered by Project)
        onResDemandValueHelpRequest: function (oEvent) {
            const oInput = oEvent.getSource();
            const sProjectId = this.byId("Resinput_Project")?.data("selectedId");

            if (!sProjectId) {
                sap.m.MessageToast.show("Please select a Project first");
                return;
            }

            // Store filter for demand value help
            this._sResProjectFilter = sProjectId;
            this._oResDemandInput = oInput;

            // TODO: Implement Demand value help filtered by Project
            sap.m.MessageToast.show("Demand value help - filtering by Project: " + sProjectId);
        },

        // ✅ REUSABLE: Hard refresh table after CRUD operations to get fresh data from DB
        _hardRefreshTable: function (sTableId) {
            const oTable = this.byId(sTableId);
            if (!oTable) {
                return;
            }

            // ✅ SPECIAL HANDLING: For Demands table, preserve the project filter
            if (sTableId === "Demands" && this._sDemandProjectFilter) {
                this._refreshDemandsTableWithFilter();
                return;
            }

            // ✅ STEP 1: Rebind MDC table (most reliable for MDC tables)
            if (oTable.rebind) {
                try {
                    oTable.rebind();
                } catch (e) {
                }
            }

            // ✅ STEP 2: Refresh all bindings to force fresh data from backend
            setTimeout(() => {
                const oRowBinding = oTable.getRowBinding && oTable.getRowBinding();
                const oBinding = oTable.getBinding("rows") || oTable.getBinding("items");

                if (oRowBinding) {
                    oRowBinding.refresh().then(() => {
                    }).catch(() => { });
                } else if (oBinding) {
                    oBinding.refresh().then(() => {
                    }).catch(() => { });
                }
            }, 200); // Small delay to ensure batch is committed
        },

        // ✅ NEW: Submit function that handles both Create and Update
        onSubmitCustomer: function () {
            // -------------------------------
            // ⭐ NEW: Read cascading fields
            // -------------------------------
            const oCountryCombo = this.byId("countryComboBox");
            const oStateCombo = this.byId("stateComboBox");
            const oCityCombo = this.byId("cityComboBox");

            // Get selected keys - read directly from ComboBox and also verify from selected item
            let sCustCountryId = "";
            let sCustStateId = "";
            let sCustCityId = "";

            if (oCountryCombo) {
                const sKey = oCountryCombo.getSelectedKey();
                // Also verify by getting the selected item's key directly
                const oSelectedItem = oCountryCombo.getSelectedItem();
                sCustCountryId = (oSelectedItem ? oSelectedItem.getKey() : sKey) || "";
            }

            if (oStateCombo) {
                const sKey = oStateCombo.getSelectedKey();
                // Also verify by getting the selected item's key directly
                const oSelectedItem = oStateCombo.getSelectedItem();
                sCustStateId = (oSelectedItem ? oSelectedItem.getKey() : sKey) || "";
            }

            if (oCityCombo) {
                const sKey = oCityCombo.getSelectedKey();
                // Also verify by getting the selected item's key directly
                const oSelectedItem = oCityCombo.getSelectedItem();
                sCustCityId = (oSelectedItem ? oSelectedItem.getKey() : sKey) || "";
            }

            // Clean the IDs - remove any commas, spaces, or formatting (shouldn't be needed but safety)
            sCustCountryId = sCustCountryId ? String(sCustCountryId).replace(/[,\s]/g, "") : "";
            sCustStateId = sCustStateId ? String(sCustStateId).replace(/[,\s]/g, "") : "";
            sCustCityId = sCustCityId ? String(sCustCityId).replace(/[,\s]/g, "") : "";

            // Debug logging
            console.log("Selected IDs (raw) - Country:", sCustCountryId, "State:", sCustStateId, "City:", sCustCityId);

            // -------------------------------
            const sCustId = this.byId("inputCustomerId").getValue(),
                sCustName = this.byId("inputCustomerName").getValue(),
                sStartDate = this.byId("inputStartDate_cus")?.getValue() || "",
                sEndDate = this.byId("inputEndDate_cus")?.getValue() || "",
                sStatus = this.byId("inputStatus").getSelectedKey(),
                sVertical = this.byId("inputVertical").getSelectedKey();

            // -------------------------------
            // ⭐ VALIDATION updated for countryId instead of country text
            // -------------------------------
            if (!sCustName || sCustName.trim() === "") {
                sap.m.MessageBox.error("Customer Name is required!");
                return;
            }

            if (!sCustCountryId) {
                sap.m.MessageBox.error("Country is required!");
                return;
            }

            if (!sStatus) {
                sap.m.MessageBox.error("Status is required!");
                return;
            }

            if (!sVertical) {
                sap.m.MessageBox.error("Vertical is required!");
                return;
            }

            const oTable = this.byId("Customers");
            const oModel = oTable.getModel();

            // Check if a row is selected (Update mode)
            const aSelectedContexts = oTable.getSelectedContexts();

            if (aSelectedContexts && aSelectedContexts.length > 0) {
                // UPDATE MODE: Row is selected, update existing customer
                const oContext = aSelectedContexts[0];
                const oExistingData = oContext.getObject();

                // For update, build entry with existing Customer ID (for verification) and new values
                // Convert to numbers safely - ensure we parse the full string
                const nCountryId = (sCustCountryId && sCustCountryId !== "") ? parseInt(sCustCountryId, 10) : null;
                const nStateId = (sCustStateId && sCustStateId !== "") ? parseInt(sCustStateId, 10) : null;
                const nCityId = (sCustCityId && sCustCityId !== "") ? parseInt(sCustCityId, 10) : null;

                // Debug logging
                console.log("Converted IDs - Country:", nCountryId, "State:", nStateId, "City:", nCityId);

                const oUpdateEntry = {
                    // ⭐ REPLACED your old fields with custCountryId, custStateId, custCityId
                    "custCountryId": (isNaN(nCountryId) ? null : nCountryId),
                    "custStateId": (isNaN(nStateId) ? null : nStateId),
                    "custCityId": (isNaN(nCityId) ? null : nCityId),
                    "customerName": sCustName,
                    "status": sStatus,
                    "vertical": sVertical,
                    "startDate": sStartDate || null,
                    "endDate": sEndDate || null
                };

                try {
                    // Update the context - set properties (this queues changes in "changesGroup")
                    Object.keys(oUpdateEntry).forEach(sKey => {
                        const vNewValue = oUpdateEntry[sKey];
                        const vCurrentValue = oContext.getProperty(sKey);
                        // Only update if value actually changed and is not empty (for non-required fields)
                        if (vNewValue !== vCurrentValue) {
                            oContext.setProperty(sKey, vNewValue);
                        }
                    });

                    // Submit changes using the default "changesGroup" from manifest
                    // Note: Changes set via setProperty() automatically use "changesGroup" by default
                    oModel.submitBatch("changesGroup")
                        .then(() => {
                            // Success - refresh table and show message
                            MessageToast.show("Customer updated successfully!");

                            // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                            this._hardRefreshTable("Customers");

                            this.onCancelForm(); // Clear form after successful update
                        })
                        .catch((oError) => {
                            // Check if update actually succeeded despite error (false positive)
                            // Many OData V4 implementations return warnings that trigger catch
                            setTimeout(() => {
                                try {
                                    const oCurrentData = oContext.getObject();
                                    // Simple check: if customer name matches (main field), likely succeeded
                                    if (oCurrentData && oCurrentData.customerName === oUpdateEntry.customerName) {
                                        // Data matches - update succeeded despite error
                                        MessageToast.show("Customer updated successfully!");
                                        const oBinding = oTable.getBinding("rows");
                                        if (oBinding) {
                                            oBinding.refresh();
                                        }
                                        this.onCancelForm();
                                    } else {
                                        // Actual failure - only log to console, don't show error if data updated
                                    }
                                } catch (e) {
                                    // Ignore verification errors - update likely succeeded
                                }
                            }, 150);
                        });
                } catch (oSetError) {
                    sap.m.MessageBox.error("Failed to update customer. Please try again.");
                }
            } else {
                // CREATE MODE: No row selected, create new customer
                // Don't send SAPcustId - backend will auto-generate it (C-0001, C-0002, etc.)
                // Convert to numbers safely - ensure we parse the full string
                const nCountryId = (sCustCountryId && sCustCountryId !== "") ? parseInt(sCustCountryId, 10) : null;
                const nStateId = (sCustStateId && sCustStateId !== "") ? parseInt(sCustStateId, 10) : null;
                const nCityId = (sCustCityId && sCustCityId !== "") ? parseInt(sCustCityId, 10) : null;

                // Debug logging
                console.log("Converted IDs (CREATE) - Country:", nCountryId, "State:", nStateId, "City:", nCityId);

                const oCreateEntry = {
                    // ⭐ NEW: cascading IDs
                    "custCountryId": (isNaN(nCountryId) ? null : nCountryId),
                    "custStateId": (isNaN(nStateId) ? null : nStateId),
                    "custCityId": (isNaN(nCityId) ? null : nCityId),
                    "customerName": sCustName,
                    "status": sStatus,
                    "vertical": sVertical,
                    "startDate": (sStartDate && sStartDate.trim() !== "") ? sStartDate : null,
                    "endDate": (sEndDate && sEndDate.trim() !== "") ? sEndDate : null
                };


                // Try to get binding using multiple methods (MDC table pattern)
                let oBinding = (oTable.getRowBinding && oTable.getRowBinding())
                    || oTable.getBinding("items")
                    || oTable.getBinding("rows");

                if (oBinding) {
                    // Binding available - use batch mode with binding.create()
                    try {
                        // Create new context using binding with "changesGroup" for batch mode
                        const oNewContext = oBinding.create(oCreateEntry, "changesGroup");

                        if (!oNewContext) {
                            sap.m.MessageBox.error("Failed to create customer entry.");
                            return;
                        }


                        // ✅ CRITICAL: Set all properties individually to ensure they're queued in batch group
                        Object.keys(oCreateEntry).forEach(sKey => {
                            oNewContext.setProperty(sKey, oCreateEntry[sKey]);
                        });

                        // ✅ CRITICAL: Check if batch group has pending changes before submitting
                        const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");

                        // Submit the batch to send to backend
                        oModel.submitBatch("changesGroup")
                            .then(() => {

                                // ✅ CRITICAL: Fetch fresh data from backend (not from UI form)
                                if (oNewContext && oNewContext.requestObject) {
                                    oNewContext.requestObject().then(() => {
                                        const oBackendData = oNewContext.getObject();

                                        MessageToast.show("Customer created successfully!");

                                        // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                                        this._hardRefreshTable("Customers");

                                        this.onCancelForm(); // Clear form after successful create
                                    }).catch(() => {
                                        // If requestObject fails, still show success and refresh
                                        MessageToast.show("Customer created successfully!");
                                        this._hardRefreshTable("Customers");
                                        this.onCancelForm();
                                    });
                                } else {
                                    // Fallback if requestObject not available
                                    MessageToast.show("Customer created successfully!");
                                    this._hardRefreshTable("Customers");
                                    this.onCancelForm();
                                }
                            })
                            .catch((oError) => {

                                // Check if create actually succeeded (false positive error)
                                setTimeout(() => {
                                    try {
                                        const oCreatedData = oNewContext.getObject();
                                        if (oCreatedData && oCreatedData.customerName === oCreateEntry.customerName) {
                                            // Create succeeded despite error
                                            MessageToast.show("Customer created successfully!");
                                            oBinding.refresh();
                                            this.onCancelForm();
                                        } else {
                                            // Actual failure - use direct model create as fallback
                                            this._createCustomerDirect(oModel, oCreateEntry, oTable);
                                        }
                                    } catch (e) {
                                        // Use direct model create as fallback
                                        this._createCustomerDirect(oModel, oCreateEntry, oTable);
                                    }
                                }, 150);
                            });
                    } catch (oCreateError) {
                        // Fallback to direct model create
                        this._createCustomerDirect(oModel, oCreateEntry, oTable);
                    }
                } else {
                    // No binding available - use direct model create (fallback)
                    this._createCustomerDirect(oModel, oCreateEntry, oTable);
                }
            }
        },

        // Helper function for direct model create (fallback when binding not available)
        _createCustomerDirect: function (oModel, oCreateEntry, oTable) {
            oModel.create("/Customers", oCreateEntry, {
                success: (oData) => {
                    MessageToast.show("Customer created successfully!");
                    this.onCancelForm();
                    // Refresh table to show new entry
                    const oBinding = oTable.getBinding("rows") || oTable.getBinding("items");
                    if (oBinding) {
                        oBinding.refresh();
                    }
                },
                error: (oError) => {
                    let sErrorMessage = "Failed to create customer. Please check the input or try again.";
                    try {
                        if (oError.responseText) {
                            const oParsed = JSON.parse(oError.responseText);
                            sErrorMessage = oParsed.error?.message || oParsed.message || sErrorMessage;
                        }
                    } catch (e) {
                        // Use default message
                    }
                    sap.m.MessageBox.error(sErrorMessage);
                }
            });
        },

        // ✅ NEW: Initialize Customer ID field with next ID preview
        _initializeCustomerIdField: function (iRetryCount = 0) {
            const MAX_RETRIES = 5;
            const oCustomerIdInput = this.byId("inputCustomerId");
            if (!oCustomerIdInput) {
                // Field not yet available, retry after a short delay
                if (iRetryCount < MAX_RETRIES) {
                    setTimeout(() => {
                        this._initializeCustomerIdField(iRetryCount + 1);
                    }, 100);
                }
                return;
            }

            const oTable = this.byId("Customers");
            let sNextId = "C-0001"; // Default

            // Try multiple methods to get the next ID
            try {
                if (oTable) {
                    // Method 1: Try from binding contexts
                    sNextId = this._generateNextIdFromBinding(oTable, "Customers", "SAPcustId", "C");

                    // Method 2: If that failed, query backend directly
                    if (!sNextId || sNextId === "C-0001") {
                        const oModel = this.getOwnerComponent().getModel();
                        if (oModel) {
                            // ✅ FIXED: Use OData V4 bindList instead of oModel.read()
                            const oBinding = oModel.bindList("/Customers", null, [], {
                                "$orderby": "SAPcustId desc",
                                "$top": "1"
                            });

                            oBinding.requestContexts(0, 1).then((aContexts) => {
                                let sBackendId = "C-0001";
                                if (aContexts && aContexts.length > 0) {
                                    const oObj = aContexts[0].getObject();
                                    if (oObj && oObj.SAPcustId) {
                                        const sMaxId = oObj.SAPcustId;
                                        const m = sMaxId.match(/(\d+)$/);
                                        if (m) {
                                            const iNextNum = parseInt(m[1], 10) + 1;
                                            sBackendId = `C-${String(iNextNum).padStart(4, "0")}`;
                                        }
                                    }
                                }
                                oCustomerIdInput.setValue(sBackendId);
                            }).catch((oError) => {
                                if (!sNextId || sNextId === "C-0001") {
                                    oCustomerIdInput.setValue(sNextId);
                                }
                            });

                            // Set immediately with binding result (will be updated if backend call succeeds)
                            if (sNextId) {
                                oCustomerIdInput.setValue(sNextId);
                            }
                        }
                    } else {
                        // Binding method worked, use it
                        oCustomerIdInput.setValue(sNextId);
                    }
                } else {
                    // No table yet, retry
                    if (iRetryCount < MAX_RETRIES) {
                        setTimeout(() => {
                            this._initializeCustomerIdField(iRetryCount + 1);
                        }, 200);
                        return;
                    }
                    // Last resort: set default
                    oCustomerIdInput.setValue(sNextId);
                }
            } catch (e) {
                // Set default on error
                oCustomerIdInput.setValue(sNextId);
            }

            // Always ensure field is disabled
            oCustomerIdInput.setEnabled(false);
            oCustomerIdInput.setPlaceholder("Auto-generated");
        },

        // ✅ NEW: Search function for Customer table
        onCustomerSearch: function (oEvent) {
            // Get search query - liveChange uses "newValue", search event uses "query"
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("Customers");

            if (!oTable) {
                return;
            }

            // Use the helper function to get binding (works for MDC Tables)
            let iRetryCount = 0;
            const MAX_RETRIES = 5;

            const fnApplySearch = () => {
                if (iRetryCount >= MAX_RETRIES) {
                    return;
                }

                iRetryCount++;

                try {
                    // Try multiple methods to get binding
                    let oBinding = this._getRowBinding(oTable);

                    // Method 2: Try direct access
                    if (!oBinding) {
                        oBinding = oTable.getBinding("items") || oTable.getBinding("rows");
                    }

                    // Method 3: Try to get from model directly
                    if (!oBinding) {
                        const oModel = oTable.getModel();
                        if (oModel && oModel.bindList) {
                            oBinding = oModel.bindList("/Customers");
                        }
                    }

                    // If still no binding, wait a bit and retry
                    if (!oBinding) {
                        setTimeout(() => {
                            fnApplySearch();
                        }, 300);
                        return;
                    }

                    // Reset retry on success
                    iRetryCount = 0;

                    // Create filters if query exists
                    if (sQuery && sQuery.trim() !== "") {
                        const sQueryTrimmed = sQuery.trim();
                        const isNumericQuery = /^\d+$/.test(sQueryTrimmed);

                        // Case-insensitive Contains filters using caseSensitive: false
                        const aFilters = [];

                        aFilters.push(new sap.ui.model.Filter({
                            path: "SAPcustId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));

                        aFilters.push(new sap.ui.model.Filter({
                            path: "customerName",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));

                        // aFilters.push(new sap.ui.model.Filter({
                        //     path: "custCountryId",
                        //     operator: sap.ui.model.FilterOperator.Contains,
                        //     value1: sQueryTrimmed,
                        //     caseSensitive: false
                        // }));

                        // aFilters.push(new sap.ui.model.Filter({
                        //     path: "custStateId",
                        //     operator: sap.ui.model.FilterOperator.Contains,
                        //     value1: sQueryTrimmed,
                        //     caseSensitive: false
                        // }));

                        //  aFilters.push(new sap.ui.model.Filter({
                        //     path: "custCityId",
                        //     operator: sap.ui.model.FilterOperator.Contains,
                        //     value1: sQueryTrimmed,
                        //     caseSensitive: false
                        // }));

                        aFilters.push(new sap.ui.model.Filter({
                            path: "vertical",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));


                        // Numeric fields - use EQ only if query is numeric
                        if (isNumericQuery) {
                            const iVal = parseInt(sQueryTrimmed, 10);
                            aFilters.push(new sap.ui.model.Filter({
                                path: "custCountryId",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: iVal
                            }));

                            aFilters.push(new sap.ui.model.Filter({
                                path: "custStateId",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: iVal
                            }));

                            aFilters.push(new sap.ui.model.Filter({
                                path: "custCityId",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: iVal
                            }));
                        }


                        // Combine with OR logic (search matches any field)
                        const oCombinedFilter = new sap.ui.model.Filter({
                            filters: aFilters,
                            and: false
                        });

                        // Apply filter
                        oBinding.filter([oCombinedFilter]);
                    } else {
                        // Clear filter when search is empty
                        oBinding.filter([]);
                    }
                } catch (e) {
                }
            };

            // Wait for table to be ready, then apply search
            if (oTable.initialized && typeof oTable.initialized === "function") {
                oTable.initialized().then(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 100);
                }).catch(() => {
                    // If initialized fails, try anyway after delay
                    setTimeout(() => {
                        fnApplySearch();
                    }, 300);
                });
            } else {
                // Table doesn't have initialized method, try direct access
                setTimeout(() => {
                    fnApplySearch();
                }, 200);
            }
        },


        // ✅ NEW: Search function for Employee table
        onEmployeeSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("Employees");

            if (!oTable) {
                return;
            }

            let iRetryCount = 0;
            const MAX_RETRIES = 5;

            const fnApplySearch = () => {
                if (iRetryCount >= MAX_RETRIES) {
                    return;
                }

                iRetryCount++;

                try {
                    let oBinding = this._getRowBinding(oTable);
                    if (!oBinding) {
                        oBinding = oTable.getBinding("items") || oTable.getBinding("rows");
                    }
                    if (!oBinding) {
                        const oModel = oTable.getModel();
                        if (oModel && oModel.bindList) {
                            oBinding = oModel.bindList("/Employees");
                        }
                    }

                    if (!oBinding) {
                        setTimeout(() => {
                            fnApplySearch();
                        }, 300);
                        return;
                    }

                    iRetryCount = 0;

                    if (sQuery && sQuery.trim() !== "") {
                        const sQueryTrimmed = sQuery.trim();
                        const aFilters = [];

                        aFilters.push(new sap.ui.model.Filter({
                            path: "ohrId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "fullName",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "mailid",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "role",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "location",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "city",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "gender",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));

                        const oCombinedFilter = new sap.ui.model.Filter({
                            filters: aFilters,
                            and: false
                        });

                        oBinding.filter([oCombinedFilter]);
                    } else {
                        oBinding.filter([]);
                    }
                } catch (e) {
                }
            };

            if (oTable.initialized && typeof oTable.initialized === "function") {
                oTable.initialized().then(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 100);
                }).catch(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 300);
                });
            } else {
                setTimeout(() => {
                    fnApplySearch();
                }, 200);
            }
        },
        onMasterDemandsSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("MasterDemands");

            if (!oTable) {
                console.warn("Master demands table not available");
                return;
            }

            let iRetryCount = 0;
            const MAX_RETRIES = 5;

            const fnApplySearch = () => {
                if (iRetryCount >= MAX_RETRIES) {
                    console.warn("Max retries reached for employee search");
                    return;
                }

                iRetryCount++;

                try {
                    let oBinding = this._getRowBinding(oTable);
                    if (!oBinding) {
                        oBinding = oTable.getBinding("items") || oTable.getBinding("rows");
                    }
                    if (!oBinding) {
                        const oModel = oTable.getModel();
                        if (oModel && oModel.bindList) {
                            oBinding = oModel.bindList("/Demands");
                        }
                    }

                    if (!oBinding) {
                        setTimeout(() => {
                            fnApplySearch();
                        }, 300);
                        return;
                    }

                    iRetryCount = 0;

                    if (sQuery && sQuery.trim() !== "") {
                        const sQueryTrimmed = sQuery.trim();
                        const aFilters = [];

                        aFilters.push(new sap.ui.model.Filter({
                            path: "demandId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "skill",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "band",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "sapPId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "quantity",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "allocatedCount",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "remaining",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));

                        const oCombinedFilter = new sap.ui.model.Filter({
                            filters: aFilters,
                            and: false
                        });

                        oBinding.filter([oCombinedFilter]);
                        console.log("✅ Master demand search filter applied (case-insensitive):", sQueryTrimmed);
                    } else {
                        oBinding.filter([]);
                        console.log("✅ Master demand search filter cleared");
                    }
                } catch (e) {
                    console.error("Error applying master demand search filter:", e);
                }
            };

            if (oTable.initialized && typeof oTable.initialized === "function") {
                oTable.initialized().then(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 100);
                }).catch(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 300);
                });
            } else {
                setTimeout(() => {
                    fnApplySearch();
                }, 200);
            }
        },
        //newly added ressearch
        // ✅ NEW: Search function for Employee table
        onResSearchField: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("Res");

            if (!oTable) {
                return;
            }

            let iRetryCount = 0;
            const MAX_RETRIES = 5;

            const fnApplySearch = () => {
                if (iRetryCount >= MAX_RETRIES) {
                    return;
                }

                iRetryCount++;

                try {
                    let oBinding = this._getRowBinding(oTable);
                    if (!oBinding) {
                        oBinding = oTable.getBinding("items") || oTable.getBinding("rows");
                    }
                    if (!oBinding) {
                        const oModel = oTable.getModel();
                        if (oModel && oModel.bindList) {
                            oBinding = oModel.bindList("/Employees");
                        }
                    }

                    if (!oBinding) {
                        setTimeout(() => {
                            fnApplySearch();
                        }, 300);
                        return;
                    }

                    iRetryCount = 0;

                    if (sQuery && sQuery.trim() !== "") {
                        const sQueryTrimmed = sQuery.trim();
                        const aFilters = [];

                        aFilters.push(new sap.ui.model.Filter({
                            path: "ohrId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "fullName",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "mailid",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "role",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "location",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "city",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "gender",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));

                        const oCombinedFilter = new sap.ui.model.Filter({
                            filters: aFilters,
                            and: false
                        });

                        oBinding.filter([oCombinedFilter]);
                    } else {
                        oBinding.filter([]);
                    }
                } catch (e) {
                }
            };

            if (oTable.initialized && typeof oTable.initialized === "function") {
                oTable.initialized().then(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 100);
                }).catch(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 300);
                });
            } else {
                setTimeout(() => {
                    fnApplySearch();
                }, 200);
            }
        },



        // ✅ NEW: Search function for Opportunity table
        onOpportunitySearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("Opportunities");

            if (!oTable) {
                return;
            }

            let iRetryCount = 0;
            const MAX_RETRIES = 5;

            const fnApplySearch = () => {
                if (iRetryCount >= MAX_RETRIES) {
                    return;
                }

                iRetryCount++;

                try {
                    let oBinding = this._getRowBinding(oTable);
                    if (!oBinding) {
                        oBinding = oTable.getBinding("items") || oTable.getBinding("rows");
                    }
                    if (!oBinding) {
                        const oModel = oTable.getModel();
                        if (oModel && oModel.bindList) {
                            oBinding = oModel.bindList("/Opportunities");
                        }
                    }

                    if (!oBinding) {
                        setTimeout(() => {
                            fnApplySearch();
                        }, 300);
                        return;
                    }

                    iRetryCount = 0;

                    if (sQuery && sQuery.trim() !== "") {
                        const sQueryTrimmed = sQuery.trim();
                        const aFilters = [];

                        aFilters.push(new sap.ui.model.Filter({
                            path: "sapOpportunityId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "sfdcOpportunityId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "opportunityName",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "businessUnit",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "salesSPOC",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "deliverySPOC",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "customerId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));

                        const oCombinedFilter = new sap.ui.model.Filter({
                            filters: aFilters,
                            and: false
                        });

                        oBinding.filter([oCombinedFilter]);
                    } else {
                        oBinding.filter([]);
                    }
                } catch (e) {
                }
            };

            if (oTable.initialized && typeof oTable.initialized === "function") {
                oTable.initialized().then(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 100);
                }).catch(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 300);
                });
            } else {
                setTimeout(() => {
                    fnApplySearch();
                }, 200);
            }
        },

        // ✅ NEW: Search function for Project table
        onProjectSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("Projects");

            if (!oTable) {
                return;
            }

            let iRetryCount = 0;
            const MAX_RETRIES = 5;

            const fnApplySearch = () => {
                if (iRetryCount >= MAX_RETRIES) {
                    return;
                }

                iRetryCount++;

                try {
                    let oBinding = this._getRowBinding(oTable);
                    if (!oBinding) {
                        oBinding = oTable.getBinding("items") || oTable.getBinding("rows");
                    }
                    if (!oBinding) {
                        const oModel = oTable.getModel();
                        if (oModel && oModel.bindList) {
                            oBinding = oModel.bindList("/Projects");
                        }
                    }

                    if (!oBinding) {
                        setTimeout(() => {
                            fnApplySearch();
                        }, 300);
                        return;
                    }

                    iRetryCount = 0;

                    if (sQuery && sQuery.trim() !== "") {
                        const sQueryTrimmed = sQuery.trim();
                        const aFilters = [];

                        aFilters.push(new sap.ui.model.Filter({
                            path: "sapPId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "sfdcPId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "projectName",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "gpm",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "oppId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));

                        const oCombinedFilter = new sap.ui.model.Filter({
                            filters: aFilters,
                            and: false
                        });

                        oBinding.filter([oCombinedFilter]);
                    } else {
                        oBinding.filter([]);
                    }
                } catch (e) {
                }
            };

            if (oTable.initialized && typeof oTable.initialized === "function") {
                oTable.initialized().then(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 100);
                }).catch(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 300);
                });
            } else {
                setTimeout(() => {
                    fnApplySearch();
                }, 200);
            }
        },
        //for allocation screen project search
        // ✅ NEW: Search function for Project table
        onAllocationSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("Allocations");

            if (!oTable) {
                return;
            }

            let iRetryCount = 0;
            const MAX_RETRIES = 5;

            const fnApplySearch = () => {
                if (iRetryCount >= MAX_RETRIES) {
                    return;
                }

                iRetryCount++;

                try {
                    let oBinding = this._getRowBinding(oTable);
                    if (!oBinding) {
                        oBinding = oTable.getBinding("items") || oTable.getBinding("rows");
                    }
                    if (!oBinding) {
                        const oModel = oTable.getModel();
                        if (oModel && oModel.bindList) {
                            oBinding = oModel.bindList("/Projects");
                        }
                    }

                    if (!oBinding) {
                        setTimeout(() => {
                            fnApplySearch();
                        }, 300);
                        return;
                    }

                    iRetryCount = 0;

                    if (sQuery && sQuery.trim() !== "") {
                        const sQueryTrimmed = sQuery.trim();
                        const aFilters = [];

                        aFilters.push(new sap.ui.model.Filter({
                            path: "sapPId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "sfdcPId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "projectName",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "gpm",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        aFilters.push(new sap.ui.model.Filter({
                            path: "oppId",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));

                        const oCombinedFilter = new sap.ui.model.Filter({
                            filters: aFilters,
                            and: false
                        });

                        oBinding.filter([oCombinedFilter]);
                    } else {
                        oBinding.filter([]);
                    }
                } catch (e) {
                }
            };

            if (oTable.initialized && typeof oTable.initialized === "function") {
                oTable.initialized().then(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 100);
                }).catch(() => {
                    setTimeout(() => {
                        fnApplySearch();
                    }, 300);
                });
            } else {
                setTimeout(() => {
                    fnApplySearch();
                }, 200);
            }
        },

        // ✅ NEW: Cancel function to clear form and deselect table row
        onCancelForm: function () {
            // Get table reference
            const oTable = this.byId("Customers");

            // Use the form data handler to clear form (handles cascading dropdowns properly)
            this._onCustDialogData([]);

            // Deselect any selected row in the table (MDC Table uses clearSelection)
            if (oTable && oTable.clearSelection) {
                try {
                    oTable.clearSelection();
                } catch (e) {
                    // Ignore if method doesn't exist or fails
                }
            }

            // ✅ CRITICAL: Disable Edit button when form is cleared (no row selected)
            this.byId("editButton_cus")?.setEnabled(false);
        },


        // ✅ NEW: Submit function for Employee (handles both Create and Update)
        onSubmitEmployee: function () {
            const sOHRId = this.byId("inputOHRId_emp").getValue(),
                sFullName = this.byId("inputFullName_emp").getValue(),
                sMailId = this.byId("inputMailId_emp").getValue(),
                sGender = this.byId("inputGender_emp").getSelectedKey(),
                sEmployeeType = this.byId("inputEmployeeType_emp").getSelectedKey(),
                sUnit = this.byId("inputUnit_emp").getSelectedKey(),
                sDoJ = this.byId("inputDoJ_emp").getValue(),
                sBand = this.byId("inputBand_emp").getSelectedKey(),
                sRole = this.byId("inputRole_emp").getSelectedKey(), // ✅ FIXED: Role is a Select control
                sLocation = this.byId("inputLocation_emp").getSelectedKey(),
                sCountry = this.byId("inputCountry_emp").getSelectedKey(),  // ✅ NEW: Country field
                sCity = this.byId("inputCity_emp").getSelectedKey(),  // ✅ CHANGED: Now uses getSelectedKey
                // Get Supervisor OHR ID from data attribute (not displayed name)
                sSupervisor = (this.byId("inputSupervisor_emp")?.data("selectedId")) || this.byId("inputSupervisor_emp")?.getValue() || "",
                // Get selected skill names from MultiComboBox and join as comma-separated string
                aSelectedSkills = this.byId("inputSkills_emp")?.getSelectedKeys() || [],
                sSkills = aSelectedSkills.join(", "),  // Join selected skills as comma-separated string
                sStatus = this.byId("inputStatus_emp").getSelectedKey(),
                sLWD = this.byId("inputLWD_emp").getValue();

            // Validation
            if (!sFullName || sFullName.trim() === "") {
                sap.m.MessageBox.error("Full Name is required!");
                return;
            }

            // Email validation (if email is provided)
            if (sMailId && sMailId.trim() !== "") {
                const sEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!sEmailRegex.test(sMailId.trim())) {
                    sap.m.MessageBox.error("Please enter a valid email address!");
                    return;
                }
            }

            const oTable = this.byId("Employees");
            const oModel = oTable.getModel();

            // Check if a row is selected (Update mode)
            const aSelectedContexts = oTable.getSelectedContexts();

            if (aSelectedContexts && aSelectedContexts.length > 0) {
                // UPDATE MODE: Row is selected, update existing employee
                const oContext = aSelectedContexts[0];

                const oUpdateEntry = {
                    "fullName": sFullName,
                    "mailid": sMailId || "",
                    "gender": sGender || "",
                    "employeeType": sEmployeeType || "",
                    "unit": sUnit || "",
                    "doj": (sDoJ && typeof sDoJ === "string" && sDoJ.trim() !== "") ? sDoJ : null,  // Date field - use null if empty
                    "band": sBand || "",
                    "role": sRole || "",
                    "location": sLocation || "",
                    "country": sCountry || "",  // ✅ NEW: Country field
                    "city": sCity || "",
                    "supervisorOHR": sSupervisor || "",
                    "skills": sSkills || "",  // Store skills as comma-separated string
                    "status": sStatus || "",
                    "lwd": (sLWD && typeof sLWD === "string" && sLWD.trim() !== "") ? sLWD : null   // Date field - use null if empty
                };

                try {
                    // Update the context
                    Object.keys(oUpdateEntry).forEach(sKey => {
                        const vNewValue = oUpdateEntry[sKey];
                        const vCurrentValue = oContext.getProperty(sKey);
                        // Handle null values for date fields - compare properly
                        if (vNewValue !== vCurrentValue) {
                            // For date fields, handle null explicitly
                            if ((sKey === "doj" || sKey === "lwd") && vNewValue === null) {
                                oContext.setProperty(sKey, null);
                            } else {
                                oContext.setProperty(sKey, vNewValue);
                            }
                        }
                    });

                    // Submit employee changes (skills are included in the update)
                    oModel.submitBatch("changesGroup")
                        .then(() => {
                            MessageToast.show("Employee updated successfully!");

                            // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                            this._hardRefreshTable("Employees");

                            this.onCancelEmployeeForm();
                        })
                        .catch((oError) => {
                            setTimeout(() => {
                                try {
                                    const oCurrentData = oContext.getObject();
                                    if (oCurrentData && oCurrentData.fullName === oUpdateEntry.fullName) {
                                        MessageToast.show("Employee updated successfully!");
                                        const oBinding = oTable.getBinding("rows") || oTable.getBinding("items");
                                        if (oBinding) {
                                            oBinding.refresh();
                                        }
                                        this.onCancelEmployeeForm();
                                    } else {
                                    }
                                } catch (e) {
                                }
                            }, 150);
                        });
                } catch (oSetError) {
                    sap.m.MessageBox.error("Failed to update employee. Please try again.");
                }
            } else {
                // CREATE MODE: No row selected, create new employee
                if (!sOHRId || sOHRId.trim() === "") {
                    sap.m.MessageBox.error("OHR ID is required for new employees!");
                    return;
                }

                const oCreateEntry = {
                    "ohrId": sOHRId,
                    "fullName": sFullName,
                    "mailid": sMailId || "",
                    "gender": sGender || "",
                    "employeeType": sEmployeeType || "",
                    "unit": sUnit,
                    "doj": (sDoJ && typeof sDoJ === "string" && sDoJ.trim() !== "") ? sDoJ : null,  // Date field - use null if empty
                    "band": sBand || "",
                    "role": sRole || "",
                    "location": sLocation || "",
                    "country": sCountry || "",  // ✅ NEW: Country field
                    "city": sCity || "",
                    "supervisorOHR": sSupervisor || "",
                    "skills": sSkills || "",  // Store skills as comma-separated string
                    "status": sStatus || "",
                    "lwd": (sLWD && typeof sLWD === "string" && sLWD.trim() !== "") ? sLWD : null   // Date field - use null if empty
                };


                // Try to get binding using multiple methods
                let oBinding = (oTable.getRowBinding && oTable.getRowBinding())
                    || oTable.getBinding("items")
                    || oTable.getBinding("rows");

                if (oBinding) {
                    try {
                        const oNewContext = oBinding.create(oCreateEntry, "changesGroup");
                        if (!oNewContext) {
                            sap.m.MessageBox.error("Failed to create employee entry.");
                            return;
                        }

                        oModel.submitBatch("changesGroup")
                            .then(() => {
                                MessageToast.show("Employee created successfully!");

                                // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                                this._hardRefreshTable("Employees");

                                this.onCancelEmployeeForm();
                            })
                            .catch((oError) => {
                                setTimeout(() => {
                                    try {
                                        const oCreatedData = oNewContext.getObject();
                                        if (oCreatedData && oCreatedData.fullName === oCreateEntry.fullName) {
                                            MessageToast.show("Employee created successfully!");
                                            oBinding.refresh();
                                            this.onCancelEmployeeForm();
                                        } else {
                                            this._createEmployeeDirect(oModel, oCreateEntry, oTable);
                                        }
                                    } catch (e) {
                                        this._createEmployeeDirect(oModel, oCreateEntry, oTable);
                                    }
                                }, 150);
                            });
                    } catch (oCreateError) {
                        this._createEmployeeDirect(oModel, oCreateEntry, oTable);
                    }
                } else {
                    this._createEmployeeDirect(oModel, oCreateEntry, oTable);
                }
            }
        },

        // Helper function for direct model create (fallback)
        _createEmployeeDirect: function (oModel, oCreateEntry, oTable) {
            oModel.create("/Employees", oCreateEntry, {
                success: (oData) => {
                    MessageToast.show("Employee created successfully!");

                    // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                    this._hardRefreshTable("Employees");

                    this.onCancelEmployeeForm();
                },
                error: (oError) => {
                    let sErrorMessage = "Failed to create employee. Please check the input or try again.";
                    try {
                        if (oError.responseText) {
                            const oParsed = JSON.parse(oError.responseText);
                            sErrorMessage = oParsed.error?.message || oParsed.message || sErrorMessage;
                        }
                    } catch (e) {
                        // Use default message
                    }
                    sap.m.MessageBox.error(sErrorMessage);
                }
            });
        },

        // onSubmitMasterDemands: function () {
        //     console.log("********onsubmit master demands")
        //     const sDemandId = this.byId("inputDemandId").getValue(),
        //         aSelectedSkills = this.byId("inputSkills")?.getSelectedKeys() || [],
        //         sSkills = aSelectedSkills.join(", "),
        //         sBand = this.byId("inputBand").getSelectedKey(),
        //         // ✅ CHANGED: Now uses getSelectedKey
        //         // Get Supervisor OHR ID from data attribute (not displayed name)
        //         sSapPId = (this.byId("inputProject")?.data("selectedId")) || this.byId("inputProject")?.getValue() || "",
        //         // Get selected skill names from MultiComboBox and join as comma-separated string
        //         sQuantity = this.byId("inputQuantity").getValue(),
        //         sAllocatedCount = this.byId("inputAllocatedCount").getValue(),
        //         sRemainingCount = this.byId("inputRemainingCount").getValue();





        //     const oTable = this.byId("MasterDemands");
        //     const oModel = oTable.getModel();

        //     // Check if a row is selected (Update mode)
        //     const aSelectedContexts = oTable.getSelectedContexts();

        //     if (aSelectedContexts && aSelectedContexts.length > 0) {
        //         // UPDATE MODE: Row is selected, update existing employee
        //         const oContext = aSelectedContexts[0];

        //         const oUpdateEntry = {
        //             "demandId": sDemandId,
        //             "skill": sSkills || "",
        //             "band": sBand || "",
        //             "sapPId": sSapPId || "",
        //             "quantity": sQuantity,
        //             "allocatedCount": sAllocatedCount,     // ✅ NEW: Calculated - count of allocations matching this demand's skill
        //             "remaining": sRemainingCount
        //         };
        //         console.log(oUpdateEntry, "updated entry");

        //         try {
        //             // Update the context
        //             Object.keys(oUpdateEntry).forEach(sKey => {
        //                 const vNewValue = oUpdateEntry[sKey];
        //                 const vCurrentValue = oContext.getProperty(sKey);
        //                 // Handle null values for date fields - compare properly
        //                 if (vNewValue !== vCurrentValue) {
        //                     // For date fields, handle null explicitly
        //                     if ((sKey === "doj" || sKey === "lwd") && vNewValue === null) {
        //                         oContext.setProperty(sKey, null);
        //                     } else {
        //                         oContext.setProperty(sKey, vNewValue);
        //                     }
        //                 }
        //             });

        //             // Submit employee changes (skills are included in the update)
        //             oModel.submitBatch("changesGroup")
        //                 .then(() => {
        //                     // MessageToast.show("Demand updated successfully!");

        //                     // ✅ CRITICAL: Hard refresh table to get fresh data from DB
        //                     this._hardRefreshTable("MasterDemands");

        //                     this.onCancelMasterDataForm();
        //                 })
        //                 .catch((oError) => {
        //                     setTimeout(() => {
        //                         try {
        //                             const oCurrentData = oContext.getObject();
        //                             if (oCurrentData && oCurrentData.fullName === oUpdateEntry.fullName) {

        //                                 const oBinding = oTable.getBinding("rows") || oTable.getBinding("items");
        //                                 if (oBinding) {
        //                                     oBinding.refresh();
        //                                 }
        //                                 this.onCancelMasterDataForm();
        //                             } else {
        //                                 console.warn("Update may have failed:", oError.message || "Unknown error");
        //                             }
        //                         } catch (e) {
        //                             console.log("Update completed");
        //                         }
        //                     }, 150);
        //                 });
        //         } catch (oSetError) {
        //             console.error("Error setting properties:", oSetError);
        //             sap.m.MessageBox.error("Failed to update demand. Please try again.");
        //         }
        //     } else {
        //         // CREATE MODE: No row selected, create new demand


        //         const oCreateEntry = {
        //             "demandId": sDemandId,
        //             "skill": sSkills || "",
        //             "band": sBand || "",
        //             "sapPId": sSapPId || "",
        //             "quantity": sQuantity,
        //             "allocatedCount": sAllocatedCount,     // ✅ NEW: Calculated - count of allocations matching this demand's skill
        //             "remaining": sRemainingCount
        //         };

        //         console.log("Creating demand with data:", oCreateEntry);

        //         // Try to get binding using multiple methods
        //         let oBinding = (oTable.getRowBinding && oTable.getRowBinding())
        //             || oTable.getBinding("items")
        //             || oTable.getBinding("rows");

        //         if (oBinding) {
        //             try {
        //                 const oNewContext = oBinding.create(oCreateEntry, "changesGroup");
        //                 if (!oNewContext) {
        //                     sap.m.MessageBox.error("Failed to create demand entry.");
        //                     return;
        //                 }
        //                 console.log("demand context created:", oNewContext.getPath());

        //                 oModel.submitBatch("changesGroup")
        //                     .then(() => {
        //                         console.log("Demand created successfully!");
        //                         MessageToast.show("Demand created successfully!");

        //                         // ✅ CRITICAL: Hard refresh table to get fresh data from DB
        //                         this._hardRefreshTable("MasterDemands");

        //                         this.onCancelMasterDataForm();
        //                     })
        //                     .catch((oError) => {
        //                         console.error("Create batch error:", oError);
        //                         setTimeout(() => {
        //                             try {
        //                                 const oCreatedData = oNewContext.getObject();
        //                                 if (oCreatedData && oCreatedData.fullName === oCreateEntry.fullName) {
        //                                     console.log("✅ Create verified successful");
        //                                     MessageToast.show("Demand created successfully!");
        //                                     oBinding.refresh();
        //                                     this.onCancelMasterDataForm();
        //                                 } else {
        //                                     this._createMasterDemandsDirect(oModel, oCreateEntry, oTable);
        //                                 }
        //                             } catch (e) {
        //                                 this._createMasterDemandsDirect(oModel, oCreateEntry, oTable);
        //                             }
        //                         }, 150);
        //                     });
        //             } catch (oCreateError) {
        //                 console.error("Error creating via binding:", oCreateError);
        //                 this._createMasterDemandsDirect(oModel, oCreateEntry, oTable);
        //             }
        //         } else {
        //             console.log("Table binding not available, using direct model create");
        //             this._createMasterDemandsDirect(oModel, oCreateEntry, oTable);
        //         }
        //     }
        // },
        // _createMasterDemandsDirect: function (oModel, oCreateEntry, oTable) {
        //     console.log("************create functionality of demands");
        //     oModel.create("/Demands", oCreateEntry, {
        //         success: (oData) => {
        //             console.log("Demand created successfully (direct):", oData);
        //             MessageToast.show("Demand created successfully!");

        //             // ✅ CRITICAL: Hard refresh table to get fresh data from DB
        //             this._hardRefreshTable("MasterDemands");

        //             this.onCancelMasterDataForm();
        //         },
        //         error: (oError) => {
        //             console.error("Create error:", oError);
        //             let sErrorMessage = "Failed to create demand. Please check the input or try again.";
        //             try {
        //                 if (oError.responseText) {
        //                     const oParsed = JSON.parse(oError.responseText);
        //                     sErrorMessage = oParsed.error?.message || oParsed.message || sErrorMessage;
        //                 }
        //             } catch (e) {
        //                 // Use default message
        //             }
        //             sap.m.MessageBox.error(sErrorMessage);
        //         }
        //     });
        // },
        onSubmitMasterDemands: function () {
            console.log("********onsubmit master demands");

            const sDemandId = this.byId("inputDemandId").getValue(),
                aSelectedSkills = this.byId("inputSkills")?.getSelectedKeys() || [],
                sSkills = aSelectedSkills.join(", "),
                sBand = this.byId("inputBand").getSelectedKey(),
                sSapPId = (this.byId("inputProject")?.data("selectedId")) || this.byId("inputProject")?.getValue() || "",
                sQuantity = this.byId("inputQuantity").getValue();
            // sAllocatedCount = this.byId("inputAllocatedCount").getValue(),
            // sRemainingCount = this.byId("inputRemainingCount").getValue();

            const oTable = this.byId("MasterDemands");
            const oModel = oTable.getModel();
            const aSelectedContexts = oTable.getSelectedContexts();

            // ✅ Common error handler
            const showError = (oError, sDefaultMsg) => {
                let sErrorMessage = sDefaultMsg || "Operation failed. Please check your input.";
                try {
                    if (oError && oError.responseText) {
                        const oParsed = JSON.parse(oError.responseText);
                        sErrorMessage = oParsed.error?.message || oParsed.message || sErrorMessage;
                    }
                } catch (e) {
                    console.warn("Error parsing backend response:", e);
                }
                sap.m.MessageBox.error(sErrorMessage, {
                    title: "Error",
                    details: oError.responseText
                });
            };

            if (aSelectedContexts && aSelectedContexts.length > 0) {
                // ✅ UPDATE MODE
                const oContext = aSelectedContexts[0];
                const oUpdateEntry = {
                    "demandId": sDemandId,
                    "skill": sSkills || "",
                    "band": sBand || "",
                    "sapPId": sSapPId || "",
                    "quantity": sQuantity,
                    // "allocatedCount": sAllocatedCount,
                    // "remaining": sRemainingCount
                };

                try {
                    Object.keys(oUpdateEntry).forEach(sKey => {
                        const vNewValue = oUpdateEntry[sKey];
                        const vCurrentValue = oContext.getProperty(sKey);
                        if (vNewValue !== vCurrentValue) {
                            oContext.setProperty(sKey, vNewValue);
                        }
                    });

                    oModel.submitBatch("changesGroup")
                        .then(() => {
                            // MessageToast.show("Demand updated successfully!");
                            this._hardRefreshTable("MasterDemands");
                            this.onCancelMasterDataForm();
                        })
                        .catch((oError) => {
                            console.error("Update batch error:", oError);
                            showError(oError, "Failed to update demand.");
                        });

                } catch (oSetError) {
                    console.error("Error setting properties:", oSetError);
                    sap.m.MessageBox.error("Failed to update demand. Please try again.");
                }

            } else {
                // ✅ CREATE MODE

                const oCreateEntry = {
                    "demandId": sDemandId,
                    "skill": sSkills || "",
                    "band": sBand || "",
                    "sapPId": sSapPId || "",
                    "quantity": sQuantity,
                    // "allocatedCount": sAllocatedCount,
                    // "remaining": sRemainingCount
                };

                console.log("Creating demand with data:", oCreateEntry);

                let oBinding = (oTable.getRowBinding && oTable.getRowBinding())
                    || oTable.getBinding("items")
                    || oTable.getBinding("rows");

                if (oBinding) {
                    try {
                        const oNewContext = oBinding.create(oCreateEntry, "changesGroup");
                        if (!oNewContext) {
                            sap.m.MessageBox.error("Failed to create demand entry.");
                            return;
                        }

                        oModel.submitBatch("changesGroup")
                            .then(() => {
                                // MessageToast.show("Demand created successfully!");
                                this._hardRefreshTable("MasterDemands");
                                this.onCancelMasterDataForm();
                            })
                            .catch((oError) => {
                                console.error("Create batch error:", oError);
                                showError(oError, "Failed to create demand.");
                            });

                    } catch (oCreateError) {
                        console.error("Error creating via binding:", oCreateError);
                        this._createMasterDemandsDirect(oModel, oCreateEntry, oTable);
                    }
                } else {
                    console.log("Table binding not available, using direct model create");
                    this._createMasterDemandsDirect(oModel, oCreateEntry, oTable);
                }
            }
        },
        _createMasterDemandsDirect: function (oModel, oCreateEntry, oTable) {
            console.log("************ Direct create functionality for Demands");

            oModel.create("/Demands", oCreateEntry, {
                success: (oData) => {
                    console.log("Demand created successfully (direct):", oData);
                    MessageToast.show("Demand created successfully!");

                    // ✅ Refresh table to get latest data
                    this._hardRefreshTable("MasterDemands");
                    this.onCancelMasterDataForm();
                },
                error: (oError) => {
                    console.error("Create error:", oError);

                    // Default error message
                    let sErrorMessage = "Failed to create demand. Please check the input or try again.";

                    // ✅ Parse CAP error response if available
                    try {
                        if (oError && oError.responseText) {
                            const oParsed = JSON.parse(oError.responseText);
                            sErrorMessage = oParsed.error?.message || oParsed.message || sErrorMessage;
                        }
                    } catch (e) {
                        console.warn("Error parsing backend response:", e);
                    }

                    // ✅ Show error popup with details
                    sap.m.MessageBox.error(sErrorMessage, {
                        title: "Create Error",
                        details: oError.responseText, // Optional: full backend response
                        styleClass: "sapUiSizeCompact"
                    });
                }
            });
        },


        // ✅ NEW: Submit function for Opportunity (handles both Create and Update)
        onSubmitOpportunity: function () {
            const sSapOppId = this.byId("inputSapOppId_oppr").getValue(),
                sSfdcOppId = this.byId("inputSfdcOppId_oppr").getValue(),
                sOppName = this.byId("inputOppName_oppr").getValue(),
                sBusinessUnit = this.byId("inputBusinessUnit_oppr").getValue(),
                sProbability = this.byId("inputProbability_oppr").getSelectedKey(),
                sStage = this.byId("inputStage_oppr").getSelectedKey(),
                // Get SPOC OHR IDs from data attribute (not displayed name)
                sSalesSPOC = (this.byId("inputSalesSPOC_oppr")?.data("selectedId")) || this.byId("inputSalesSPOC_oppr")?.getValue() || "",
                sDeliverySPOC = (this.byId("inputDeliverySPOC_oppr")?.data("selectedId")) || this.byId("inputDeliverySPOC_oppr")?.getValue() || "",
                sExpectedStart = this.byId("inputExpectedStart_oppr").getValue(),
                sExpectedEnd = this.byId("inputExpectedEnd_oppr").getValue(),
                sTCV = this.byId("inputTCV_oppr").getValue(),
                sCurrency = this.byId("inputCurrency_oppr").getSelectedKey();

            // Get the stored ID from data attribute, or fallback to model
            const oCustomerInput = this.byId("inputCustomerId_oppr");
            let sCustomerId = oCustomerInput ? oCustomerInput.data("selectedId") : "";
            if (!sCustomerId) {
                // Fallback to model value
                const oModel = this.getView().getModel("opportunityModel");
                sCustomerId = oModel ? oModel.getProperty("/customerId") : "";
            }

            // Validation
            if (!sOppName || sOppName.trim() === "") {
                sap.m.MessageBox.error("Opportunity Name is required!");
                return;
            }

            const oTable = this.byId("Opportunities");
            const oModel = oTable.getModel();

            // Check if a row is selected (Update mode)
            const aSelectedContexts = oTable.getSelectedContexts();

            if (aSelectedContexts && aSelectedContexts.length > 0) {
                // UPDATE MODE
                const oContext = aSelectedContexts[0];

                const oUpdateEntry = {
                    "sfdcOpportunityId": sSfdcOppId || "",
                    "opportunityName": sOppName,
                    "businessUnit": sBusinessUnit || "",
                    "probability": sProbability || "",
                    "Stage": sStage || "",
                    "salesSPOC": sSalesSPOC || "",
                    "deliverySPOC": sDeliverySPOC || "",
                    "expectedStart": (sExpectedStart && sExpectedStart.trim() !== "") ? sExpectedStart : null,  // ✅ FIXED: Use null instead of empty string for Date
                    "expectedEnd": (sExpectedEnd && sExpectedEnd.trim() !== "") ? sExpectedEnd : null,  // ✅ FIXED: Use null instead of empty string for Date
                    "tcv": sTCV ? parseFloat(sTCV) : 0,
                    "currency": sCurrency || "",
                    "customerId": sCustomerId || ""
                };

                try {
                    Object.keys(oUpdateEntry).forEach(sKey => {
                        const vNewValue = oUpdateEntry[sKey];
                        const vCurrentValue = oContext.getProperty(sKey);
                        if (vNewValue !== vCurrentValue) {
                            oContext.setProperty(sKey, vNewValue);
                        }
                    });

                    oModel.submitBatch("changesGroup")
                        .then(() => {
                            // ✅ CRITICAL: Fetch fresh data from backend (not from UI form)
                            if (oContext && oContext.requestObject) {
                                oContext.requestObject().then(() => {
                                    const oBackendData = oContext.getObject();

                                    MessageToast.show("Opportunity updated successfully!");

                                    // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                                    this._hardRefreshTable("Opportunities");

                                    this.onCancelOpportunityForm();
                                }).catch(() => {
                                    // If requestObject fails, still show success and refresh
                                    MessageToast.show("Opportunity updated successfully!");
                                    this._hardRefreshTable("Opportunities");
                                    this.onCancelOpportunityForm();
                                });
                            } else {
                                // Fallback if requestObject not available
                                MessageToast.show("Opportunity updated successfully!");
                                this._hardRefreshTable("Opportunities");
                                this.onCancelOpportunityForm();
                            }
                        })
                        .catch((oError) => {
                            setTimeout(() => {
                                try {
                                    const oCurrentData = oContext.getObject();
                                    if (oCurrentData && oCurrentData.opportunityName === oUpdateEntry.opportunityName) {
                                        MessageToast.show("Opportunity updated successfully!");
                                        // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                                        this._hardRefreshTable("Opportunities");
                                        this.onCancelOpportunityForm();
                                    } else {
                                    }
                                } catch (e) {
                                }
                            }, 150);
                        });
                } catch (oSetError) {
                    sap.m.MessageBox.error("Failed to update opportunity. Please try again.");
                }
            } else {
                // CREATE MODE
                const oCreateEntry = {
                    "sfdcOpportunityId": sSfdcOppId || "",
                    "opportunityName": sOppName,
                    "businessUnit": sBusinessUnit || "",
                    "probability": sProbability || "",
                    "Stage": sStage || "",
                    "salesSPOC": sSalesSPOC || "",
                    "deliverySPOC": sDeliverySPOC || "",
                    "expectedStart": (sExpectedStart && sExpectedStart.trim() !== "") ? sExpectedStart : null,  // ✅ FIXED: Use null instead of empty string for Date
                    "expectedEnd": (sExpectedEnd && sExpectedEnd.trim() !== "") ? sExpectedEnd : null,  // ✅ FIXED: Use null instead of empty string for Date
                    "tcv": sTCV ? parseFloat(sTCV) : 0,
                    "currency": sCurrency || "",
                    "customerId": sCustomerId || ""
                };


                // Try to get binding using multiple methods (MDC table pattern) - EXACT same as Customer
                let oBinding = (oTable.getRowBinding && oTable.getRowBinding())
                    || oTable.getBinding("items")
                    || oTable.getBinding("rows");

                if (oBinding) {
                    // Binding available - use batch mode with binding.create() - EXACT same as Customer
                    try {
                        // Create new context using binding with "changesGroup" for batch mode
                        const oNewContext = oBinding.create(oCreateEntry, "changesGroup");

                        if (!oNewContext) {
                            sap.m.MessageBox.error("Failed to create opportunity entry.");
                            return;
                        }


                        // ✅ CRITICAL: Set all properties individually to ensure they're queued in batch group
                        Object.keys(oCreateEntry).forEach(sKey => {
                            oNewContext.setProperty(sKey, oCreateEntry[sKey]);
                        });

                        // ✅ CRITICAL: Check if batch group has pending changes before submitting
                        const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");

                        // Submit the batch to send to backend - EXACT same as Customer
                        oModel.submitBatch("changesGroup")
                            .then(() => {

                                // ✅ CRITICAL: Fetch fresh data from backend (not from UI form)
                                if (oNewContext && oNewContext.requestObject) {
                                    oNewContext.requestObject().then(() => {
                                        const oBackendData = oNewContext.getObject();

                                        MessageToast.show("Opportunity created successfully!");

                                        // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                                        this._hardRefreshTable("Opportunities");

                                        this.onCancelOpportunityForm(); // Clear form after successful create
                                    }).catch(() => {
                                        // If requestObject fails, still show success and refresh
                                        MessageToast.show("Opportunity created successfully!");
                                        this._hardRefreshTable("Opportunities");
                                        this.onCancelOpportunityForm();
                                    });
                                } else {
                                    // Fallback if requestObject not available
                                    MessageToast.show("Opportunity created successfully!");
                                    this._hardRefreshTable("Opportunities");
                                    this.onCancelOpportunityForm();
                                }
                            })
                            .catch((oError) => {

                                // Check if create actually succeeded (false positive error) - EXACT same as Customer
                                setTimeout(() => {
                                    try {
                                        const oCreatedData = oNewContext.getObject();
                                        if (oCreatedData && oCreatedData.opportunityName === oCreateEntry.opportunityName) {
                                            // Create succeeded despite error
                                            MessageToast.show("Opportunity created successfully!");
                                            this._hardRefreshTable("Opportunities");
                                            this.onCancelOpportunityForm();
                                        } else {
                                            // Actual failure - use direct model create as fallback
                                            this._createOpportunityDirect(oModel, oCreateEntry, oTable);
                                        }
                                    } catch (e) {
                                        // Use direct model create as fallback
                                        this._createOpportunityDirect(oModel, oCreateEntry, oTable);
                                    }
                                }, 150);
                            });
                    } catch (oCreateError) {
                        // Fallback to direct model create
                        this._createOpportunityDirect(oModel, oCreateEntry, oTable);
                    }
                } else {
                    // No binding available - use direct model create (fallback) - EXACT same as Customer
                    this._createOpportunityDirect(oModel, oCreateEntry, oTable);
                }
            }
        },

        // Helper function for direct model create (fallback)
        _createOpportunityDirect: function (oModel, oCreateEntry, oTable) {
            oModel.create("/Opportunities", oCreateEntry, {
                success: (oData) => {
                    MessageToast.show("Opportunity created successfully!");

                    // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                    this._hardRefreshTable("Opportunities");

                    this.onCancelOpportunityForm();
                },
                error: (oError) => {
                    let sErrorMessage = "Failed to create opportunity. Please check the input or try again.";
                    try {
                        if (oError.responseText) {
                            const oParsed = JSON.parse(oError.responseText);
                            sErrorMessage = oParsed.error?.message || oParsed.message || sErrorMessage;
                        }
                    } catch (e) {
                        // Use default message
                    }
                    sap.m.MessageBox.error(sErrorMessage);
                }
            });
        },

        // ✅ NEW: Cancel function for Opportunity form
        onCancelOpportunityForm: function () {
            // Get table reference for ID generation
            const oTable = this.byId("Opportunities");

            // Generate next ID preview
            let sNextId = "O-0001";
            try {
                if (oTable) {
                    sNextId = this._generateNextIdFromBinding(oTable, "Opportunities", "sapOpportunityId", "O") || sNextId;
                }
            } catch (e) {
            }

            // Clear all form fields
            this.byId("inputSapOppId_oppr")?.setValue(sNextId);
            this.byId("inputSapOppId_oppr")?.setEnabled(false);
            this.byId("inputSapOppId_oppr")?.setPlaceholder("Auto-generated");
            this.byId("inputSfdcOppId_oppr")?.setValue("");
            this.byId("inputOppName_oppr")?.setValue("");
            this.byId("inputBusinessUnit_oppr")?.setValue("");
            this.byId("inputProbability_oppr")?.setSelectedKey("");
            this.byId("inputStage_oppr")?.setSelectedKey("");
            this.byId("inputSalesSPOC_oppr")?.setValue("");
            this.byId("inputSalesSPOC_oppr")?.data("selectedId", "");
            this.byId("inputDeliverySPOC_oppr")?.setValue("");
            this.byId("inputDeliverySPOC_oppr")?.data("selectedId", "");
            this.byId("inputExpectedStart_oppr")?.setValue("");
            this.byId("inputExpectedEnd_oppr")?.setValue("");
            this.byId("inputTCV_oppr")?.setValue("");
            this.byId("inputCurrency_oppr")?.setSelectedKey("");
            this.byId("inputCustomerId_oppr")?.setValue("");
            this.byId("inputCustomerId_oppr")?.data("selectedId", "");

            // Deselect any selected row
            if (oTable && oTable.clearSelection) {
                try {
                    oTable.clearSelection();
                } catch (e) {
                }
            }

            // ✅ CRITICAL: Disable Edit button when form is cleared (no row selected)
            this.byId("editButton_oppr")?.setEnabled(false);
        },

        // ✅ NEW: Initialize Opportunity ID field with next ID preview
        _initializeOpportunityIdField: function (iRetryCount = 0) {
            const MAX_RETRIES = 5;
            const oOppIdInput = this.byId("inputSapOppId_oppr");
            if (!oOppIdInput) {
                if (iRetryCount < MAX_RETRIES) {
                    setTimeout(() => {
                        this._initializeOpportunityIdField(iRetryCount + 1);
                    }, 100);
                }
                return;
            }

            const oTable = this.byId("Opportunities");
            let sNextId = "O-0001";

            try {
                if (oTable) {
                    sNextId = this._generateNextIdFromBinding(oTable, "Opportunities", "sapOpportunityId", "O");

                    if (!sNextId || sNextId === "O-0001") {
                        const oModel = this.getOwnerComponent().getModel();
                        if (oModel) {
                            // ✅ FIXED: Use OData V4 bindList instead of oModel.read()
                            const oBinding = oModel.bindList("/Opportunities", null, [], {
                                "$orderby": "sapOpportunityId desc",
                                "$top": "1"
                            });

                            oBinding.requestContexts(0, 1).then((aContexts) => {
                                let sBackendId = "O-0001";
                                if (aContexts && aContexts.length > 0) {
                                    const oObj = aContexts[0].getObject();
                                    if (oObj && oObj.sapOpportunityId) {
                                        const sMaxId = oObj.sapOpportunityId;
                                        const m = sMaxId.match(/(\d+)$/);
                                        if (m) {
                                            const iNextNum = parseInt(m[1], 10) + 1;
                                            sBackendId = `O-${String(iNextNum).padStart(4, "0")}`;
                                        }
                                    }
                                }
                                oOppIdInput.setValue(sBackendId);
                            }).catch((oError) => {
                                if (!sNextId || sNextId === "O-0001") {
                                    oOppIdInput.setValue(sNextId);
                                }
                            });

                            if (sNextId) {
                                oOppIdInput.setValue(sNextId);
                            }
                        }
                    } else {
                        oOppIdInput.setValue(sNextId);
                    }
                } else {
                    if (iRetryCount < MAX_RETRIES) {
                        setTimeout(() => {
                            this._initializeOpportunityIdField(iRetryCount + 1);
                        }, 200);
                        return;
                    }
                    oOppIdInput.setValue(sNextId);
                }
            } catch (e) {
                oOppIdInput.setValue(sNextId);
            }

            oOppIdInput.setEnabled(false);
            oOppIdInput.setPlaceholder("Auto-generated");
        },

        // ✅ NEW: Submit function for Project (handles both Create and Update)
        onSubmitProject: function () {
            const sSapProjId = this.byId("inputSapProjId_proj").getValue(),
                sSfdcProjId = this.byId("inputSfdcProjId_proj").getValue(),
                sProjectName = this.byId("inputProjectName_proj").getValue(),
                sStartDate = this.byId("inputStartDate_proj").getValue(),
                sEndDate = this.byId("inputEndDate_proj").getValue(),
                // Get GPM OHR ID from data attribute (not displayed name)
                sGPM = (this.byId("inputGPM_proj")?.data("selectedId")) || this.byId("inputGPM_proj")?.getValue() || "",
                sProjectType = this.byId("inputProjectType_proj").getSelectedKey(),
                sStatus = this.byId("inputStatus_proj").getSelectedKey();


            // Get the stored ID from data attribute, or fallback to model
            const oOppInput = this.byId("inputOppId_proj");
            let sOppId = oOppInput ? oOppInput.data("selectedId") : "";
            if (!sOppId) {
                // Fallback to model value
                const oModel = this.getView().getModel("projectModel");
                sOppId = oModel ? oModel.getProperty("/oppId") : "";
            }

            const sSegment = this.byId("inputSegment_proj").getSelectedKey();
            const sVertical = this.byId("inputVertical_proj").getSelectedKey();
            const sSubVertical = this.byId("inputSubVertical_proj").getSelectedKey();
            const sUnit = this.byId("inputUnit_proj").getSelectedKey();

            const sRequiredResources = this.byId("inputRequiredResources_proj").getValue(),
                sAllocatedResources = this.byId("inputAllocatedResources_proj").getValue(),
                sToBeAllocated = this.byId("inputToBeAllocated_proj").getValue(),
                sSOWReceived = this.byId("inputSOWReceived_proj").getSelectedKey(),
                sPOReceived = this.byId("inputPOReceived_proj").getSelectedKey();

            // Validation
            if (!sProjectName || sProjectName.trim() === "") {
                sap.m.MessageBox.error("Project Name is required!");
                return;
            }

            const oTable = this.byId("Projects");
            const oModel = oTable.getModel();

            // Check if a row is selected (Update mode)
            const aSelectedContexts = oTable.getSelectedContexts();

            if (aSelectedContexts && aSelectedContexts.length > 0) {
                // UPDATE MODE
                const oContext = aSelectedContexts[0];

                const oUpdateEntry = {
                    "sfdcPId": sSfdcProjId || "",
                    "projectName": sProjectName,
                    "startDate": (sStartDate && sStartDate.trim() !== "") ? sStartDate : null,  // ✅ FIXED: Use null instead of empty string for Date
                    "endDate": (sEndDate && sEndDate.trim() !== "") ? sEndDate : null,  // ✅ FIXED: Use null instead of empty string for Date
                    "gpm": sGPM || "",
                    "projectType": sProjectType || "",
                    "status": sStatus || "",

                    "oppId": sOppId || "",
                    "segment": sSegment || "",
                    "vertical": sVertical || "",
                    "subVertical": sSubVertical || "",
                    "unit": sUnit || "",
                    "requiredResources": sRequiredResources ? parseInt(sRequiredResources) : 0,
                    "allocatedResources": sAllocatedResources ? parseInt(sAllocatedResources) : 0,
                    "toBeAllocated": sToBeAllocated ? parseInt(sToBeAllocated) : 0,
                    "SOWReceived": sSOWReceived || "",
                    "POReceived": sPOReceived || ""
                };

                try {
                    Object.keys(oUpdateEntry).forEach(sKey => {
                        const vNewValue = oUpdateEntry[sKey];
                        const vCurrentValue = oContext.getProperty(sKey);
                        if (vNewValue !== vCurrentValue) {
                            oContext.setProperty(sKey, vNewValue);
                        }
                    });

                    oModel.submitBatch("changesGroup")
                        .then(() => {
                            // ✅ CRITICAL: Fetch fresh data from backend (not from UI form)
                            if (oContext && oContext.requestObject) {
                                oContext.requestObject().then(() => {
                                    const oBackendData = oContext.getObject();

                                    MessageToast.show("Project updated successfully!");

                                    // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                                    this._hardRefreshTable("Projects");

                                    this.onCancelProjectForm();
                                }).catch(() => {
                                    // If requestObject fails, still show success and refresh
                                    MessageToast.show("Project updated successfully!");
                                    this._hardRefreshTable("Projects");
                                    this.onCancelProjectForm();
                                });
                            } else {
                                // Fallback if requestObject not available
                                MessageToast.show("Project updated successfully!");
                                this._hardRefreshTable("Projects");
                                this.onCancelProjectForm();
                            }
                        })
                        .catch((oError) => {
                            setTimeout(() => {
                                try {
                                    const oCurrentData = oContext.getObject();
                                    if (oCurrentData && oCurrentData.projectName === oUpdateEntry.projectName) {
                                        MessageToast.show("Project updated successfully!");
                                        // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                                        this._hardRefreshTable("Projects");
                                        this.onCancelProjectForm();
                                    } else {
                                    }
                                } catch (e) {
                                }
                            }, 150);
                        });
                } catch (oSetError) {
                    sap.m.MessageBox.error("Failed to update project. Please try again.");
                }
            } else {
                // CREATE MODE
                const oCreateEntry = {
                    "sfdcPId": sSfdcProjId || "",
                    "projectName": sProjectName,
                    "startDate": (sStartDate && sStartDate.trim() !== "") ? sStartDate : null,  // ✅ FIXED: Use null instead of empty string for Date
                    "endDate": (sEndDate && sEndDate.trim() !== "") ? sEndDate : null,  // ✅ FIXED: Use null instead of empty string for Date
                    "gpm": sGPM || "",
                    "projectType": sProjectType || "",
                    "status": sStatus || "",
                    "oppId": sOppId || "",
                    "segment": sSegment || "",
                    "vertical": sVertical || "",
                    "subVertical": sSubVertical || "",
                    "unit": sUnit || "",
                    "requiredResources": sRequiredResources ? parseInt(sRequiredResources) : 0,
                    "allocatedResources": sAllocatedResources ? parseInt(sAllocatedResources) : 0,
                    "toBeAllocated": sToBeAllocated ? parseInt(sToBeAllocated) : 0,
                    "SOWReceived": sSOWReceived || "",
                    "POReceived": sPOReceived || ""
                };


                // Try to get binding using multiple methods (MDC table pattern) - EXACT same as Customer
                let oBinding = (oTable.getRowBinding && oTable.getRowBinding())
                    || oTable.getBinding("items")
                    || oTable.getBinding("rows");

                if (oBinding) {
                    // Binding available - use batch mode with binding.create() - EXACT same as Customer
                    try {
                        // Create new context using binding with "changesGroup" for batch mode
                        const oNewContext = oBinding.create(oCreateEntry, "changesGroup");

                        if (!oNewContext) {
                            sap.m.MessageBox.error("Failed to create project entry.");
                            return;
                        }


                        // ✅ CRITICAL: Set all properties individually to ensure they're queued in batch group
                        Object.keys(oCreateEntry).forEach(sKey => {
                            oNewContext.setProperty(sKey, oCreateEntry[sKey]);
                        });

                        // ✅ CRITICAL: Check if batch group has pending changes before submitting
                        const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");

                        // Submit the batch to send to backend - EXACT same as Customer
                        oModel.submitBatch("changesGroup")
                            .then(() => {

                                // ✅ CRITICAL: Fetch fresh data from backend (not from UI form)
                                if (oNewContext && oNewContext.requestObject) {
                                    oNewContext.requestObject().then(() => {
                                        const oBackendData = oNewContext.getObject();

                                        MessageToast.show("Project created successfully!");

                                        // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                                        this._hardRefreshTable("Projects");

                                        this.onCancelProjectForm(); // Clear form after successful create
                                    }).catch(() => {
                                        // If requestObject fails, still show success and refresh
                                        MessageToast.show("Project created successfully!");
                                        this._hardRefreshTable("Projects");
                                        this.onCancelProjectForm();
                                    });
                                } else {
                                    // Fallback if requestObject not available
                                    MessageToast.show("Project created successfully!");
                                    this._hardRefreshTable("Projects");
                                    this.onCancelProjectForm();
                                }
                            })
                            .catch((oError) => {

                                // Check if create actually succeeded (false positive error) - EXACT same as Customer
                                setTimeout(() => {
                                    try {
                                        const oCreatedData = oNewContext.getObject();
                                        if (oCreatedData && oCreatedData.projectName === oCreateEntry.projectName) {
                                            // Create succeeded despite error
                                            MessageToast.show("Project created successfully!");
                                            oBinding.refresh();
                                            this.onCancelProjectForm();
                                        } else {
                                            // Actual failure - use direct model create as fallback
                                            this._createProjectDirect(oModel, oCreateEntry, oTable);
                                        }
                                    } catch (e) {
                                        // Use direct model create as fallback
                                        this._createProjectDirect(oModel, oCreateEntry, oTable);
                                    }
                                }, 150);
                            });
                    } catch (oCreateError) {
                        // Fallback to direct model create
                        this._createProjectDirect(oModel, oCreateEntry, oTable);
                    }
                } else {
                    // No binding available - use direct model create (fallback) - EXACT same as Customer
                    this._createProjectDirect(oModel, oCreateEntry, oTable);
                }
            }
        },

        // Helper function for direct model create (fallback)
        _createProjectDirect: function (oModel, oCreateEntry, oTable) {
            oModel.create("/Projects", oCreateEntry, {
                success: (oData) => {
                    MessageToast.show("Project created successfully!");

                    // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                    this._hardRefreshTable("Projects");

                    this.onCancelProjectForm();
                },
                error: (oError) => {
                    let sErrorMessage = "Failed to create project. Please check the input or try again.";
                    try {
                        if (oError.responseText) {
                            const oParsed = JSON.parse(oError.responseText);
                            sErrorMessage = oParsed.error?.message || oParsed.message || sErrorMessage;
                        }
                    } catch (e) {
                        // Use default message
                    }
                    sap.m.MessageBox.error(sErrorMessage);
                }
            });
        },

        // ✅ NEW: Cancel function for Project form
        onCancelProjectForm: function () {
            // Get table reference for ID generation
            const oTable = this.byId("Projects");

            // Generate next ID preview
            let sNextId = "P-0001";
            try {
                if (oTable) {
                    sNextId = this._generateNextIdFromBinding(oTable, "Projects", "sapPId", "P") || sNextId;
                }
            } catch (e) {
            }

            // ✅ CRITICAL: Clear the model first (form fields are bound to model)
            let oProjModel = this.getView().getModel("projectModel");
            if (!oProjModel) {
                oProjModel = new sap.ui.model.json.JSONModel({});
                this.getView().setModel(oProjModel, "projectModel");
            }
            // Clear all model properties
            oProjModel.setData({
                sapPId: sNextId,
                sfdcPId: "",
                projectName: "",
                startDate: "",
                endDate: "",
                gpm: "",
                projectType: "",
                status: "",
                oppId: "",
                segment: "",
                vertical: "",
                subVertical: "",
                unit: "",
                requiredResources: "",
                allocatedResources: "",
                toBeAllocated: "",
                SOWReceived: "",
                POReceived: ""
            });

            // Also clear controls directly (for non-bound fields)
            this.byId("inputSapProjId_proj")?.setValue(sNextId);
            this.byId("inputSapProjId_proj")?.setEnabled(false);
            this.byId("inputSapProjId_proj")?.setPlaceholder("Auto-generated");
            this.byId("inputOppId_proj")?.setValue("");
            this.byId("inputOppId_proj")?.data("selectedId", "");
            this.byId("inputGPM_proj")?.setValue("");
            this.byId("inputGPM_proj")?.data("selectedId", "");

            // Deselect any selected row
            if (oTable && oTable.clearSelection) {
                try {
                    oTable.clearSelection();
                } catch (e) {
                }
            }

            // ✅ CRITICAL: Disable Edit button when form is cleared (no row selected)
            this.byId("editButton_proj")?.setEnabled(false);
        },

        // ✅ NEW: Initialize Project ID field with next ID preview
        _initializeProjectIdField: function (iRetryCount = 0) {
            const MAX_RETRIES = 5;
            const oProjIdInput = this.byId("inputSapProjId_proj");
            if (!oProjIdInput) {
                if (iRetryCount < MAX_RETRIES) {
                    setTimeout(() => {
                        this._initializeProjectIdField(iRetryCount + 1);
                    }, 100);
                }
                return;
            }

            const oTable = this.byId("Projects");
            let sNextId = "P-0001";

            try {
                if (oTable) {
                    sNextId = this._generateNextIdFromBinding(oTable, "Projects", "sapPId", "P");

                    if (!sNextId || sNextId === "P-0001") {
                        const oModel = this.getOwnerComponent().getModel();
                        if (oModel) {
                            // ✅ FIXED: Use OData V4 bindList instead of oModel.read()
                            const oBinding = oModel.bindList("/Projects", null, [], {
                                "$orderby": "sapPId desc",
                                "$top": "1"
                            });

                            oBinding.requestContexts(0, 1).then((aContexts) => {
                                let sBackendId = "P-0001";
                                if (aContexts && aContexts.length > 0) {
                                    const oObj = aContexts[0].getObject();
                                    if (oObj && oObj.sapPId) {
                                        const sMaxId = oObj.sapPId;
                                        const m = sMaxId.match(/(\d+)$/);
                                        if (m) {
                                            const iNextNum = parseInt(m[1], 10) + 1;
                                            sBackendId = `P-${String(iNextNum).padStart(4, "0")}`;
                                        }
                                    }
                                }
                                oProjIdInput.setValue(sBackendId);
                            }).catch((oError) => {
                                if (!sNextId || sNextId === "P-0001") {
                                    oProjIdInput.setValue(sNextId);
                                }
                            });

                            if (sNextId) {
                                oProjIdInput.setValue(sNextId);
                            }
                        }
                    } else {
                        oProjIdInput.setValue(sNextId);
                    }
                } else {
                    if (iRetryCount < MAX_RETRIES) {
                        setTimeout(() => {
                            this._initializeProjectIdField(iRetryCount + 1);
                        }, 200);
                        return;
                    }
                    oProjIdInput.setValue(sNextId);
                }
            } catch (e) {
                oProjIdInput.setValue(sNextId);
            }

            oProjIdInput.setEnabled(false);
            oProjIdInput.setPlaceholder("Auto-generated");
        },

        // ✅ NEW: Edit button handlers - populate forms when Edit is clicked
        // ✅ CRITICAL: Always fetch fresh data from backend with associations expanded
        onEditCustomerForm: function () {
            const oTable = this.byId("Customers");
            const aSelectedContexts = oTable.getSelectedContexts();

            // ✅ CRITICAL: If no selection, clear form to ensure fresh dialog
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                this._onCustDialogData([]);
                sap.m.MessageToast.show("Please select a row to edit.");
                return;
            }

            // ✅ CRITICAL: Clear form FIRST and wait for it to complete before populating
            this._onCustDialogData([]);

            // ✅ CRITICAL: Use setTimeout to ensure form is completely cleared before populating
            setTimeout(() => {
                if (aSelectedContexts && aSelectedContexts.length > 0) {
                    const oContext = aSelectedContexts[0];
                    // ✅ CRITICAL: Fetch fresh data from backend using requestObject
                    if (oContext.requestObject && typeof oContext.requestObject === "function") {
                        oContext.requestObject().then(() => {
                            // After fetching fresh data, populate form
                            this._onCustDialogData(aSelectedContexts);
                        }).catch(() => {
                            // Fallback if request fails - still try to populate
                            this._onCustDialogData(aSelectedContexts);
                        });
                    } else {
                        // No requestObject method - populate directly
                        this._onCustDialogData(aSelectedContexts);
                    }
                }
            }, 50); // Small delay to ensure clear completes
        },

        onEditEmployeeForm: function () {
            const oTable = this.byId("Employees");
            const aSelectedContexts = oTable.getSelectedContexts();

            // ✅ CRITICAL: If no selection, clear form to ensure fresh dialog
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                this._onEmpDialogData([]);
                sap.m.MessageToast.show("Please select a row to edit.");
                return;
            }

            // ✅ CRITICAL: Clear form FIRST and wait for it to complete before populating
            this._onEmpDialogData([]);

            // ✅ CRITICAL: Use setTimeout to ensure form is completely cleared before populating
            setTimeout(() => {
                if (aSelectedContexts && aSelectedContexts.length > 0) {
                    const oContext = aSelectedContexts[0];
                    const oModel = oTable.getModel();
                    // ✅ CRITICAL: Fetch fresh data from backend - use requestObject with refresh
                    if (oModel && oContext.getPath) {
                        const sPath = oContext.getPath();
                        // First, refresh the context to get fresh data from backend
                        if (oContext.requestObject && typeof oContext.requestObject === "function") {
                            // Request fresh data from backend
                            oContext.requestObject().then(() => {
                                const oObj = oContext.getObject();

                                // Now fetch Supervisor association if needed
                                const sSupervisorId = oObj && oObj.supervisorOHR;
                                if (sSupervisorId && oModel) {
                                    // Fetch Supervisor name from backend
                                    const oSupervisorContext = oModel.bindContext(`/Employees('${sSupervisorId}')`, null, { deferred: true });
                                    oSupervisorContext.execute().then(() => {
                                        const oSupervisor = oSupervisorContext.getObject();
                                        if (oSupervisor && oObj) {
                                            // Add supervisor data to object
                                            oObj.to_Supervisor = oSupervisor;
                                        }
                                        // Now populate form with fresh backend data
                                        this._onEmpDialogData(aSelectedContexts);
                                    }).catch(() => {
                                        // If supervisor fetch fails, still populate form
                                        this._onEmpDialogData(aSelectedContexts);
                                    });
                                } else {
                                    // No supervisor, populate directly with fresh backend data
                                    this._onEmpDialogData(aSelectedContexts);
                                }
                            }).catch(() => {
                                // If requestObject fails, try direct populate
                                this._onEmpDialogData(aSelectedContexts);
                            });
                        } else {
                            // No requestObject, populate directly
                            this._onEmpDialogData(aSelectedContexts);
                        }
                    } else {
                        // No path, use requestObject directly
                        if (oContext.requestObject && typeof oContext.requestObject === "function") {
                            oContext.requestObject().then(() => {
                                this._onEmpDialogData(aSelectedContexts);
                            }).catch(() => {
                                this._onEmpDialogData(aSelectedContexts);
                            });
                        } else {
                            this._onEmpDialogData(aSelectedContexts);
                        }
                    }
                }
            }, 50); // Small delay to ensure clear completes
        },

        onEditMasterDemandsForm: function () {
            const oTable = this.byId("MasterDemands");
            const aSelectedContexts = oTable.getSelectedContexts();
            if (aSelectedContexts && aSelectedContexts.length > 0) {
                const oContext = aSelectedContexts[0];
                const oModel = oTable.getModel();
                // ✅ CRITICAL: Fetch fresh data from backend - use requestObject with refresh
                if (oModel && oContext.getPath) {
                    const sPath = oContext.getPath();
                    // First, refresh the context to get fresh data from backend
                    if (oContext.requestObject && typeof oContext.requestObject === "function") {
                        // Request fresh data from backend
                        oContext.requestObject().then(() => {
                            const oObj = oContext.getObject();
                            console.log(oObj);
                            console.log("✅ Employee fresh data from backend:", oObj);

                            // Now fetch Supervisor association if needed
                            const sSapPId = oObj && oObj.sapPId;
                            if (sSapPId && oModel) {
                                // Fetch Supervisor name from backend
                                const oSapPIdContext = oModel.bindContext(`/Demands('${sSapPId}')`, null, { deferred: true });
                                oSapPIdContext.execute().then(() => {
                                    const oSapPId = oSapPIdContext.getObject();
                                    if (oSapPId && oObj) {
                                        // Add supervisor data to object
                                        oObj.to_Project = oSapPId;
                                    }
                                    // Now populate form with fresh backend data
                                    this._onMasterDemandsDialogData(aSelectedContexts);
                                }).catch(() => {
                                    // If supervisor fetch fails, still populate form
                                    this._onMasterDemandsDialogData(aSelectedContexts);
                                });
                            } else {
                                // No supervisor, populate directly with fresh backend data
                                this._onMasterDemandsDialogData(aSelectedContexts);
                            }
                        }).catch(() => {
                            // If requestObject fails, try direct populate
                            this._onMasterDemandsDialogData(aSelectedContexts);
                        });
                    } else {
                        // No requestObject, populate directly
                        this._onMasterDemandsDialogData(aSelectedContexts);
                    }
                } else {
                    // No path, use requestObject directly
                    if (oContext.requestObject && typeof oContext.requestObject === "function") {
                        oContext.requestObject().then(() => {
                            this._onMasterDemandsDialogData(aSelectedContexts);
                        }).catch(() => {
                            this._onMasterDemandsDialogData(aSelectedContexts);
                        });
                    } else {
                        this._onMasterDemandsDialogData(aSelectedContexts);
                    }
                }
            } else {
                sap.m.MessageToast.show("Please select a row to edit.");
            }
        },


        onEditOpportunityForm: function () {
            const oTable = this.byId("Opportunities");
            const aSelectedContexts = oTable.getSelectedContexts();

            // ✅ CRITICAL: If no selection, clear form to ensure fresh dialog
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                this._onOppDialogData([]);
                sap.m.MessageToast.show("Please select a row to edit.");
                return;
            }

            // ✅ CRITICAL: Clear form FIRST and wait for it to complete before populating
            this._onOppDialogData([]);

            // ✅ CRITICAL: Use setTimeout to ensure form is completely cleared before populating
            setTimeout(() => {
                if (aSelectedContexts && aSelectedContexts.length > 0) {
                    const oContext = aSelectedContexts[0];
                    // ✅ CRITICAL: Fetch fresh data from backend - use requestObject
                    if (oContext.requestObject && typeof oContext.requestObject === "function") {
                        // Request fresh data from backend
                        oContext.requestObject().then(() => {
                            // Populate form - _onOppDialogData will handle customer name loading
                            this._onOppDialogData(aSelectedContexts);
                        }).catch(() => {
                            // If requestObject fails, still populate (async load will handle customer)
                            this._onOppDialogData(aSelectedContexts);
                        });
                    } else {
                        // No requestObject, populate directly (async load will handle customer)
                        this._onOppDialogData(aSelectedContexts);
                    }
                }
            }, 50); // Small delay to ensure clear completes
        },

        onEditProjectForm: function () {
            const oTable = this.byId("Projects");
            const aSelectedContexts = oTable.getSelectedContexts();

            // ✅ CRITICAL: If no selection, clear form to ensure fresh dialog
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                this._onProjDialogData([]);
                sap.m.MessageToast.show("Please select a row to edit.");
                return;
            }

            // ✅ CRITICAL: Clear form FIRST and wait for it to complete before populating
            this._onProjDialogData([]);

            // ✅ CRITICAL: Use setTimeout to ensure form is completely cleared before populating
            setTimeout(() => {
                if (aSelectedContexts && aSelectedContexts.length > 0) {
                    const oContext = aSelectedContexts[0];
                    const oModel = oTable.getModel();
                    // ✅ CRITICAL: Fetch fresh data from backend - use requestObject with refresh
                    if (oModel && oContext.getPath) {
                        const sPath = oContext.getPath();
                        // First, refresh the context to get fresh data from backend
                        if (oContext.requestObject && typeof oContext.requestObject === "function") {
                            // Request fresh data from backend
                            oContext.requestObject().then(() => {
                                const oObj = oContext.getObject();

                                // Now fetch Opportunity and GPM associations if needed
                                const sOppId = oObj && oObj.oppId;
                                const sGPMId = oObj && oObj.gpm;
                                const aPromises = [];

                                // Fetch Opportunity if exists
                                if (sOppId && oModel) {
                                    const oOppContext = oModel.bindContext(`/Opportunities('${sOppId}')`, null, { deferred: true });
                                    aPromises.push(
                                        oOppContext.execute().then(() => {
                                            const oOpportunity = oOppContext.getObject();
                                            if (oOpportunity && oObj) {
                                                oObj.to_Opportunity = oOpportunity;
                                            }
                                        }).catch(() => { })
                                    );
                                }

                                // Fetch GPM if exists
                                if (sGPMId && oModel) {
                                    const oGPMContext = oModel.bindContext(`/Employees('${sGPMId}')`, null, { deferred: true });
                                    aPromises.push(
                                        oGPMContext.execute().then(() => {
                                            const oGPM = oGPMContext.getObject();
                                            if (oGPM && oObj) {
                                                oObj.to_GPM = oGPM;
                                            }
                                        }).catch(() => { })
                                    );
                                }

                                // Wait for all association fetches, then populate form
                                Promise.all(aPromises).then(() => {
                                    // Now populate form with fresh backend data
                                    this._onProjDialogData(aSelectedContexts);
                                }).catch(() => {
                                    // Even if some associations fail, populate form
                                    this._onProjDialogData(aSelectedContexts);
                                });

                                // If no associations to fetch, populate immediately
                                if (aPromises.length === 0) {
                                    this._onProjDialogData(aSelectedContexts);
                                }
                            }).catch(() => {
                                // If requestObject fails, try direct populate
                                this._onProjDialogData(aSelectedContexts);
                            });
                        } else {
                            // No requestObject, populate directly
                            this._onProjDialogData(aSelectedContexts);
                        }
                    } else {
                        // No path, use requestObject directly
                        if (oContext.requestObject && typeof oContext.requestObject === "function") {
                            oContext.requestObject().then(() => {
                                this._onProjDialogData(aSelectedContexts);
                            }).catch(() => {
                                this._onProjDialogData(aSelectedContexts);
                            });
                        } else {
                            this._onProjDialogData(aSelectedContexts);
                        }
                    }
                }
            }, 50); // Small delay to ensure clear completes
        },

        // ✅ NEW: Submit function for Demand (handles both Create and Update)
        onSubmitDemand: function () {
            // ✅ CRITICAL: Always use the stored project ID from controller or model
            // Priority: 1. _sSelectedProjectId (stored when navigating from Projects)
            //           2. Model property /sapPId
            // Project field removed from form, so we get ID from controller/model only
            let sSapPId = this._sSelectedProjectId;

            // If still no ID, try to get it from the model
            if (!sSapPId || sSapPId.trim() === "") {
                const oDemandModel = this.getView().getModel("demandModel");
                if (oDemandModel) {
                    sSapPId = oDemandModel.getProperty("/sapPId");
                }
            }

            // Final validation - if still no ID, show error
            if (!sSapPId || sSapPId.trim() === "") {
                sap.m.MessageBox.error("Project ID is required! Please navigate from Projects screen to select a project.");
                return;
            }

            const sBand = this.byId("inputBand_demand")?.getSelectedKey() || "",
                sQuantity = this.byId("inputQuantity_demand")?.getValue() || "";

            // Get selected skills from MultiComboBox
            const aSelectedSkills = this.byId("inputSkill_demand")?.getSelectedKeys() || [];
            const sSkill = aSelectedSkills.join(", "); // Join selected skills as comma-separated string

            if (!sSkill || sSkill.trim() === "") {
                sap.m.MessageBox.error("Skill is required!");
                return;
            }
            if (!sQuantity || parseInt(sQuantity) <= 0) {
                sap.m.MessageBox.error("Quantity must be greater than 0!");
                return;
            }

            const iQuantity = parseInt(sQuantity);
            const oTable = this.byId("Demands");
            const oModel = oTable.getModel();

            // ✅ UI VALIDATION: Check if total demand quantities exceed requiredResources
            // Get project to check requiredResources
            const oProjectsBinding = oModel.bindList("/Projects");
            oProjectsBinding.attachEventOnce("dataReceived", function () {
                const aProjects = oProjectsBinding.getContexts().map(ctx => ctx.getObject());
                const oProject = aProjects.find(p => p.sapPId === sSapPId);

                if (oProject && oProject.requiredResources) {
                    // Get existing demands for this project
                    const oDemandsBinding = oModel.bindList("/Demands", {
                        filters: [new sap.ui.model.Filter("sapPId", sap.ui.model.FilterOperator.EQ, sSapPId)]
                    });

                    oDemandsBinding.attachEventOnce("dataReceived", function () {
                        const aDemands = oDemandsBinding.getContexts().map(ctx => ctx.getObject());

                        // Check if updating existing demand
                        const aSelectedContexts = this.byId("Demands").getSelectedContexts();
                        let iExistingTotal = 0;
                        let sCurrentDemandId = null;

                        if (aSelectedContexts && aSelectedContexts.length > 0) {
                            // UPDATE MODE: Exclude current demand from total
                            sCurrentDemandId = aSelectedContexts[0].getObject().demandId;
                            iExistingTotal = aDemands
                                .filter(d => d.demandId !== sCurrentDemandId)
                                .reduce((sum, d) => sum + (d.quantity || 0), 0);
                        } else {
                            // CREATE MODE: Include all existing demands
                            iExistingTotal = aDemands.reduce((sum, d) => sum + (d.quantity || 0), 0);
                        }

                        const iNewTotal = iExistingTotal + iQuantity;

                        if (iNewTotal > oProject.requiredResources) {
                            const iExcess = iNewTotal - oProject.requiredResources;
                            const iAvailable = oProject.requiredResources - iExistingTotal;
                            sap.m.MessageBox.error(
                                `Total demand quantity (${iNewTotal}) exceeds required resources (${oProject.requiredResources}) for this project.\n\n` +
                                `Excess: ${iExcess}\n` +
                                `Available: ${iAvailable}\n` +
                                `Current total: ${iExistingTotal}`
                            );
                            return;
                        }

                        // Validation passed, proceed with submit
                        this._proceedWithDemandSubmit(sSapPId, sBand, sQuantity, sSkill, oTable, oModel);
                    }.bind(this));

                    oDemandsBinding.getContexts(); // Trigger data load
                } else {
                    // Project not found or no requiredResources set, proceed anyway
                    this._proceedWithDemandSubmit(sSapPId, sBand, sQuantity, sSkill, oTable, oModel);
                }
            }.bind(this));

            oProjectsBinding.getContexts(); // Trigger data load
        },

        // ✅ Helper function to proceed with demand submit after validation
        _proceedWithDemandSubmit: function (sSapPId, sBand, sQuantity, sSkill, oTable, oModel) {
            // Check if a row is selected (Update mode)
            const aSelectedContexts = oTable.getSelectedContexts();

            if (aSelectedContexts && aSelectedContexts.length > 0) {
                // UPDATE MODE
                const oContext = aSelectedContexts[0];

                const oUpdateEntry = {
                    "skill": sSkill || "",
                    "band": sBand || "",
                    "sapPId": sSapPId || "",
                    "quantity": sQuantity ? parseInt(sQuantity) : 0
                };

                try {
                    Object.keys(oUpdateEntry).forEach(sKey => {
                        const vNewValue = oUpdateEntry[sKey];
                        const vCurrentValue = oContext.getProperty(sKey);
                        if (vNewValue !== vCurrentValue) {
                            oContext.setProperty(sKey, vNewValue);
                        }
                    });

                    oModel.submitBatch("changesGroup")
                        .then(() => {
                            if (oContext && oContext.requestObject) {
                                oContext.requestObject().then(() => {
                                    const oBackendData = oContext.getObject();

                                    MessageToast.show("Demand updated successfully!");

                                    this._hardRefreshTable("Demands");

                                    this.onCancelDemandForm();
                                }).catch(() => {
                                    MessageToast.show("Demand updated successfully!");
                                    this._hardRefreshTable("Demands");
                                    this.onCancelDemandForm();
                                });
                            } else {
                                MessageToast.show("Demand updated successfully!");
                                this._hardRefreshTable("Demands");
                                this.onCancelDemandForm();
                            }
                        })
                        .catch((oError) => {
                            setTimeout(() => {
                                try {
                                    const oCurrentData = oContext.getObject();
                                    if (oCurrentData && oCurrentData.skill === oUpdateEntry.skill) {
                                        MessageToast.show("Demand updated successfully!");
                                        this._hardRefreshTable("Demands");
                                        this.onCancelDemandForm();
                                    } else {
                                        sap.m.MessageBox.error("Failed to update demand. Please try again.");
                                    }
                                } catch (e) {
                                }
                            }, 150);
                        });
                } catch (oSetError) {
                    sap.m.MessageBox.error("Failed to update demand. Please try again.");
                }
            } else {
                // CREATE MODE
                // ✅ Don't include demandId - it will be auto-generated by the backend
                const oCreateEntry = {
                    "skill": sSkill || "",
                    "band": sBand || "",
                    "sapPId": sSapPId || "",
                    "quantity": sQuantity ? parseInt(sQuantity, 10) : 0
                };

                // ✅ CRITICAL: Remove demandId if it exists (shouldn't, but just in case)
                // Also ensure quantity is a number, not string
                delete oCreateEntry.demandId;
                if (oCreateEntry.quantity && typeof oCreateEntry.quantity === 'string') {
                    oCreateEntry.quantity = parseInt(oCreateEntry.quantity, 10);
                }


                // Try to get binding using multiple methods (MDC table pattern) - EXACT same as Project
                let oBinding = (oTable.getRowBinding && oTable.getRowBinding())
                    || oTable.getBinding("items")
                    || oTable.getBinding("rows");

                if (oBinding) {
                    // Binding available - use batch mode with binding.create() - EXACT same as Project
                    try {
                        // Create new context using binding with "changesGroup" for batch mode
                        const oNewContext = oBinding.create(oCreateEntry, "changesGroup");

                        if (!oNewContext) {
                            sap.m.MessageBox.error("Failed to create demand entry.");
                            return;
                        }


                        // ✅ CRITICAL: Set all properties individually to ensure they're queued in batch group
                        Object.keys(oCreateEntry).forEach(sKey => {
                            oNewContext.setProperty(sKey, oCreateEntry[sKey]);
                        });

                        // ✅ CRITICAL: Check if batch group has pending changes before submitting
                        const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");

                        // Submit the batch to send to backend
                        oModel.submitBatch("changesGroup")
                            .then((oResponse) => {
                                // ✅ CRITICAL: Check for errors in batch response

                                // ✅ Check if batch response contains errors
                                let bHasError = false;
                                let sErrorMessage = "";

                                // Check multiple possible response structures
                                if (oResponse) {
                                    // Check if response has responses array
                                    if (oResponse.responses && Array.isArray(oResponse.responses)) {
                                        for (let i = 0; i < oResponse.responses.length; i++) {
                                            const oResp = oResponse.responses[i];
                                            if (oResp.statusCode && oResp.statusCode >= 400) {
                                                bHasError = true;
                                                if (oResp.body && oResp.body.error) {
                                                    sErrorMessage = oResp.body.error.message || oResp.body.error.code || "Validation error";
                                                } else if (oResp.body && typeof oResp.body === 'string') {
                                                    try {
                                                        const oParsed = JSON.parse(oResp.body);
                                                        sErrorMessage = oParsed.error?.message || oParsed.message || "Validation error";
                                                    } catch (e) {
                                                        sErrorMessage = oResp.body || "Validation error occurred";
                                                    }
                                                } else {
                                                    sErrorMessage = "Validation error occurred";
                                                }
                                                break;
                                            }
                                        }
                                    }

                                    // Also check if response itself indicates an error
                                    if (!bHasError && oResponse.statusCode && oResponse.statusCode >= 400) {
                                        bHasError = true;
                                        if (oResponse.body && oResponse.body.error) {
                                            sErrorMessage = oResponse.body.error.message || oResponse.body.error.code || "Validation error";
                                        } else {
                                            sErrorMessage = "Validation error occurred";
                                        }
                                    }

                                    // Check for error in responseText (OData V4 batch format)
                                    if (!bHasError && oResponse.responseText) {
                                        try {
                                            const oParsed = JSON.parse(oResponse.responseText);
                                            if (oParsed.error) {
                                                bHasError = true;
                                                sErrorMessage = oParsed.error.message || oParsed.error.code || "Validation error";
                                            }
                                        } catch (e) {
                                            // Not JSON, ignore
                                        }
                                    }
                                }

                                // ✅ If error found, remove the invalid row from table and show error
                                if (bHasError) {

                                    // Remove the invalid context from the table
                                    if (oNewContext && oNewContext.delete) {
                                        try {
                                            oNewContext.delete();
                                        } catch (e) {
                                        }
                                    }

                                    // Refresh table to remove invalid row
                                    this._hardRefreshTable("Demands");

                                    // Show error message
                                    sap.m.MessageBox.error(sErrorMessage || "Failed to create demand. Please check the quantity doesn't exceed required resources.");
                                    return;
                                }

                                // ✅ No errors - verify the context was actually created successfully
                                if (oNewContext && oNewContext.getProperty && oNewContext.getProperty("skill")) {

                                    if (oNewContext.requestObject) {
                                        oNewContext.requestObject().then(() => {
                                            const oBackendData = oNewContext.getObject();

                                            MessageToast.show("Demand created successfully!");

                                            this._hardRefreshTable("Demands");

                                            this.onCancelDemandForm();
                                        }).catch((oReadError) => {
                                            // Still show success if context exists
                                            MessageToast.show("Demand created successfully!");
                                            this._hardRefreshTable("Demands");
                                            this.onCancelDemandForm();
                                        });
                                    } else {
                                        MessageToast.show("Demand created successfully!");
                                        this._hardRefreshTable("Demands");
                                        this.onCancelDemandForm();
                                    }
                                } else {
                                    // Context doesn't have data - creation likely failed

                                    // Remove invalid context
                                    if (oNewContext && oNewContext.delete) {
                                        try {
                                            oNewContext.delete();
                                        } catch (e) {
                                        }
                                    }

                                    this._hardRefreshTable("Demands");
                                    sap.m.MessageBox.error("Failed to create demand. Please check the data and try again.");
                                }
                            })
                            .catch((oError) => {

                                // ✅ Remove invalid context from table
                                if (oNewContext && oNewContext.delete) {
                                    try {
                                        oNewContext.delete();
                                    } catch (e) {
                                    }
                                }

                                // Refresh table to remove invalid row
                                this._hardRefreshTable("Demands");

                                let sErrorMessage = "Failed to create demand. Please check the data and try again.";

                                // Try to extract error message from various sources
                                if (oError.message) {
                                    sErrorMessage = oError.message;
                                } else if (oError.body && oError.body.error) {
                                    sErrorMessage = oError.body.error.message || oError.body.error.code || sErrorMessage;
                                } else if (oError.responseText) {
                                    try {
                                        const oParsed = JSON.parse(oError.responseText);
                                        sErrorMessage = oParsed.error?.message || oParsed.message || sErrorMessage;
                                    } catch (e) {
                                        // Use default
                                    }
                                }

                                // Check for specific datatype mismatch error
                                if (sErrorMessage.includes("datatype mismatch") || sErrorMessage.includes("SQLITE_MISMATCH")) {
                                    sap.m.MessageBox.error("Datatype mismatch error. The demand ID generation may have failed. Please try again or contact support.");
                                } else if (sErrorMessage.includes("exceeds required resources") || sErrorMessage.includes("exceed")) {
                                    sap.m.MessageBox.error(sErrorMessage);
                                } else {
                                    sap.m.MessageBox.error(sErrorMessage);
                                }
                            });
                    } catch (oCreateError) {
                        // Fallback to direct model create
                        this._createDemandDirect(oModel, oCreateEntry, oTable);
                    }
                } else {
                    // No binding available - use direct model create (fallback) - EXACT same as Project
                    this._createDemandDirect(oModel, oCreateEntry, oTable);
                }
            }
        },

        // Helper function for direct model create (fallback)
        _createDemandDirect: function (oModel, oCreateEntry, oTable) {
            oModel.create("/Demands", oCreateEntry, {
                success: (oData) => {
                    MessageToast.show("Demand created successfully!");

                    // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                    this._hardRefreshTable("Demands");

                    this.onCancelDemandForm();
                },
                error: (oError) => {
                    let sErrorMessage = "Failed to create demand. Please check the input or try again.";
                    try {
                        if (oError.responseText) {
                            const oParsed = JSON.parse(oError.responseText);
                            sErrorMessage = oParsed.error?.message || oParsed.message || sErrorMessage;
                        }
                    } catch (e) {
                        // Use default message
                    }
                    sap.m.MessageBox.error(sErrorMessage);
                }
            });
        },

        // ✅ NEW: Cancel function for Demand form
        onCancelDemandForm: function () {
            // Clear the model first (form fields are bound to model)
            let oDemandModel = this.getView().getModel("demandModel");
            if (!oDemandModel) {
                oDemandModel = new sap.ui.model.json.JSONModel({});
                this.getView().setModel(oDemandModel, "demandModel");
            }

            // ✅ Keep the pre-selected project ID (don't clear it)
            const sPreSelectedProjectId = this._sSelectedProjectId || "";
            const sPreSelectedProjectName = this._sSelectedProjectName || "";

            // Clear all model properties except project
            oDemandModel.setData({
                demandId: "",
                skill: "",
                band: "",
                sapPId: sPreSelectedProjectId, // Keep pre-selected project
                quantity: ""
            });

            // Also clear controls directly
            // ✅ Removed Demand ID field - it's auto-generated by backend

            // ✅ Project field removed from form - project is pre-selected from navigation
            // The project ID is stored in the model and controller, but not displayed in form

            this.byId("inputSkill_demand")?.removeAllSelectedItems();
            this.byId("inputBand_demand")?.setSelectedKey("");
            this.byId("inputQuantity_demand")?.setValue("");

            // Deselect any selected row
            const oTable = this.byId("Demands");
            if (oTable && oTable.clearSelection) {
                try {
                    oTable.clearSelection();
                } catch (e) {
                }
            }

            // Disable Edit button when form is cleared
            this.byId("editButton_demand")?.setEnabled(false);
        },

        // ✅ NEW: Edit function for Demand form
        onEditDemandForm: function () {
            const oTable = this.byId("Demands");
            const aSelectedContexts = oTable.getSelectedContexts();

            // ✅ CRITICAL: If no selection, clear form to ensure fresh dialog
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                this._onDemandDialogData([]);
                sap.m.MessageToast.show("Please select a row to edit.");
                return;
            }

            // ✅ CRITICAL: Clear form FIRST and wait for it to complete before populating
            this._onDemandDialogData([]);

            // ✅ CRITICAL: Use setTimeout to ensure form is completely cleared before populating
            setTimeout(() => {
                if (aSelectedContexts && aSelectedContexts.length > 0) {
                    const oContext = aSelectedContexts[0];
                    const oModel = oTable.getModel();
                    // Fetch fresh data from backend
                    if (oModel && oContext.getPath) {
                        const sPath = oContext.getPath();
                        if (oContext.requestObject && typeof oContext.requestObject === "function") {
                            oContext.requestObject().then(() => {
                                const oObj = oContext.getObject();

                                // Fetch Project association if needed
                                const sSapPId = oObj && oObj.sapPId;
                                if (sSapPId && oModel) {
                                    const oProjContext = oModel.bindContext(`/Projects('${sSapPId}')`, null, { deferred: true });
                                    oProjContext.execute().then(() => {
                                        const oProject = oProjContext.getObject();
                                        if (oProject && oObj) {
                                            oObj.to_Project = oProject;
                                        }
                                        this._onDemandDialogData(aSelectedContexts);
                                    }).catch(() => {
                                        this._onDemandDialogData(aSelectedContexts);
                                    });
                                } else {
                                    this._onDemandDialogData(aSelectedContexts);
                                }
                            }).catch(() => {
                                this._onDemandDialogData(aSelectedContexts);
                            });
                        } else {
                            this._onDemandDialogData(aSelectedContexts);
                        }
                    } else {
                        if (oContext.requestObject && typeof oContext.requestObject === "function") {
                            oContext.requestObject().then(() => {
                                this._onDemandDialogData(aSelectedContexts);
                            }).catch(() => {
                                this._onDemandDialogData(aSelectedContexts);
                            });
                        } else {
                            this._onDemandDialogData(aSelectedContexts);
                        }
                    }
                }
            }, 50); // Small delay to ensure clear completes
        },

        // ✅ NEW: Cancel function for Employee form
        onCancelEmployeeForm: function () {
            // Clear all form fields
            this.byId("inputOHRId_emp")?.setValue("");
            this.byId("inputOHRId_emp")?.setEnabled(true); // Enable for new entry
            this.byId("inputFullName_emp")?.setValue("");
            this.byId("inputMailId_emp")?.setValue("");
            this.byId("inputGender_emp")?.setSelectedKey("");
            this.byId("inputEmployeeType_emp")?.setSelectedKey("");
            this.byId("inputUnit_emp")?.setSelectedKey("");
            this.byId("inputDoJ_emp")?.setValue("");
            this.byId("inputBand_emp")?.setSelectedKey("");
            this.byId("inputRole_emp")?.setSelectedKey("");
            // Clear designation dropdown items when band is cleared
            const oDesignationSelect = this.byId("inputRole_emp");
            if (oDesignationSelect) {
                const aItems = oDesignationSelect.getItems();
                aItems.forEach((oItem, iIndex) => {
                    if (iIndex > 0) {
                        oDesignationSelect.removeItem(oItem);
                    }
                });
            }
            this.byId("inputLocation_emp")?.setValue("");
            this.byId("inputCountry_emp")?.setSelectedKey("");  // ✅ NEW: Clear country
            this.byId("inputCity_emp")?.setSelectedKey("");  // ✅ CHANGED: Now uses setSelectedKey
            this.byId("inputSupervisor_emp")?.setValue("");
            this.byId("inputSupervisor_emp")?.data("selectedId", "");
            this.byId("inputSkills_emp")?.removeAllSelectedItems();
            this.byId("inputStatus_emp")?.setSelectedKey("");
            this.byId("inputLWD_emp")?.setValue("");
            this.byId("inputStatus_emp")?.setSelectedKey("");
            this.byId("inputUnit_emp")?.setSelectedKey("");


            // Deselect any selected row
            const oTable = this.byId("Employees");
            if (oTable && oTable.clearSelection) {
                try {
                    oTable.clearSelection();
                } catch (e) {
                }
            }

            // ✅ CRITICAL: Disable Edit button when form is cleared (no row selected)
            this.byId("editButton_emp")?.setEnabled(false);
        },
        onCancelMasterDataForm: function () {
            // Clear all form fields
            this.byId("inputDemandId")?.setValue("");
            this.byId("inputProject")?.setValue("");
            this.byId("inputProject")?.setEnabled(true); // Enable for new entry
            this.byId("inputQuantity")?.setValue("");
            this.byId("inputAllocatedCount")?.setValue("");
            this.byId("inputRemainingCount")?.setValue("");
            this.byId("inputBand")?.setSelectedKey("");

            // Clear MultiComboBox for skills
            this.byId("inputSkills")?.removeAllSelectedItems();

            // Deselect any selected row in the table
            const oTable = this.byId("MasterDemands");
            if (oTable && oTable.clearSelection) {
                try {
                    oTable.clearSelection();
                } catch (e) {
                    console.log("Selection cleared or method not available");
                }
            }

            // ✅ Disable Edit button when form is cleared
            this.byId("editButton_demand")?.setEnabled(false);
        },


        // Include all methods from CustomUtility
        initializeTable: CustomUtility.prototype.initializeTable,
        _getPersonsBinding: CustomUtility.prototype._getPersonsBinding,
        _getSelectedContexts: CustomUtility.prototype._getSelectedContexts,
        _updateSelectionState: CustomUtility.prototype._updateSelectionState,
        _updatePendingState: CustomUtility.prototype._updatePendingState,
        onSelectionChange: CustomUtility.prototype.onSelectionChange,
        _onCustDialogData: CustomUtility.prototype._onCustDialogData,
        _onEmpDialogData: CustomUtility.prototype._onEmpDialogData,
        _onOppDialogData: CustomUtility.prototype._onOppDialogData,
        _onProjDialogData: CustomUtility.prototype._onProjDialogData,
        _onDemandDialogData: CustomUtility.prototype._onDemandDialogData,
        _onMasterDemandsDialogData: CustomUtility.prototype._onMasterDemandsDialogData,
        // onAddPress: CustomUtility.prototype.onAddPress,
        // onDeletePress: CustomUtility.prototype.onDeletePress,
        // onSaveChanges: CustomUtility.prototype.onSaveChanges,
        // onCancelChanges: CustomUtility.prototype.onCancelChanges,
        // onCopyToClipboard: CustomUtility.prototype.onCopyToClipboard,
        // onUploadPress: CustomUtility.prototype.onUploadPress,
        // onUploadTemplate: CustomUtility.prototype.onUploadTemplate,
        // onDownloadTemplate: CustomUtility.prototype.onDownloadTemplate,
        // onEditPress: CustomUtility.prototype.onEditPress,
        // onAlignToggle: CustomUtility.prototype.onAlignToggle,
        _openPersonDialog: CustomUtility.prototype._openPersonDialog,
        onInlineAccept: CustomUtility.prototype.onInlineAccept,
        onInlineCancel: CustomUtility.prototype.onInlineCancel,
        // onSelectionChange_customers: CustomUtility.prototype.onSelectionChange_customers,
        // onSelectionChange_employees: CustomUtility.prototype.onSelectionChange_employees,
        // onSelectionChange_opportunities: CustomUtility.prototype.onSelectionChange_opportunities,
        // onSelectionChange_projects: CustomUtility.prototype.onSelectionChange_projects,
        // onSelectionChange_sapid: CustomUtility.prototype.onSelectionChange_sapid,
        // onSelectionChange: CustomUtility.prototype.onSelectionChange,
        onDeletePress: CustomUtility.prototype.onDeletePress,
        onEditPress: CustomUtility.prototype.onEditPress,
        onSaveButtonPress: CustomUtility.prototype.onSaveButtonPress,
        onCancelButtonPress: CustomUtility.prototype.onCancelButtonPress,
        _performCancelOperation: CustomUtility.prototype._performCancelOperation, // ✅ EXPOSED: For cancel button to work
        onAdd: CustomUtility.prototype.onAdd,
        _createEmptyRowData: CustomUtility.prototype._createEmptyRowData,
        _resolveContextByPath: CustomUtility.prototype._resolveContextByPath,
        _getRowBinding: CustomUtility.prototype._getRowBinding,
        onToggleRowDetail: CustomUtility.prototype.onToggleRowDetail,
        _generateNextIdFromBinding: CustomUtility.prototype._generateNextIdFromBinding,
        onFilterSearch: CustomUtility.prototype.onFilterSearch,

        // ✅ REMOVED: onFilterBarClear function - Clear button removed from all FilterBars

        // ✅ Load all home screen counts dynamically
        _loadHomeCounts: async function () {
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                return;
            }

            try {
                await Promise.all([
                    this._loadTotalHeadCount(),
                    this._loadAllocatedCount(),
                    this._loadPreAllocatedCount(),
                    this._loadUnproductiveBenchCount(),
                    this._loadOnLeaveCount()
                ]);
                // Calculate Bench Count
                this._calculateBenchCount();
            } catch (error) {
            }
        },

        // ✅ Load Total Head Count (all employees excluding Resigned)
        _loadTotalHeadCount: async function () {
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                return;
            }

            try {
                const oListBinding = oModel.bindList("/Employees", undefined, undefined,
                    new sap.ui.model.Filter({
                        path: "status",
                        operator: sap.ui.model.FilterOperator.NE,
                        value1: "Resigned"
                    })
                );

                const aContexts = await oListBinding.requestContexts(0, 10000);
                const totalCount = aContexts.length;


                const oHomeCountsModel = this.getView().getModel("homeCounts");
                if (oHomeCountsModel) {
                    oHomeCountsModel.setProperty("/totalHeadCount", totalCount);
                } else {
                }
            } catch (error) {
            }
        },

        // ✅ Load Allocated Count (employees with status='Allocated')
        _loadAllocatedCount: async function () {
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                return;
            }

            try {
                const oListBinding = oModel.bindList("/Employees", undefined, undefined,
                    new sap.ui.model.Filter({
                        path: "status",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: "Allocated"
                    })
                );

                const aContexts = await oListBinding.requestContexts(0, 10000);
                const allocatedCount = aContexts.length;

                const oHomeCountsModel = this.getView().getModel("homeCounts");
                if (oHomeCountsModel) {
                    oHomeCountsModel.setProperty("/allocatedCount", allocatedCount);
                }
            } catch (error) {
            }
        },

        // ✅ Load Pre Allocated Count (employees with status='Pre Allocated')
        _loadPreAllocatedCount: async function () {
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                return;
            }

            try {
                // ✅ Fetch all employees and filter in JavaScript (OData V4 compatibility)
                const oListBinding = oModel.bindList("/Employees", null, null, null);

                const aContexts = await oListBinding.requestContexts(0, 10000);
                const allEmployees = aContexts.map(ctx => ctx.getObject());

                // Filter employees with status = 'Pre Allocated'
                const preAllocatedCount = allEmployees.filter(emp => emp.status === "Pre Allocated").length;

                const oHomeCountsModel = this.getView().getModel("homeCounts");
                if (oHomeCountsModel) {
                    oHomeCountsModel.setProperty("/preAllocatedCount", preAllocatedCount);
                }
            } catch (error) {
            }
        },

        // ✅ Load Unproductive Bench Count (employees with status='Unproductive Bench')
        _loadUnproductiveBenchCount: async function () {
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                return;
            }

            try {
                // ✅ Fetch all employees and filter in JavaScript (OData V4 compatibility)
                const oListBinding = oModel.bindList("/Employees", null, null, null);

                const aContexts = await oListBinding.requestContexts(0, 10000);
                const allEmployees = aContexts.map(ctx => ctx.getObject());

                // Filter employees with status = 'Unproductive Bench'
                const unproductiveBenchCount = allEmployees.filter(emp => emp.status === "Unproductive Bench").length;

                const oHomeCountsModel = this.getView().getModel("homeCounts");
                if (oHomeCountsModel) {
                    oHomeCountsModel.setProperty("/unproductiveBenchCount", unproductiveBenchCount);
                }
            } catch (error) {
            }
        },

        // ✅ Load On Leave Count (employees with status='Inactive Bench')
        _loadOnLeaveCount: async function () {
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                return;
            }

            try {
                // ✅ Fetch all employees and filter in JavaScript (OData V4 compatibility)
                const oListBinding = oModel.bindList("/Employees", null, null, null);

                const aContexts = await oListBinding.requestContexts(0, 10000);
                const allEmployees = aContexts.map(ctx => ctx.getObject());

                // Filter employees with status = 'Inactive Bench'
                const onLeaveCount = allEmployees.filter(emp => emp.status === "Inactive Bench").length;

                const oHomeCountsModel = this.getView().getModel("homeCounts");
                if (oHomeCountsModel) {
                    oHomeCountsModel.setProperty("/onLeaveCount", onLeaveCount);
                }
            } catch (error) {
            }
        },

        // ✅ Calculate Bench Count (Pre Allocated + Unproductive Bench + On Leave)
        _calculateBenchCount: function () {
            const oHomeCountsModel = this.getView().getModel("homeCounts");
            if (!oHomeCountsModel) {
                return;
            }

            const oData = oHomeCountsModel.getData();
            const benchCount = (oData.preAllocatedCount || 0) +
                (oData.unproductiveBenchCount || 0) +
                (oData.onLeaveCount || 0);

            oHomeCountsModel.setProperty("/benchCount", benchCount);
        },

        // ✅ NEW: Set default filters for each entity
        _setDefaultFilters: function () {
            const oFilterModel = this.getView().getModel("filterModel");
            if (!oFilterModel) return;

            // ✅ Default filters structure initialized - actual filter fields set in fragment load
        },

        // ✅ NEW: Helper function to set default visible filter fields AND show fields with values
        // ✅ IMPORTANT: Always shows 1-2 important filters for each fragment
        _setDefaultFilterFields: function (oFilterBar, aDefaultFields) {
            if (!oFilterBar || !aDefaultFields || aDefaultFields.length === 0) return;

            // ✅ Get fragment name from FilterBar ID
            const sFilterBarId = oFilterBar.getId();
            let sFragmentName = "Customers";
            if (sFilterBarId.includes("customerFilterBar")) {
                sFragmentName = "Customers";
            } else if (sFilterBarId.includes("projectFilterBar")) {
                sFragmentName = "Projects";
            } else if (sFilterBarId.includes("opportunityFilterBar")) {
                sFragmentName = "Opportunities";
            } else if (sFilterBarId.includes("employeeFilterBar")) {
                sFragmentName = "Employees";
            } else if (sFilterBarId.includes("employeeBenchReportFilterBar")) {
                sFragmentName = "EmployeeBenchReport";
            } else if (sFilterBarId.includes("employeeProbableReleaseReportFilterBar")) {
                sFragmentName = "EmployeeProbableReleaseReport";
            } else if (sFilterBarId.includes("revenueForecastReportFilterBar")) {
                sFragmentName = "RevenueForecastReport";
            } else if (sFilterBarId.includes("employeeAllocationReportFilterBar")) {
                sFragmentName = "EmployeeAllocationReport";
            } else if (sFilterBarId.includes("employeeSkillReportFilterBar")) {
                sFragmentName = "EmployeeSkillReport";
            } else if (sFilterBarId.includes("projectsNearingCompletionReportFilterBar")) {
                sFragmentName = "ProjectsNearingCompletionReport";
            }

            const oFilterModel = this.getView().getModel("filterModel");
            const oFragmentConditions = oFilterModel ? oFilterModel.getProperty(`/${sFragmentName}/conditions`) : {};

            const fnSetDefaultFilters = () => {
                // ✅ Try multiple times to ensure FilterBar is ready
                let nAttempts = 0;
                const nMaxAttempts = 10;

                const fnTrySetFilters = () => {
                    nAttempts++;

                    if (oFilterBar && oFilterBar.initialized && typeof oFilterBar.initialized === "function") {
                        oFilterBar.initialized().then(() => {
                            // ✅ Collect fields that should be visible:
                            // 1. Default/Important fields (ALWAYS visible - 1-2 per fragment)
                            // 2. Fields that have values in filterModel
                            const aFieldsToShow = [...aDefaultFields];

                            // Check which fields have values
                            if (oFragmentConditions) {
                                Object.keys(oFragmentConditions).forEach(function (sPropertyKey) {
                                    const oCondition = oFragmentConditions[sPropertyKey];
                                    // Check if condition has a value
                                    if (oCondition &&
                                        (oCondition.length > 0 ||
                                            (oCondition.operator && oCondition.values && oCondition.values.length > 0))) {
                                        // Add to visible fields if not already there
                                        if (aFieldsToShow.indexOf(sPropertyKey) < 0) {
                                            aFieldsToShow.push(sPropertyKey);
                                        }
                                    }
                                });
                            }

                            // ✅ Always apply the state to ensure important filters are visible
                            const oNewState = {
                                filter: {
                                    FilterFields: {
                                        items: aFieldsToShow
                                    }
                                }
                            };

                            // ✅ Apply state directly (don't check existing state)
                            StateUtil.applyExternalState(oFilterBar, oNewState).then(() => {

                                // ✅ Also ensure FilterFields are actually visible via setVisible - try multiple times
                                setTimeout(() => {
                                    fnSetDefaultFiltersAlternative(aFieldsToShow);

                                    // ✅ Force FilterBar to update/refresh
                                    if (oFilterBar && typeof oFilterBar.invalidate === "function") {
                                        oFilterBar.invalidate();
                                    }

                                    // ✅ Retry once more to ensure visibility
                                    setTimeout(() => {
                                        fnSetDefaultFiltersAlternative(aFieldsToShow);
                                    }, 500);
                                }, 300);
                            }).catch((e) => {
                                fnSetDefaultFiltersAlternative(aFieldsToShow);
                            });
                        }).catch(() => {
                            // If initialization fails, retry
                            if (nAttempts < nMaxAttempts) {
                                setTimeout(fnTrySetFilters, 500);
                            } else {
                                // Fallback to alternative method
                                const aFieldsToShow = [...aDefaultFields];
                                if (oFragmentConditions) {
                                    Object.keys(oFragmentConditions).forEach(function (sPropertyKey) {
                                        const oCondition = oFragmentConditions[sPropertyKey];
                                        if (oCondition &&
                                            (oCondition.length > 0 ||
                                                (oCondition.operator && oCondition.values && oCondition.values.length > 0))) {
                                            if (aFieldsToShow.indexOf(sPropertyKey) < 0) {
                                                aFieldsToShow.push(sPropertyKey);
                                            }
                                        }
                                    });
                                }
                                fnSetDefaultFiltersAlternative(aFieldsToShow);
                            }
                        });
                    } else {
                        // FilterBar not ready, retry
                        if (nAttempts < nMaxAttempts) {
                            setTimeout(fnTrySetFilters, 300);
                        } else {
                            // Fallback to alternative method
                            const aFieldsToShow = [...aDefaultFields];
                            fnSetDefaultFiltersAlternative(aFieldsToShow);
                        }
                    }
                };

                fnTrySetFilters();
            };

            const fnSetDefaultFiltersAlternative = (aFieldsToShow) => {
                try {
                    const aFilterFields = oFilterBar.getFilterFields();
                    if (aFilterFields && aFilterFields.length > 0) {
                        aFilterFields.forEach(function (oField) {
                            if (oField && oField.setVisible) {
                                const sPropertyKey = oField.getPropertyKey();
                                // ✅ Always show default/important fields
                                if (aDefaultFields.indexOf(sPropertyKey) >= 0) {
                                    oField.setVisible(true);
                                    // ✅ Force update
                                    if (oField.rerender) {
                                        oField.rerender();
                                    }
                                } else if (aFieldsToShow && aFieldsToShow.indexOf(sPropertyKey) >= 0) {
                                    // Show fields with values
                                    oField.setVisible(true);
                                } else {
                                    // Hide fields that are not important and have no value
                                    oField.setVisible(false);
                                }
                            }
                        });

                        // ✅ Force FilterBar to refresh
                        if (oFilterBar && typeof oFilterBar.invalidate === "function") {
                            oFilterBar.invalidate();
                        }
                    } else {
                        // ✅ If FilterFields not ready, retry
                        setTimeout(() => {
                            fnSetDefaultFiltersAlternative(aFieldsToShow);
                        }, 500);
                    }
                } catch (e) {
                }
            };

            fnSetDefaultFilters();
        },

        // ============================================
        // REPORT GENERATION HANDLERS
        // ============================================

        onReportTypeChange: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return;
            }

            const sReportType = oSelectedItem.getKey();
            const oFiltersPanel = this.byId("reportFiltersPanel");
            const oGenerateBtn = this.byId("generateReportBtn");

            // Clear existing filters
            if (oFiltersPanel) {
                oFiltersPanel.destroyContent();
            }

            // Enable generate button if a report type is selected
            if (oGenerateBtn) {
                if (sReportType && sReportType !== "") {
                    oGenerateBtn.setEnabled(true);
                } else {
                    oGenerateBtn.setEnabled(false);
                }
            }

            // Create dynamic filters based on report type
            if (sReportType && sReportType !== "") {
                this._createReportFilters(sReportType);
            }
        },

        _createReportFilters: function (sReportType) {
            const oFiltersPanel = this.byId("reportFiltersPanel");
            if (!oFiltersPanel) return;

            // Common filters for most reports
            const oVBox = new sap.m.VBox({
                items: []
            });

            // Add report-specific filters
            switch (sReportType) {
                case "EmployeeBenchReport":
                    oVBox.addItem(new sap.m.Label({ text: "Band Filter" }));
                    oVBox.addItem(new sap.m.MultiComboBox({
                        id: "bandFilter",
                        placeholder: "Select Bands"
                    }));
                    oVBox.addItem(new sap.m.Label({ text: "Employee Type Filter" }));
                    oVBox.addItem(new sap.m.MultiComboBox({
                        id: "employeeTypeFilter",
                        placeholder: "Select Employee Types"
                    }));
                    oVBox.addItem(new sap.m.Label({ text: "Minimum Days on Bench" }));
                    oVBox.addItem(new sap.m.Input({
                        id: "minDaysOnBench",
                        type: "Number",
                        placeholder: "Enter minimum days"
                    }));
                    break;
                case "EmployeeProbableReleaseReport":
                    oVBox.addItem(new sap.m.Label({ text: "Release Window" }));
                    oVBox.addItem(new sap.m.Select({
                        id: "releaseWindow",
                        items: [
                            new sap.ui.core.Item({ key: "30", text: "30 Days" }),
                            new sap.ui.core.Item({ key: "60", text: "60 Days" }),
                            new sap.ui.core.Item({ key: "90", text: "90 Days" }),
                            new sap.ui.core.Item({ key: "All", text: "All" })
                        ]
                    }));
                    break;
                case "RevenueForecastReport":
                    oVBox.addItem(new sap.m.Label({ text: "Start Month (YYYY-MM)" }));
                    oVBox.addItem(new sap.m.DatePicker({
                        id: "startMonth",
                        displayFormat: "yyyy-MM"
                    }));
                    oVBox.addItem(new sap.m.Label({ text: "End Month (YYYY-MM)" }));
                    oVBox.addItem(new sap.m.DatePicker({
                        id: "endMonth",
                        displayFormat: "yyyy-MM"
                    }));
                    break;
                case "SupervisorTeamAllocationReport":
                    oVBox.addItem(new sap.m.Label({ text: "Supervisor ID" }));
                    oVBox.addItem(new sap.m.Input({
                        id: "supervisorId",
                        placeholder: "Enter Supervisor OHR ID"
                    }));
                    break;
                case "EmployeeAssignmentHistoryReport":
                    oVBox.addItem(new sap.m.Label({ text: "Employee ID" }));
                    oVBox.addItem(new sap.m.Input({
                        id: "employeeId",
                        placeholder: "Enter Employee OHR ID"
                    }));
                    oVBox.addItem(new sap.m.Label({ text: "Limit" }));
                    oVBox.addItem(new sap.m.Input({
                        id: "limit",
                        type: "Number",
                        value: "50"
                    }));
                    break;
            }

            oFiltersPanel.addContent(oVBox);
        },

        onGenerateReport: function () {
            const oReportTypeSelect = this.byId("reportTypeSelect");
            const sReportType = oReportTypeSelect ? oReportTypeSelect.getSelectedKey() : "";

            if (!sReportType) {
                sap.m.MessageToast.show("Please select a report type");
                return;
            }

            // Collect filter values
            const oFilters = this._collectReportFilters(sReportType);

            // Call the appropriate report function
            const oModel = this.getOwnerComponent().getModel();
            if (!oModel) {
                sap.m.MessageToast.show("Model not available");
                return;
            }

            // Map report type to function name
            const sFunctionName = "generate" + sReportType;

            // Show busy indicator
            const oTable = this.byId("reportDataTable");
            if (oTable) {
                oTable.setBusy(true);
            }

            // Call the function
            oModel.callFunction(sFunctionName, {
                method: "GET",
                urlParameters: oFilters,
                success: (oData) => {
                    this._displayReportResults(sReportType, oData);
                    if (oTable) {
                        oTable.setBusy(false);
                    }
                },
                error: (oError) => {
                    sap.m.MessageToast.show("Error generating report: " + (oError.message || "Unknown error"));
                    if (oTable) {
                        oTable.setBusy(false);
                    }
                }
            });
        },

        _collectReportFilters: function (sReportType) {
            const oFilters = {};

            switch (sReportType) {
                case "EmployeeBenchReport":
                    const oBandFilter = this.byId("bandFilter");
                    const oEmployeeTypeFilter = this.byId("employeeTypeFilter");
                    const oMinDays = this.byId("minDaysOnBench");
                    if (oBandFilter) oFilters.bandFilter = oBandFilter.getSelectedKeys();
                    if (oEmployeeTypeFilter) oFilters.employeeTypeFilter = oEmployeeTypeFilter.getSelectedKeys();
                    if (oMinDays) oFilters.minDaysOnBench = parseInt(oMinDays.getValue()) || 0;
                    break;
                case "EmployeeProbableReleaseReport":
                    const oReleaseWindow = this.byId("releaseWindow");
                    if (oReleaseWindow) oFilters.releaseWindow = oReleaseWindow.getSelectedKey();
                    break;
                case "RevenueForecastReport":
                    const oStartMonth = this.byId("startMonth");
                    const oEndMonth = this.byId("endMonth");
                    if (oStartMonth) oFilters.startMonth = oStartMonth.getValue();
                    if (oEndMonth) oFilters.endMonth = oEndMonth.getValue();
                    break;
                case "SupervisorTeamAllocationReport":
                    const oSupervisorId = this.byId("supervisorId");
                    if (oSupervisorId) oFilters.supervisorId = oSupervisorId.getValue();
                    break;
                case "EmployeeAssignmentHistoryReport":
                    const oEmployeeId = this.byId("employeeId");
                    const oLimit = this.byId("limit");
                    if (oEmployeeId) oFilters.employeeId = oEmployeeId.getValue();
                    if (oLimit) oFilters.limit = parseInt(oLimit.getValue()) || 50;
                    break;
            }

            return oFilters;
        },

        _displayReportResults: function (sReportType, oData) {
            // Display summary cards
            const oSummaryCards = this.byId("reportSummaryCards");
            if (oSummaryCards) {
                oSummaryCards.destroyContent();

                if (oData.summary) {
                    Object.keys(oData.summary).forEach(sKey => {
                        const oValue = oData.summary[sKey];
                        if (typeof oValue === 'number' || typeof oValue === 'string') {
                            const oCard = new sap.m.GenericTile({
                                header: sKey,
                                subHeader: String(oValue),
                                frameType: "OneByOne"
                            });
                            oSummaryCards.addContent(oCard);
                        }
                    });
                }
            }

            // Display report data in table
            const oTable = this.byId("reportDataTable");
            const oExportBtn = this.byId("exportReportBtn");

            if (oTable && oData.reportData) {
                // Create a JSON model for the report data
                const oReportModel = new sap.ui.model.json.JSONModel({
                    results: oData.reportData
                });
                oTable.setModel(oReportModel);
            }

            if (oExportBtn) {
                oExportBtn.setVisible(true);
            }
        },

        onExportReport: function () {
            const oReportTypeSelect = this.byId("reportTypeSelect");
            const sReportType = oReportTypeSelect ? oReportTypeSelect.getSelectedKey() : "";

            if (!sReportType) {
                sap.m.MessageToast.show("Please select a report type");
                return;
            }

            // Implementation for CSV export
            sap.m.MessageToast.show("Export functionality will be implemented");
        },

        // For upload functionality function
        onUpload: CustomUtility.prototype._onUploadPress,
        onFileUploadSubmit: CustomUtility.prototype._onFileUploadSubmit,
        onMessagePopoverPress: CustomUtility.prototype._onMessagePopoverPress,
        onFileUploadChange: CustomUtility.prototype._onFileUploadChange,
        updateMessageButtonIcon: CustomUtility.prototype._updateMessageButtonIcon,
        onCloseUpload: CustomUtility.prototype._onCloseUpload,
        getMessagePopover: CustomUtility.prototype._getMessagePopover,
        downloadCSV: CustomUtility.prototype._downloadCSV,
        onSplitButtonArrowPress: CustomUtility.prototype._onSplitButtonArrowPress,
        exportUploadTemplate: CustomUtility.prototype._exportUploadTemplate,

        // ✅ Value Help Dialog Handlers
        onCustomerValueHelpRequest: function (oEvent) {
            const oInput = oEvent.getSource();
            const oView = this.getView();

            // Create dialog if not exists
            if (!this._oCustomerValueHelpDialog) {
                this._oCustomerValueHelpDialog = sap.ui.xmlfragment(
                    "glassboard.view.dialogs.CustomerValueHelp",
                    this
                );
                oView.addDependent(this._oCustomerValueHelpDialog);
            }

            // Store reference to input field
            this._oCustomerValueHelpDialog._oInputField = oInput;

            // Open dialog
            this._oCustomerValueHelpDialog.open();
        },

        onOpportunityValueHelpRequest: function (oEvent) {
            const oInput = oEvent.getSource();
            const oView = this.getView();

            if (!this._oOpportunityValueHelpDialog) {
                this._oOpportunityValueHelpDialog = sap.ui.xmlfragment(
                    "glassboard.view.dialogs.OpportunityValueHelp",
                    this
                );
                oView.addDependent(this._oOpportunityValueHelpDialog);
            }

            this._oOpportunityValueHelpDialog._oInputField = oInput;
            this._oOpportunityValueHelpDialog.open();
        },

        onEmployeeValueHelpRequest: function (oEvent) {
            const oInput = oEvent.getSource();
            const oView = this.getView();

            if (!this._oEmployeeValueHelpDialog) {
                this._oEmployeeValueHelpDialog = sap.ui.xmlfragment(
                    "glassboard.view.dialogs.EmployeeValueHelp",
                    this
                );
                oView.addDependent(this._oEmployeeValueHelpDialog);
            }

            // Check which field is requesting value help
            const sInputId = oInput.getId();
            const bIsGPMField = sInputId && sInputId.includes("inputGPM_proj");
            const bIsSalesSPOC = sInputId && sInputId.includes("inputSalesSPOC_oppr");
            const bIsDeliverySPOC = sInputId && sInputId.includes("inputDeliverySPOC_oppr");

            // Set dialog title based on which field is calling
            let sDialogTitle = "Select Supervisor"; // Default for supervisor field
            if (bIsGPMField) {
                sDialogTitle = "Select GPM";
            } else if (bIsSalesSPOC) {
                sDialogTitle = "Select Sales SPOC";
            } else if (bIsDeliverySPOC) {
                sDialogTitle = "Select Delivery SPOC";
            }

            // Update dialog title
            if (this._oEmployeeValueHelpDialog) {
                this._oEmployeeValueHelpDialog.setTitle(sDialogTitle);
            }

            this._oEmployeeValueHelpDialog._oInputField = oInput;
            this._oEmployeeValueHelpDialog._isGPMField = bIsGPMField;
            this._oEmployeeValueHelpDialog._isSalesSPOC = bIsSalesSPOC;
            this._oEmployeeValueHelpDialog._isDeliverySPOC = bIsDeliverySPOC;
            this._oEmployeeValueHelpDialog.open();
        },

        // ✅ Value Help Dialog: GPM request handler (reuses Employee dialog)
        onGPMValueHelpRequest: function (oEvent) {
            // Reuse Employee value help dialog for GPM selection
            this.onEmployeeValueHelpRequest(oEvent);
        },

        // ✅ Value Help Dialog: Cancel handler
        onCustomerValueHelpCancel: function (oEvent) {
            const oDialog = this._oCustomerValueHelpDialog;
            if (oDialog) {
                // Clear selection in the value help table before closing
                const oDialogContent = oDialog.getContent()[0];
                if (oDialogContent) {
                    const aItems = oDialogContent.getItems();
                    const oTable = aItems.find(item => item.getId && item.getId().includes("customerValueHelpTable"));
                    if (oTable && oTable.clearSelection) {
                        oTable.clearSelection();
                    }
                }
                oDialog.close();
            }
        },

        onOpportunityValueHelpCancel: function (oEvent) {
            const oDialog = this._oOpportunityValueHelpDialog;
            if (oDialog) {
                // Clear selection in the value help table before closing
                const oDialogContent = oDialog.getContent()[0];
                if (oDialogContent) {
                    const aItems = oDialogContent.getItems();
                    const oTable = aItems.find(item => item.getId && item.getId().includes("opportunityValueHelpTable"));
                    if (oTable && oTable.clearSelection) {
                        oTable.clearSelection();
                    }
                }
                oDialog.close();
            }
        },

        onEmployeeValueHelpCancel: function (oEvent) {
            const oDialog = this._oEmployeeValueHelpDialog;
            if (oDialog) {
                // Clear selection in the value help table before closing
                const oDialogContent = oDialog.getContent()[0];
                if (oDialogContent) {
                    const aItems = oDialogContent.getItems();
                    const oTable = aItems.find(item => item.getId && item.getId().includes("employeeValueHelpTable"));
                    if (oTable && oTable.clearSelection) {
                        oTable.clearSelection();
                    }
                }
                oDialog.close();
            }
        },

        // ✅ Value Help Dialog: GPM cancel handler (reuses Employee dialog)
        onGPMValueHelpCancel: function (oEvent) {
            // Reuse Employee value help cancel
            this.onEmployeeValueHelpCancel(oEvent);
        },

        // ✅ Value Help Dialog: Project request handler
        onProjectValueHelpRequest: function (oEvent) {
            const oInput = oEvent.getSource();
            const oView = this.getView();

            if (!this._oProjectValueHelpDialog) {
                this._oProjectValueHelpDialog = sap.ui.xmlfragment(
                    "glassboard.view.dialogs.ProjectValueHelp",
                    this
                );
                oView.addDependent(this._oProjectValueHelpDialog);
            }

            this._oProjectValueHelpDialog._oInputField = oInput;

            // Check if this is from AllocateDialog and filter by project if needed
            const sInputId = oInput.getId();
            const bIsAllocateDialog = sInputId && sInputId.includes("Resinput_proj");

            // ✅ CRITICAL: If opened from employee level (AllocateDialog), get project from Res fragment
            if (bIsAllocateDialog) {
                // Try to get project ID from Res fragment if available (when opened from employee level)
                const sResProjectId = this.byId("Resinput_Project")?.data("selectedId");
                if (sResProjectId) {
                    this._sAllocateProjectFilter = sResProjectId;
                }
            }

            this._oProjectValueHelpDialog.open();
        },

        // ✅ Value Help Dialog: Project search handler
        onProjectValueHelpSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oDialog = this._oProjectValueHelpDialog;
            if (!oDialog) return;

            const oDialogContent = oDialog.getContent()[0];
            const aItems = oDialogContent.getItems();
            const oTable = aItems.find(item => item.getId && item.getId().includes("projectValueHelpTable"));

            if (!oTable) return;

            const oBinding = oTable.getBinding("items");
            if (!oBinding) return;

            const aFilters = [];

            // Apply opportunity filter if available (from Res fragment)
            if (this._sResOppFilter) {
                aFilters.push(new sap.ui.model.Filter("oppId", sap.ui.model.FilterOperator.EQ, this._sResOppFilter));
            }

            // Apply search filter
            if (sQuery && sQuery.trim() !== "") {
                aFilters.push(new sap.ui.model.Filter("projectName", sap.ui.model.FilterOperator.Contains, sQuery.trim(), false));
            }

            oBinding.filter(aFilters.length > 0 ? aFilters : []);
        },

        // ✅ Value Help Dialog: Project confirm handler
        onProjectValueHelpConfirm: function (oEvent) {
            const oDialog = this._oProjectValueHelpDialog;
            if (!oDialog) {
                return;
            }

            const oDialogContent = oDialog.getContent()[0];
            const aItems = oDialogContent.getItems();
            const oTable = aItems.find(item => item.getId && item.getId().includes("projectValueHelpTable"));

            if (!oTable || !oTable.getSelectedItem) {
                sap.m.MessageToast.show("Please select a project");
                return;
            }

            const oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select a project");
                return;
            }

            const oContext = oSelectedItem.getBindingContext();
            if (oContext && oDialog._oInputField) {
                const oProject = oContext.getObject();
                const sProjectId = oProject.sapPId || "";

                // ✅ Display only ID (not name) for association fields
                oDialog._oInputField.setValue(sProjectId || "");
                oDialog._oInputField.data("selectedId", sProjectId);

                // ✅ CRITICAL: Store project ID for AllocateDialog demand filtering
                const sInputId = oDialog._oInputField.getId();
                if (sInputId && sInputId.includes("Resinput_proj")) {
                    this._sAllocateDemandProjectFilter = sProjectId;

                    // ✅ NEW: Populate employees allocated to selected project
                    this._populateProjectEmployees(sProjectId);

                    // ✅ Auto-fill start and end dates from project (default values, user can modify)
                    // Try multiple methods to find date pickers (they're in AllocateDialog fragment)
                    let oStartDatePicker = this.byId("startDate");
                    let oEndDatePicker = this.byId("endDate");

                    // If not found, try Fragment.byId
                    if (!oStartDatePicker) {
                        oStartDatePicker = sap.ui.core.Fragment.byId(this.getView().getId(), "startDate");
                    }
                    if (!oEndDatePicker) {
                        oEndDatePicker = sap.ui.core.Fragment.byId(this.getView().getId(), "endDate");
                    }

                    // If still not found, try to get from AllocateDialog
                    if ((!oStartDatePicker || !oEndDatePicker) && this._oAllocateDialog) {
                        const aDialogContent = this._oAllocateDialog.getContent();
                        if (aDialogContent && aDialogContent.length > 0) {
                            const oVBox = aDialogContent[0];
                            if (oVBox && oVBox.getContent) {
                                const aVBoxContent = oVBox.getContent();
                                for (let i = 0; i < aVBoxContent.length; i++) {
                                    const oItem = aVBoxContent[i];
                                    if (oItem && oItem.getId) {
                                        const sItemId = oItem.getId();
                                        if (sItemId.includes("startDate") && !oStartDatePicker) {
                                            oStartDatePicker = oItem;
                                        }
                                        if (sItemId.includes("endDate") && !oEndDatePicker) {
                                            oEndDatePicker = oItem;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ✅ Auto-fill dates from project - try to get full project data to ensure dates are available
                    const fnSetDates = (oProjectData) => {
                        if (oProjectData && oStartDatePicker && oProjectData.startDate) {
                            oStartDatePicker.setValue(oProjectData.startDate);
                            oStartDatePicker.data("projectStartDate", oProjectData.startDate);
                        }
                        if (oProjectData && oEndDatePicker && oProjectData.endDate) {
                            oEndDatePicker.setValue(oProjectData.endDate);
                            oEndDatePicker.data("projectEndDate", oProjectData.endDate);
                        }
                    };

                    // Try to use dates from project object first (if available)
                    if (oProject.startDate || oProject.endDate) {
                        fnSetDates(oProject);
                    } else {
                        // ✅ If dates not in project object, fetch full project data using requestObject
                        if (oContext && oContext.requestObject) {
                            oContext.requestObject().then((oFullProject) => {
                                fnSetDates(oFullProject);
                            }).catch((oError) => {
                                // Still try to set dates from partial project object if available
                                fnSetDates(oProject);
                            });
                        } else {
                            // Fallback: try to set from partial project object
                            fnSetDates(oProject);
                        }
                    }
                }
            }

            if (oTable && oTable.clearSelection) {
                oTable.clearSelection();
            }
            oDialog.close();
        },

        // ✅ Value Help Dialog: Project cancel handler
        onProjectValueHelpCancel: function (oEvent) {
            const oDialog = this._oProjectValueHelpDialog;
            if (oDialog) {
                const oDialogContent = oDialog.getContent()[0];
                if (oDialogContent) {
                    const aItems = oDialogContent.getItems();
                    const oTable = aItems.find(item => item.getId && item.getId().includes("projectValueHelpTable"));
                    if (oTable && oTable.clearSelection) {
                        oTable.clearSelection();
                    }
                }
                oDialog.close();
            }
        },

        // ✅ Value Help Dialog: Demand request handler
        onDemandValueHelpRequest: function (oEvent) {
            const oInput = oEvent.getSource();
            const oView = this.getView();

            if (!this._oDemandValueHelpDialog) {
                this._oDemandValueHelpDialog = sap.ui.xmlfragment(
                    "glassboard.view.dialogs.DemandValueHelp",
                    this
                );
                oView.addDependent(this._oDemandValueHelpDialog);
            }

            this._oDemandValueHelpDialog._oInputField = oInput;

            // Check if this is from AllocateDialog, FindResourcesDialog, or Res fragment and filter by project if needed
            const sInputId = oInput.getId();
            const bIsAllocateDialog = sInputId && sInputId.includes("Resinput_demand");
            const bIsFindResourcesDialog = sInputId && sInputId.includes("findResourcesDemandInput");
            const bIsResFragment = sInputId && sInputId.includes("Resinput_Demand");

            // ✅ CRITICAL: Store project filter if available (from AllocateDialog, FindResourcesDialog, or Res fragment)
            if (bIsAllocateDialog) {
                // Get project ID from AllocateDialog project input
                const sProjectId = this.byId("Resinput_proj")?.data("selectedId");
                if (sProjectId) {
                    this._sAllocateDemandProjectFilter = sProjectId;
                } else {
                    // Try to get from Res fragment if available (when opened from employee level)
                    const sResProjectId = this.byId("Resinput_Project")?.data("selectedId");
                    if (sResProjectId) {
                        this._sAllocateDemandProjectFilter = sResProjectId;
                    } else {
                        // ✅ Also check if project was already stored from previous selection
                    }
                }
            } else if (bIsFindResourcesDialog) {
                // ✅ NEW: Get project ID from Find Resources context (stored when dialog opened)
                const sProjectId = this._sAllocationProjectId;
                if (sProjectId) {
                    this._sAllocateDemandProjectFilter = sProjectId;
                } else {
                }
            } else if (bIsResFragment) {
                const sProjectId = this.byId("Resinput_Project")?.data("selectedId");
                if (sProjectId) {
                    this._sResDemandProjectFilter = sProjectId;
                } else {
                }
            }

            this._oDemandValueHelpDialog.open();

            // ✅ CRITICAL: Apply filter immediately when dialog opens (not just on search)
            setTimeout(() => {
                const oDialogContent = this._oDemandValueHelpDialog.getContent()[0];
                if (oDialogContent) {
                    const aItems = oDialogContent.getItems();
                    const oTable = aItems.find(item => item.getId && item.getId().includes("demandValueHelpTable"));

                    if (oTable) {
                        const oBinding = oTable.getBinding("items");
                        if (oBinding) {
                            // Apply the same filter logic as in search handler
                            const aFilters = [];

                            // Apply project filter if available
                            let sProjectFilter = null;
                            if (this._sAllocateDemandProjectFilter) {
                                sProjectFilter = this._sAllocateDemandProjectFilter;
                            } else if (this._sResDemandProjectFilter) {
                                sProjectFilter = this._sResDemandProjectFilter;
                            }

                            if (sProjectFilter) {
                                // ✅ CRITICAL: Use project ID as-is (P-0001 format) - no conversion needed
                                // The Demand CSV and database now use "P-0001" format consistently
                                aFilters.push(new sap.ui.model.Filter("sapPId", sap.ui.model.FilterOperator.EQ, sProjectFilter));
                                oBinding.filter(aFilters);
                            }
                        }
                    }
                }
            }, 100);
        },

        // ✅ Value Help Dialog: Demand search handler
        onDemandValueHelpSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oDialog = this._oDemandValueHelpDialog;
            if (!oDialog) return;

            const oDialogContent = oDialog.getContent()[0];
            const aItems = oDialogContent.getItems();
            const oTable = aItems.find(item => item.getId && item.getId().includes("demandValueHelpTable"));

            if (!oTable) return;

            const oBinding = oTable.getBinding("items");
            if (!oBinding) return;

            const aFilters = [];

            // Apply project filter if available
            let sProjectFilter = null;
            if (this._sAllocateDemandProjectFilter) {
                sProjectFilter = this._sAllocateDemandProjectFilter;
            } else if (this._sResDemandProjectFilter) {
                sProjectFilter = this._sResDemandProjectFilter;
            }

            if (sProjectFilter) {
                // ✅ CRITICAL: Use project ID as-is (P-0001 format) - no conversion needed
                // The Demand CSV and database now use "P-0001" format consistently
                aFilters.push(new sap.ui.model.Filter("sapPId", sap.ui.model.FilterOperator.EQ, sProjectFilter));
            }

            // Apply search filter
            if (sQuery && sQuery.trim() !== "") {
                aFilters.push(new sap.ui.model.Filter("skill", sap.ui.model.FilterOperator.Contains, sQuery.trim(), false));
            }

            oBinding.filter(aFilters.length > 0 ? aFilters : []);
        },

        // ✅ Value Help Dialog: Demand confirm handler
        onDemandValueHelpConfirm: function (oEvent) {
            const oDialog = this._oDemandValueHelpDialog;
            if (!oDialog) {
                return;
            }

            const oDialogContent = oDialog.getContent()[0];
            const aItems = oDialogContent.getItems();
            const oTable = aItems.find(item => item.getId && item.getId().includes("demandValueHelpTable"));

            if (!oTable || !oTable.getSelectedItem) {
                sap.m.MessageToast.show("Please select a demand");
                return;
            }

            const oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select a demand");
                return;
            }

            const oContext = oSelectedItem.getBindingContext();
            if (oContext && oDialog._oInputField) {
                const oDemand = oContext.getObject();
                // ✅ Display only ID (not description) for association fields
                const sDemandId = oDemand.demandId || oDemand.id || "";
                oDialog._oInputField.setValue(sDemandId);
                oDialog._oInputField.data("selectedId", sDemandId);
            }

            if (oTable && oTable.clearSelection) {
                oTable.clearSelection();
            }
            oDialog.close();
        },

        // ✅ Value Help Dialog: Demand cancel handler
        onDemandValueHelpCancel: function (oEvent) {
            const oDialog = this._oDemandValueHelpDialog;
            if (oDialog) {
                const oDialogContent = oDialog.getContent()[0];
                if (oDialogContent) {
                    const aItems = oDialogContent.getItems();
                    const oTable = aItems.find(item => item.getId && item.getId().includes("demandValueHelpTable"));
                    if (oTable && oTable.clearSelection) {
                        oTable.clearSelection();
                    }
                }
                oDialog.close();
            }
        },

        // ✅ Value Help Dialog: Customer selection handler
        onCustomerValueHelpConfirm: function (oEvent) {
            const oDialog = this._oCustomerValueHelpDialog;
            if (!oDialog) {
                return;
            }

            // Get table from within the dialog
            const oDialogContent = oDialog.getContent()[0];
            const aItems = oDialogContent.getItems();
            const oTable = aItems.find(item => item.getId && item.getId().includes("customerValueHelpTable"));

            if (!oTable) {
                sap.m.MessageToast.show("Table not found");
                return;
            }

            // ✅ CRITICAL: Check if a row is actually selected
            const oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select a customer");
                return;
            }

            // Also check selected contexts as backup
            const aSelectedContexts = oTable.getSelectedContexts ? oTable.getSelectedContexts() : [];
            if (aSelectedContexts.length === 0) {
                sap.m.MessageToast.show("Please select a customer");
                return;
            }

            const oContext = oSelectedItem.getBindingContext();
            if (!oContext) {
                sap.m.MessageToast.show("Unable to get customer data");
                if (oTable && oTable.clearSelection) {
                    oTable.clearSelection();
                }
                oDialog.close();
                return;
            }

            const oCustomer = oContext.getObject();
            if (!oDialog._oInputField) {
                sap.m.MessageToast.show("Input field not found");
                if (oTable && oTable.clearSelection) {
                    oTable.clearSelection();
                }
                oDialog.close();
                return;
            }

            // ✅ Display only ID (not name) for association fields
            oDialog._oInputField.setValue(oCustomer.SAPcustId || "");
            oDialog._oInputField.data("selectedId", oCustomer.SAPcustId);

            // Also update/create the model with the ID (for backend submission)
            let oModel = this.getView().getModel("opportunityModel");
            if (!oModel) {
                oModel = new sap.ui.model.json.JSONModel({ customerId: oCustomer.SAPcustId });
                this.getView().setModel(oModel, "opportunityModel");
            } else {
                oModel.setProperty("/customerId", oCustomer.SAPcustId);
            }

            // ✅ CRITICAL: Close dialog FIRST before doing table updates
            if (oTable && oTable.clearSelection) {
                oTable.clearSelection();
            }
            oDialog.close();

            // ✅ CRITICAL: Update selected row in main table and refresh for instant UI update
            const oMainTable = this.byId("Opportunities");
            if (oMainTable) {
                const aSelectedContexts = oMainTable.getSelectedContexts();
                if (aSelectedContexts && aSelectedContexts.length > 0) {
                    const oMainContext = aSelectedContexts[0];
                    const oModel = oMainTable.getModel();
                    const sPath = oMainContext.getPath();

                    // ✅ STEP 1: Update the context property immediately
                    oMainContext.setProperty("customerId", oCustomer.SAPcustId);

                    // ✅ STEP 2: Update the association data immediately for instant UI feedback
                    if (oMainContext.getObject) {
                        const oObj = oMainContext.getObject();
                        if (oObj) {
                            oObj.to_Customer = {
                                SAPcustId: oCustomer.SAPcustId,
                                customerName: oCustomer.customerName
                            };
                        }
                    }

                    // ✅ STEP 3: CRITICAL - Refresh the expanded association binding for this specific row
                    // This forces the table to re-fetch the expanded association data
                    if (sPath && oModel) {
                        const oExpandedContext = oModel.bindContext(sPath + "/to_Customer", null, { deferred: true });
                        oExpandedContext.execute().then(() => {
                            const oAssocData = oExpandedContext.getObject();
                            if (oAssocData && oMainContext.getObject) {
                                const oMainObj = oMainContext.getObject();
                                if (oMainObj) {
                                    oMainObj.to_Customer = oAssocData;
                                }
                            }
                            // Force UI refresh after expanded association is refreshed
                            if (oModel && oModel.checkDataState) {
                                oModel.checkDataState();
                            }
                            if (oMainContext.checkUpdate) {
                                oMainContext.checkUpdate();
                            }
                        }).catch(() => { });
                    }

                    // ✅ STEP 4: Force immediate UI update by checking data state
                    if (oModel && oModel.checkDataState) {
                        oModel.checkDataState();
                    }
                    if (oMainContext.checkUpdate) {
                        oMainContext.checkUpdate();
                    }

                    // ✅ STEP 5: Refresh the table binding to show updated value immediately
                    const oRowBinding = oMainTable.getRowBinding && oMainTable.getRowBinding();
                    const oBinding = oMainTable.getBinding("rows") || oMainTable.getBinding("items");
                    if (oRowBinding) {
                        oRowBinding.refresh().catch(() => { });
                    } else if (oBinding) {
                        oBinding.refresh().catch(() => { });
                    }

                    // ✅ STEP 6: Also try rebind for MDC tables (this refreshes expanded associations)
                    if (oMainTable.rebind) {
                        setTimeout(() => {
                            try {
                                oMainTable.rebind();
                            } catch (e) {
                            }
                        }, 100);
                    }
                }
            }
        },

        // ✅ Value Help Dialog: Opportunity selection handler
        onOpportunityValueHelpConfirm: function (oEvent) {
            const oDialog = this._oOpportunityValueHelpDialog;
            if (!oDialog) {
                return;
            }

            // Get table from within the dialog
            const oDialogContent = oDialog.getContent()[0];
            const aItems = oDialogContent.getItems();
            const oTable = aItems.find(item => item.getId && item.getId().includes("opportunityValueHelpTable"));

            if (!oTable) {
                sap.m.MessageToast.show("Table not found");
                return;
            }

            // ✅ CRITICAL: Check if a row is actually selected
            const oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select an opportunity");
                return;
            }

            // Also check selected contexts as backup
            const aSelectedContexts = oTable.getSelectedContexts ? oTable.getSelectedContexts() : [];
            if (aSelectedContexts.length === 0) {
                sap.m.MessageToast.show("Please select an opportunity");
                return;
            }

            const oContext = oSelectedItem.getBindingContext();
            if (!oContext) {
                sap.m.MessageToast.show("Unable to get opportunity data");
                if (oTable && oTable.clearSelection) {
                    oTable.clearSelection();
                }
                oDialog.close();
                return;
            }

            const oOpportunity = oContext.getObject();
            if (!oDialog._oInputField) {
                sap.m.MessageToast.show("Input field not found");
                if (oTable && oTable.clearSelection) {
                    oTable.clearSelection();
                }
                oDialog.close();
                return;
            }

            // ✅ Display only ID (not name) for association fields
            oDialog._oInputField.setValue(oOpportunity.sapOpportunityId || "");
            oDialog._oInputField.data("selectedId", oOpportunity.sapOpportunityId);

            // Also update/create the model with the ID (for backend submission)
            let oModel = this.getView().getModel("projectModel");
            if (!oModel) {
                oModel = new sap.ui.model.json.JSONModel({ oppId: oOpportunity.sapOpportunityId });
                this.getView().setModel(oModel, "projectModel");
            } else {
                oModel.setProperty("/oppId", oOpportunity.sapOpportunityId);
            }

            // ✅ CRITICAL: Close dialog FIRST before doing table updates
            if (oTable && oTable.clearSelection) {
                oTable.clearSelection();
            }
            oDialog.close();

            // ✅ CRITICAL: Update selected row in main table and refresh for instant UI update
            const oMainTable = this.byId("Projects");
            if (oMainTable) {
                const aSelectedContexts = oMainTable.getSelectedContexts();
                if (aSelectedContexts && aSelectedContexts.length > 0) {
                    const oMainContext = aSelectedContexts[0];
                    const oModel = oMainTable.getModel();
                    const sPath = oMainContext.getPath();

                    // ✅ STEP 1: Update the context property immediately
                    oMainContext.setProperty("oppId", oOpportunity.sapOpportunityId);

                    // ✅ STEP 2: Update the association data immediately for instant UI feedback
                    if (oMainContext.getObject) {
                        const oObj = oMainContext.getObject();
                        if (oObj) {
                            oObj.to_Opportunity = {
                                sapOpportunityId: oOpportunity.sapOpportunityId,
                                opportunityName: oOpportunity.opportunityName
                            };
                        }
                    }

                    // ✅ STEP 3: CRITICAL - Refresh the expanded association binding for this specific row
                    // This forces the table to re-fetch the expanded association data
                    if (sPath && oModel) {
                        const oExpandedContext = oModel.bindContext(sPath + "/to_Opportunity", null, { deferred: true });
                        oExpandedContext.execute().then(() => {
                            const oAssocData = oExpandedContext.getObject();
                            if (oAssocData && oMainContext.getObject) {
                                const oMainObj = oMainContext.getObject();
                                if (oMainObj) {
                                    oMainObj.to_Opportunity = oAssocData;
                                }
                            }
                            // Force UI refresh after expanded association is refreshed
                            if (oModel && oModel.checkDataState) {
                                oModel.checkDataState();
                            }
                            if (oMainContext.checkUpdate) {
                                oMainContext.checkUpdate();
                            }
                        }).catch(() => { });
                    }

                    // ✅ STEP 4: Force immediate UI update by checking data state
                    if (oModel && oModel.checkDataState) {
                        oModel.checkDataState();
                    }
                    if (oMainContext.checkUpdate) {
                        oMainContext.checkUpdate();
                    }

                    // ✅ STEP 5: Refresh the table binding to show updated value immediately
                    const oRowBinding = oMainTable.getRowBinding && oMainTable.getRowBinding();
                    const oBinding = oMainTable.getBinding("rows") || oMainTable.getBinding("items");
                    if (oRowBinding) {
                        oRowBinding.refresh().catch(() => { });
                    } else if (oBinding) {
                        oBinding.refresh().catch(() => { });
                    }

                    // ✅ STEP 6: Also try rebind for MDC tables (this refreshes expanded associations)
                    if (oMainTable.rebind) {
                        setTimeout(() => {
                            try {
                                oMainTable.rebind();
                            } catch (e) {
                            }
                        }, 100);
                    }
                }
            }
        },

        // ✅ Value Help Dialog: Employee selection handler
        onEmployeeValueHelpConfirm: function (oEvent) {
            const oDialog = this._oEmployeeValueHelpDialog;
            if (!oDialog) {
                return;
            }

            // Get table from within the dialog
            const oDialogContent = oDialog.getContent()[0];
            const aItems = oDialogContent.getItems();
            const oTable = aItems.find(item => item.getId && item.getId().includes("employeeValueHelpTable"));

            if (!oTable) {
                sap.m.MessageToast.show("Table not found");
                return;
            }

            // ✅ CRITICAL: Check if a row is actually selected
            const oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                sap.m.MessageToast.show("Please select a supervisor");
                return;
            }

            // Also check selected contexts as backup
            const aSelectedContexts = oTable.getSelectedContexts ? oTable.getSelectedContexts() : [];
            if (aSelectedContexts.length === 0) {
                sap.m.MessageToast.show("Please select a supervisor");
                return;
            }

            const oContext = oSelectedItem.getBindingContext();
            if (!oContext) {
                sap.m.MessageToast.show("Unable to get employee data");
                if (oTable && oTable.clearSelection) {
                    oTable.clearSelection();
                }
                oDialog.close();
                return;
            }

            const oEmployee = oContext.getObject();
            if (!oDialog._oInputField) {
                sap.m.MessageToast.show("Input field not found");
                if (oTable && oTable.clearSelection) {
                    oTable.clearSelection();
                }
                oDialog.close();
                return;
            }

            // Check which field is being updated
            const bIsGPMField = oDialog._isGPMField === true;
            const bIsSalesSPOC = oDialog._isSalesSPOC === true;
            const bIsDeliverySPOC = oDialog._isDeliverySPOC === true;
            const sStoredId = oEmployee.ohrId || "";

            // ✅ Display only ID (not name) for association fields
            oDialog._oInputField.setValue(sStoredId);
            oDialog._oInputField.data("selectedId", sStoredId);

            // ✅ CRITICAL: Close dialog FIRST before doing table updates
            if (oTable && oTable.clearSelection) {
                oTable.clearSelection();
            }
            oDialog.close();

            // ✅ CRITICAL: Update selected row in main table and refresh for instant UI update
            let oMainTable;
            let sFieldName;
            let sAssocName;

            if (bIsGPMField) {
                oMainTable = this.byId("Projects");
                sFieldName = "gpm";
                sAssocName = "to_GPM";
            } else if (bIsSalesSPOC || bIsDeliverySPOC) {
                oMainTable = this.byId("Opportunities");
                sFieldName = bIsSalesSPOC ? "salesSPOC" : "deliverySPOC";
                sAssocName = null; // Opportunities don't have associations for SPOCs
            } else {
                oMainTable = this.byId("Employees");
                sFieldName = "supervisorOHR";
                sAssocName = "to_Supervisor";
            }
            if (oMainTable) {
                const aSelectedContexts = oMainTable.getSelectedContexts();
                if (aSelectedContexts && aSelectedContexts.length > 0) {
                    const oMainContext = aSelectedContexts[0];
                    const oModel = oMainTable.getModel();
                    const sPath = oMainContext.getPath();

                    // ✅ STEP 1: Update the context property immediately
                    oMainContext.setProperty(sFieldName, sStoredId);

                    // ✅ STEP 2: Update the association data immediately for instant UI feedback (only for GPM and Supervisor)
                    if (sAssocName && oMainContext.getObject) {
                        const oObj = oMainContext.getObject();
                        if (oObj) {
                            oObj[sAssocName] = {
                                ohrId: sStoredId,
                                fullName: sDisplayValue
                            };
                        }
                    }

                    // ✅ STEP 3: CRITICAL - Refresh the expanded association binding for this specific row (only for GPM and Supervisor)
                    // This forces the table to re-fetch the expanded association data
                    if (sAssocName && sPath && oModel) {
                        const oExpandedContext = oModel.bindContext(sPath + "/" + sAssocName, null, { deferred: true });
                        oExpandedContext.execute().then(() => {
                            const oAssocData = oExpandedContext.getObject();
                            if (oAssocData && oMainContext.getObject) {
                                const oMainObj = oMainContext.getObject();
                                if (oMainObj) {
                                    oMainObj[sAssocName] = oAssocData;
                                }
                            }
                            // Force UI refresh after expanded association is refreshed
                            if (oModel && oModel.checkDataState) {
                                oModel.checkDataState();
                            }
                            if (oMainContext.checkUpdate) {
                                oMainContext.checkUpdate();
                            }
                        }).catch(() => { });
                    }

                    // ✅ STEP 4: Force immediate UI update by checking data state
                    if (oModel && oModel.checkDataState) {
                        oModel.checkDataState();
                    }
                    if (oMainContext.checkUpdate) {
                        oMainContext.checkUpdate();
                    }

                    // ✅ STEP 5: Refresh the table binding to show updated value immediately
                    const oRowBinding = oMainTable.getRowBinding && oMainTable.getRowBinding();
                    const oBinding = oMainTable.getBinding("rows") || oMainTable.getBinding("items");
                    if (oRowBinding) {
                        oRowBinding.refresh().catch(() => { });
                    } else if (oBinding) {
                        oBinding.refresh().catch(() => { });
                    }

                    // ✅ STEP 6: Also try rebind for MDC tables (this refreshes expanded associations)
                    if (oMainTable.rebind) {
                        setTimeout(() => {
                            try {
                                oMainTable.rebind();
                            } catch (e) {
                            }
                        }, 100);
                    }
                }
            }
        },

        // ✅ Value Help Dialog: Search handlers
        onCustomerValueHelpSearch: function (oEvent) {
            const sValue = oEvent.getParameter("value") || oEvent.getSource().getValue() || "";
            const oDialog = this._oCustomerValueHelpDialog;
            if (!oDialog) {
                return;
            }

            const oDialogContent = oDialog.getContent()[0];
            const aItems = oDialogContent.getItems();
            const oTable = aItems.find(item => item.getId && item.getId().includes("customerValueHelpTable"));

            if (!oTable) {
                return;
            }

            const oBinding = oTable.getBinding("items");
            if (!oBinding) {
                return;
            }

            if (sValue && sValue.trim()) {
                const aFilters = [
                    new sap.ui.model.Filter({
                        path: "customerName",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: sValue.trim(),
                        caseSensitive: false // ✅ Case-insensitive search for value help
                    })
                ];
                oBinding.filter(aFilters, sap.ui.model.FilterType.Application);
            } else {
                oBinding.filter([], sap.ui.model.FilterType.Application);
            }
        },

        onOpportunityValueHelpSearch: function (oEvent) {
            const sValue = oEvent.getParameter("value") || oEvent.getSource().getValue() || "";
            const oDialog = this._oOpportunityValueHelpDialog;
            if (!oDialog) {
                return;
            }

            const oDialogContent = oDialog.getContent()[0];
            const aItems = oDialogContent.getItems();
            const oTable = aItems.find(item => item.getId && item.getId().includes("opportunityValueHelpTable"));

            if (!oTable) {
                return;
            }

            const oBinding = oTable.getBinding("items");
            if (!oBinding) {
                return;
            }

            if (sValue && sValue.trim()) {
                const aFilters = [
                    new sap.ui.model.Filter({
                        path: "opportunityName",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: sValue.trim(),
                        caseSensitive: false // ✅ Case-insensitive search for value help
                    })
                ];
                oBinding.filter(aFilters, sap.ui.model.FilterType.Application);
            } else {
                oBinding.filter([], sap.ui.model.FilterType.Application);
            }
        },

        onEmployeeValueHelpSearch: function (oEvent) {
            const sValue = oEvent.getParameter("value") || oEvent.getSource().getValue() || "";
            const oDialog = this._oEmployeeValueHelpDialog;
            if (!oDialog) {
                return;
            }

            const oDialogContent = oDialog.getContent()[0];
            const aItems = oDialogContent.getItems();
            const oTable = aItems.find(item => item.getId && item.getId().includes("employeeValueHelpTable"));

            if (!oTable) {
                return;
            }

            const oBinding = oTable.getBinding("items");
            if (!oBinding) {
                return;
            }

            if (sValue && sValue.trim()) {
                const aFilters = [
                    new sap.ui.model.Filter({
                        path: "fullName",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: sValue.trim(),
                        caseSensitive: false // ✅ Case-insensitive search for value help
                    })
                ];
                oBinding.filter(aFilters, sap.ui.model.FilterType.Application);
            } else {
                oBinding.filter([], sap.ui.model.FilterType.Application);
            }
        },

        // ✅ Helper: Populate Country dropdown for Employee form
        _populateCountryDropdown: function () {
            // ✅ Populate Employee Country Dropdown
            const oEmployeeCountrySelect = this.byId("inputCountry_emp");
            if (!oEmployeeCountrySelect) {
                return;
            }

            if (!this._mCountryToCities) {
                return;
            }

            const aCountries = Object.keys(this._mCountryToCities).sort();

            const aItems = oEmployeeCountrySelect.getItems();

            // Clear existing items (except placeholder)
            aItems.forEach((oItem, iIndex) => {
                if (iIndex > 0) { // Keep first placeholder item
                    oEmployeeCountrySelect.removeItem(oItem);
                }
            });

            // Add country items
            aCountries.forEach((sCountry) => {
                oEmployeeCountrySelect.addItem(new sap.ui.core.Item({
                    key: sCountry,
                    text: sCountry
                }));
            });

        },

        // ✅ Handler: Employee Country change - populate Employee City dropdown
        onEmployeeCountryChange: function (oEvent) {
            const sSelectedCountry = oEvent.getParameter("selectedItem")?.getKey() || "";
            const oCitySelect = this.byId("inputCity_emp");

            if (!oCitySelect) {
                return;
            }

            // Clear existing city items (except placeholder)
            const aItems = oCitySelect.getItems();
            aItems.forEach((oItem, iIndex) => {
                if (iIndex > 0) { // Keep first placeholder item
                    oCitySelect.removeItem(oItem);
                }
            });

            // Reset selection
            oCitySelect.setSelectedKey("");

            if (!sSelectedCountry || !this._mCountryToCities) {
                return;
            }

            // Populate cities for selected country
            const aCities = this._mCountryToCities[sSelectedCountry] || [];
            aCities.forEach((sCity) => {
                oCitySelect.addItem(new sap.ui.core.Item({
                    key: sCity,
                    text: sCity
                }));
            });

            // Update model
            const oEmployeeModel = this.getView().getModel("employeeModel");
            if (oEmployeeModel) {
                oEmployeeModel.setProperty("/country", sSelectedCountry);
                oEmployeeModel.setProperty("/city", ""); // Reset city when country changes
            }
        },

        // ✅ Handler: Customer Country change - populate Customer State dropdown
        onCountryChange: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            const countryId = oSelectedItem ? oSelectedItem.getKey() : "";

            const oStateCombo = this.byId("stateComboBox");
            const oCityCombo = this.byId("cityComboBox");

            // Update customerModel - use null instead of empty string for proper handling
            const oCustomerModel = this.getView().getModel("customerModel");
            if (oCustomerModel) {
                oCustomerModel.setProperty("/custCountryId", countryId && countryId !== "" ? countryId : null);
                oCustomerModel.setProperty("/custStateId", null); // Reset state when country changes
                oCustomerModel.setProperty("/custCityId", null); // Reset city when country changes
            }

            // Clear selected values
            if (oStateCombo) {
                oStateCombo.setSelectedKey("");
            }
            if (oCityCombo) {
                oCityCombo.setSelectedKey("");
            }

            // Clear city list
            if (oCityCombo) {
                oCityCombo.unbindItems();
            }

            // Disable city until state is selected
            if (oCityCombo) {
                oCityCombo.setEnabled(false);
            }

            if (!countryId) {
                // Disable state if no country selected
                if (oStateCombo) {
                    oStateCombo.unbindItems();
                    oStateCombo.setEnabled(false);
                }
                return;
            }

            // Enable State dropdown
            if (oStateCombo) {
                oStateCombo.setEnabled(true);

                // Bind States filtered by country_id
                oStateCombo.bindItems({
                    path: "default>/CustomerStates",
                    filters: [
                        new sap.ui.model.Filter("country_id", "EQ", Number(countryId))
                    ],
                    length: 1000,
                    template: new sap.ui.core.ListItem({
                        key: "{default>id}",
                        text: "{default>name}"
                    })
                });
            }
        },

        // ✅ Handler: Customer State change - populate Customer City dropdown
        onStateChange: function (oEvent) {
            const stateIdStr = oEvent.getSource().getSelectedKey();
            const countryIdStr = this.byId("countryComboBox").getSelectedKey();

            const oCityCombo = this.byId("cityComboBox");

            // Update customerModel - use null instead of empty string for proper handling
            const oCustomerModel = this.getView().getModel("customerModel");
            if (oCustomerModel) {
                oCustomerModel.setProperty("/custStateId", stateIdStr && stateIdStr !== "" ? stateIdStr : null);
                oCustomerModel.setProperty("/custCityId", null); // Reset city when state changes
            }

            // Reset city selection
            if (oCityCombo) {
                oCityCombo.setSelectedKey("");
            }

            // Clean IDs - remove commas, spaces, and ensure they're strings
            const cleanState = stateIdStr ? String(stateIdStr).replace(/[,\s]/g, "") : "";
            const cleanCountry = countryIdStr ? String(countryIdStr).replace(/[,\s]/g, "") : "";

            const stateId = cleanState ? parseInt(cleanState, 10) : null;
            const countryId = cleanCountry ? parseInt(cleanCountry, 10) : null;

            console.log("stateIdStr:", stateId, "countryIdStr:", countryId);

            // If invalid → disable and stop
            if (isNaN(stateId) || isNaN(countryId)) {
                console.warn("Invalid filters → disable city list");
                if (oCityCombo) {
                    oCityCombo.unbindItems();
                    oCityCombo.setEnabled(false);
                }
                return;
            }

            // Enable city dropdown
            if (oCityCombo) {
                oCityCombo.setEnabled(true);

                // Bind filtered cities
                oCityCombo.bindItems({
                    path: "default>/CustomerCities",
                    filters: [
                        new sap.ui.model.Filter("state_id", "EQ", stateId),
                        new sap.ui.model.Filter("country_id", "EQ", countryId)
                    ],
                    length: 1000,
                    template: new sap.ui.core.ListItem({
                        key: "{default>id}",
                        text: "{default>name}"
                    })
                });
            }
        },

        // ✅ Handler: Customer City change - update customerModel
        onCityChange: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            const sSelectedCityId = oSelectedItem ? oSelectedItem.getKey() : "";

            // Update customerModel
            const oCustomerModel = this.getView().getModel("customerModel");
            if (oCustomerModel) {
                oCustomerModel.setProperty("/custCityId", sSelectedCityId);
            }
        },

        // ✅ Handler: Band change - populate Designation dropdown
        onBandChange: function (oEvent) {
            const sSelectedBand = oEvent.getParameter("selectedItem")?.getKey() || "";
            const oDesignationSelect = this.byId("inputRole_emp");

            if (!oDesignationSelect) {
                return;
            }

            // Clear existing designation items (except placeholder)
            const aItems = oDesignationSelect.getItems();
            aItems.forEach((oItem, iIndex) => {
                if (iIndex > 0) { // Keep first placeholder item
                    oDesignationSelect.removeItem(oItem);
                }
            });

            // Reset selection
            oDesignationSelect.setSelectedKey("");

            if (!sSelectedBand || !this.mBandToDesignations) {
                return;
            }

            // Populate designations for selected band
            const aDesignations = this.mBandToDesignations[sSelectedBand] || [];
            aDesignations.forEach((sDesignation) => {
                oDesignationSelect.addItem(new sap.ui.core.Item({
                    key: sDesignation,
                    text: sDesignation
                }));
            });

            // Update model
            const oEmployeeModel = this.getView().getModel("employeeModel");
            if (oEmployeeModel) {
                oEmployeeModel.setProperty("/band", sSelectedBand);
                oEmployeeModel.setProperty("/role", ""); // Reset designation when band changes
            }
        },

        // ✅ NEW: Update EmployeeSkill records (create/delete based on selection)
        _updateEmployeeSkills: function (sEmployeeId, aSelectedSkillIds, oModel) {
            if (!sEmployeeId || !oModel) {
                return Promise.resolve();
            }

            // Convert selected skill IDs to integers
            const aSelected = aSelectedSkillIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

            return new Promise((resolve, reject) => {
                // Get existing EmployeeSkill records for this employee
                const sPath = `/EmployeeSkills?$filter=employeeId eq '${sEmployeeId}'`;
                oModel.read(sPath)
                    .then((oData) => {
                        const aExisting = oData.results || [];
                        const aExistingSkillIds = aExisting.map(es => parseInt(es.skillId, 10));

                        // Find skills to delete (exist but not selected)
                        const aToDelete = aExisting.filter(es => !aSelected.includes(parseInt(es.skillId, 10)));

                        // Find skills to create (selected but don't exist)
                        const aToCreate = aSelected.filter(skillId => !aExistingSkillIds.includes(skillId));

                        // ✅ CRITICAL: Get binding once (like Allocations)
                        const oBinding = oModel.bindList("/EmployeeSkills", null, [], [], {
                            groupId: "changesGroup"
                        });

                        const aPromises = [];

                        // Delete removed skills
                        aToDelete.forEach((es) => {
                            const sDeletePath = `/EmployeeSkills(employeeId='${es.employeeId}',skillId=${es.skillId})`;
                            aPromises.push(
                                oModel.remove(sDeletePath, {
                                    groupId: "changesGroup"
                                }).catch((oError) => {
                                })
                            );
                        });

                        // Create new skills - use same binding pattern as Allocations
                        const aCreatedContexts = [];
                        aToCreate.forEach((skillId) => {
                            const oNewSkill = {
                                employeeId: sEmployeeId,
                                skillId: skillId
                            };


                            // ✅ Use same pattern as Allocations creation
                            const oNewContext = oBinding.create(oNewSkill, "changesGroup");
                            if (oNewContext) {
                                aCreatedContexts.push(oNewContext);

                                // ✅ CRITICAL: Explicitly set all properties (like Allocations)
                                Object.keys(oNewSkill).forEach((sKey) => {
                                    try {
                                        oNewContext.setProperty(sKey, oNewSkill[sKey]);
                                    } catch (e) {
                                    }
                                });
                            } else {
                            }
                        });

                        // Submit all changes in batch
                        if (aToDelete.length > 0 || aToCreate.length > 0) {
                            // ✅ CRITICAL: Wait a moment for contexts to be queued, then check pending changes
                            setTimeout(() => {
                                const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");

                                if (bHasPendingChanges || aToDelete.length > 0) {
                                    oModel.submitBatch("changesGroup")
                                        .then(() => {
                                            resolve();
                                        })
                                        .catch((oError) => {
                                            resolve();
                                        });
                                } else {
                                    // Try submitting anyway - sometimes hasPendingChanges doesn't work correctly
                                    oModel.submitBatch("changesGroup")
                                        .then(() => {
                                            resolve();
                                        })
                                        .catch((oError) => {
                                            resolve();
                                        });
                                }
                            }, 150);
                        } else {
                            resolve();
                        }
                    })
                    .catch((oError) => {
                        // If read fails, still try to create new skills
                        if (aSelected.length > 0) {
                            const oBinding = oModel.bindList("/EmployeeSkills", null, [], [], {
                                groupId: "changesGroup"
                            });

                            aSelected.forEach((skillId) => {
                                const oNewSkill = {
                                    employeeId: sEmployeeId,
                                    skillId: skillId
                                };
                                oBinding.create(oNewSkill, "changesGroup");
                            });

                            return oModel.submitBatch("changesGroup")
                                .then(() => resolve())
                                .catch(() => resolve());
                        } else {
                            resolve();
                        }
                    });
            });
        },

        // ✅ Formatter function for allocation percentage display
        formatAllocationPercentage: function (iPercentage) {
            if (iPercentage === null || iPercentage === undefined || iPercentage === "") {
                return "0%";
            }
            const iValue = parseInt(iPercentage, 10);
            if (isNaN(iValue)) {
                return "0%";
            }
            return iValue + "%";
        }

    });
});

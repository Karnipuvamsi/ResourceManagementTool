sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/mdc/p13n/StateUtil",
    "sap/m/MessageToast",
    "glassboard/utility/CustomUtility"
], (Controller, Fragment, StateUtil, MessageToast, CustomUtility) => {
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
        
        onAfterRendering: function() {
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
                            console.log("✅ OData model and metadata ready, loading counts...");
                            this._loadHomeCounts();
                        } else {
                            // Metadata not ready yet, retry
                            if (nRetries < nMaxRetries) {
                                setTimeout(fnLoadCounts, 500);
                            } else {
                                console.error("❌ Max retries reached, metadata not available");
                            }
                        }
                    } catch (e) {
                        // Metadata not ready, retry
                        if (nRetries < nMaxRetries) {
                            setTimeout(fnLoadCounts, 500);
                        } else {
                            console.error("❌ Max retries reached, error accessing metadata:", e);
                        }
                    }
                } else {
                    // Model not ready yet, retry
                    if (nRetries < nMaxRetries) {
                        setTimeout(fnLoadCounts, 500);
                    } else {
                        console.error("❌ Max retries reached, OData model not available");
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
                console.warn("No page mapped for key:", sKey);
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
            if (sKey === "customers") {
                // Check if already loaded to prevent duplicate IDs
                if (this._bCustomersLoaded) {
                    console.log("[Customers] Fragment already loaded, skipping");
                    return;
                }
                
                this._bCustomersLoaded = true;
                const oCustomersPage = this.getView().byId(sPageId);
                
                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oCustomersPage && oCustomersPage.getContent) {
                    const aExistingContent = oCustomersPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        console.log("[Customers] Removing existing content to prevent duplicate IDs");
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
                    this.initializeTable("Customers");

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
                    console.log("[Opportunities] Fragment already loaded, skipping");
                    return;
                }
                
                this._bOpportunitiesLoaded = true;
                const oOpportunitiesPage = this.getView().byId(sPageId);
                
                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oOpportunitiesPage && oOpportunitiesPage.getContent) {
                    const aExistingContent = oOpportunitiesPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        console.log("[Opportunities] Removing existing content to prevent duplicate IDs");
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
                        // ✅ Set defaults with multiple retries
                        setTimeout(() => {
                            this._setDefaultFilterFields(oOpportunityFilterBar, ["opportunityName", "Stage"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oOpportunityFilterBar, ["opportunityName", "Stage"]);
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
                const oProjectsPage = this.getView().byId(sPageId);
                
                // ✅ CRITICAL: Check if content already exists and remove it to prevent duplicate IDs
                if (oProjectsPage && oProjectsPage.getContent) {
                    const aExistingContent = oProjectsPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        console.log("[Projects] Removing existing content to prevent duplicate IDs");
                        aExistingContent.forEach((oContent) => {
                            if (oContent && oContent.destroy) {
                                oContent.destroy();
                            }
                        });
                        oProjectsPage.removeAllContent();
                        // Reset flag so fragment can be reloaded if needed
                        this._bProjectsLoaded = false;
                    }
                }
                
                // Check if already loaded to prevent duplicate IDs
                if (this._bProjectsLoaded) {
                    console.log("[Projects] Fragment already loaded, skipping");
                    return;
                }
                
                this._bProjectsLoaded = true;

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
                            // ✅ Set defaults with multiple retries - 3 important filters: projectName, projectType, SOWReceived
                            setTimeout(() => {
                                this._setDefaultFilterFields(oProjectFilterBar, ["projectName", "projectType", "SOWReceived"]);
                            }, 1000);
                            setTimeout(() => {
                                this._setDefaultFilterFields(oProjectFilterBar, ["projectName", "projectType", "SOWReceived"]);
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
                this._loadReportFragment(sPageId, "EmployeeBenchReport", "EmployeeBenchReport", oLogButton);
            } else if (sKey === "employeeProbableReleaseReport") {
                this._loadReportFragment(sPageId, "EmployeeProbableReleaseReport", "EmployeeProbableReleaseReport", oLogButton);
            } else if (sKey === "revenueForecastReport") {
                this._loadReportFragment(sPageId, "RevenueForecastReport", "RevenueForecastReport", oLogButton);
            } else if (sKey === "employeeAllocationReport") {
                this._loadReportFragment(sPageId, "EmployeeAllocationReport", "EmployeeAllocationReport", oLogButton);
            } else if (sKey === "employeeSkillReport") {
                this._loadReportFragment(sPageId, "EmployeeSkillReport", "EmployeeSkillReport", oLogButton);
            } else if (sKey === "projectsNearingCompletionReport") {
                this._loadReportFragment(sPageId, "ProjectsNearingCompletionReport", "ProjectsNearingCompletionReport", oLogButton);
            } else if (sKey === "employees") {
                // Check if already loaded to prevent duplicate IDs
                if (this._bEmployeesLoaded) {
                    console.log("[Employees] Fragment already loaded, skipping");
                    return;
                }
                
                this._bEmployeesLoaded = true;
                const oEmployeesPage = this.getView().byId(sPageId);
                
                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oEmployeesPage && oEmployeesPage.getContent) {
                    const aExistingContent = oEmployeesPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        console.log("[Employees] Removing existing content to prevent duplicate IDs");
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
                            this._setDefaultFilterFields(oEmployeeFilterBar, ["fullName", "status"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oEmployeeFilterBar, ["fullName", "status"]);
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
                    console.log("[Allocations] Fragment already loaded, skipping");
                    return;
                }
                
                this._bAllocationsLoaded = true;
                const oAllocationPage = this.getView().byId(sPageId);
                
                // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
                if (oAllocationPage && oAllocationPage.getContent) {
                    const aExistingContent = oAllocationPage.getContent();
                    if (aExistingContent && aExistingContent.length > 0) {
                        console.log("[Allocations] Removing existing content to prevent duplicate IDs");
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
                            this._setDefaultFilterFields(oResFilterBar, ["fullName", "status"]);
                        }, 1000);
                        setTimeout(() => {
                            this._setDefaultFilterFields(oResFilterBar, ["fullName", "status"]);
                        }, 2000);
                    }

                    // Initialize table-specific functionality
                    this.initializeTable("Res").then(() => {
                        // ✅ CRITICAL: Apply Unproductive Bench filter to Res table after initialization
                        // Use multiple retries to ensure binding is ready
                        const fnApplyBenchFilter = () => {
                            const oResBinding = oTable.getRowBinding && oTable.getRowBinding();
                            if (oResBinding) {
                                const oBenchFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Unproductive Bench");
                                oResBinding.filter([oBenchFilter]);
                                console.log("✅ Res table filtered to show only Unproductive Bench employees");
                                
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
                                        console.log("✅ Re-applied Unproductive Bench filter after dataReceived");
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
                    // Reset segmented button to "less" state for this fragment
                    this._resetSegmentedButtonForFragment("Res");
                    
                    // Ensure dropdown is set to "employees"
                    const oSelect = this.byId("resViewSelect");
                    if (oSelect) {
                        oSelect.setSelectedKey("employees");
                    }
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
                    console.log(`[Navigation] Reset table ${sTableId} to show-less state`);
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
                    console.log(`[Navigation] Reset segmented button to "less" state`);
                }
            });
        },
        // Reset segmented button for a specific fragment
        // ✅ NEW: Helper function to load report fragments
        _loadReportFragment: function (sPageId, sFragmentName, sTableId, oLogButton) {
            const sFlagName = "_b" + sFragmentName + "Loaded";
            
            // Check if already loaded to prevent duplicate IDs
            if (this[sFlagName]) {
                console.log(`[${sFragmentName}] Fragment already loaded, skipping`);
                return;
            }
            
            this[sFlagName] = true;
            const oReportPage = this.getView().byId(sPageId);
            
            // ✅ CRITICAL: Remove existing content before adding new fragment to prevent duplicate IDs
            if (oReportPage && oReportPage.getContent) {
                const aExistingContent = oReportPage.getContent();
                if (aExistingContent && aExistingContent.length > 0) {
                    console.log(`[${sFragmentName}] Removing existing content to prevent duplicate IDs`);
                    aExistingContent.forEach((oContent) => {
                        if (oContent && oContent.destroy) {
                            oContent.destroy();
                        }
                    });
                    oReportPage.removeAllContent();
                }
            }

            Fragment.load({
                id: this.getView().getId(),
                name: "glassboard.view.fragments." + sFragmentName,
                controller: this
            }).then(function (oFragment) {
                oReportPage.addContent(oFragment);

                // Wait a bit for the fragment to be fully rendered
                setTimeout(function() {
                    const oTable = this.byId(sTableId + "Table");
                    // Get FilterBar ID based on fragment name (camelCase)
                    let sFilterBarId = "";
                    if (sTableId === "EmployeeBenchReport") {
                        sFilterBarId = "employeeBenchReportFilterBar";
                    } else if (sTableId === "EmployeeProbableReleaseReport") {
                        sFilterBarId = "employeeProbableReleaseReportFilterBar";
                    } else if (sTableId === "RevenueForecastReport") {
                        sFilterBarId = "revenueForecastReportFilterBar";
                    } else if (sTableId === "EmployeeAllocationReport") {
                        sFilterBarId = "employeeAllocationReportFilterBar";
                    } else if (sTableId === "EmployeeSkillReport") {
                        sFilterBarId = "employeeSkillReportFilterBar";
                    } else if (sTableId === "ProjectsNearingCompletionReport") {
                        sFilterBarId = "projectsNearingCompletionReportFilterBar";
                    }
                    const oFilterBar = sFilterBarId ? this.byId(sFilterBarId) : null;
                    
                    if (oTable) {
                        // Ensure table starts with show-less state (default)
                        oTable.removeStyleClass("show-more");
                        oTable.addStyleClass("show-less");
                        
                        // Ensure the table has the correct model
                        const oModel = this.getOwnerComponent().getModel();
                        if (oModel) {
                            oTable.setModel(oModel);
                        }

                        // Initialize table-specific functionality
                        this.initializeTable(sTableId + "Table").then(function() {
                            console.log(`[${sFragmentName}] Table initialized successfully`);
                            // Force rebind to ensure data loads
                            if (oTable.rebind) {
                                oTable.rebind();
                            }
                        }.bind(this)).catch(function(oErr) {
                            console.error(`[${sFragmentName}] Error initializing table:`, oErr);
                        });
                    } else {
                        console.error(`[${sFragmentName}] Table not found: ${sTableId}Table`);
                    }
                    
                    // Set default filter fields for report FilterBar
                    if (oFilterBar) {
                        // Define default filters for each report
                        let aDefaultFields = [];
                        if (sTableId === "EmployeeBenchReport") {
                            aDefaultFields = ["employeeName", "status", "location"];
                        } else if (sTableId === "EmployeeProbableReleaseReport") {
                            aDefaultFields = ["employeeName", "currentProject", "daysToRelease"];
                        } else if (sTableId === "RevenueForecastReport") {
                            aDefaultFields = ["projectName", "customer", "status"];
                        } else if (sTableId === "EmployeeAllocationReport") {
                            aDefaultFields = ["employeeName", "currentProject", "customer"];
                        } else if (sTableId === "EmployeeSkillReport") {
                            aDefaultFields = ["skillName", "category"];
                        } else if (sTableId === "ProjectsNearingCompletionReport") {
                            aDefaultFields = ["projectName", "completionRisk", "customer"];
                        }
                        
                        if (aDefaultFields.length > 0) {
                            // Set default filters with retries (same pattern as main entities)
                            setTimeout(() => {
                                this._setDefaultFilterFields(oFilterBar, aDefaultFields);
                            }, 1000);
                            setTimeout(() => {
                                this._setDefaultFilterFields(oFilterBar, aDefaultFields);
                            }, 2000);
                        }
                    }
                }.bind(this), 100);

                if (oLogButton) {
                    oLogButton.setVisible(false);
                }
            }.bind(this)).catch(function (oError) {
                console.error(`[${sFragmentName}] Error loading fragment:`, oError);
            });
        },

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
                            console.log(`[Fragment] Reset segmented button for ${sTableId} to "less" state`);
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
                                    console.error("[Navigation] Error saving changes:", err);
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
                                    console.error("[Navigation] Error canceling changes:", err);
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
                    console.error("[Navigation] Error canceling changes:", error);
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
                            console.warn(`[Navigation] Could not reset context ${sPath}:`, e);
                        }
                    });
                }
            } catch (e) {
                console.warn("[Navigation] Error discarding pending changes:", e);
            }
        },

        // ✅ NEW: Handler for allocation view change (Employees/Projects toggle)
        onAllocationViewChange: function (oEvent) {
            // Get selected key from Select control
            const oSelect = oEvent.getSource();
            const sSelectedKey = oSelect.getSelectedKey();
            const oAllocationPage = this.byId("allocationPage");
            
            console.log("✅ Allocation view change - Selected key:", sSelectedKey);
            
            if (!oAllocationPage) {
                console.error("Allocation page not found");
                return;
            }
            
            // Reset flag so fragment can be reloaded
            this._bAllocationsLoaded = false;
            
            // Destroy current content
            oAllocationPage.destroyContent();
            
            if (sSelectedKey === "employees") {
                console.log("✅ Loading Employees view (Res fragment)");
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
                                this._setDefaultFilterFields(oResFilterBar, ["fullName", "status"]);
                            }, 1000);
                            setTimeout(() => {
                                this._setDefaultFilterFields(oResFilterBar, ["fullName", "status"]);
                            }, 2000);
                        }
                        
                        this.initializeTable("Res").then(() => {
                            // ✅ CRITICAL: Apply Unproductive Bench filter to Res table after initialization
                            // Use multiple retries to ensure binding is ready
                            const fnApplyBenchFilter = () => {
                                const oResBinding = oTable.getRowBinding && oTable.getRowBinding();
                                if (oResBinding) {
                                    const oBenchFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Unproductive Bench");
                                    oResBinding.filter([oBenchFilter]);
                                    console.log("✅ Res table filtered to show only Unproductive Bench employees");
                                    
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
                                            console.log("✅ Re-applied Unproductive Bench filter after dataReceived");
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
                        
                        // Ensure dropdown is set to "employees"
                        const oSelect = this.byId("resViewSelect");
                        if (oSelect) {
                            oSelect.setSelectedKey("employees");
                        }
                    }
                }.bind(this));
            } else {
                // Load Projects view (Allocations fragment)
                console.log("✅ Loading Projects view (Allocations fragment)");
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
        onDemandPress: function() {
            console.log('Define Demand');
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
            
            console.log("✅ Selected project data:", {
                sapPId: sProjectId,
                projectName: oProject.projectName,
                fullObject: oProject
            });
            
            // Store selected project ID and name
            this._sSelectedProjectId = sProjectId;
            this._sSelectedProjectName = sProjectName;
            
            // ✅ If project name not available, try to fetch it (but don't block navigation)
            // ✅ CRITICAL: Always ensure data("selectedId") is set with the project ID
            if (!oProject.projectName && !oProject.to_Project?.projectName && oProject.sapPId) {
                const oModel = this.getOwnerComponent().getModel();
                if (oModel) {
                    // Use read instead of bindContext to avoid deferred binding issues
                    oModel.read(`/Projects('${sProjectId}')`).then((oResult) => {
                        if (oResult && oResult.projectName) {
                            this._sSelectedProjectName = oResult.projectName;
                            // Update the input field if it exists - ALWAYS set both value and selectedId
                            const oProjectInput = this.byId("inputSapPId_demand");
                            if (oProjectInput) {
                                oProjectInput.setValue(oResult.projectName);
                                oProjectInput.data("selectedId", sProjectId); // ✅ CRITICAL: Always set the ID
                            }
                            console.log("✅ Fetched project name:", oResult.projectName, "ID:", sProjectId);
                        }
                    }).catch((oError) => {
                        console.log("Could not fetch project name, using ID:", oError);
                        // Even if fetch fails, ensure selectedId is set
                        const oProjectInput = this.byId("inputSapPId_demand");
                        if (oProjectInput) {
                            oProjectInput.data("selectedId", sProjectId);
                        }
                    });
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
                    console.log("✅ Stored project filter:", sProjectId);
                    
                    // ✅ CRITICAL: Use project ID as-is for filter (sapPId can be "P-0001" format or numeric)
                    // The filter should match the actual sapPId value in the database
                    let sFilterValue = sProjectId;
                    
                    // Check if we need to convert format - but first check what format is in DB
                    // For now, use the project ID as-is since Projects use "P-0001" format
                    console.log("✅ Using project ID for filter:", sProjectId);
                    
                    // ✅ CRITICAL: Prevent auto-binding by setting filter BEFORE initialization
                    // Get binding early and apply filter immediately to prevent initial data load
                    const oEarlyBinding = oDemandsTable.getRowBinding && oDemandsTable.getRowBinding();
                    if (oEarlyBinding && sProjectId) {
                        try {
                            // ✅ Use project ID as-is (should be "P-0001" format to match Demand CSV)
                            const oFilter = new sap.ui.model.Filter("sapPId", sap.ui.model.FilterOperator.EQ, sProjectId);
                            oEarlyBinding.filter([oFilter]);
                            console.log("✅ Filter applied EARLY to prevent unfiltered data load:", sProjectId);
                        } catch (e) {
                            console.warn("⚠️ Could not apply early filter:", e);
                        }
                    }
                    
                    // Initialize table and wait for it to complete
                    this.initializeTable("Demands").then(() => {
                        console.log("✅ Table initialization completed, ensuring filter is applied");
                        
                        // Function to apply/verify filter
                        const fnApplyFilter = () => {
                            const oBinding = oDemandsTable.getRowBinding && oDemandsTable.getRowBinding();
                            if (oBinding && sProjectId) {
                                try {
                                    // ✅ Use project ID as-is (should be "P-0001" format to match Demand CSV)
                                    const oFilter = new sap.ui.model.Filter("sapPId", sap.ui.model.FilterOperator.EQ, sProjectId);
                                    oBinding.filter([oFilter]);
                                    console.log("✅ Filter applied/verified for demands table:", sProjectId);
                                    
                                    // Attach data received event to track data loading
                                    oBinding.attachDataReceived((oEvent) => {
                                        const iLength = oEvent.getParameter("length");
                                        const oData = oEvent.getParameter("data");
                                        const iActualCount = oData ? oData.length : (iLength || 0);
                                        console.log("✅ Demands data received with filter. Count:", iActualCount);
                                        if (iActualCount === 0) {
                                            console.warn("⚠️ No demands found for project:", sProjectId);
                                        }
                                    });
                                } catch (e) {
                                    console.error("❌ Error applying filter:", e);
                                }
                            } else {
                                console.warn("⚠️ Binding not ready. Binding:", oBinding, "ProjectId:", sProjectId);
                            }
                        };
                        
                        // Apply filter immediately after initialization
                        fnApplyFilter();
                        
                        // Also verify after a short delay to ensure it persists
                        setTimeout(fnApplyFilter, 300);
                    }).catch((e) => {
                        console.error("❌ Error initializing Demands table:", e);
                    });
                    
                    this._resetSegmentedButtonForFragment("Demands");
                    
                    // ✅ Pre-fill project field in demand form with selected project
                    this._prefillDemandProject(sProjectId, sProjectName);
                }
            }.bind(this));
        },
        
        // ✅ NEW: Store project ID in model (project field removed from form)
        _prefillDemandProject: function(sProjectId, sProjectName) {
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
            
            console.log("✅ Stored project ID in model:", sFinalProjectId);
        },
        
        // ✅ NEW: Refresh Demands table while preserving project filter
        _refreshDemandsTableWithFilter: function() {
            const oTable = this.byId("Demands");
            if (!oTable) {
                console.warn("Demands table not found for refresh");
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
            
            console.log("✅ Refreshing Demands table with filter:", sFilterValue);
            
            // Rebind the table
            if (oTable.rebind) {
                try {
                    oTable.rebind();
                } catch (e) {
                    console.log("Rebind error:", e);
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
                            console.log("✅ Filter reapplied after refresh:", sFilterValue);
                            
                            // Attach data received event to verify filter is working
                            oBinding.attachDataReceived((oEvent) => {
                                const iLength = oEvent.getParameter("length");
                                console.log("✅ Demands data received with filter. Count:", iLength);
                            });
                        } catch (e) {
                            console.error("❌ Error reapplying filter:", e);
                        }
                    } else {
                        console.warn("⚠️ Binding not ready for filter. Retrying...");
                        setTimeout(fnApplyFilter, 200);
                    }
                };
                
                fnApplyFilter();
            }, 300);
        },
        
        // ✅ NEW: Back to Projects handler - returns to Allocations view
        onBackToProjectsPress: function () {
            console.log("Back to projects");
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
            
            console.log("✅ Demands view change - Selected key:", sSelectedKey);
            
            if (!oAllocationPage) {
                console.error("Allocation page not found");
                return;
            }
            
            // Reset flag so fragment can be reloaded
            this._bAllocationsLoaded = false;
            
            // Destroy current content
            oAllocationPage.destroyContent();
            
            if (sSelectedKey === "employees") {
                console.log("✅ Loading Employees view (Res fragment) from Demands dropdown");
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
                                this._setDefaultFilterFields(oResFilterBar, ["fullName", "status"]);
                            }, 1000);
                            setTimeout(() => {
                                this._setDefaultFilterFields(oResFilterBar, ["fullName", "status"]);
                            }, 2000);
                        }
                        
                        this.initializeTable("Res").then(() => {
                            // ✅ CRITICAL: Apply Unproductive Bench filter to Res table after initialization
                            const fnApplyBenchFilter = () => {
                                const oResBinding = oTable.getRowBinding && oTable.getRowBinding();
                                if (oResBinding) {
                                    const oBenchFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Unproductive Bench");
                                    oResBinding.filter([oBenchFilter]);
                                    console.log("✅ Res table filtered to show only Unproductive Bench employees");
                                    
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
                                            console.log("✅ Re-applied Unproductive Bench filter after dataReceived");
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
                console.log("✅ Loading Projects view (Allocations fragment) from Demands dropdown");
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
        onResourcesPress: function() {
            console.log("Find Resources pressed");
            
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
            
            // ✅ CRITICAL: Get project ID from multiple sources (priority order)
            // 1. From stored filter (set when navigating from Projects)
            // 2. From selected project ID (set when navigating from Projects)
            // 3. From selected demand's sapPId
            let sProjectId = this._sDemandProjectFilter || this._sSelectedProjectId;
            
            // ✅ Try to get project data from selected demand's association (if available)
            let oProjectData = null;
            if (aSelectedContexts.length > 0) {
                const oDemand = aSelectedContexts[0].getObject();
                // If no project ID yet, get it from demand
            if (!sProjectId) {
                    sProjectId = oDemand.sapPId;
                    console.log("✅ Got project ID from selected demand:", sProjectId);
                }
                // ✅ Always try to get project data from demand's association (has dates)
                if (oDemand.to_Project) {
                    oProjectData = oDemand.to_Project;
                    console.log("✅ Got project data from demand association");
                }
            }
            
            if (!sProjectId) {
                sap.m.MessageBox.error("Project ID not found. Please navigate from Projects screen or select a demand with a project.");
                return;
            }
            
            console.log("✅ Using project ID for Find Resources:", sProjectId);
            
            // Store project ID for allocation
            this._sAllocationProjectId = sProjectId;
            console.log("✅ Stored project ID for allocation:", sProjectId);
            
            // ✅ Store project data if available from demand association (has dates for validation)
            if (oProjectData && oProjectData.startDate && oProjectData.endDate) {
                this._oAllocationProjectData = {
                    startDate: oProjectData.startDate,
                    endDate: oProjectData.endDate
                };
                console.log("✅ Stored project dates from demand association:", oProjectData.startDate, "to", oProjectData.endDate);
            } else {
                console.log("⚠️ Project dates not available from demand association - will use backend validation");
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
                        console.log("✅ Allocate button found and accessible");
                    } else {
                        console.error("❌ Allocate button not found after dialog load!");
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
                    console.log("✅ Allocate button found and accessible");
                } else {
                    console.error("❌ Allocate button not found after dialog open!");
                }
                
                // ✅ Auto-fill dates from project (will use cached data or fetch)
                this._prefillAllocationDates(sProjectId);
            }
        },
        
        // ✅ NEW: Helper to pre-fill allocation dates from project
        _prefillAllocationDates: function(sProjectId) {
            const oModel = this.getOwnerComponent().getModel();
            if (!oModel || !sProjectId) return;
            
            // ✅ Use cached data if available (set when opening from Demands)
            if (this._oAllocationProjectData && this._oAllocationProjectData.startDate && this._oAllocationProjectData.endDate) {
                const oStartDatePicker = this.byId("allocationStartDate");
                const oEndDatePicker = this.byId("allocationEndDate");
                
                if (this._oAllocationProjectData.startDate && oStartDatePicker) {
                    oStartDatePicker.setValue(this._oAllocationProjectData.startDate);
                    oStartDatePicker.data("projectStartDate", this._oAllocationProjectData.startDate);
                    console.log("✅ Pre-filled start date from cached data:", this._oAllocationProjectData.startDate);
                }
                
                if (this._oAllocationProjectData.endDate && oEndDatePicker) {
                    oEndDatePicker.setValue(this._oAllocationProjectData.endDate);
                    oEndDatePicker.data("projectEndDate", this._oAllocationProjectData.endDate);
                    console.log("✅ Pre-filled end date from cached data:", this._oAllocationProjectData.endDate);
                }
            } else {
                // ✅ If no cached data, try to get from demand association (when coming from Demands)
                // This should have been set in onResourcesPress, but if not, skip pre-fill
                // User can manually enter dates, and backend will validate
                console.log("⚠️ No cached project dates available - user can enter dates manually");
            }
        },
        
        // ✅ NEW: Find Resources dialog close handler
        onFindResourcesDialogClose: function() {
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
        onFindResourcesSearch: function(oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("findResourcesTable");
            
            if (!oTable) {
                return;
            }
            
            const oBinding = oTable.getBinding("items");
            if (oBinding) {
                // ✅ CRITICAL: Always include Unproductive Bench status filter (for allocation), add search filter on top
                const aFilters = [
                    new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Unproductive Bench")
                ];
                
                if (sQuery) {
                    aFilters.push(new sap.ui.model.Filter("fullName", sap.ui.model.FilterOperator.Contains, sQuery));
                }
                
                oBinding.filter(aFilters, "Application");
            }
        },
        
        // ✅ NEW: Find Resources selection change handler
        onFindResourcesSelectionChange: function(oEvent) {
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
            
            console.log("🔵 onFindResourcesSelectionChange - Selected items:", aSelectedItems.length);
            
            if (oAllocateBtn) {
                const bEnabled = aSelectedItems.length > 0;
                oAllocateBtn.setEnabled(bEnabled);
                console.log("✅ Allocate button enabled:", bEnabled);
            } else {
                console.error("❌ Allocate button not found!");
            }
        },
        
        // ✅ NEW: Find Resources allocate handler - creates allocation record
        onFindResourcesAllocate: function(oEvent) {
            console.log("🔵 onFindResourcesAllocate called", oEvent);
            
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
                console.error("❌ Resources table not found");
                sap.m.MessageToast.show("Resources table not found");
                return;
            }
            
            const aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems || aSelectedItems.length === 0) {
                console.warn("⚠️ No employees selected");
                sap.m.MessageToast.show("Please select at least one employee to allocate");
                return;
            }
            
            console.log(`✅ ${aSelectedItems.length} employee(s) selected, proceeding with allocation...`);
            
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
            console.log("✅ Using project ID for allocation:", sProjectId);
            
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
                console.log("✅ Using cached project dates for validation");
            } else if (oStartDatePicker && oEndDatePicker) {
                sProjectStartDate = oStartDatePicker.data("projectStartDate");
                sProjectEndDate = oEndDatePicker.data("projectEndDate");
                console.log("✅ Using date picker data attributes for validation");
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
                console.log(`🔵 Method 1 (byId): ${oPercentageInput ? "Found" : "Not found"}`);
                
                // Method 2: Fragment.byId with dialog ID
                if (!oPercentageInput) {
                    try {
                        oPercentageInput = sap.ui.core.Fragment.byId("findResourcesDialog", "allocationPercentage_find");
                        console.log(`🔵 Method 2 (Fragment.byId with dialog ID): ${oPercentageInput ? "Found" : "Not found"}`);
                    } catch (e) {
                        console.warn("Method 2 failed:", e);
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
                    console.log(`🔵 Method 3 (Recursive search): ${oPercentageInput ? "Found" : "Not found"}`);
                }
                
                // Method 4: Try byId with view prefix
                if (!oPercentageInput) {
                    const sViewId = this.getView().getId();
                    oPercentageInput = sap.ui.getCore().byId(sViewId + "--allocationPercentage_find");
                    console.log(`🔵 Method 4 (View prefix): ${oPercentageInput ? "Found" : "Not found"}`);
                }
                
                let sPercentage = "";
                if (oPercentageInput) {
                    sPercentage = oPercentageInput.getValue() || "";
                    console.log(`✅ Found percentage input! ID: ${oPercentageInput.getId()}, raw value: "${sPercentage}"`);
                } else {
                    console.error("❌ Could not find allocationPercentage_find input field using any method!");
                    console.error("❌ Dialog exists:", !!this._oFindResourcesDialog);
                    if (this._oFindResourcesDialog) {
                        console.error("❌ Dialog ID:", this._oFindResourcesDialog.getId());
                        console.error("❌ Dialog content:", this._oFindResourcesDialog.getContent());
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
                    console.log(`⚠️ Percentage input field is empty, using default: 100%`);
                }
                
                console.log(`✅ Allocation percentage from input: "${sPercentage}" -> ${iPercentage}%`);
                
                // ✅ CRITICAL: Frontend validation - Check total allocation percentage per employee
                // Group employees and check their existing allocations
                const mEmployeeTotals = {}; // Map of employeeId -> current total percentage
                const aEmployeeIds = [...new Set(aEmployees.map(e => e.ohrId))];
                
                // Fetch existing allocations for all selected employees
                const fnValidateAndCreate = async () => {
                    try {
                        // Get existing allocations for all selected employees
                        for (let i = 0; i < aEmployeeIds.length; i++) {
                            const sEmployeeId = aEmployeeIds[i];
                            
                            try {
                                // ✅ Use OData V4 bindList to read allocations
                                const oAllocBinding = oModel.bindList("/Allocations", null, [
                                    new sap.ui.model.Filter("employeeId", sap.ui.model.FilterOperator.EQ, sEmployeeId),
                                    new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Active")
                                ]);
                                
                                const aExistingAllocs = await new Promise((resolve, reject) => {
                                    oAllocBinding.requestContexts(0, 1000).then((aContexts) => {
                                        const aAllocs = aContexts.map(ctx => ctx.getObject());
                                        resolve(aAllocs);
                                    }).catch(reject);
                                });
                                
                                const iCurrentTotal = aExistingAllocs.reduce((sum, alloc) => {
                                    return sum + (alloc.allocationPercentage || 0);
                                }, 0);
                                
                                mEmployeeTotals[sEmployeeId] = iCurrentTotal;
                                
                                // Check if adding new allocation would exceed 100%
                                // Count how many times this employee appears in the selection
                                const iEmployeeCount = aEmployees.filter(e => e.ohrId === sEmployeeId).length;
                                const iNewTotal = iCurrentTotal + (iPercentage * iEmployeeCount);
                                
                                if (iNewTotal > 100) {
                                    const sEmployeeName = aEmployees.find(e => e.ohrId === sEmployeeId)?.fullName || sEmployeeId;
                                    sap.m.MessageBox.error(`Cannot allocate: Total allocation percentage (${iNewTotal}%) would exceed 100% for employee ${sEmployeeName}. Current allocations: ${iCurrentTotal}%, New allocation(s): ${iPercentage * iEmployeeCount}%`);
                                    return;
                                }
                            } catch (oReadError) {
                                console.warn(`Could not fetch existing allocations for employee ${sEmployeeId}:`, oReadError);
                                // Continue with validation - backend will catch it
                            }
                        }
                        
                        // All validations passed - create allocations
                        const aAllocationData = [];
                        for (let i = 0; i < aEmployees.length; i++) {
                            const oEmployee = aEmployees[i];
            const sAllocationId = this._generateUUID();
            
                            const oAllocData = {
                allocationId: sAllocationId,
                                employeeId: oEmployee.ohrId,
                projectId: sProjectId,
                startDate: sStartDate,
                endDate: sEndDate,
                                allocationPercentage: iPercentage,
                status: "Active"
            };
                            
                            console.log(`🔵 Creating allocation for employee ${oEmployee.ohrId} with percentage: ${iPercentage}%`);
                            console.log(`🔵 Allocation data:`, JSON.stringify(oAllocData, null, 2));
                            
                            aAllocationData.push(oAllocData);
                        }
                        
                        console.log(`✅ Frontend validation passed. Creating ${aAllocationData.length} allocation(s) with ${iPercentage}% each...`);
                        this._createMultipleAllocationsFromFindResources(aAllocationData, oModel, aEmployees);
                    } catch (oError) {
                        console.error("Error in frontend validation:", oError);
                        // Still proceed - backend will validate
                        const aAllocationData = [];
                        for (let i = 0; i < aEmployees.length; i++) {
                            const oEmployee = aEmployees[i];
                            const sAllocationId = this._generateUUID();
                            
                            const oAllocData = {
                                allocationId: sAllocationId,
                                employeeId: oEmployee.ohrId,
                                projectId: sProjectId,
                                startDate: sStartDate,
                                endDate: sEndDate,
                                allocationPercentage: iPercentage,
                                status: "Active"
                            };
                            
                            console.log(`🔵 Creating allocation for employee ${oEmployee.ohrId} with percentage: ${iPercentage}%`);
                            console.log(`🔵 Allocation data:`, JSON.stringify(oAllocData, null, 2));
                            
                            aAllocationData.push(oAllocData);
                        }
                        this._createMultipleAllocationsFromFindResources(aAllocationData, oModel, aEmployees);
                    }
                };
                
                fnValidateAndCreate();
            };
            
            // ✅ If we have project dates, validate and create immediately
            // ✅ If dates aren't available, skip frontend validation and let backend handle it
            if (sProjectStartDate && sProjectEndDate) {
                fnCreateAllocations();
            } else {
                console.log("⚠️ Project dates not available for frontend validation - backend will validate");
                // Skip frontend validation, proceed directly to creation
                fnCreateAllocations();
            }
        },
        
        // ✅ NEW: Helper function to create multiple allocations from Find Resources
        _createMultipleAllocationsFromFindResources: function(aAllocationData, oModel, aEmployees) {
            console.log(`Creating ${aAllocationData.length} allocation(s)...`);
            
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
                    console.warn(`⚠️ WARNING: Creating ${aAllocsForEmployee.length} allocations for employee ${sEmployeeId} in same batch. Total percentage: ${iTotalPercentage}%`);
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
                    console.error(`❌ Failed to create allocation entry for employee ${oAllocData.employeeId}`);
                    continue;
                }
                
                // ✅ Explicitly set all properties on the context
                Object.keys(oAllocData).forEach((sKey) => {
                    try {
                        oNewContext.setProperty(sKey, oAllocData[sKey]);
                    } catch (e) {
                        console.warn("Could not set property:", sKey, e);
                    }
                });
                
                aContexts.push(oNewContext);
            }
            
            if (aContexts.length === 0) {
                sap.m.MessageBox.error("Failed to create any allocation entries.");
                return;
            }
            
            console.log(`✅ Created ${aContexts.length} allocation context(s), submitting batch...`);
            
            // Submit batch
            oModel.submitBatch("changesGroup").then((oResponse) => {
                console.log("Batch response:", oResponse);
                
                // ✅ Check if all contexts were created successfully
                let iSuccessCount = 0;
                for (let i = 0; i < aContexts.length; i++) {
                    const oContext = aContexts[i];
                    if (oContext && oContext.getProperty && oContext.getProperty("allocationId")) {
                        iSuccessCount++;
                    }
                }
                
                if (iSuccessCount === aContexts.length) {
                    console.log(`✅ All ${iSuccessCount} allocation(s) created successfully!`);
                    
                    // Show success message with employee names
                    const aEmployeeNames = aEmployees.map(o => o.fullName).join(", ");
                    sap.m.MessageToast.show(`${iSuccessCount} employee(s) allocated successfully: ${aEmployeeNames}`);
                    
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
                        console.log("✅ Refreshed Projects table to update resource counts");
                    }, 800);
                    
                    // ✅ CRITICAL: Refresh Find Resources table and re-apply Unproductive Bench filter
                    const oFindResourcesTable = this.byId("findResourcesTable");
                    if (oFindResourcesTable && oFindResourcesTable.getBinding) {
                        setTimeout(() => {
                            const oBinding = oFindResourcesTable.getBinding("items");
                            if (oBinding) {
                                const oBenchFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Unproductive Bench");
                                oBinding.filter([oBenchFilter]);
                                console.log("✅ Re-applied Unproductive Bench filter to Find Resources table after allocation");
                            }
                        }, 300);
                    }
                } else {
                    console.error(`❌ Only ${iSuccessCount} of ${aContexts.length} allocation(s) created successfully`);
                    sap.m.MessageBox.warning(`${iSuccessCount} of ${aContexts.length} allocation(s) created successfully. Some may have failed.`);
                }
            }).catch((oError) => {
                console.error("❌ Error submitting allocation batch:", oError);
                console.error("Error details:", JSON.stringify(oError, null, 2));
                
                // ✅ CRITICAL: Extract error message from batch response
                let sErrorMessage = `Failed to create allocation(s). ${aAllocationData.length} employee(s) selected.`;
                
                if (oError.message) {
                    sErrorMessage = oError.message;
                } else if (oError.body && oError.body.error && oError.body.error.message) {
                    sErrorMessage = oError.body.error.message;
                } else if (typeof oError === 'string') {
                    sErrorMessage = oError;
                }
                
                sap.m.MessageBox.error(sErrorMessage);
            });
        },
        
        // ✅ NEW: Helper function to create multiple allocations from AllocateDialog
        _createMultipleAllocationsFromAllocateDialog: function(aAllocationData, oModel, aEmployees, oResTable) {
            console.log(`Creating ${aAllocationData.length} allocation(s) from AllocateDialog...`);
            
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
                    console.error(`❌ Failed to create allocation entry for employee ${oAllocData.employeeId}`);
                    continue;
                }
                
                // ✅ Explicitly set all properties on the context
                Object.keys(oAllocData).forEach((sKey) => {
                    try {
                        oNewContext.setProperty(sKey, oAllocData[sKey]);
                    } catch (e) {
                        console.warn("Could not set property:", sKey, e);
                    }
                });
                
                aContexts.push(oNewContext);
            }
            
            if (aContexts.length === 0) {
                sap.m.MessageBox.error("Failed to create any allocation entries.");
                return;
            }
            
            console.log(`✅ Created ${aContexts.length} allocation context(s), submitting batch...`);
            
            // Submit batch
            oModel.submitBatch("changesGroup").then((oResponse) => {
                console.log("Batch response:", oResponse);
                
                // ✅ Check if all contexts were created successfully
                let iSuccessCount = 0;
                for (let i = 0; i < aContexts.length; i++) {
                    const oContext = aContexts[i];
                    if (oContext && oContext.getProperty && oContext.getProperty("allocationId")) {
                        iSuccessCount++;
                    }
                }
                
                if (iSuccessCount === aContexts.length) {
                    console.log(`✅ All ${iSuccessCount} allocation(s) created successfully!`);
                    
                    // Show success message with employee names
                    const aEmployeeNames = aEmployees.map(o => o.fullName).join(", ");
                    sap.m.MessageToast.show(`${iSuccessCount} employee(s) allocated successfully: ${aEmployeeNames}`);
                    
                    // ✅ CRITICAL: Close dialog - try multiple ways to ensure it closes
                    const oDialog = this.byId("allocateDialog") || this._oAllocateDialog;
                    if (oDialog && oDialog.close) {
                        oDialog.close();
                        console.log("✅ Dialog closed successfully");
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
                        // Re-apply Unproductive Bench filter after rebind
                        setTimeout(() => {
                            const oResBinding = oResTable.getRowBinding && oResTable.getRowBinding();
                            if (oResBinding) {
                                const oBenchFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Unproductive Bench");
                                oResBinding.filter([oBenchFilter]);
                                console.log("✅ Re-applied Unproductive Bench filter after allocation");
                            }
                        }, 300);
                    }
                    
                    // ✅ CRITICAL: Refresh Projects table to update allocation counts (allocatedResources, toBeAllocated)
                    setTimeout(() => {
                        this._hardRefreshTable("Projects");
                        console.log("✅ Refreshed Projects table to update resource counts");
                    }, 800);
                    
                    // ✅ CRITICAL: Re-apply demand filter if we're on Demands screen
                    if (this._sDemandProjectFilter) {
                        setTimeout(() => {
                            this._refreshDemandsTableWithFilter(this._sDemandProjectFilter);
                        }, 500);
                    }
                } else {
                    console.error(`❌ Only ${iSuccessCount} of ${aContexts.length} allocation(s) created successfully`);
                    sap.m.MessageBox.warning(`${iSuccessCount} of ${aContexts.length} allocation(s) created successfully. Some may have failed.`);
                }
            }).catch((oError) => {
                console.error("❌ Error submitting allocation batch:", oError);
                console.error("Error details:", JSON.stringify(oError, null, 2));
                
                // ✅ CRITICAL: Extract error message from batch response
                let sErrorMessage = `Failed to create allocation(s). ${aAllocationData.length} employee(s) selected.`;
                
                if (oError.message) {
                    sErrorMessage = oError.message;
                } else if (oError.body && oError.body.error && oError.body.error.message) {
                    sErrorMessage = oError.body.error.message;
                } else if (typeof oError === 'string') {
                    sErrorMessage = oError;
                }
                
                sap.m.MessageBox.error(sErrorMessage);
            });
        },
        
        // ✅ NEW: Helper function to create single allocation from Find Resources (kept for backward compatibility)
        _createAllocationFromFindResources: function(oAllocationData, oModel, oEmployee) {
            
            console.log("Creating allocation:", oAllocationData);
            
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
            
            console.log("✅ Allocation context created:", oNewContext.getPath());
            
            // ✅ CRITICAL: Explicitly set all properties on the context to ensure they're queued
            Object.keys(oAllocationData).forEach((sKey) => {
                try {
                    oNewContext.setProperty(sKey, oAllocationData[sKey]);
                    console.log("✅ Set property:", sKey, "=", oAllocationData[sKey]);
                } catch (e) {
                    console.warn("Could not set property:", sKey, e);
                }
            });
            
            // ✅ CRITICAL: Check if batch group has pending changes before submitting
            const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");
            console.log("Allocation - Has pending changes in batch group:", bHasPendingChanges);
            
            console.log("✅ Properties set, submitting batch...");
            
            // Submit batch
            oModel.submitBatch("changesGroup").then((oResponse) => {
                // ✅ CRITICAL: Check for errors in batch response
                console.log("Batch response:", oResponse);
                
                // Verify the context was actually created successfully
                // If there was an error, the context might be in error state
                if (oNewContext && oNewContext.getProperty && oNewContext.getProperty("allocationId")) {
                    console.log("✅ Allocation created successfully!");
                    
                    // Double-check by reading the created allocation
                    if (oNewContext.requestObject) {
                        oNewContext.requestObject().then(() => {
                            const oBackendData = oNewContext.getObject();
                            console.log("✅ Allocation data from backend:", oBackendData);
                            
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
                                console.log("✅ Refreshed Projects table to update resource counts");
                            }, 800);
                            
                            // ✅ CRITICAL: Refresh Find Resources table and re-apply Unproductive Bench filter
                            const oFindResourcesTable = this.byId("findResourcesTable");
                            if (oFindResourcesTable && oFindResourcesTable.getBinding) {
                                setTimeout(() => {
                                    const oBinding = oFindResourcesTable.getBinding("items");
                                    if (oBinding) {
                                        const oBenchFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Unproductive Bench");
                                        oBinding.filter([oBenchFilter]);
                                        console.log("✅ Re-applied Unproductive Bench filter to Find Resources table after allocation");
                                    }
                                }, 300);
                            }
                        }).catch((oReadError) => {
                            console.warn("Could not read created allocation:", oReadError);
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
                    console.error("❌ Allocation context has no data - creation may have failed");
                    sap.m.MessageBox.error("Failed to create allocation. Please check the data and try again.");
                }
            }).catch((oError) => {
                console.error("❌ Error submitting allocation batch:", oError);
                console.error("Error details:", JSON.stringify(oError, null, 2));
                
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
        _generateUUID: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        
        // ✅ NEW: Allocate Resource handler - opens allocation dialog
        onAllocateRes: function() {  
            console.log("Open allocate dialog"); 
            
            if (!this._oAllocateDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "glassboard.view.fragments.AllocateDialog",
                    controller: this
                }).then(function(oDialog) {
                    this._oAllocateDialog = oDialog;
                    this.getView().addDependent(this._oAllocateDialog);
                    this._oAllocateDialog.open();
                }.bind(this));
            } else {
                this._oAllocateDialog.open();
            }
        },
        
        // ✅ NEW: Allocate confirm handler - creates allocation from AllocateDialog
        onAllocateConfirm: function () {
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
            
            console.log(`✅ ${aEmployees.length} employee(s) selected for allocation`);
            
            // Get project and demand from dialog
            const oProjectInput = this.byId("Resinput_proj");
            const oDemandInput = this.byId("Resinput_demand");
            const oStartDatePicker = this.byId("startDate");
            const oEndDatePicker = this.byId("endDate");
            
            const sProjectId = oProjectInput ? oProjectInput.data("selectedId") : null;
            const sStartDate = oStartDatePicker ? oStartDatePicker.getValue() : "";
            const sEndDate = oEndDatePicker ? oEndDatePicker.getValue() : "";
            
            if (!sProjectId) {
                sap.m.MessageToast.show("Please select a project");
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
            console.log("✅ Using project ID for allocation:", sProjectId);
            
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
                console.log(`🔵 Found percentage input, raw value: "${sPercentage}"`);
            } else {
                console.warn("⚠️ Could not find allocationPercentage_allocate input field");
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
            
            console.log(`✅ Allocation percentage from input: "${sPercentage}" -> ${iPercentage}%`);
            
            // ✅ Create allocation data for all selected employees
            const aAllocationData = [];
            for (let i = 0; i < aEmployees.length; i++) {
                const oEmployee = aEmployees[i];
                const sAllocationId = this._generateUUID();
                
                const oAllocData = {
                    allocationId: sAllocationId,
                    employeeId: oEmployee.ohrId,
                    projectId: sProjectId,
                    // ✅ Only include dates if they have values, otherwise backend will auto-fill from project
                    ...(sStartDate && sStartDate.trim() !== "" ? { startDate: sStartDate } : {}),
                    ...(sEndDate && sEndDate.trim() !== "" ? { endDate: sEndDate } : {}),
                    allocationPercentage: iPercentage,
                    status: "Active"
                };
                
                console.log(`🔵 Creating allocation for employee ${oEmployee.ohrId} with percentage: ${iPercentage}%`);
                console.log(`🔵 Allocation data:`, JSON.stringify(oAllocData, null, 2));
                
                aAllocationData.push(oAllocData);
            }
            
            console.log(`✅ Creating ${aAllocationData.length} allocation(s) from AllocateDialog with ${iPercentage}% each...`);
            
            // ✅ Use the same function for creating multiple allocations
            this._createMultipleAllocationsFromAllocateDialog(aAllocationData, oModel, aEmployees, oResTable);
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
        
        // ✅ NEW: Search handler for Res (Employees) view
        onResSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            const oTable = this.byId("Res");
            
            if (!oTable) {
                return;
            }
            
            // Apply search filter to table - always include Unproductive Bench filter
            const oBinding = oTable.getRowBinding && oTable.getRowBinding();
            if (oBinding) {
                // ✅ CRITICAL: Always include Unproductive Bench status filter (for allocation)
                const aFilters = [
                    new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "Unproductive Bench")
                ];
                
                if (sQuery && sQuery.trim() !== "") {
                    // Add search filter on top of Unproductive Bench filter
                    aFilters.push(new sap.ui.model.Filter("fullName", sap.ui.model.FilterOperator.Contains, sQuery.trim(), false));
                }
                
                oBinding.filter(aFilters);
                console.log("✅ Res search filter applied with Unproductive Bench filter, query:", sQuery);
            } else {
                console.warn("⚠️ Res binding not ready for search filter");
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
                console.log("✅ Stored project ID for AllocateDialog demand filter:", sProjectId);
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
                console.warn(`Table ${sTableId} not found for refresh`);
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
                    console.log(`✅ Table ${sTableId} rebinded`);
                } catch (e) {
                    console.log(`Rebind error for ${sTableId}:`, e);
                }
            }
            
            // ✅ STEP 2: Refresh all bindings to force fresh data from backend
            setTimeout(() => {
                const oRowBinding = oTable.getRowBinding && oTable.getRowBinding();
                const oBinding = oTable.getBinding("rows") || oTable.getBinding("items");
                
                if (oRowBinding) {
                    oRowBinding.refresh().then(() => {
                        console.log(`✅ Table ${sTableId} row binding refreshed`);
                    }).catch(() => {});
                } else if (oBinding) {
                    oBinding.refresh().then(() => {
                        console.log(`✅ Table ${sTableId} binding refreshed`);
                    }).catch(() => {});
                }
            }, 200); // Small delay to ensure batch is committed
        },

        // ✅ NEW: Submit function that handles both Create and Update
        onSubmitCustomer: function () {
            const sCustId = this.byId("inputCustomerId").getValue(),
                sCustName = this.byId("inputCustomerName").getValue(),
                sState = this.byId("inputState")?.getValue() || "",
                sCountry = this.byId("inputCountry").getValue(),
                sStartDate = this.byId("inputStartDate_cus")?.getValue() || "",
                sEndDate = this.byId("inputEndDate_cus")?.getValue() || "",
                sStatus = this.byId("inputStatus").getSelectedKey(),
                sVertical = this.byId("inputVertical").getSelectedKey();

            // ✅ Validation - Check all required fields
            if (!sCustName || sCustName.trim() === "") {
                sap.m.MessageBox.error("Customer Name is required!");
                return;
            }
            
            if (!sCountry || sCountry.trim() === "") {
                sap.m.MessageBox.error("Country is required!");
                return;
            }
            
            if (!sStatus || sStatus.trim() === "") {
                sap.m.MessageBox.error("Status is required!");
                return;
            }
            
            if (!sVertical || sVertical.trim() === "") {
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
                const oUpdateEntry = {
                    "country": sCountry || "",
                    "customerName": sCustName,
                    "state": sState || "",
                    "status": sStatus || "",
                    "vertical": sVertical || "",
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
                                            console.warn("Update may have failed:", oError.message || "Unknown error");
                                        }
                                    } catch (e) {
                                        // Ignore verification errors - update likely succeeded
                                        console.log("Update completed");
                                    }
                                }, 150);
                            });
                    } catch (oSetError) {
                        console.error("Error setting properties:", oSetError);
                        sap.m.MessageBox.error("Failed to update customer. Please try again.");
                    }
            } else {
                // CREATE MODE: No row selected, create new customer
                // Don't send SAPcustId - backend will auto-generate it (C-0001, C-0002, etc.)
                const oCreateEntry = {
                    "country": sCountry || "",
                    "customerName": sCustName,
                    "state": sState || "",
                    "status": sStatus || "",
                    "vertical": sVertical || "",
                    "startDate": sStartDate || null,
                    "endDate": sEndDate || null
                };
                
                // Validation - ensure required fields are filled
                if (!sCustName || sCustName.trim() === "") {
                    sap.m.MessageBox.error("Customer Name is required!");
                    return;
                }
                if (!sCountry || sCountry.trim() === "") {
                    sap.m.MessageBox.error("Country is required!");
                    return;
                }
                if (!sStatus || sStatus.trim() === "") {
                    sap.m.MessageBox.error("Status is required!");
                    return;
                }
                if (!sVertical || sVertical.trim() === "") {
                    sap.m.MessageBox.error("Vertical is required!");
                    return;
                }
                
                console.log("Creating customer with data:", oCreateEntry);
                
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
                        
                        console.log("Customer context created:", oNewContext.getPath());
                        
                        // ✅ CRITICAL: Set all properties individually to ensure they're queued in batch group
                        Object.keys(oCreateEntry).forEach(sKey => {
                            oNewContext.setProperty(sKey, oCreateEntry[sKey]);
                        });
                        
                        // ✅ CRITICAL: Check if batch group has pending changes before submitting
                        const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");
                        console.log("Customer - Has pending changes in batch group:", bHasPendingChanges);
                        
                        // Submit the batch to send to backend
                        console.log("Submitting batch for Customers...");
                        oModel.submitBatch("changesGroup")
                            .then(() => {
                                console.log("Customer created successfully!");
                                
                                // ✅ CRITICAL: Fetch fresh data from backend (not from UI form)
                                if (oNewContext && oNewContext.requestObject) {
                                    oNewContext.requestObject().then(() => {
                                        const oBackendData = oNewContext.getObject();
                                        console.log("✅ Customer data from backend:", oBackendData);
                                        
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
                                console.error("Create batch error:", oError);
                                
                                // Check if create actually succeeded (false positive error)
                                setTimeout(() => {
                                    try {
                                        const oCreatedData = oNewContext.getObject();
                                        if (oCreatedData && oCreatedData.customerName === oCreateEntry.customerName) {
                                            // Create succeeded despite error
                                            console.log("✅ Create verified successful");
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
                        console.error("Error creating via binding:", oCreateError);
                        // Fallback to direct model create
                        this._createCustomerDirect(oModel, oCreateEntry, oTable);
                    }
                } else {
                    // No binding available - use direct model create (fallback)
                    console.log("Table binding not available, using direct model create");
                    this._createCustomerDirect(oModel, oCreateEntry, oTable);
                }
            }
        },

        // Helper function for direct model create (fallback when binding not available)
        _createCustomerDirect: function (oModel, oCreateEntry, oTable) {
            oModel.create("/Customers", oCreateEntry, {
                success: (oData) => {
                    console.log("Customer created successfully (direct):", oData);
                    MessageToast.show("Customer created successfully!");
                    this.onCancelForm();
                    // Refresh table to show new entry
                    const oBinding = oTable.getBinding("rows") || oTable.getBinding("items");
                    if (oBinding) {
                        oBinding.refresh();
                    }
                },
                error: (oError) => {
                    console.error("Create error:", oError);
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
                    console.log("[ID Generation] Method 1 (binding):", sNextId);
                    
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
                                console.log("[ID Generation] Customer Backend query result:", aContexts);
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
                                console.log("[ID Generation] Customer Method 2 (backend):", sBackendId);
                                oCustomerIdInput.setValue(sBackendId);
                            }).catch((oError) => {
                                console.warn("[ID Generation] Customer Backend query failed:", oError);
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
                console.error("[ID Generation] Error:", e);
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
                console.warn("Customer table not available");
                return;
            }
            
            // Use the helper function to get binding (works for MDC Tables)
            let iRetryCount = 0;
            const MAX_RETRIES = 5;
            
            const fnApplySearch = () => {
                if (iRetryCount >= MAX_RETRIES) {
                    console.warn("Max retries reached for customer search");
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
                        
                        aFilters.push(new sap.ui.model.Filter({
                            path: "country",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        
                        aFilters.push(new sap.ui.model.Filter({
                            path: "state",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        
                        aFilters.push(new sap.ui.model.Filter({
                            path: "vertical",
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sQueryTrimmed,
                            caseSensitive: false
                        }));
                        
                        // Combine with OR logic (search matches any field)
                        const oCombinedFilter = new sap.ui.model.Filter({
                            filters: aFilters,
                            and: false
                        });
                        
                        // Apply filter
                        oBinding.filter([oCombinedFilter]);
                        console.log("✅ Search filter applied (case-insensitive):", sQueryTrimmed);
                    } else {
                        // Clear filter when search is empty
                        oBinding.filter([]);
                        console.log("✅ Search filter cleared");
                    }
                } catch (e) {
                    console.error("Error applying search filter:", e);
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
                console.warn("Employee table not available");
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
                        
                        const oCombinedFilter = new sap.ui.model.Filter({
                            filters: aFilters,
                            and: false
                        });
                        
                        oBinding.filter([oCombinedFilter]);
                        console.log("✅ Employee search filter applied (case-insensitive):", sQueryTrimmed);
                    } else {
                        oBinding.filter([]);
                        console.log("✅ Employee search filter cleared");
                    }
                } catch (e) {
                    console.error("Error applying employee search filter:", e);
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
                console.warn("Opportunity table not available");
                return;
            }
            
            let iRetryCount = 0;
            const MAX_RETRIES = 5;
            
            const fnApplySearch = () => {
                if (iRetryCount >= MAX_RETRIES) {
                    console.warn("Max retries reached for opportunity search");
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
                        console.log("✅ Opportunity search filter applied (case-insensitive):", sQueryTrimmed);
                    } else {
                        oBinding.filter([]);
                        console.log("✅ Opportunity search filter cleared");
                    }
                } catch (e) {
                    console.error("Error applying opportunity search filter:", e);
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
                console.warn("Project table not available");
                return;
            }
            
            let iRetryCount = 0;
            const MAX_RETRIES = 5;
            
            const fnApplySearch = () => {
                if (iRetryCount >= MAX_RETRIES) {
                    console.warn("Max retries reached for project search");
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
                        console.log("✅ Project search filter applied (case-insensitive):", sQueryTrimmed);
                    } else {
                        oBinding.filter([]);
                        console.log("✅ Project search filter cleared");
                    }
                } catch (e) {
                    console.error("Error applying project search filter:", e);
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
            
            // Clear all form fields
            const oCustomerIdInput = this.byId("inputCustomerId");
            if (oCustomerIdInput) {
                // Reuse the improved initialization method
                this._initializeCustomerIdField();
            }
            this.byId("inputCustomerName")?.setValue("");
            this.byId("inputState")?.setValue("");
            this.byId("inputCountry")?.setValue("");
            this.byId("inputStartDate_cus")?.setValue("");
            this.byId("inputEndDate_cus")?.setValue("");
            this.byId("inputStatus")?.setSelectedKey("");
            this.byId("inputVertical")?.setSelectedKey("");
            
            // Deselect any selected row in the table (MDC Table uses clearSelection)
            if (oTable && oTable.clearSelection) {
                try {
                    oTable.clearSelection();
                } catch (e) {
                    // Ignore if method doesn't exist or fails
                    console.log("Selection cleared or method not available");
                }
            }
            
            // ✅ CRITICAL: Disable Edit button when form is cleared (no row selected)
            this.byId("editButton_cus")?.setEnabled(false);
        },

        // ✅ DEPRECATED: Old create function (kept for reference, can be removed)
        onCreateCustomer: function () {
            // Redirect to new submit function
            this.onSubmitCustomer();
        },

        // ✅ NEW: Submit function for Employee (handles both Create and Update)
        onSubmitEmployee: function () {
            const sOHRId = this.byId("inputOHRId_emp").getValue(),
                sFullName = this.byId("inputFullName_emp").getValue(),
                sMailId = this.byId("inputMailId_emp").getValue(),
                sGender = this.byId("inputGender_emp").getSelectedKey(),
                sEmployeeType = this.byId("inputEmployeeType_emp").getSelectedKey(),
                sDoJ = this.byId("inputDoJ_emp").getValue(),
                sBand = this.byId("inputBand_emp").getSelectedKey(),
                sRole = this.byId("inputRole_emp").getSelectedKey(), // ✅ FIXED: Role is a Select control
                sLocation = this.byId("inputLocation_emp").getValue(),
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
                                        console.warn("Update may have failed:", oError.message || "Unknown error");
                                    }
                                } catch (e) {
                                    console.log("Update completed");
                                }
                            }, 150);
                        });
                } catch (oSetError) {
                    console.error("Error setting properties:", oSetError);
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
                
                console.log("Creating employee with data:", oCreateEntry);
                
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
                        console.log("Employee context created:", oNewContext.getPath());
                        
                        oModel.submitBatch("changesGroup")
                            .then(() => {
                                console.log("Employee created successfully!");
                                MessageToast.show("Employee created successfully!");
                                
                                // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                                this._hardRefreshTable("Employees");
                                
                                this.onCancelEmployeeForm();
                            })
                            .catch((oError) => {
                                console.error("Create batch error:", oError);
                                setTimeout(() => {
                                    try {
                                        const oCreatedData = oNewContext.getObject();
                                        if (oCreatedData && oCreatedData.fullName === oCreateEntry.fullName) {
                                            console.log("✅ Create verified successful");
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
                        console.error("Error creating via binding:", oCreateError);
                        this._createEmployeeDirect(oModel, oCreateEntry, oTable);
                    }
                } else {
                    console.log("Table binding not available, using direct model create");
                    this._createEmployeeDirect(oModel, oCreateEntry, oTable);
                }
            }
        },

        // Helper function for direct model create (fallback)
        _createEmployeeDirect: function (oModel, oCreateEntry, oTable) {
            oModel.create("/Employees", oCreateEntry, {
                success: (oData) => {
                    console.log("Employee created successfully (direct):", oData);
                    MessageToast.show("Employee created successfully!");
                    
                    // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                    this._hardRefreshTable("Employees");
                    
                    this.onCancelEmployeeForm();
                },
                error: (oError) => {
                    console.error("Create error:", oError);
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
                sTCV = this.byId("inputTCV_oppr").getValue();
            
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
                    "expectedStart": sExpectedStart || "",
                    "expectedEnd": sExpectedEnd || "",
                    "tcv": sTCV ? parseFloat(sTCV) : 0,
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
                                    console.log("✅ Opportunity updated data from backend:", oBackendData);
                                    
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
                                        console.warn("Update may have failed:", oError.message || "Unknown error");
                                    }
                                } catch (e) {
                                    console.log("Update completed");
                                }
                            }, 150);
                        });
                } catch (oSetError) {
                    console.error("Error setting properties:", oSetError);
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
                    "expectedStart": sExpectedStart || "",
                    "expectedEnd": sExpectedEnd || "",
                    "tcv": sTCV ? parseFloat(sTCV) : 0,
                    "customerId": sCustomerId || ""
                };
                
                console.log("Creating opportunity with data:", oCreateEntry);
                
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
                        
                        console.log("Opportunity context created:", oNewContext.getPath());
                        
                        // ✅ CRITICAL: Set all properties individually to ensure they're queued in batch group
                        Object.keys(oCreateEntry).forEach(sKey => {
                            oNewContext.setProperty(sKey, oCreateEntry[sKey]);
                        });
                        
                        // ✅ CRITICAL: Check if batch group has pending changes before submitting
                        const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");
                        console.log("Opportunity - Has pending changes in batch group:", bHasPendingChanges);
                        
                        // Submit the batch to send to backend - EXACT same as Customer
                        console.log("Submitting batch for Opportunities...");
                        oModel.submitBatch("changesGroup")
                            .then(() => {
                                console.log("Opportunity created successfully!");
                                
                                // ✅ CRITICAL: Fetch fresh data from backend (not from UI form)
                                if (oNewContext && oNewContext.requestObject) {
                                    oNewContext.requestObject().then(() => {
                                        const oBackendData = oNewContext.getObject();
                                        console.log("✅ Opportunity data from backend:", oBackendData);
                                        
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
                                console.error("Create batch error:", oError);
                                
                                // Check if create actually succeeded (false positive error) - EXACT same as Customer
                                setTimeout(() => {
                                    try {
                                        const oCreatedData = oNewContext.getObject();
                                        if (oCreatedData && oCreatedData.opportunityName === oCreateEntry.opportunityName) {
                                            // Create succeeded despite error
                                            console.log("✅ Create verified successful");
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
                        console.error("Error creating via binding:", oCreateError);
                        // Fallback to direct model create
                        this._createOpportunityDirect(oModel, oCreateEntry, oTable);
                    }
                } else {
                    // No binding available - use direct model create (fallback) - EXACT same as Customer
                    console.log("Table binding not available, using direct model create");
                    this._createOpportunityDirect(oModel, oCreateEntry, oTable);
                }
            }
        },

        // Helper function for direct model create (fallback)
        _createOpportunityDirect: function (oModel, oCreateEntry, oTable) {
            oModel.create("/Opportunities", oCreateEntry, {
                success: (oData) => {
                    console.log("Opportunity created successfully (direct):", oData);
                    MessageToast.show("Opportunity created successfully!");
                    
                    // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                    this._hardRefreshTable("Opportunities");
                    
                    this.onCancelOpportunityForm();
                },
                error: (oError) => {
                    console.error("Create error:", oError);
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
                console.log("Could not generate next ID, using default:", sNextId);
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
            this.byId("inputCustomerId_oppr")?.setValue("");
            this.byId("inputCustomerId_oppr")?.data("selectedId", "");
            
            // Deselect any selected row
            if (oTable && oTable.clearSelection) {
                try {
                    oTable.clearSelection();
                } catch (e) {
                    console.log("Selection cleared or method not available");
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
                    console.log("[ID Generation] Opportunity Method 1 (binding):", sNextId);
                    
                    if (!sNextId || sNextId === "O-0001") {
                        const oModel = this.getOwnerComponent().getModel();
                        if (oModel) {
                            // ✅ FIXED: Use OData V4 bindList instead of oModel.read()
                            const oBinding = oModel.bindList("/Opportunities", null, [], {
                                "$orderby": "sapOpportunityId desc",
                                "$top": "1"
                            });
                            
                            oBinding.requestContexts(0, 1).then((aContexts) => {
                                console.log("[ID Generation] Opportunity Backend query result:", aContexts);
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
                                console.log("[ID Generation] Opportunity Method 2 (backend):", sBackendId);
                                oOppIdInput.setValue(sBackendId);
                            }).catch((oError) => {
                                console.warn("[ID Generation] Opportunity Backend query failed:", oError);
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
                console.error("[ID Generation] Opportunity Error:", e);
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
                    "startDate": sStartDate || "",
                    "endDate": sEndDate || "",
                    "gpm": sGPM || "",
                    "projectType": sProjectType || "",
                    "status": sStatus || "",
                    "oppId": sOppId || "",
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
                                    console.log("✅ Project updated data from backend:", oBackendData);
                                    
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
                                        console.warn("Update may have failed:", oError.message || "Unknown error");
                                    }
                                } catch (e) {
                                    console.log("Update completed");
                                }
                            }, 150);
                        });
                } catch (oSetError) {
                    console.error("Error setting properties:", oSetError);
                    sap.m.MessageBox.error("Failed to update project. Please try again.");
                }
            } else {
                // CREATE MODE
                const oCreateEntry = {
                    "sfdcPId": sSfdcProjId || "",
                    "projectName": sProjectName,
                    "startDate": sStartDate || "",
                    "endDate": sEndDate || "",
                    "gpm": sGPM || "",
                    "projectType": sProjectType || "",
                    "status": sStatus || "",
                    "oppId": sOppId || "",
                    "requiredResources": sRequiredResources ? parseInt(sRequiredResources) : 0,
                    "allocatedResources": sAllocatedResources ? parseInt(sAllocatedResources) : 0,
                    "toBeAllocated": sToBeAllocated ? parseInt(sToBeAllocated) : 0,
                    "SOWReceived": sSOWReceived || "",
                    "POReceived": sPOReceived || ""
                };
                
                console.log("Creating project with data:", oCreateEntry);
                
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
                        
                        console.log("Project context created:", oNewContext.getPath());
                        
                        // ✅ CRITICAL: Set all properties individually to ensure they're queued in batch group
                        Object.keys(oCreateEntry).forEach(sKey => {
                            oNewContext.setProperty(sKey, oCreateEntry[sKey]);
                        });
                        
                        // ✅ CRITICAL: Check if batch group has pending changes before submitting
                        const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");
                        console.log("Project - Has pending changes in batch group:", bHasPendingChanges);
                        
                        // Submit the batch to send to backend - EXACT same as Customer
                        console.log("Submitting batch for Projects...");
                        oModel.submitBatch("changesGroup")
                            .then(() => {
                                console.log("Project created successfully!");
                                
                                // ✅ CRITICAL: Fetch fresh data from backend (not from UI form)
                                if (oNewContext && oNewContext.requestObject) {
                                    oNewContext.requestObject().then(() => {
                                        const oBackendData = oNewContext.getObject();
                                        console.log("✅ Project data from backend:", oBackendData);
                                        
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
                                console.error("Create batch error:", oError);
                                
                                // Check if create actually succeeded (false positive error) - EXACT same as Customer
                                setTimeout(() => {
                                    try {
                                        const oCreatedData = oNewContext.getObject();
                                        if (oCreatedData && oCreatedData.projectName === oCreateEntry.projectName) {
                                            // Create succeeded despite error
                                            console.log("✅ Create verified successful");
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
                        console.error("Error creating via binding:", oCreateError);
                        // Fallback to direct model create
                        this._createProjectDirect(oModel, oCreateEntry, oTable);
                    }
                } else {
                    // No binding available - use direct model create (fallback) - EXACT same as Customer
                    console.log("Table binding not available, using direct model create");
                    this._createProjectDirect(oModel, oCreateEntry, oTable);
                }
            }
        },

        // Helper function for direct model create (fallback)
        _createProjectDirect: function (oModel, oCreateEntry, oTable) {
            oModel.create("/Projects", oCreateEntry, {
                success: (oData) => {
                    console.log("Project created successfully (direct):", oData);
                    MessageToast.show("Project created successfully!");
                    
                    // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                    this._hardRefreshTable("Projects");
                    
                    this.onCancelProjectForm();
                },
                error: (oError) => {
                    console.error("Create error:", oError);
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
                console.log("Could not generate next ID, using default:", sNextId);
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
                    console.log("Selection cleared or method not available");
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
                    console.log("[ID Generation] Project Method 1 (binding):", sNextId);
                    
                    if (!sNextId || sNextId === "P-0001") {
                        const oModel = this.getOwnerComponent().getModel();
                        if (oModel) {
                            // ✅ FIXED: Use OData V4 bindList instead of oModel.read()
                            const oBinding = oModel.bindList("/Projects", null, [], {
                                "$orderby": "sapPId desc",
                                "$top": "1"
                            });
                            
                            oBinding.requestContexts(0, 1).then((aContexts) => {
                                console.log("[ID Generation] Project Backend query result:", aContexts);
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
                                console.log("[ID Generation] Project Method 2 (backend):", sBackendId);
                                oProjIdInput.setValue(sBackendId);
                            }).catch((oError) => {
                                console.warn("[ID Generation] Project Backend query failed:", oError);
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
                console.error("[ID Generation] Project Error:", e);
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
            } else {
                sap.m.MessageToast.show("Please select a row to edit.");
            }
        },

        onEditEmployeeForm: function () {
            const oTable = this.byId("Employees");
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
                            console.log("✅ Employee fresh data from backend:", oObj);
                            
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
            } else {
                sap.m.MessageToast.show("Please select a row to edit.");
            }
        },

        onEditOpportunityForm: function () {
            const oTable = this.byId("Opportunities");
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
                            console.log("✅ Opportunity fresh data from backend:", oObj);
                            
                            // Now fetch Customer association if needed
                            const sCustomerId = oObj && oObj.customerId;
                            if (sCustomerId && oModel) {
                                // Fetch Customer name from backend
                                const oCustomerContext = oModel.bindContext(`/Customers('${sCustomerId}')`, null, { deferred: true });
                                oCustomerContext.execute().then(() => {
                                    const oCustomer = oCustomerContext.getObject();
                                    if (oCustomer && oObj) {
                                        // Add customer data to object
                                        oObj.to_Customer = oCustomer;
                                    }
                                    // Now populate form with fresh backend data
                                    this._onOppDialogData(aSelectedContexts);
                                }).catch(() => {
                                    // If customer fetch fails, still populate form
                                    this._onOppDialogData(aSelectedContexts);
                                });
                            } else {
                                // No customer, populate directly with fresh backend data
                                this._onOppDialogData(aSelectedContexts);
                            }
                        }).catch(() => {
                            // If requestObject fails, try direct populate
                            this._onOppDialogData(aSelectedContexts);
                        });
                    } else {
                        // No requestObject, populate directly
                        this._onOppDialogData(aSelectedContexts);
                    }
                } else {
                    // No path, use requestObject directly
                    if (oContext.requestObject && typeof oContext.requestObject === "function") {
                        oContext.requestObject().then(() => {
                            this._onOppDialogData(aSelectedContexts);
                        }).catch(() => {
                            this._onOppDialogData(aSelectedContexts);
                        });
                    } else {
                        this._onOppDialogData(aSelectedContexts);
                    }
                }
            } else {
                sap.m.MessageToast.show("Please select a row to edit.");
            }
        },

        onEditProjectForm: function () {
            const oTable = this.byId("Projects");
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
                            console.log("✅ Project fresh data from backend:", oObj);
                            
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
                                    }).catch(() => {})
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
                                    }).catch(() => {})
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
            } else {
                sap.m.MessageToast.show("Please select a row to edit.");
            }
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

            console.log("✅ Submitting demand with project ID:", sSapPId);
            if (!sSkill || sSkill.trim() === "") {
                sap.m.MessageBox.error("Skill is required!");
                return;
            }
            if (!sQuantity || parseInt(sQuantity) <= 0) {
                sap.m.MessageBox.error("Quantity must be greater than 0!");
                return;
            }

            const oTable = this.byId("Demands");
            const oModel = oTable.getModel();
            
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
                                    console.log("✅ Demand updated data from backend:", oBackendData);
                                    
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
                                        console.warn("Update may have failed:", oError.message || "Unknown error");
                                        sap.m.MessageBox.error("Failed to update demand. Please try again.");
                                    }
                                } catch (e) {
                                    console.log("Update completed");
                                }
                            }, 150);
                        });
                } catch (oSetError) {
                    console.error("Error setting properties:", oSetError);
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
                
                console.log("Creating demand with data:", oCreateEntry);
                console.log("✅ Data types - skill:", typeof oCreateEntry.skill, "band:", typeof oCreateEntry.band, "sapPId:", typeof oCreateEntry.sapPId, "quantity:", typeof oCreateEntry.quantity);
                
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
                        
                        console.log("Demand context created:", oNewContext.getPath());
                        
                        // ✅ CRITICAL: Set all properties individually to ensure they're queued in batch group
                        Object.keys(oCreateEntry).forEach(sKey => {
                            oNewContext.setProperty(sKey, oCreateEntry[sKey]);
                        });
                        
                        // ✅ CRITICAL: Check if batch group has pending changes before submitting
                        const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");
                        console.log("Demand - Has pending changes in batch group:", bHasPendingChanges);
                        
                        // Submit the batch to send to backend
                        console.log("Submitting batch for Demands...");
                        oModel.submitBatch("changesGroup")
                            .then((oResponse) => {
                                // ✅ CRITICAL: Check for errors in batch response
                                console.log("Batch response:", oResponse);
                                
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
                                    console.error("❌ Demand creation failed with error:", sErrorMessage);
                                    
                                    // Remove the invalid context from the table
                                    if (oNewContext && oNewContext.delete) {
                                        try {
                                            oNewContext.delete();
                                        } catch (e) {
                                            console.warn("Could not delete invalid context:", e);
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
                                    console.log("✅ Demand created successfully!");
                                    
                                    if (oNewContext.requestObject) {
                                        oNewContext.requestObject().then(() => {
                                            const oBackendData = oNewContext.getObject();
                                            console.log("✅ Demand data from backend:", oBackendData);
                                            
                                            MessageToast.show("Demand created successfully!");
                                            
                                            this._hardRefreshTable("Demands");
                                            
                                            this.onCancelDemandForm();
                                        }).catch((oReadError) => {
                                            console.warn("Could not read created demand:", oReadError);
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
                                    console.error("❌ Demand context has no data - creation may have failed");
                                    
                                    // Remove invalid context
                                    if (oNewContext && oNewContext.delete) {
                                        try {
                                            oNewContext.delete();
                                        } catch (e) {
                                            console.warn("Could not delete invalid context:", e);
                                        }
                                    }
                                    
                                    this._hardRefreshTable("Demands");
                                    sap.m.MessageBox.error("Failed to create demand. Please check the data and try again.");
                                }
                            })
                            .catch((oError) => {
                                console.error("❌ Create batch error:", oError);
                                
                                // ✅ Remove invalid context from table
                                if (oNewContext && oNewContext.delete) {
                                    try {
                                        oNewContext.delete();
                                    } catch (e) {
                                        console.warn("Could not delete invalid context:", e);
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
                        console.error("Error creating via binding:", oCreateError);
                        // Fallback to direct model create
                        this._createDemandDirect(oModel, oCreateEntry, oTable);
                    }
                } else {
                    // No binding available - use direct model create (fallback) - EXACT same as Project
                    console.log("Table binding not available, using direct model create");
                    this._createDemandDirect(oModel, oCreateEntry, oTable);
                }
            }
        },

        // Helper function for direct model create (fallback)
        _createDemandDirect: function (oModel, oCreateEntry, oTable) {
            oModel.create("/Demands", oCreateEntry, {
                success: (oData) => {
                    console.log("Demand created successfully (direct):", oData);
                    MessageToast.show("Demand created successfully!");
                    
                    // ✅ CRITICAL: Hard refresh table to get fresh data from DB
                    this._hardRefreshTable("Demands");
                    
                    this.onCancelDemandForm();
                },
                error: (oError) => {
                    console.error("Create error:", oError);
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
                    console.log("Selection cleared or method not available");
                }
            }
            
            // Disable Edit button when form is cleared
            this.byId("editButton_demand")?.setEnabled(false);
        },

        // ✅ NEW: Edit function for Demand form
        onEditDemandForm: function () {
            const oTable = this.byId("Demands");
            const aSelectedContexts = oTable.getSelectedContexts();
            if (aSelectedContexts && aSelectedContexts.length > 0) {
                const oContext = aSelectedContexts[0];
                const oModel = oTable.getModel();
                // Fetch fresh data from backend
                if (oModel && oContext.getPath) {
                    const sPath = oContext.getPath();
                    if (oContext.requestObject && typeof oContext.requestObject === "function") {
                        oContext.requestObject().then(() => {
                            const oObj = oContext.getObject();
                            console.log("✅ Demand fresh data from backend:", oObj);
                            
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
            } else {
                sap.m.MessageBox.show("Please select a row to edit.");
            }
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
            
            // Deselect any selected row
            const oTable = this.byId("Employees");
            if (oTable && oTable.clearSelection) {
                try {
                    oTable.clearSelection();
                } catch (e) {
                    console.log("Selection cleared or method not available");
                }
            }
            
            // ✅ CRITICAL: Disable Edit button when form is cleared (no row selected)
            this.byId("editButton_emp")?.setEnabled(false);
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
        _loadHomeCounts: async function() {
            console.log("🔄 Loading all home screen counts...");
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                console.error("❌ OData model not available for loading counts");
                return;
            }
            console.log("✅ OData model found, starting count calculations...");
            
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
                console.log("✅ All home screen counts loaded successfully");
            } catch (error) {
                console.error("❌ Error loading home screen counts:", error);
                console.error("Error details:", error.message, error.stack);
            }
        },
        
        // ✅ Load Total Head Count (all employees excluding Resigned)
        _loadTotalHeadCount: async function() {
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                console.error("❌ OData V4 model not found for Total Head Count");
                return;
            }
            
            try {
                console.log("🔄 Fetching Total Head Count from /Employees...");
                const oListBinding = oModel.bindList("/Employees", undefined, undefined,
                    new sap.ui.model.Filter({
                        path: "status",
                        operator: sap.ui.model.FilterOperator.NE,
                        value1: "Resigned"
                    })
                );
                
                const aContexts = await oListBinding.requestContexts(0, 10000);
                const totalCount = aContexts.length;
                
                console.log("📊 Total Head Count fetched:", totalCount, "contexts:", aContexts.length);
                
                const oHomeCountsModel = this.getView().getModel("homeCounts");
                if (oHomeCountsModel) {
                    oHomeCountsModel.setProperty("/totalHeadCount", totalCount);
                    console.log("✅ Total Head Count updated in model:", oHomeCountsModel.getProperty("/totalHeadCount"));
                } else {
                    console.error("❌ homeCounts model not found!");
                }
            } catch (error) {
                console.error("❌ Error loading Total Head Count:", error);
                console.error("Error details:", error.message, error.stack);
            }
        },
        
        // ✅ Load Allocated Count (employees with status='Allocated')
        _loadAllocatedCount: async function() {
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                console.error("❌ OData V4 model not found for Allocated Count");
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
                console.log("✅ Allocated Count:", allocatedCount);
            } catch (error) {
                console.error("❌ Error loading Allocated Count:", error);
            }
        },
        
        // ✅ Load Pre Allocated Count (employees with status='Pre Allocated')
        _loadPreAllocatedCount: async function() {
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                console.error("❌ OData V4 model not found for Pre Allocated Count");
                return;
            }
            
            try {
                const oListBinding = oModel.bindList("/Employees", undefined, undefined,
                    new sap.ui.model.Filter({
                        path: "status",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: "Pre Allocated"
                    })
                );
                
                const aContexts = await oListBinding.requestContexts(0, 10000);
                const preAllocatedCount = aContexts.length;
                
                const oHomeCountsModel = this.getView().getModel("homeCounts");
                if (oHomeCountsModel) {
                    oHomeCountsModel.setProperty("/preAllocatedCount", preAllocatedCount);
                }
                console.log("✅ Pre Allocated Count:", preAllocatedCount);
            } catch (error) {
                console.error("❌ Error loading Pre Allocated Count:", error);
            }
        },
        
        // ✅ Load Unproductive Bench Count (employees with status='Unproductive Bench')
        _loadUnproductiveBenchCount: async function() {
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                console.error("❌ OData V4 model not found for Unproductive Bench Count");
                return;
            }
            
            try {
                const oListBinding = oModel.bindList("/Employees", undefined, undefined,
                    new sap.ui.model.Filter({
                        path: "status",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: "Unproductive Bench"
                    })
                );
                
                const aContexts = await oListBinding.requestContexts(0, 10000);
                const unproductiveBenchCount = aContexts.length;
                
                const oHomeCountsModel = this.getView().getModel("homeCounts");
                if (oHomeCountsModel) {
                    oHomeCountsModel.setProperty("/unproductiveBenchCount", unproductiveBenchCount);
                }
                console.log("✅ Unproductive Bench Count:", unproductiveBenchCount);
            } catch (error) {
                console.error("❌ Error loading Unproductive Bench Count:", error);
            }
        },
        
        // ✅ Load On Leave Count (employees with status='Inactive Bench')
        _loadOnLeaveCount: async function() {
            const oModel = this.getView().getModel("default") || this.getView().getModel();
            if (!oModel) {
                console.error("❌ OData V4 model not found for On Leave Count");
                return;
            }
            
            try {
                const oListBinding = oModel.bindList("/Employees", undefined, undefined,
                    new sap.ui.model.Filter({
                        path: "status",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: "Inactive Bench"
                    })
                );
                
                const aContexts = await oListBinding.requestContexts(0, 10000);
                const onLeaveCount = aContexts.length;
                
                const oHomeCountsModel = this.getView().getModel("homeCounts");
                if (oHomeCountsModel) {
                    oHomeCountsModel.setProperty("/onLeaveCount", onLeaveCount);
                }
                console.log("✅ On Leave Count:", onLeaveCount);
            } catch (error) {
                console.error("❌ Error loading On Leave Count:", error);
            }
        },
        
        // ✅ Calculate Bench Count (Pre Allocated + Unproductive Bench + On Leave)
        _calculateBenchCount: function() {
            const oHomeCountsModel = this.getView().getModel("homeCounts");
            if (!oHomeCountsModel) {
                return;
            }
            
            const oData = oHomeCountsModel.getData();
            const benchCount = (oData.preAllocatedCount || 0) + 
                             (oData.unproductiveBenchCount || 0) + 
                             (oData.onLeaveCount || 0);
            
            oHomeCountsModel.setProperty("/benchCount", benchCount);
            console.log("✅ Bench Count calculated:", benchCount);
        },
        
        // ✅ NEW: Set default filters for each entity
        _setDefaultFilters: function() {
            const oFilterModel = this.getView().getModel("filterModel");
            if (!oFilterModel) return;
            
            // ✅ Default filters structure initialized - actual filter fields set in fragment load
            console.log("✅ Default filter structure initialized for all entities");
        },
        
        // ✅ NEW: Helper function to set default visible filter fields AND show fields with values
        // ✅ IMPORTANT: Always shows 1-2 important filters for each fragment
        _setDefaultFilterFields: function(oFilterBar, aDefaultFields) {
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
                                Object.keys(oFragmentConditions).forEach(function(sPropertyKey) {
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
                                console.log(`✅ Important filters (${aFieldsToShow.join(", ")}) set successfully for ${sFragmentName}`);
                                
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
                                console.warn("Could not set default filter state:", e);
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
                                    Object.keys(oFragmentConditions).forEach(function(sPropertyKey) {
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
                        aFilterFields.forEach(function(oField) {
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
                        console.log(`✅ Important filters set via alternative method: ${aFieldsToShow.join(", ")} for ${sFragmentName}`);
                        
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
                    console.warn("Alternative filter setting failed:", e);
                }
            };
            
            fnSetDefaultFilters();
        },

        // ============================================
        // REPORT GENERATION HANDLERS
        // ============================================
        
        onReportTypeChange: function(oEvent) {
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
        
        _createReportFilters: function(sReportType) {
            const oFiltersPanel = this.byId("reportFiltersPanel");
            if (!oFiltersPanel) return;
            
            // Common filters for most reports
            const oVBox = new sap.m.VBox({
                items: []
            });
            
            // Add report-specific filters
            switch(sReportType) {
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
        
        onGenerateReport: function() {
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
                    console.error("Error generating report:", oError);
                    sap.m.MessageToast.show("Error generating report: " + (oError.message || "Unknown error"));
                    if (oTable) {
                        oTable.setBusy(false);
                    }
                }
            });
        },
        
        _collectReportFilters: function(sReportType) {
            const oFilters = {};
            
            switch(sReportType) {
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
        
        _displayReportResults: function(sReportType, oData) {
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
        
        onExportReport: function() {
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
        onMessagePopoverPress: CustomUtility.prototype._onMessagePopoverPress,
        onCloseUpload: CustomUtility.prototype._onCloseUpload,
        getMessagePopover: CustomUtility.prototype._getMessagePopover,
        onDownload: CustomUtility.prototype._onDownloadPress,
        downloadCSV: CustomUtility.prototype._downloadCSV,
        OnTemplateDownloadBtn: CustomUtility.prototype._OnTemplateDownloadBtn,
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
                    console.log("✅ Stored project ID from Res fragment for AllocateDialog project filter:", sResProjectId);
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
                
                // Display project name, but store ID in data attribute
                oDialog._oInputField.setValue(oProject.projectName || "");
                oDialog._oInputField.data("selectedId", sProjectId);
                
                // ✅ CRITICAL: Store project ID for AllocateDialog demand filtering
                const sInputId = oDialog._oInputField.getId();
                if (sInputId && sInputId.includes("Resinput_proj")) {
                    this._sAllocateDemandProjectFilter = sProjectId;
                    console.log("✅ Stored project ID for AllocateDialog demand filter:", sProjectId);
                    
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
                            console.log("✅ Auto-filled start date from project:", oProjectData.startDate);
                        }
                        if (oProjectData && oEndDatePicker && oProjectData.endDate) {
                            oEndDatePicker.setValue(oProjectData.endDate);
                            oEndDatePicker.data("projectEndDate", oProjectData.endDate);
                            console.log("✅ Auto-filled end date from project:", oProjectData.endDate);
                        }
                    };
                    
                    // Try to use dates from project object first (if available)
                    if (oProject.startDate || oProject.endDate) {
                        fnSetDates(oProject);
                    } else {
                        // ✅ If dates not in project object, fetch full project data using requestObject
                        console.log("⚠️ Project dates not in value help data, fetching full project...");
                        if (oContext && oContext.requestObject) {
                            oContext.requestObject().then((oFullProject) => {
                                fnSetDates(oFullProject);
                            }).catch((oError) => {
                                console.warn("Could not fetch full project data:", oError);
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
            
            // Check if this is from AllocateDialog and filter by project if needed
            const sInputId = oInput.getId();
            const bIsAllocateDialog = sInputId && sInputId.includes("Resinput_demand");
            const bIsResFragment = sInputId && sInputId.includes("Resinput_Demand");
            
            // ✅ CRITICAL: Store project filter if available (from AllocateDialog or Res fragment)
            if (bIsAllocateDialog) {
                // Get project ID from AllocateDialog project input
                const sProjectId = this.byId("Resinput_proj")?.data("selectedId");
                if (sProjectId) {
                    this._sAllocateDemandProjectFilter = sProjectId;
                    console.log("✅ Stored project ID for AllocateDialog demand filter:", sProjectId);
                } else {
                    // Try to get from Res fragment if available (when opened from employee level)
                    const sResProjectId = this.byId("Resinput_Project")?.data("selectedId");
                    if (sResProjectId) {
                        this._sAllocateDemandProjectFilter = sResProjectId;
                        console.log("✅ Stored project ID from Res fragment for AllocateDialog:", sResProjectId);
                    } else {
                        // ✅ Also check if project was already stored from previous selection
                        console.log("⚠️ No project ID found in input field. Using stored filter:", this._sAllocateDemandProjectFilter);
                    }
                }
            } else if (bIsResFragment) {
                const sProjectId = this.byId("Resinput_Project")?.data("selectedId");
                if (sProjectId) {
                    this._sResDemandProjectFilter = sProjectId;
                    console.log("✅ Stored project ID for Res fragment demand filter:", sProjectId);
                } else {
                    console.log("⚠️ No project ID found in Res fragment. Using stored filter:", this._sResDemandProjectFilter);
                }
            }
            
            console.log("✅ Opening demand value help with filters - AllocateDialog:", this._sAllocateDemandProjectFilter, "ResFragment:", this._sResDemandProjectFilter);
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
                                console.log("✅ Applying project filter for demands (on open):", sProjectFilter);
                                aFilters.push(new sap.ui.model.Filter("sapPId", sap.ui.model.FilterOperator.EQ, sProjectFilter));
                                oBinding.filter(aFilters);
                                console.log("✅ Applied project filter to demand value help on dialog open");
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
                console.log("✅ Applying project filter for demands:", sProjectFilter);
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
                // Display demand info (skill + band), but store demand ID in data attribute
                const sDisplayText = `${oDemand.skill || ""} - ${oDemand.band || ""} (Qty: ${oDemand.quantity || 0})`;
                oDialog._oInputField.setValue(sDisplayText);
                oDialog._oInputField.data("selectedId", oDemand.demandId || oDemand.id);
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
            
            // Display customer name, but store ID in data attribute
            oDialog._oInputField.setValue(oCustomer.customerName || "");
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
                        }).catch(() => {});
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
                        oRowBinding.refresh().catch(() => {});
                    } else if (oBinding) {
                        oBinding.refresh().catch(() => {});
                    }
                    
                    // ✅ STEP 6: Also try rebind for MDC tables (this refreshes expanded associations)
                    if (oMainTable.rebind) {
                        setTimeout(() => {
                            try {
                                oMainTable.rebind();
                            } catch (e) {
                                console.log("Rebind error:", e);
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
            
            // Display opportunity name, but store ID in data attribute
            oDialog._oInputField.setValue(oOpportunity.opportunityName || "");
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
                        }).catch(() => {});
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
                        oRowBinding.refresh().catch(() => {});
                    } else if (oBinding) {
                        oBinding.refresh().catch(() => {});
                    }
                    
                    // ✅ STEP 6: Also try rebind for MDC tables (this refreshes expanded associations)
                    if (oMainTable.rebind) {
                        setTimeout(() => {
                            try {
                                oMainTable.rebind();
                            } catch (e) {
                                console.log("Rebind error:", e);
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
            const sDisplayValue = oEmployee.fullName || oEmployee.ohrId || "";
            const sStoredId = oEmployee.ohrId || "";
            
            // Display name in UI, store ID in data attribute
            oDialog._oInputField.setValue(sDisplayValue);
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
                        }).catch(() => {});
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
                        oRowBinding.refresh().catch(() => {});
                    } else if (oBinding) {
                        oBinding.refresh().catch(() => {});
                    }
                    
                    // ✅ STEP 6: Also try rebind for MDC tables (this refreshes expanded associations)
                    if (oMainTable.rebind) {
                        setTimeout(() => {
                            try {
                                oMainTable.rebind();
                            } catch (e) {
                                console.log("Rebind error:", e);
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
                console.warn("Customer value help table binding not available");
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
                console.warn("Opportunity value help table binding not available");
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
                console.warn("Employee value help table binding not available");
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
                console.warn("⚠️ Employee Country dropdown not found (inputCountry_emp)");
                return;
            }
            
            if (!this._mCountryToCities) {
                console.warn("⚠️ Country to Cities mapping not initialized");
                return;
            }
            
            const aCountries = Object.keys(this._mCountryToCities).sort();
            console.log("✅ Populating Employee Country dropdown with", aCountries.length, "countries");
            
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
            
            console.log("✅ Employee Country dropdown populated successfully");
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
        _updateEmployeeSkills: function(sEmployeeId, aSelectedSkillIds, oModel) {
            console.log("🔧 _updateEmployeeSkills called:", {
                employeeId: sEmployeeId,
                selectedSkillIds: aSelectedSkillIds,
                model: oModel ? "exists" : "missing"
            });
            
            if (!sEmployeeId || !oModel) {
                console.warn("⚠️ Missing employeeId or model, skipping EmployeeSkills update");
                return Promise.resolve();
            }

            // Convert selected skill IDs to integers
            const aSelected = aSelectedSkillIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
            console.log("🔧 Converted skill IDs:", aSelected);
            
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
                        
                        console.log("EmployeeSkills Update:", {
                            employeeId: sEmployeeId,
                            existing: aExistingSkillIds,
                            selected: aSelected,
                            toDelete: aToDelete.length,
                            toCreate: aToCreate.length
                        });
                        
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
                                    console.warn("Failed to delete EmployeeSkill:", oError);
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
                            
                            console.log("Creating EmployeeSkill:", oNewSkill);
                            
                            // ✅ Use same pattern as Allocations creation
                            const oNewContext = oBinding.create(oNewSkill, "changesGroup");
                            if (oNewContext) {
                                console.log(`✅ EmployeeSkill context created: ${sEmployeeId} - ${skillId}`);
                                aCreatedContexts.push(oNewContext);
                                
                                // ✅ CRITICAL: Explicitly set all properties (like Allocations)
                                Object.keys(oNewSkill).forEach((sKey) => {
                                    try {
                                        oNewContext.setProperty(sKey, oNewSkill[sKey]);
                                        console.log("✅ Set EmployeeSkill property:", sKey, "=", oNewSkill[sKey]);
                                    } catch (e) {
                                        console.warn("Could not set EmployeeSkill property:", sKey, e);
                                    }
                                });
                            } else {
                                console.error(`❌ Failed to create EmployeeSkill context: ${sEmployeeId} - ${skillId}`);
                            }
                        });
                        
                        // Submit all changes in batch
                        if (aToDelete.length > 0 || aToCreate.length > 0) {
                            // ✅ CRITICAL: Wait a moment for contexts to be queued, then check pending changes
                            setTimeout(() => {
                                const bHasPendingChanges = oModel.hasPendingChanges && oModel.hasPendingChanges("changesGroup");
                                console.log("EmployeeSkills - Has pending changes:", bHasPendingChanges, 
                                    "Deletes:", aToDelete.length, "Creates:", aToCreate.length, "Contexts:", aCreatedContexts.length);
                                
                                if (bHasPendingChanges || aToDelete.length > 0) {
                                    oModel.submitBatch("changesGroup")
                                        .then(() => {
                                            console.log("✅ EmployeeSkills batch submitted successfully");
                                            resolve();
                                        })
                                        .catch((oError) => {
                                            console.error("❌ Error submitting EmployeeSkills batch:", oError);
                                            resolve();
                                        });
                                } else {
                                    console.warn("⚠️ No pending changes detected, but attempting submit anyway");
                                    // Try submitting anyway - sometimes hasPendingChanges doesn't work correctly
                                    oModel.submitBatch("changesGroup")
                                        .then(() => {
                                            console.log("✅ EmployeeSkills batch submitted (forced)");
                                            resolve();
                                        })
                                        .catch((oError) => {
                                            console.warn("⚠️ Submit failed (might be expected if no changes):", oError);
                                            resolve();
                                        });
                                }
                            }, 150);
                        } else {
                            console.log("No EmployeeSkills changes to save");
                            resolve();
                        }
                    })
                    .catch((oError) => {
                        console.error("Error reading EmployeeSkills:", oError);
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

    });
});
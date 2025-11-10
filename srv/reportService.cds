// RESOURCE ALLOCATION SYSTEM - REPORT SERVICE v7.1
// Updated to align with schema v2.0

using {reports} from '../db/reports/reportViews';

service ReportService @(path: '/reports') {

  // ============================================
  // MANDATORY REPORT ENTITIES
  // ============================================

  @readonly
  entity EmployeeBenchReport as projection on reports.EmployeeBenchReportView;

  @readonly
  entity EmployeeProbableReleaseReport as projection on reports.EmployeeProbableReleaseView;

  @readonly
  entity RevenueForecastReport as projection on reports.RevenueForecastView;

  @readonly
  entity EmployeeAllocationReport as projection on reports.EmployeeAllocationReportView;

  @readonly
  entity EmployeeSkillReport as projection on reports.EmployeeSkillReportView;

  @readonly
  entity ProjectsNearingCompletionReport as projection on reports.ProjectsNearingCompletionView;

  // ============================================
  // ADDITIONAL REPORT ENTITIES
  // ============================================

  @readonly
  entity SupervisorTeamAllocationReport as projection on reports.SupervisorTeamAllocationView;

  @readonly
  entity CustomerProjectPortfolioReport as projection on reports.CustomerProjectPortfolioView;

  @readonly
  entity UtilizationTrendReport as projection on reports.UtilizationTrendView;

  @readonly
  entity SkillsGapAnalysisReport as projection on reports.SkillsGapAnalysisView;

  // ============================================
  // REPORT GENERATION FUNCTIONS
  // ============================================

  /**
   * Generate Employee Bench Report
   * Returns available resources with filtering options
   */
  function generateEmployeeBenchReport(
    bandFilter : array of String,
    employeeTypeFilter : array of String,
    skillFilter : array of String,
    minDaysOnBench : Integer
  ) returns {
    totalBenchCount : Integer;
    reportData : array of {
      employeeName : String;
      band : String;
      employeeType : String;
      location : String;
      skills : String;
      daysOnBench : Integer;
      supervisor : String;
      email : String;
    };
    summary : {
      benchByBand : array of { band : String; count : Integer; };
      benchByEmployeeType : array of { employeeType : String; count : Integer; };
      avgDaysOnBench : Decimal;
    };
  };

  /**
   * Generate Probable Release Report
   * Predicts upcoming resource availability (30/60/90 days)
   */
  function generateProbableReleaseReport(
    releaseWindow : String,  // '30 Days', '60 Days', '90 Days', 'All'
    bandFilter : array of String,
    skillFilter : array of String
  ) returns {
    totalEmployeesReleasing : Integer;
    reportData : array of {
      employeeName : String;
      band : String;
      currentProject : String;
      customer : String;
      releaseDate : String;
      daysToRelease : Integer;
      skills : String;
      location : String;
    };
    summary : {
      releasesByWindow : array of { window : String; count : Integer; };
      releasesByBand : array of { band : String; count : Integer; };
      avgDaysToRelease : Decimal;
    };
  };

  /**
   * Generate Revenue Forecast Report
   * Financial planning and forecasting by period
   */
  function generateRevenueForecastReport(
    startMonth : String,           // 'YYYY-MM'
    endMonth : String,             // 'YYYY-MM'
    customerFilter : array of String,
    projectTypeFilter : array of String
  ) returns {
    totalRevenue : Decimal;
    weightedRevenue : Decimal;
    reportData : array of {
      month : String;
      projectCount : Integer;
      totalRevenue : Decimal;
      weightedRevenue : Decimal;
      byProjectType : array of {
        projectType : String;
        revenue : Decimal;
        count : Integer;
      };
      byCustomer : array of {
        customer : String;
        revenue : Decimal;
        projectCount : Integer;
      };
    };
    summary : {
      highestRevenueMonth : String;
      highestRevenueAmount : Decimal;
      avgMonthlyRevenue : Decimal;
    };
  };

  /**
   * Generate Employee Allocation Report
   * Current workforce utilization metrics
   */
  function generateEmployeeAllocationReport(
    includeResigned : Boolean,
    bandFilter : array of String
  ) returns {
    totalEmployees : Integer;
    allocated : Integer;
    bench : Integer;
    utilizationPercentage : Decimal;
    reportData : array of {
      employeeName : String;
      band : String;
      employeeType : String;
      status : String;
      currentProject : String;
      customer : String;
      allocationStartDate : String;
      allocationEndDate : String;
      daysRemaining : Integer;
      utilizationPercentage : Integer;
    };
    summary : {
      utilizationByBand : array of {
        band : String;
        allocated : Integer;
        total : Integer;
        percentage : Decimal;
      };
      utilizationByEmployeeType : array of {
        employeeType : String;
        allocated : Integer;
        total : Integer;
        percentage : Decimal;
      };
      utilizationByProjectType : array of {
        projectType : String;
        count : Integer;
        percentage : Decimal;
      };
    };
  };

  /**
   * Generate Employee Skill Report
   * Skills inventory and availability analysis
   */
  function generateEmployeeSkillReport(
    skillCategoryFilter : array of String,
    availabilityFilter : String  // 'All', 'Available', 'Allocated'
  ) returns {
    totalSkills : Integer;
    totalEmployeesWithSkills : Integer;
    reportData : array of {
      skillName : String;
      category : String;
      totalEmployees : Integer;
      availableEmployees : Integer;
      allocatedEmployees : Integer;
      availabilityPercentage : Decimal;
    };
    summary : {
      skillsByCategory : array of {
        category : String;
        count : Integer;
        avgAvailability : Decimal;
      };
      criticalSkillsShortage : array of {
        skillName : String;
        demand : Integer;
        supply : Integer;
        gap : Integer;
      };
    };
  };

  /**
   * Generate Projects Nearing Completion Report
   * Project closure planning and resource release tracking
   */
  function generateProjectsNearingCompletionReport(
    completionWindow : String,  // '30 Days', '60 Days', '90 Days', 'All'
    projectTypeFilter : array of String
  ) returns {
    totalProjectsNearing : Integer;
    reportData : array of {
      projectReference : String;
      projectName : String;
      projectType : String;
      customer : String;
      completionDate : String;
      daysToCompletion : Integer;
      completionRisk : String;
      employeeCount : Integer;
      projectManager : String;
      projectManagerEmail : String;
    };
    summary : {
      byCriticality : array of {
        riskLevel : String;
        count : Integer;
        totalEmployees : Integer;
      };
      byProjectType : array of {
        projectType : String;
        count : Integer;
      };
      totalEmployeesToBeReleased : Integer;
    };
  };

  /**
   * Generate Supervisor Team Allocation Report
   * Team management view for supervisors
   */
  function generateSupervisorTeamAllocationReport(
    supervisorId : String
  ) returns {
    supervisorName : String;
    supervisorEmail : String;
    totalTeamMembers : Integer;
    allocatedCount : Integer;
    benchCount : Integer;
    teamUtilization : Decimal;
    reportData : array of {
      employeeName : String;
      band : String;
      employeeType : String;
      status : String;
      currentProject : String;
      allocationPercentage : Integer;
      daysRemainingOnProject : Integer;
    };
    summary : {
      byStatus : array of { status : String; count : Integer; };
      byProjectType : array of {
        projectType : String;
        count : Integer;
      };
    };
  };

  /**
   * Generate Customer Project Portfolio Report
   * Customer engagement overview and project tracking
   */
  function generateCustomerProjectPortfolioReport(
    customerFilter : array of String,
    verticalFilter : array of String
  ) returns {
    totalCustomers : Integer;
    totalActiveProjects : Integer;
    totalEngagedEmployees : Integer;
    reportData : array of {
      customerName : String;
      customerStatus : String;
      vertical : String;
      totalProjects : Integer;
      activeProjects : Integer;
      plannedProjects : Integer;
      totalRevenue : Decimal;
      engagedEmployees : Integer;
      projects : array of {
        projectReference : String;
        projectName : String;
        projectType : String;
        status : String;
        startDate : String;
        endDate : String;
      };
    };
  };

  /**
   * Generate Utilization Trend Report
   * Historical utilization analysis and trends
   */
  function generateUtilizationTrendReport(
    startDate : String,      // 'YYYY-MM-DD'
    endDate : String,        // 'YYYY-MM-DD'
    bandFilter : array of String,
    granularity : String    // 'Daily', 'Weekly', 'Monthly'
  ) returns {
    reportData : array of {
      period : String;
      totalEmployees : Integer;
      allocatedEmployees : Integer;
      benchEmployees : Integer;
      utilizationPercentage : Decimal;
      byBand : array of {
        band : String;
        total : Integer;
        allocated : Integer;
        percentage : Decimal;
      };
    };
    summary : {
      avgUtilization : Decimal;
      peakUtilizationPeriod : String;
      lowestUtilizationPeriod : String;
      trend : String;  // 'Increasing', 'Decreasing', 'Stable'
    };
  };

  /**
   * Generate Skills Gap Analysis Report
   * Identify training and hiring needs
   */
  function generateSkillsGapAnalysisReport(
    projectTypeFilter : array of String,
    priorityThreshold : Integer  // Minimum gap count to report
  ) returns {
    criticalGaps : array of {
      skillName : String;
      skillCategory : String;
      requiredForBand : String;
      totalDemand : Integer;
      currentSupply : Integer;
      gap : Integer;
      impactedProjects : Integer;
      recommendations : String;
    };
    summary : {
      totalCriticalSkillGaps : Integer;
      topMissingSkills : array of {
        skillName : String;
        gap : Integer;
      };
      topSurplusSkills : array of {
        skillName : String;
        surplus : Integer;
      };
      trainingPriority : array of {
        skillName : String;
        investmentLevel : String;  // 'High', 'Medium', 'Low'
      };
    };
  };

  /**
   * Generate Employee Assignment History Report
   * Track employee project experience and progression
   */
  function generateEmployeeAssignmentHistoryReport(
    employeeId : String,
    limit : Integer
  ) returns {
    employeeName : String;
    totalAssignments : Integer;
    totalProjectsWorked : Integer;
    avgProjectDuration : Decimal;
    reportData : array of {
      projectReference : String;
      projectName : String;
      customer : String;
      projectType : String;
      startDate : String;
      endDate : String;
      durationMonths : Integer;
      allocationPercentage : Integer;
      status : String;
    };
    summary : {
      skillsDeveloped : array of String;
      industriesExperienced : array of String;
      averageAllocationPercentage : Decimal;
      projectTypeDistribution : array of {
        projectType : String;
        count : Integer;
        percentage : Decimal;
      };
    };
  };

  /**
   * Utility function to export report as CSV
   */
  function exportReportToCSV(
    reportType : String,
    filters : String
  ) returns String;

  /**
   * Utility function to schedule report generation
   */
  function scheduleReportGeneration(
    reportType : String,
    frequency : String,      // 'Daily', 'Weekly', 'Monthly', 'Quarterly'
    recipients : array of String,
    filters : String
  ) returns {
    scheduleId : String;
    status : String;
    nextGenerationDate : String;
  };

}


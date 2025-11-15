// ============================================
// ANNOTATIONS FOR VALUE HELP
// ============================================
// This file contains annotations to link enum fields to Code Lists
// and associations to Value Lists for OData-driven value help

using {db} from './schema';

// ============================================
// PHASE 1: CODE LIST ANNOTATIONS FOR ENUMS
// ============================================

annotate db.Customer with {
    status @Common.Text : db.CustomerStatuses.name
           @Common.TextArrangement : #TextOnly
           @sap.common.CodeList.StandardCodeList : 'CustomerStatuses';
    
    vertical @Common.Text : db.Verticals.name
             @Common.TextArrangement : #TextOnly
             @sap.common.CodeList.StandardCodeList : 'Verticals';
}

annotate db.Opportunity with {
    probability @Common.Text : db.Probabilities.name
                @Common.TextArrangement : #TextOnly
                @sap.common.CodeList.StandardCodeList : 'Probabilities';
    
    Stage @Common.Text : db.OpportunityStages.name
          @Common.TextArrangement : #TextOnly
          @sap.common.CodeList.StandardCodeList : 'OpportunityStages';
}

annotate db.Project with {
    projectType @Common.Text : db.ProjectTypes.name
                @Common.TextArrangement : #TextOnly
                @sap.common.CodeList.StandardCodeList : 'ProjectTypes';
    
    status @Common.Text : db.ProjectStatuses.name
           @Common.TextArrangement : #TextOnly
           @sap.common.CodeList.StandardCodeList : 'ProjectStatuses';
    
    SOWReceived @Common.Text : db.SowOptions.name
                @Common.TextArrangement : #TextOnly
                @sap.common.CodeList.StandardCodeList : 'SowOptions';
    
    POReceived @Common.Text : db.PoOptions.name
               @Common.TextArrangement : #TextOnly
               @sap.common.CodeList.StandardCodeList : 'PoOptions';
}

annotate db.Employee with {
    gender @Common.Text : db.Genders.name
           @Common.TextArrangement : #TextOnly
           @sap.common.CodeList.StandardCodeList : 'Genders';
    
    employeeType @Common.Text : db.EmployeeTypes.name
                 @Common.TextArrangement : #TextOnly
                 @sap.common.CodeList.StandardCodeList : 'EmployeeTypes';
    
    band @Common.Text : db.EmployeeBands.name
         @Common.TextArrangement : #TextOnly
         @sap.common.CodeList.StandardCodeList : 'EmployeeBands';
    
    status @Common.Text : db.EmployeeStatuses.name
           @Common.TextArrangement : #TextOnly
           @sap.common.CodeList.StandardCodeList : 'EmployeeStatuses';
}

annotate db.EmployeeProjectAllocation with {
    status @Common.Text : db.AllocationStatuses.name
           @Common.TextArrangement : #TextOnly
           @sap.common.CodeList.StandardCodeList : 'AllocationStatuses';
}

// ============================================
// PHASE 2: VALUE LIST ANNOTATIONS FOR ASSOCIATIONS
// ============================================

annotate db.Opportunity with {
    customerId @Common.Text : to_Customer.customerName
               @Common.TextArrangement : #TextFirst
               @Common.ValueList : {
                   Label : 'Customer',
                   CollectionPath : 'Customers',
                   Parameters : [
                       {
                           $Type : 'Common.ValueListParameterInOut',
                           ValueListProperty : 'SAPcustId',
                           LocalDataProperty : customerId
                       },
                       {
                           $Type : 'Common.ValueListParameterDisplayOnly',
                           ValueListProperty : 'customerName'
                       }
                   ]
               };
}

annotate db.Project with {
    oppId @Common.Text : to_Opportunity.opportunityName
          @Common.TextArrangement : #TextFirst
          @Common.ValueList : {
              Label : 'Opportunity',
              CollectionPath : 'Opportunities',
              Parameters : [
                  {
                      $Type : 'Common.ValueListParameterInOut',
                      ValueListProperty : 'sapOpportunityId',
                      LocalDataProperty : oppId
                  },
                  {
                      $Type : 'Common.ValueListParameterDisplayOnly',
                      ValueListProperty : 'opportunityName'
                  }
              ]
          };
    
    gpm @Common.Text : to_GPM.fullName
        @Common.TextArrangement : #TextFirst
        @Common.ValueList : {
            Label : 'GPM',
            CollectionPath : 'Employees',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    ValueListProperty : 'ohrId',
                    LocalDataProperty : gpm
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'fullName'
                }
            ]
        };
}

annotate db.Demand with {
    sapPId @Common.Text : to_Project.projectName
           @Common.TextArrangement : #TextFirst
           @Common.ValueList : {
               Label : 'Project',
               CollectionPath : 'Projects',
               Parameters : [
                   {
                       $Type : 'Common.ValueListParameterInOut',
                       ValueListProperty : 'sapPId',
                       LocalDataProperty : sapPId
                   },
                   {
                       $Type : 'Common.ValueListParameterDisplayOnly',
                       ValueListProperty : 'projectName'
                   }
               ]
           };
}

annotate db.Employee with {
    supervisorOHR @Common.Text : to_Supervisor.fullName
                  @Common.TextArrangement : #TextFirst
                  @Common.ValueList : {
                      Label : 'Supervisor',
                      CollectionPath : 'Employees',
                      Parameters : [
                          {
                              $Type : 'Common.ValueListParameterInOut',
                              ValueListProperty : 'ohrId',
                              LocalDataProperty : supervisorOHR
                          },
                          {
                              $Type : 'Common.ValueListParameterDisplayOnly',
                              ValueListProperty : 'fullName'
                          }
                      ]
                  };
}

annotate db.EmployeeProjectAllocation with {
    employeeId @Common.Text : to_Employee.fullName
               @Common.TextArrangement : #TextFirst
               @Common.ValueList : {
                   Label : 'Employee',
                   CollectionPath : 'Employees',
                   Parameters : [
                       {
                           $Type : 'Common.ValueListParameterInOut',
                           ValueListProperty : 'ohrId',
                           LocalDataProperty : employeeId
                       },
                       {
                           $Type : 'Common.ValueListParameterDisplayOnly',
                           ValueListProperty : 'fullName'
                       }
                   ]
               };
    
    projectId @Common.Text : to_Project.projectName
              @Common.TextArrangement : #TextFirst
              @Common.ValueList : {
                  Label : 'Project',
                  CollectionPath : 'Projects',
                  Parameters : [
                      {
                          $Type : 'Common.ValueListParameterInOut',
                          ValueListProperty : 'sapPId',
                          LocalDataProperty : projectId
                      },
                      {
                          $Type : 'Common.ValueListParameterDisplayOnly',
                          ValueListProperty : 'projectName'
                      }
                  ]
              };
    
    demandId @Common.Text : to_Demand.demandId
             @Common.TextArrangement : #TextFirst
             @Common.ValueList : {
                 Label : 'Demand',
                 CollectionPath : 'Demands',
                 Parameters : [
                     {
                         $Type : 'Common.ValueListParameterInOut',
                         ValueListProperty : 'demandId',
                         LocalDataProperty : demandId
                     }
                 ]
             };
}

// ============================================
// PHASE 3: DEPENDENT VALUE LISTS - COUNTRY/CITY
// ============================================

annotate db.Employee with {
    country @Common.Text : to_Country.name
            @Common.TextArrangement : #TextFirst
            @Common.ValueList : {
                Label : 'Country',
                CollectionPath : 'Countries',
                Parameters : [
                    {
                        $Type : 'Common.ValueListParameterInOut',
                        ValueListProperty : 'code',
                        LocalDataProperty : country
                    },
                    {
                        $Type : 'Common.ValueListParameterDisplayOnly',
                        ValueListProperty : 'name'
                    }
                ]
            };
    
    city @Common.Text : to_City.name
         @Common.TextArrangement : #TextFirst
         @Common.ValueList : {
             Label : 'City',
             CollectionPath : 'Cities',
             Parameters : [
                 {
                     $Type : 'Common.ValueListParameterInOut',
                     ValueListProperty : 'code',
                     LocalDataProperty : city
                 },
                 {
                     $Type : 'Common.ValueListParameterDisplayOnly',
                     ValueListProperty : 'name'
                 },
                 // ✅ DEPENDENT FILTERING: Only show cities of selected country
                 {
                     $Type : 'Common.ValueListParameterIn',
                     LocalDataProperty : country,
                     ValueListProperty : 'countryCode'
                 }
             ]
         };
}

// ============================================
// PHASE 4: DEPENDENT VALUE LISTS - BAND/DESIGNATION
// ============================================

annotate db.Employee with {
    role @Common.Text : to_Designation.name
         @Common.TextArrangement : #TextFirst
         @Common.ValueList : {
             Label : 'Designation',
             CollectionPath : 'BandDesignations',
             Parameters : [
                 {
                     $Type : 'Common.ValueListParameterInOut',
                     ValueListProperty : 'code',
                     LocalDataProperty : role
                 },
                 {
                     $Type : 'Common.ValueListParameterDisplayOnly',
                     ValueListProperty : 'name'
                 },
                 // ✅ DEPENDENT FILTERING: Only show designations for selected band
                 {
                     $Type : 'Common.ValueListParameterIn',
                     LocalDataProperty : band,
                     ValueListProperty : 'bandCode'
                 }
             ]
         };
}


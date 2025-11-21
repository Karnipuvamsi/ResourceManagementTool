# Customer Cascading Dropdowns Implementation Documentation

## Overview
This document describes the implementation of cascading dropdowns (Country → State → City) for the Customer form in the Resource Management Tool application.

## What Was Implemented

### 1. Database Schema Changes (`db/schema.cds`)
- **Replaced text fields with ID fields**:
  - `state` (String) → `custStateId` (Integer)
  - `country` (String) → `custCountryId` (Integer)
  - Added `custCityId` (Integer)
- **Activated master data entities**:
  - `CustomerCountries` - Country master data
  - `CustomerStates` - State master data (filtered by country)
  - `CustomerCities` - City master data (filtered by state and country)
- **Added associations**:
  - `to_CustCountry`: Customer → CustomerCountries
  - `to_CustState`: Customer → CustomerStates
  - `to_CustCity`: Customer → CustomerCities

### 2. Service Layer (`srv/service.cds`)
- Exposed master data entities as OData projections:
  - `CustomerCountries`
  - `CustomerStates`
  - `CustomerCities`

### 3. Frontend UI Changes (`app/webapp/view/fragments/Customers.fragment.xml`)
- **Replaced Input fields with ComboBoxes**:
  - Country ComboBox: Bound to `CustomerCountries` collection
  - State ComboBox: Dynamically bound based on selected country
  - City ComboBox: Dynamically bound based on selected state
- **Two-way data binding**:
  - All ComboBoxes bound to `customerModel` for form state management
  - `selectedKey` bound to respective model properties

### 4. Controller Logic (`app/webapp/controller/Home.controller.js`)

#### Event Handlers
- **`onCountryChange`**: 
  - Filters states by selected country
  - Resets state and city selections
  - Enables/disables dependent dropdowns
  - Updates `customerModel` with selected country ID

- **`onStateChange`**:
  - Filters cities by selected state and country
  - Resets city selection
  - Updates `customerModel` with selected state ID

- **`onCityChange`**:
  - Updates `customerModel` with selected city ID

#### Submit Function (`onSubmitCustomer`)
- **Reads values directly from ComboBoxes**:
  - Uses `getSelectedItem().getKey()` for reliable key retrieval
  - Falls back to `getSelectedKey()` if item not available
- **Cleans IDs**:
  - Removes commas, spaces, and formatting characters
  - Handles comma-formatted numbers (e.g., "4,017" → "4017")
- **Safe conversion**:
  - Uses `parseInt(value, 10)` with radix 10
  - Validates with `isNaN()` check
  - Sets `null` for empty/invalid values
- **Works for both CREATE and UPDATE modes**

### 5. Form Handler (`app/webapp/utility/FormHandler.js`)

#### Edit Form Population (`onCustDialogData`)
- **Converts IDs to strings** for ComboBox compatibility
- **Sets country selection** first
- **Loads states** filtered by country ID
- **Handles comma-formatted keys**:
  - Removes commas when comparing keys
  - Uses actual formatted key when setting selection
- **Loads cities** filtered by state and country IDs
- **Uses multiple timing approaches**:
  - `attachDataReceived` event on binding
  - Timeout fallback (300ms)
  - Polling fallback if binding unavailable
- **Verifies key existence** before setting selection
- **Updates model** to keep UI in sync

## Functionalities Available

### 1. Customer Form Features

#### Create New Customer
- Select Country from dropdown (all countries)
- Select State from dropdown (filtered by selected country)
- Select City from dropdown (filtered by selected state and country)
- All selections are validated before submission
- IDs are saved to database (not text values)

#### Edit Existing Customer
- Form auto-populates with existing customer data
- Country dropdown shows selected country
- State dropdown automatically loads and shows selected state
- City dropdown automatically loads and shows selected city
- All cascading relationships are maintained

#### Form Validation
- Customer Name: Required
- Country: Required
- Status: Required
- Vertical: Required
- State and City: Optional (can be null)

### 2. Cascading Dropdown Behavior

#### Country Selection
- When country is selected:
  - State dropdown is enabled
  - States are filtered by `country_id`
  - State and city selections are cleared
  - City dropdown is disabled

#### State Selection
- When state is selected:
  - City dropdown is enabled
  - Cities are filtered by `state_id` AND `country_id`
  - City selection is cleared

#### Clearing Selections
- When country is cleared:
  - State dropdown is disabled and cleared
  - City dropdown is disabled and cleared
- When state is cleared:
  - City dropdown is disabled and cleared

### 3. Data Handling

#### ID Storage
- All IDs stored as integers in database
- `null` values allowed for optional fields
- Proper handling of empty selections

#### Key Formatting
- Handles comma-formatted numbers (e.g., "4,017")
- Removes formatting when comparing
- Preserves formatting when setting ComboBox selection

#### Model Synchronization
- `customerModel` keeps form state in sync
- ComboBox selections update model
- Model updates reflect in UI

## Technical Details

### Data Flow

1. **Loading Master Data**:
   ```
   OData Service → CustomerCountries/CustomerStates/CustomerCities
   → Filtered by country_id/state_id
   → Bound to ComboBox items
   ```

2. **User Selection**:
   ```
   User selects Country
   → onCountryChange handler
   → Filter States by country_id
   → Update customerModel
   → Enable State dropdown
   ```

3. **Form Submission**:
   ```
   Read selected keys from ComboBoxes
   → Clean and convert to integers
   → Validate
   → Submit to backend (CREATE/UPDATE)
   → Refresh table
   ```

4. **Edit Mode**:
   ```
   Load customer data
   → Set country selection
   → Load states for country
   → Find and set state selection
   → Load cities for state
   → Find and set city selection
   ```

### Key Files Modified

1. **`db/schema.cds`**: Database schema with ID fields and associations
2. **`srv/service.cds`**: OData service exposing master data
3. **`db/data/db-Customer.csv`**: Updated with `custCountryId` (all set to 101 - India)
4. **`app/webapp/view/fragments/Customers.fragment.xml`**: UI with ComboBoxes
5. **`app/webapp/controller/Home.controller.js`**: Event handlers and submit logic
6. **`app/webapp/utility/FormHandler.js`**: Form population logic for edit mode

### Error Handling

- **Invalid IDs**: Converted to `null` instead of causing errors
- **Missing selections**: Handled gracefully with validation messages
- **Binding failures**: Fallback mechanisms ensure dropdowns still work
- **Key mismatches**: Detailed console logging for debugging

## How to Push Code to a New Branch

### Prerequisites
- Git installed and configured
- Access to the repository
- Current changes committed or stashed

### Steps to Create and Push New Branch

#### Option 1: Using Command Line

1. **Check current status**:
   ```bash
   git status
   ```

2. **Ensure all changes are committed**:
   ```bash
   git add .
   git commit -m "Implement cascading dropdowns for Customer form (Country/State/City)"
   ```

3. **Create a new branch**:
   ```bash
   git checkout -b feature/customer-cascading-dropdowns
   ```
   Or if you want to branch from a specific branch:
   ```bash
   git checkout -b feature/customer-cascading-dropdowns origin/main
   ```

4. **Push the new branch to remote**:
   ```bash
   git push -u origin feature/customer-cascading-dropdowns
   ```

5. **Verify branch was created**:
   ```bash
   git branch -a
   ```

#### Option 2: Using Git GUI Tools

**VS Code / Cursor**:
1. Click on branch name in bottom-left corner
2. Select "Create new branch"
3. Enter branch name: `feature/customer-cascading-dropdowns`
4. Push branch using "Publish Branch" button

**GitHub Desktop**:
1. Click "Current Branch" dropdown
2. Click "New Branch"
3. Enter branch name: `feature/customer-cascading-dropdowns`
4. Click "Create Branch"
5. Click "Publish Branch"

**SourceTree**:
1. Click "Branch" → "New Branch"
2. Enter branch name: `feature/customer-cascading-dropdowns`
3. Check "Checkout new branch"
4. Click "Create Branch"
5. Right-click branch → "Push feature/customer-cascading-dropdowns"

#### Option 3: If You Have Uncommitted Changes

1. **Stash current changes**:
   ```bash
   git stash save "WIP: Cascading dropdowns implementation"
   ```

2. **Create and switch to new branch**:
   ```bash
   git checkout -b feature/customer-cascading-dropdowns
   ```

3. **Apply stashed changes**:
   ```bash
   git stash pop
   ```

4. **Commit changes**:
   ```bash
   git add .
   git commit -m "Implement cascading dropdowns for Customer form (Country/State/City)"
   ```

5. **Push branch**:
   ```bash
   git push -u origin feature/customer-cascading-dropdowns
   ```

### Branch Naming Conventions

Recommended branch names:
- `feature/customer-cascading-dropdowns` (feature implementation)
- `feat/customer-country-state-city` (shorter version)
- `bugfix/customer-dropdown-selection` (if fixing a bug)
- `enhancement/customer-form-improvements` (if enhancing)

### After Pushing Branch

1. **Create Pull Request** (if using GitHub/GitLab):
   - Go to repository on web
   - Click "New Pull Request"
   - Select your branch
   - Add description of changes
   - Request review

2. **Share branch with team**:
   ```bash
   # Team members can checkout your branch
   git fetch origin
   git checkout feature/customer-cascading-dropdowns
   ```

## Testing Checklist

### Create Customer
- [ ] Select country → State dropdown enables
- [ ] Select state → City dropdown enables
- [ ] Submit form → IDs saved correctly
- [ ] Verify in database → Correct IDs stored

### Edit Customer
- [ ] Click Edit → Form populates correctly
- [ ] Country shows selected value
- [ ] State shows selected value (after loading)
- [ ] City shows selected value (after loading)
- [ ] Change country → State and city reset
- [ ] Submit changes → Updates saved correctly

### Validation
- [ ] Submit without country → Error message shown
- [ ] Submit without customer name → Error message shown
- [ ] Clear country → State and city disabled
- [ ] Clear state → City disabled

### Edge Cases
- [ ] Customer with no state/city → Form handles null values
- [ ] Customer with all fields → All selections work
- [ ] Rapid country changes → No race conditions
- [ ] Network delays → Fallback mechanisms work

## Troubleshooting

### Issue: State dropdown not populating
**Solution**: Check browser console for filter errors. Verify `country_id` filter is using correct data type (Number).

### Issue: State selection not setting on edit
**Solution**: Check console logs for key comparison. Ensure comma-formatted keys are handled correctly.

### Issue: IDs saved as null
**Solution**: Verify `parseInt()` conversion. Check that ComboBoxes have valid selections before submit.

### Issue: Wrong ID saved (e.g., 4 instead of 4017)
**Solution**: Ensure comma removal logic is working. Check that `getSelectedItem().getKey()` is used.

## Future Enhancements

1. **Search functionality** in dropdowns for large lists
2. **Lazy loading** for better performance with large datasets
3. **Caching** of master data to reduce API calls
4. **Validation** to ensure state belongs to selected country
5. **Auto-complete** instead of dropdowns for better UX

## Support

For issues or questions:
1. Check browser console for error messages
2. Review console logs for debugging information
3. Verify database schema matches expected structure
4. Ensure OData service is running and accessible

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Author**: Development Team


# Data Upload Guide

## 📖 Overview

This document explains how **CSV file upload** works in the Resource Management Tool. You can bulk import data for Customers, Opportunities, Projects, and Employees.

---

## 🗂️ Where Upload Functionality Is Located

### Main Files
- **Upload Handler**: `app/webapp/utility/FileUploadHelper.js`
- **UI Dialog**: `app/webapp/view/fragments/UploadDialog.fragment.xml`
- **Controller Integration**: `app/webapp/controller/Home.controller.js`
- **Utility Integration**: `app/webapp/utility/CustomUtility.js`

---

## 📤 Supported Entities

You can upload CSV files for:

| Entity | Button ID | OData Endpoint |
|--------|-----------|----------------|
| **Customers** | `customerUpload` | `/Customers` |
| **Opportunities** | `opportunityUpload` | `/Opportunities` |
| **Projects** | `projectUpload` | `/Projects` |
| **Employees** | `employeeUpload` | `/Employees` |

**Note**: Allocations and Demands are typically created through the UI, not via upload.

---

## 🔄 Upload Process Flow

### Step-by-Step Process

```
1. User clicks "Upload" button in table toolbar
   ↓
2. Upload dialog opens (UploadDialog.fragment.xml)
   ↓
3. User selects CSV file
   ↓
4. File is parsed and validated (FileUploadHelper.js)
   ↓
5. User clicks "Upload File" button
   ↓
6. Each row is sent as CREATE request to backend
   ↓
7. Backend validates and saves each record
   ↓
8. Success/Error messages shown for each record
   ↓
9. Table refreshes to show new data
```

---

## 📝 How It Works (Detailed)

### 1. User Clicks Upload Button

**Location**: `app/webapp/view/fragments/*.fragment.xml`

Each entity fragment has an upload button:
```xml
<Button
    id="customerUpload"  <!-- or opportunityUpload, projectUpload, employeeUpload -->
    icon="sap-icon://upload"
    tooltip="Upload"
    press="onUpload"
/>
```

**Handler**: `app/webapp/controller/Home.controller.js` → `onUpload()`
- Delegates to: `CustomUtility.js` → `_onUploadPress()`
- Which calls: `FileUploadHelper.js` → `_onUploadPress()`

### 2. Upload Dialog Opens

**File**: `app/webapp/view/fragments/UploadDialog.fragment.xml`

The dialog contains:
- File uploader component
- "Upload File" button
- "Cancel" button

**Function**: `FileUploadHelper.js` → `_onUploadPress()`
- Opens the dialog
- Stores which entity is being uploaded (button ID)

### 3. User Selects CSV File

**Handler**: `FileUploadHelper.js` → `_onFileUploadChange()`

**What Happens**:
1. File is read as text
2. CSV is parsed (split by commas, newlines)
3. Headers are extracted (first row)
4. Data rows are parsed
5. **Validation**:
   - Checks required columns exist
   - Validates file format
   - Shows error if invalid

**Required Columns** (per entity):

#### Customers
- `customerName` (required)
- `state`, `country`, `status`, `vertical` (optional)

#### Opportunities
- `opportunityName` (required)
- `customerId` (required - must exist)
- `probability`, `Stage`, `tcv` (optional)

#### Projects
- `projectName` (required)
- `oppId` (required - must exist)
- `startDate`, `endDate`, `projectType` (optional)

#### Employees
- `ohrId` (required - unique key)
- `fullName` (required)
- `band`, `employeeType`, `doj` (optional)

### 4. User Clicks "Upload File"

**Handler**: `FileUploadHelper.js` → `_onFileUploadSubmit()`

**What Happens**:
1. Gets parsed CSV data (`_csvPayload`) - array of row objects
2. Maps button ID to OData endpoint (e.g., `customerUpload` → `/Customers`)
3. Gets CSRF token from server (required for POST requests)
4. For each row:
   - Builds endpoint URL: `{serviceUrl}{entitySet}` (e.g., `/odata/v4/my/Customers`)
   - Sends HTTP POST request with JSON body
   - Handles success (201) or error response
5. Shows summary message with success/failure counts

**Code Flow** (Actual Implementation):
```javascript
// Step 1: Map button ID to OData endpoint
const mEntityMap = {
    customerUpload: "/Customers",
    opportunityUpload: "/Opportunities",
    employeeUpload: "/Employees",
    projectUpload: "/Projects"
};
const sEntitySet = mEntityMap[sButtonId];  // e.g., "/Customers"

// Step 2: Get service URL and CSRF token
const sServiceUrl = oMainModel?.sServiceUrl || "";  // e.g., "/odata/v4/my/"
let sCsrfToken = null;

// Fetch CSRF token (required for POST requests)
const oTokenRes = await fetch(sServiceUrl, {
    method: "GET",
    headers: { "X-CSRF-Token": "Fetch" },
    credentials: "same-origin"
});
sCsrfToken = oTokenRes.headers.get("x-csrf-token");

// Step 3: For each CSV row, send POST request
for (const [iIndex, oRecord] of this._csvPayload.entries()) {
    // Build full endpoint URL
    // Example: "/odata/v4/my/" + "/Customers" = "/odata/v4/my/Customers"
    const sEndpoint = `${sServiceUrl}${sEntitySet}`;
    
    // Send HTTP POST request
    const oRes = await fetch(sEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json;odata.metadata=minimal",
            "X-CSRF-Token": sCsrfToken  // Security token
        },
        body: JSON.stringify(oRecord)  // Convert CSV row object to JSON
    });
    
    // Check response status
    if (oRes.status === 201) {
        // ✅ Success - Record created
        iSuccessCount++;
    } else {
        // ❌ Error - Show error message
        iFailureCount++;
    }
}
```

**Step-by-Step Explanation**:

1. **Map Button to Endpoint**: 
   - Button ID (e.g., `customerUpload`) → Entity set (e.g., `/Customers`)
   - This tells the system which backend endpoint to use

2. **Get Service URL**:
   - Gets base URL from OData model (e.g., `/odata/v4/my/`)
   - This is where the backend service is running

3. **Get CSRF Token**:
   - Sends GET request to service URL with `X-CSRF-Token: Fetch` header
   - Server responds with token in response header
   - This token is required for all POST/PUT/DELETE requests (security)

4. **Build Endpoint URL**:
   - Combines service URL + entity set
   - Example: `/odata/v4/my/` + `/Customers` = `/odata/v4/my/Customers`

5. **Send POST Request**:
   - For each CSV row, sends HTTP POST request
   - Body contains JSON data from CSV row
   - Headers include CSRF token and content type

6. **Handle Response**:
   - Status 201 = Success (record created)
   - Other status = Error (shows error message)

### 5. Backend Processing

**Location**: `srv/service.js`

Each CREATE request goes through normal backend validation:
- **before('CREATE', Entity)**: Validates data, auto-generates IDs
- **Data saved** to database
- **after('CREATE', Entity)**: Calculates related fields

**Example for Customers**:
```javascript
this.before('CREATE', Customers, async (req) => {
    // Auto-generate SAPcustId: C-0001, C-0002, etc.
    const result = await SELECT.one`max(SAPcustId)`.from(Customers);
    let nextId = 1;
    if (result && result.max) {
        const currentNum = parseInt(result.max.replace('C-', ''), 10);
        nextId = currentNum + 1;
    }
    req.data.SAPcustId = `C-${String(nextId).padStart(4, '0')}`;
});
```

---

## 📋 CSV File Format

### General Rules
1. **First row** must be headers (column names)
2. **Comma-separated** values
3. **No spaces** around commas (or consistent spacing)
4. **Quotes** for values containing commas
5. **UTF-8** encoding

### Example: Customers CSV

```csv
customerName,state,country,status,vertical
Acme Corp,California,USA,Active,High Tech
Tech Solutions,New York,USA,Active,High Tech
Global Industries,Texas,USA,Prospect,Manufacturing
```

### Example: Employees CSV

```csv
ohrId,fullName,mailid,gender,employeeType,doj,band,role,location,country,city
EMP001,John Doe,john.doe@company.com,Male,Full Time,2024-01-15,4A,Consultant,Bangalore,India,Bangalore (Karnataka)
EMP002,Jane Smith,jane.smith@company.com,Female,Full Time,2024-02-01,4B-C,Manager,Mumbai,India,Mumbai (Maharashtra)
```

### Example: Projects CSV

```csv
projectName,oppId,startDate,endDate,projectType,status,requiredResources
Project Alpha,O-0001,2024-01-01,2024-12-31,Fixed Price,Active,5
Project Beta,O-0002,2024-02-01,2024-11-30,Time & Material,Active,3
```

**Note**: `oppId` must exist in Opportunities table.

---

## 🔍 Validation Rules

### Frontend Validation (Before Upload)

**Location**: `FileUploadHelper.js` → `_onFileUploadChange()`

1. **File Format**: Must be `.csv`
2. **File Not Empty**: Must have data rows
3. **Headers Match**: Required columns must exist
4. **Data Rows**: Must have at least one data row

### Backend Validation (During Upload)

**Location**: `srv/service.js` → `before('CREATE', Entity)`

1. **Required Fields**: Must have all required fields
2. **Data Types**: Dates, numbers must be valid format
3. **Foreign Keys**: References must exist (e.g., `customerId`, `oppId`)
4. **Unique Keys**: Keys must be unique (e.g., `ohrId` for employees)
5. **Enum Values**: Must match enum values (e.g., `status`, `band`)

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Invalid CSV Format"
**Cause**: File not properly formatted
**Solution**: 
- Check first row has headers
- Ensure comma-separated values
- Check for extra spaces or special characters

### Issue 2: "Required Column Missing"
**Cause**: CSV doesn't have required column
**Solution**: 
- Check required columns for your entity
- Ensure column names match exactly (case-sensitive)

### Issue 3: "Foreign Key Error"
**Cause**: Referenced entity doesn't exist
**Solution**: 
- For Projects: Ensure `oppId` exists in Opportunities
- For Opportunities: Ensure `customerId` exists in Customers
- Upload referenced entities first

### Issue 4: "Duplicate Key Error"
**Cause**: Trying to create record with existing key
**Solution**: 
- For Employees: `ohrId` must be unique
- For Customers/Opportunities/Projects: IDs are auto-generated, but check if manually set

### Issue 5: "Invalid Enum Value"
**Cause**: Value doesn't match allowed enum values
**Solution**: 
- Check enum values in `db/schema.cds`
- Use exact values (case-sensitive)
- Examples:
  - `status`: `Active`, `Inactive`, `Prospect` (for Customers)
  - `band`: `1`, `2`, `3`, `4A`, `4B-C`, etc. (for Employees)

---

## 🎯 Upload Template Download

### How to Get Template

Some entities support template download (if implemented):

1. Click upload button
2. In dialog, click "Download Template" (if available)
3. Template CSV downloads with:
   - Headers row
   - Example data row
   - Comments explaining required fields

**Location**: `FileUploadHelper.js` → `_exportUploadTemplate()`

---

## 📊 Upload Results

### Success/Error Tracking

After upload completes:
- **Success count**: Number of records successfully created
- **Failure count**: Number of records that failed
- **Individual messages**: Each row shows success/error message

**Display**: Message toast shows summary:
```
✅ Upload complete: 10 success, 2 failed
```

### Error Messages

Each failed record shows specific error:
- Validation errors (e.g., "Required field missing")
- Foreign key errors (e.g., "Customer not found")
- Data type errors (e.g., "Invalid date format")

---

## 🔄 After Upload

### Automatic Actions

After successful upload:
1. **Table refreshes** to show new data
2. **Related calculations** run (if applicable)
3. **Status updates** (for employees, if allocations exist)

### Manual Actions

You may need to:
1. **Verify data** in the table
2. **Create related records** (e.g., create allocations for employees)
3. **Update fields** that couldn't be uploaded (e.g., skills for employees)

---

## 💡 Best Practices

1. **Test with Small File First**: Upload 2-3 records to test format
2. **Check Required Fields**: Ensure all required columns are present
3. **Validate Foreign Keys**: Ensure referenced entities exist
4. **Use Correct Date Format**: `YYYY-MM-DD` (e.g., `2024-01-15`)
5. **Check Enum Values**: Use exact enum values from schema
6. **Backup Data**: Export existing data before bulk upload
7. **Review Errors**: Check error messages to fix data issues

---

## 🔍 Code Locations Summary

| Function | File | Purpose |
|---------|------|---------|
| `onUpload()` | `Home.controller.js` | Entry point for upload button |
| `_onUploadPress()` | `FileUploadHelper.js` | Opens upload dialog |
| `_onFileUploadChange()` | `FileUploadHelper.js` | Parses and validates CSV |
| `_onFileUploadSubmit()` | `FileUploadHelper.js` | Submits data to backend |
| `_exportUploadTemplate()` | `FileUploadHelper.js` | Downloads template CSV |

---

## 📝 Example: Complete Upload Flow

### Scenario: Upload 10 Customers

1. **User Action**: Clicks "Upload" button in Customers table
2. **Dialog Opens**: Upload dialog appears
3. **File Selection**: User selects `customers.csv`
4. **File Parsed**: 
   - Headers: `customerName,state,country,status,vertical`
   - 10 data rows parsed
5. **Validation**: All required columns present ✅
6. **Upload**: User clicks "Upload File"
7. **Processing**: 
   - 10 CREATE requests sent to `/Customers`
   - Backend auto-generates IDs: `C-0001` to `C-0010`
   - All records saved successfully
8. **Result**: 
   - Message: "✅ Upload complete: 10 success, 0 failed"
   - Table refreshes showing 10 new customers

---

**Next Steps**: Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the technical architecture.


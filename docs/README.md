# Resource Management Tool - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Documentation Files](#documentation-files)
4. [Application Structure](#application-structure)
5. [Key Features](#key-features)

---

## 🎯 Overview

This is a **SAP CAP (Cloud Application Programming)** application for managing:
- **Employees** - Track employee details, skills, and status
- **Projects** - Manage project information and resource requirements
- **Allocations** - Assign employees to projects with specific demands
- **Customers & Opportunities** - Track customer relationships and sales opportunities
- **Reports** - Generate various business reports

### Technology Stack
- **Backend**: Node.js + SAP CAP Framework (`@sap/cds`)
- **Database**: SQLite (development) / SAP HANA (production)
- **Frontend**: SAP UI5 (Fiori-like interface)
- **Deployment**: Cloud Foundry

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- npm
- SAP CAP CLI (`npm install -g @sap/cds-dk`)

### Running the Application

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   # OR for specific project views:
   npm run watch-project1
   npm run watch-project2
   ```

3. **Access the Application**
   - Open browser: `http://localhost:4004`
   - The app will automatically open in your browser

---

## 📚 Documentation Files

For detailed information, see these documentation files:

### 1. **[CRUD_OPERATIONS.md](CRUD_OPERATIONS.md)**
   - How to Create, Read, Update, Delete records
   - Which files handle CRUD operations
   - Step-by-step flow for each operation

### 2. **[DATA_UPLOAD.md](DATA_UPLOAD.md)**
   - How CSV file upload works
   - Which entities support upload
   - File format requirements
   - Upload process flow
   - **Service endpoint creation and data passing explained in detail**

### 3. **[ARCHITECTURE.md](ARCHITECTURE.md)**
   - Technical architecture overview
   - Backend vs Frontend separation
   - Database schema structure
   - Service layer explanation

### 4. **[FILE_STRUCTURE.md](FILE_STRUCTURE.md)**
   - Complete file structure
   - What each folder/file does
   - Where to find specific functionality

### 5. **[BUSINESS_LOGIC.md](BUSINESS_LOGIC.md)**
   - Employee status calculation
   - Allocation percentage validation
   - Resource count calculations
   - Automatic status updates

---

## 🏗️ Application Structure

```
ResourceManagementTool/
├── db/                    # Database layer
│   ├── schema.cds        # Main data model (entities, enums)
│   ├── reports/          # Report view definitions
│   └── data/             # CSV seed data
│
├── srv/                   # Service layer (Backend)
│   ├── service.cds       # Service definition (exposes entities)
│   ├── service.js        # Business logic (validations, calculations)
│   └── reportService.js  # Report generation functions
│
├── app/                   # Frontend (UI5)
│   └── webapp/
│       ├── controller/    # UI controllers
│       ├── delegate/      # MDC table/filter delegates
│       ├── view/          # XML views and fragments
│       └── utility/       # Helper functions
│
└── package.json          # Dependencies and scripts
```

---

## ✨ Key Features

### 1. Master Data Management
- **Customers**: Manage customer information with verticals and status
- **Opportunities**: Track sales opportunities with probability and stages
- **Projects**: Manage projects with resource requirements
- **Demands**: Define skill-based resource demands for projects
- **Employees**: Track employee details, skills, bands, and status
- **Skills**: Master data for employee skills

### 2. Allocations
- Assign employees to projects
- Link allocations to specific demands (skill + band)
- Track allocation percentage (0-100%)
- Automatic validation (can't exceed 100% per employee)

### 3. Automatic Status Management
- Employee status automatically updates based on:
  - Allocation dates
  - Project start dates
  - Project SFDC PID presence
- Statuses: `Allocated`, `Pre Allocated`, `Unproductive Bench`, `Inactive Bench`

### 4. Reports
- Employee Bench Report
- Employee Probable Release Report
- Revenue Forecast Report
- Employee Allocation Report
- Employee Skill Report
- Projects Nearing Completion Report

### 5. Data Upload
- CSV file upload for bulk data import
- Supports: Customers, Opportunities, Projects, Employees
- Automatic validation and error handling

---

## 🔍 Common Tasks

### Adding a New Entity
1. Define entity in `db/schema.cds`
2. Add to service in `srv/service.cds`
3. Create UI fragment in `app/webapp/view/fragments/`
4. Add delegate files in `app/webapp/delegate/`
5. Add navigation in `app/webapp/view/Home.view.xml`

### Modifying Business Logic
- **Backend validations**: `srv/service.js`
- **Frontend validations**: `app/webapp/controller/Home.controller.js`
- **CRUD operations**: `app/webapp/utility/CRUDHelper.js`

### Adding a New Report
1. Create view in `db/reports/reportViews.cds`
2. Add to service in `srv/service.cds`
3. Implement in `srv/reportService.js`
4. Create UI fragment in `app/webapp/view/fragments/`

---

## 📞 Need Help?

1. Check the specific documentation files listed above
2. Review code comments in the relevant files
3. Check existing similar implementations for reference

---

## 🎓 For Junior Developers

**Start Here:**
1. Read [FILE_STRUCTURE.md](FILE_STRUCTURE.md) to understand where everything is
2. Read [CRUD_OPERATIONS.md](CRUD_OPERATIONS.md) to understand how data operations work
3. Read [DATA_UPLOAD.md](DATA_UPLOAD.md) to understand file uploads (includes service endpoint details)
4. Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details

**When Making Changes:**
- Always check existing similar code first
- Follow the same patterns used in the codebase
- Test your changes thoroughly
- Update documentation if needed

---

**Last Updated**: 2025

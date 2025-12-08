# Employee Status Update Guide

## Overview

This guide explains how employee status is automatically updated when allocations are created and when projects start.

## Problem Statement

When an employee is allocated to a project:
- **Scenario 1**: Allocation created today, project starts today → Status should update immediately
- **Scenario 2**: Allocation created today, project starts in 1 month → Status should update when project actually starts

## Solution: Hybrid Approach

We use a **hybrid approach** that combines:
1. **Immediate status update** on allocation creation (if dates have arrived)
2. **Daily scheduled check** for employees whose projects start today

---

## Implementation Details

### 1. Immediate Status Update (On Allocation Creation)

**Location**: `srv/service.js` - `on('CREATE', newAllocations, ...)`

When a new allocation is created:
- Checks if both `allocation startDate` and `project startDate` have arrived
- If yes → Updates employee status immediately:
  - **"Allocated"** if project has SFDC PID
  - **"Pre Allocated"** if project has no SFDC PID
- If no → Status remains unchanged (will be updated by daily check)

**Code Flow**:
```javascript
// After creating allocation
if (allocationStartDate <= today && projectStartDate <= today) {
    updateEmployeeStatus(employeeId);
}
```

### 2. Daily Status Check Function

**Function**: `_checkAndUpdateStatusesForStartingProjects()`

This function:
- Finds all `newAllocations` where `startDate <= today`
- Checks if corresponding project `startDate <= today`
- Updates employee status for all qualifying employees

**API Endpoint**: `POST /service/checkStartingProjects`

Returns:
```json
{
    "success": true,
    "message": "Checked and updated employee statuses for projects starting today",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "checked": 25,
    "updated": 8,
    "employees": ["EMP001", "EMP002", ...]
}
```

---

## Scheduling Options

### Option 1: External Scheduler (Recommended for Production)

Use SAP Cloud Platform Job Scheduler or similar service to call the API daily.

**Setup**:
1. Create a scheduled job that calls: `POST /service/checkStartingProjects`
2. Schedule it to run daily (e.g., at 2:00 AM)
3. Configure authentication/authorization as needed

**Pros**:
- ✅ Production-ready
- ✅ Reliable and monitored
- ✅ Can handle failures and retries
- ✅ No code changes needed

**Cons**:
- ❌ Requires external service setup

---

### Option 2: Node.js Timer (Development/Testing Only)

For local development, you can use a simple timer:

```javascript
// Add to srv/service.js (ONLY for development)
if (process.env.NODE_ENV !== 'production') {
    // Run daily check every 24 hours
    setInterval(async () => {
        try {
            await this._checkAndUpdateStatusesForStartingProjects();
            console.log('Daily status check completed');
        } catch (err) {
            console.error('Daily status check failed:', err);
        }
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
}
```

**⚠️ Warning**: This is NOT recommended for production because:
- Process must run continuously
- No monitoring/alerting
- No retry mechanism
- Lost if server restarts

---

### Option 3: On-Demand Check (Manual Trigger)

You can manually trigger the check via API:

```bash
# Using curl
curl -X POST http://your-server/service/checkStartingProjects \
  -H "Content-Type: application/json"
```

**Use Cases**:
- Manual testing
- Troubleshooting
- One-time corrections

---

### Option 4: Cloud Functions with Scheduled Triggers

If deploying to cloud platforms (AWS, Azure, GCP):
- Create a cloud function that calls the API
- Configure scheduled trigger (cron expression)
- Example: `0 2 * * *` (runs daily at 2 AM)

---

## Status Update Logic

### Status Determination Rules

1. **Allocated** (Highest Priority)
   - Employee has active allocation(s)
   - Allocation start date ≤ today
   - Project start date ≤ today
   - Project has SFDC PID

2. **Pre Allocated**
   - Employee has active allocation(s)
   - Allocation start date ≤ today
   - Project start date ≤ today
   - Project has NO SFDC PID

3. **Unproductive Bench** (Default)
   - Employee has no active allocations
   - OR allocations haven't started yet

4. **Resigned** (Protected)
   - Status never changes automatically once set

5. **Inactive Bench** (Manual)
   - Manually set for employees on leave

### Multiple Allocations

If employee has multiple allocations:
- If **ANY** allocation qualifies for "Allocated" → Status = **"Allocated"**
- If **ALL** allocations qualify for "Pre Allocated" → Status = **"Pre Allocated"**
- Priority: **Allocated** > **Pre Allocated**

---

## Testing

### Test Immediate Update

1. Create allocation with:
   - `startDate` = today
   - `project.startDate` = today
   - `project.sfdcPId` = "PROJ123"
2. Verify employee status changes to "Allocated"

### Test Daily Check

1. Create allocation with:
   - `startDate` = tomorrow
   - `project.startDate` = tomorrow
2. Manually call `POST /service/checkStartingProjects`
3. Change system date to tomorrow
4. Call API again
5. Verify employee status updates

---

## Monitoring

### Recommended Monitoring

1. **API Response Monitoring**
   - Track success/failure of daily check
   - Monitor number of employees updated
   - Alert on errors

2. **Status Consistency Checks**
   - Periodically verify employee statuses match their allocations
   - Flag discrepancies for review

3. **Logging**
   - All status updates are logged
   - Check logs for errors or unexpected behavior

---

## Troubleshooting

### Issue: Status not updating

**Check**:
1. Are allocation and project start dates ≤ today?
2. Is the daily check running?
3. Check logs for errors
4. Verify employee is not "Resigned"

### Issue: Wrong status assigned

**Check**:
1. Does project have SFDC PID? (Allocated vs Pre Allocated)
2. Are there multiple allocations? (Priority rules)
3. Check allocation and project start dates

---

## Summary

✅ **Immediate Update**: Handles cases where allocation and project start today  
✅ **Daily Check**: Handles cases where project starts in the future  
✅ **API Endpoint**: Allows manual triggering and external scheduling  
✅ **Flexible**: Works with any scheduling mechanism  

**Next Steps**:
1. Set up external scheduler (Option 1) for production
2. Test the daily check function
3. Monitor status updates for accuracy


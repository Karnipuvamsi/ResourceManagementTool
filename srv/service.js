const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
    const { Opportunities, Customers, Projects, Employees, Verticals, Allocations } = this.entities;


    this.before('CREATE', Opportunities, async (req) => {
        // Get the highest existing numeric part of sapOpportunityId
        const result = await SELECT.one`max(sapOpportunityId)`.from(Opportunities);


        let nextId = 1;
        if (result && result.max) {
            const currentNum = parseInt(result.max.replace('O-', ''), 10);


            nextId = currentNum + 1;
        }

        // Format the new ID
        req.data.sapOpportunityId = `O-${String(nextId).padStart(4, '0')}`;

    });
    this.before('CREATE', Customers, async (req) => {
        // Get the highest existing numeric part of SAPcustId
        const result = await SELECT.one`max(SAPcustId)`.from(Customers);

        console.log(result);



        let nextId = 1;
        if (result && result.max) {
            const currentNum = parseInt(result.max.replace('C-', ''), 10);


            nextId = currentNum + 1;
        }

        // Format the new ID
        req.data.SAPcustId = `C-${String(nextId).padStart(4, '0')}`;

    });
    this.before('CREATE', Projects, async (req) => {
        // Get the highest existing numeric part of sapPId
        const result = await SELECT.one`max(sapPId)`.from(Projects);


        let nextId = 1;
        if (result && result.max) {
            const currentNum = parseInt(result.max.replace('P-', ''), 10);


            nextId = currentNum + 1;
        }

        // Format the new ID
        req.data.sapPId = `P-${String(nextId).padStart(4, '0')}`;

    });

    this.on('CREATE', Allocations, async (req) => {
        // 1. Fetch the employee record by ohrId
        const result = await SELECT.one.from(Employees).where({ ohrId: req.data.employeeId });
        console.log("📥 Fetched Employee:", result);
        console.log("Current empallocpercentage:", result.empallocpercentage);

        // 2. Calculate new allocation percentage
        const total_allocper = result.empallocpercentage + req.data.allocationPercentage;
        console.log("📊 Total Allocation Percentage to update:", total_allocper);

        // 3. Update the employee record with new allocation percentage
        await UPDATE(Employees).set({ empallocpercentage: total_allocper }).where({ ohrId: req.data.employeeId });
        console.log("✅ Employee allocation percentage updated successfully.");
    });
    

});
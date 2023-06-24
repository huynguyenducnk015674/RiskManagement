// Imports
const cds = require("@sap/cds");
const { process_params } = require("express/lib/router");

/**
   * The service implementation with all service handlers
   */
module.exports = cds.service.impl(async function () {
   // Define constants for the Risk and BusinessPartners entities from the risk-service.cds file
   const { Risks, BusinessPartners } = this.entities;

   /**
   * Set criticality after a READ operation on /risks
   */
   this.after("READ", Risks, (data) => {
      const risks = Array.isArray(data) ? data : [data];

      risks.forEach((risk) => {
         if (risk.impact >= 100000) {
            risk.criticality = 1;
         } else {
            risk.criticality = 2;
         }
      });
   });

   // ### external service
   const BPsrv = await cds.connect.to("API_BUSINESS_PARTNER");
   /**
    * * Event-handler for read-events on the BusinessPartners entity.
    * * Each request to the API Business Hub requires the apikey in the header.
    */
   this.on("READ", BusinessPartners, async (req) => {
      req.query.where("LastName <> '' and FirstName <> '' ");
      return await BPsrv.transaction(req).send({
         query: req.query,
         headers: {
            apikey: process.env.apikey
         }
      })
   })
   this.on("READ",Risks,async(req,next)=>{
      if (!req.query.SELECT.columns) return next();
      const expandIndex = req.query.SELECT.columns.findIndex(
         ({ expand, ref }) => expand && ref[0] === "bp");
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
      console.log(req.query.SELECT.columns);
      if (expandIndex < 0) return next();
      req.query.SELECT.columns.splice(expandIndex, 1);
      if(
         !req.query.SELECT.columns.find((column) =>
         column.ref.find((ref) => ref == "bp_BusinessPartner"))
      ){
         req.query.SELECT.columns.push({ ref: ["bp_BusinessPartner"] });
      }
      /*
      Instead of carrying out the expand, issue a separate request for each business partner
      This code could be optimized, instead of having n requests for n business partners, just one bulk request could be created
      */
     try {
      res = await next();
      res=Array.isArray(res)?res:[res];
      console.log(res)
      await Promise.all(
         res.map(async (risk)=>{
            const bp=await BPsrv.transaction(req).send(
               {
                  query : SELECT.one(this.entities.BusinessPartners)
                  .where({
                     BusinessPartner : risk.bp_BusinessPartner 
                  })
                  .columns([
                     "BusinessPartner",
                     "LastName",
                     "FirstName"
                  ]),
                  headers:{
                     apikey:process.env.apikey
                     
                  }
               }
            );
            risk.bp=bp;
         })
      )
     } catch (error) {
      console.log(error)
     }
   })
});

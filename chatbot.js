const express = require("express");
const { read } = require("./db");
const { getFlow } = require("./flows");
const router = express.Router();
router.get("/businesses/:businessId/chatbot-flow",(req,res)=>{
  const biz=read().businesses.find(b=>b.id===req.params.businessId);
  if(!biz)return res.status(404).json({error:"Business not found"});
  if(!biz.modules.website_chat&&!biz.modules.ai_receptionist)return res.status(403).json({error:"Chat is disabled for this business"});
  const flow=getFlow(biz.niche);
  res.json({
    businessName:biz.name,
    niche:biz.niche,
    ...flow,
    modulesEnabled:{
      website_chat:!!biz.modules.website_chat,
      ai_receptionist:!!biz.modules.ai_receptionist,
      lead_capture:!!biz.modules.lead_capture,
      appointment:!!biz.modules.appointment,
    },
  });
});
module.exports=router;

const express = require("express");
const { nanoid } = require("nanoid");
const { transact, read } = require("./db");
const { requireAuth } = require("./auth-helper");
const router=express.Router();
router.post("/businesses/:businessId/appointments",async(req,res)=>{const {businessId}=req.params;const {leadId,name,phone,date,time,notes}=req.body||{};if(!read().businesses.find(b=>b.id===businessId))return res.status(404).json({error:"Business not found"});if(!date)return res.status(400).json({error:"date is required"});const appt={id:nanoid(10),businessId,leadId:leadId||null,name:name||"Unknown",phone:phone||"",date,time:time||"",notes:notes||"",status:"booked",createdAt:new Date().toISOString()};await transact(d=>d.appointments.push(appt));res.status(201).json({appointment:appt});});
router.get("/businesses/:businessId/appointments",requireAuth(),(req,res)=>{const {businessId}=req.params;if(req.user.role==="client"&&req.user.businessId!==businessId)return res.status(403).json({error:"Not allowed"});res.json(read().appointments.filter(a=>a.businessId===businessId).sort((a,b)=>new Date(a.date)-new Date(b.date)));});
router.patch("/appointments/:id",requireAuth(),async(req,res)=>{const {status}=req.body||{};const valid=["booked","reminded","completed","cancelled"];if(!valid.includes(status))return res.status(400).json({error:"Invalid status"});const result=await transact(data=>{const appt=data.appointments.find(a=>a.id===req.params.id);if(!appt)return null;if(req.user.role==="client"&&req.user.businessId!==appt.businessId)return "forbidden";appt.status=status;return appt;});if(result==="forbidden")return res.status(403).json({error:"Not allowed"});if(!result)return res.status(404).json({error:"Appointment not found"});res.json(result);});
module.exports=router;

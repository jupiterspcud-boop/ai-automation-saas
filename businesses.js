const express = require("express");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const { transact, read } = require("./db");
const { requireAuth } = require("./auth-helper");
const { listNiches } = require("./flows");

const router = express.Router();

const DEFAULT_MODULES = { ai_receptionist:true, whatsapp:true, instagram:false, facebook:false, website_chat:true, lead_capture:true, lead_qualification:true, lead_scoring:true, followup:false, appointment:true, crm:true, payment:false, invoice:false, review:false, voice_ai:false, human_handoff:true, analytics:true, ai_reports:false };
const PACKAGES = { starter:{label:"Starter",setup:"9,999 - 15,000",monthly:"2,999 - 4,999"}, growth:{label:"Growth",setup:"25,000 - 40,000",monthly:"6,999 - 9,999"}, pro:{label:"Pro",setup:"50,000 - 1,00,000",monthly:"12,999 - 24,999"}, enterprise:{label:"Enterprise",setup:"1,50,000+",monthly:"30,000+"} };
function publicBiz(b) { const { passcodeHash, ...rest } = b; return rest; }
router.get("/meta", (req,res)=>res.json({ niches:listNiches(), packages:PACKAGES, defaultModules:DEFAULT_MODULES }));
router.get("/", requireAuth("admin"), (req,res)=>res.json(read().businesses.map(publicBiz)));
router.post("/", requireAuth("admin"), async (req,res)=>{ const {name,niche,package:pkg}=req.body||{}; if(!name)return res.status(400).json({error:"name is required"}); const passcode=Math.random().toString(36).slice(2,8).toUpperCase(); const biz={id:nanoid(10),name,niche:niche&&listNiches().some(n=>n.id===niche)?niche:"generic",package:PACKAGES[pkg]?pkg:"starter",modules:{...DEFAULT_MODULES},passcodeHash:bcrypt.hashSync(passcode,8),createdAt:new Date().toISOString()}; await transact(d=>d.businesses.push(biz)); res.status(201).json({business:publicBiz(biz),passcode}); });
router.patch("/:id/modules", requireAuth("admin"), async (req,res)=>{ const result=await transact(data=>{const biz=data.businesses.find(b=>b.id===req.params.id);if(!biz)return null;biz.modules={...biz.modules,...(req.body||{}).modules};return biz;});if(!result)return res.status(404).json({error:"Business not found"});res.json(publicBiz(result)); });
router.patch("/:id/package", requireAuth("admin"), async (req,res)=>{const pkg=(req.body||{}).package;if(!PACKAGES[pkg])return res.status(400).json({error:"Invalid package"});const result=await transact(data=>{const biz=data.businesses.find(b=>b.id===req.params.id);if(!biz)return null;biz.package=pkg;return biz;});if(!result)return res.status(404).json({error:"Business not found"});res.json(publicBiz(result));});
router.get("/:id/public-config", (req,res)=>{const biz=read().businesses.find(b=>b.id===req.params.id);if(!biz)return res.status(404).json({error:"Business not found"});res.json({id:biz.id,name:biz.name,niche:biz.niche,modulesEnabled:{website_chat:!!biz.modules.website_chat,ai_receptionist:!!biz.modules.ai_receptionist,appointment:!!biz.modules.appointment}});});
router.get("/:id", requireAuth(), (req,res)=>{if(req.user.role==="client"&&req.user.businessId!==req.params.id)return res.status(403).json({error:"Not allowed"});const biz=read().businesses.find(b=>b.id===req.params.id);if(!biz)return res.status(404).json({error:"Business not found"});res.json(publicBiz(biz));});
module.exports = router;

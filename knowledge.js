const express = require("express");
const { nanoid } = require("nanoid");
const { read, transact } = require("./db");
const { requireAuth } = require("./auth-helper");

const router = express.Router();

function canAccess(req, businessId) {
  return req.user && (req.user.role === "admin" || (req.user.role === "client" && req.user.businessId === businessId));
}

function cleanText(value, max = 12000) {
  return String(value || "").trim().slice(0, max);
}

router.get("/businesses/:businessId/knowledge", requireAuth(), (req, res) => {
  if (!canAccess(req, req.params.businessId)) return res.status(403).json({ error: "Not allowed" });
  const biz = read().businesses.find(b => b.id === req.params.businessId);
  if (!biz) return res.status(404).json({ error: "Business not found" });
  res.json({ businessId: biz.id, knowledge: Array.isArray(biz.knowledge) ? biz.knowledge : [] });
});

router.post("/businesses/:businessId/knowledge", requireAuth(), async (req, res) => {
  if (!canAccess(req, req.params.businessId)) return res.status(403).json({ error: "Not allowed" });
  const title = cleanText(req.body?.title, 200);
  const content = cleanText(req.body?.content);
  const tags = Array.isArray(req.body?.tags) ? req.body.tags.map(t => cleanText(t, 80)).filter(Boolean).slice(0, 30) : [];
  if (!content) return res.status(400).json({ error: "Knowledge content is required" });

  const item = { id: nanoid(10), title: title || "Untitled knowledge", content, tags, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const result = await transact(data => {
    const biz = data.businesses.find(b => b.id === req.params.businessId);
    if (!biz) return null;
    if (!Array.isArray(biz.knowledge)) biz.knowledge = [];
    biz.knowledge.push(item);
    return item;
  });
  if (!result) return res.status(404).json({ error: "Business not found" });
  res.status(201).json({ knowledge: result });
});

router.put("/businesses/:businessId/knowledge/:knowledgeId", requireAuth(), async (req, res) => {
  if (!canAccess(req, req.params.businessId)) return res.status(403).json({ error: "Not allowed" });
  const title = cleanText(req.body?.title, 200);
  const content = cleanText(req.body?.content);
  const tags = Array.isArray(req.body?.tags) ? req.body.tags.map(t => cleanText(t, 80)).filter(Boolean).slice(0, 30) : undefined;
  const result = await transact(data => {
    const biz = data.businesses.find(b => b.id === req.params.businessId);
    const item = biz?.knowledge?.find(k => k.id === req.params.knowledgeId);
    if (!item) return null;
    if (title) item.title = title;
    if (content) item.content = content;
    if (tags) item.tags = tags;
    item.updatedAt = new Date().toISOString();
    return item;
  });
  if (!result) return res.status(404).json({ error: "Knowledge item not found" });
  res.json({ knowledge: result });
});

router.delete("/businesses/:businessId/knowledge/:knowledgeId", requireAuth(), async (req, res) => {
  if (!canAccess(req, req.params.businessId)) return res.status(403).json({ error: "Not allowed" });
  const result = await transact(data => {
    const biz = data.businesses.find(b => b.id === req.params.businessId);
    if (!biz || !Array.isArray(biz.knowledge)) return false;
    const before = biz.knowledge.length;
    biz.knowledge = biz.knowledge.filter(k => k.id !== req.params.knowledgeId);
    return biz.knowledge.length !== before;
  });
  if (!result) return res.status(404).json({ error: "Knowledge item not found" });
  res.status(204).end();
});

module.exports = router;

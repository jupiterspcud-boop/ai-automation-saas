const express = require("express");
const { nanoid } = require("nanoid");
const { transact, read } = require("../lib/db");
const { requireAuth } = require("../lib/auth");
const { scoreLead } = require("../lib/flows");

const router = express.Router();

function checkAccess(req, businessId, res) {
  if (req.user.role === "client" && req.user.businessId !== businessId) {
    res.status(403).json({ error: "Not allowed" });
    return false;
  }
  return true;
}

// PUBLIC: capture a lead — called by the embeddable chatbot widget or any
// lead-capture form on the client's own website. No auth (public traffic).
router.post("/businesses/:businessId/leads", async (req, res) => {
  const { businessId } = req.params;
  const { name, phone, answers = {}, source = "website_chat" } = req.body || {};

  const data = read();
  const biz = data.businesses.find((b) => b.id === businessId);
  if (!biz) return res.status(404).json({ error: "Business not found" });

  const { score, tier } = scoreLead({ ...answers, phone });
  const lead = {
    id: nanoid(10),
    businessId,
    name: name || "Unknown",
    phone: phone || answers.phone || "",
    answers,
    source,
    score,
    tier,
    status: "new", // new -> contacted -> qualified -> won / lost
    createdAt: new Date().toISOString(),
  };

  await transact((d) => d.leads.push(lead));
  res.status(201).json({ lead });
});

// Admin or the owning client: list leads for a business
router.get("/businesses/:businessId/leads", requireAuth(), (req, res) => {
  const { businessId } = req.params;
  if (!checkAccess(req, businessId, res)) return;
  const data = read();
  const leads = data.leads
    .filter((l) => l.businessId === businessId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(leads);
});

// Update a lead's CRM status (contacted / qualified / won / lost)
router.patch("/leads/:leadId", requireAuth(), async (req, res) => {
  const { leadId } = req.params;
  const { status } = req.body || {};
  const valid = ["new", "contacted", "qualified", "won", "lost"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const result = await transact((data) => {
    const lead = data.leads.find((l) => l.id === leadId);
    if (!lead) return null;
    if (req.user.role === "client" && req.user.businessId !== lead.businessId) return "forbidden";
    lead.status = status;
    lead.updatedAt = new Date().toISOString();
    return lead;
  });

  if (result === "forbidden") return res.status(403).json({ error: "Not allowed" });
  if (!result) return res.status(404).json({ error: "Lead not found" });
  res.json(result);
});

// Simple analytics for a business's CRM dashboard
router.get("/businesses/:businessId/analytics", requireAuth(), (req, res) => {
  const { businessId } = req.params;
  if (!checkAccess(req, businessId, res)) return;
  const data = read();
  const leads = data.leads.filter((l) => l.businessId === businessId);
  const appts = data.appointments.filter((a) => a.businessId === businessId);

  const byTier = { hot: 0, warm: 0, cold: 0 };
  const byStatus = { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 };
  leads.forEach((l) => {
    byTier[l.tier] = (byTier[l.tier] || 0) + 1;
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
  });

  res.json({
    totalLeads: leads.length,
    byTier,
    byStatus,
    totalAppointments: appts.length,
    conversionRate: leads.length ? Math.round((byStatus.won / leads.length) * 100) : 0,
  });
});

module.exports = router;

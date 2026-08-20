const express = require("express");
const { nanoid } = require("nanoid");
const { transact, read } = require("./db");
const { requireAuth } = require("./auth-helper");
const { runAutomationsForEvent } = require("./automations");
const router = express.Router();

function checkAccess(req, businessId, res) {
  if (req.user.role === "client" && req.user.businessId !== businessId) {
    res.status(403).json({ error: "Not allowed" });
    return false;
  }
  return true;
}

router.post("/businesses/:businessId/appointments", async (req, res) => {
  const { businessId } = req.params;
  const { leadId, name, phone, date, time, notes } = req.body || {};
  if (!read().businesses.find(b => b.id === businessId)) {
    return res.status(404).json({ error: "Business not found" });
  }
  if (!date) return res.status(400).json({ error: "date is required" });
  if (leadId && !read().leads.find(l => l.id === leadId && l.businessId === businessId)) {
    return res.status(400).json({ error: "Lead not found for this business" });
  }

  const appt = {
    id: nanoid(10),
    businessId,
    leadId: leadId || null,
    name: name || "Unknown",
    phone: phone || "",
    date,
    time: time || "",
    notes: notes || "",
    status: "booked",
    createdAt: new Date().toISOString()
  };

  await transact(d => {
    if (!Array.isArray(d.appointments)) d.appointments = [];
    d.appointments.push(appt);
  });

  if (appt.leadId) {
    await runAutomationsForEvent(businessId, "appointment_created", { leadId: appt.leadId, appointmentId: appt.id });
  }

  res.status(201).json({ appointment: appt });
});

router.get("/businesses/:businessId/appointments", requireAuth(), (req, res) => {
  const { businessId } = req.params;
  if (!checkAccess(req, businessId, res)) return;
  res.json(read().appointments.filter(a => a.businessId === businessId).sort((a, b) => new Date(`${a.date} ${a.time || "00:00"}`) - new Date(`${b.date} ${b.time || "00:00"}`)));
});

router.patch("/appointments/:id", requireAuth(), async (req, res) => {
  const { status } = req.body || {};
  const valid = ["booked", "reminded", "completed", "cancelled"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });
  const result = await transact(data => {
    const appt = data.appointments.find(a => a.id === req.params.id);
    if (!appt) return null;
    if (req.user.role === "client" && req.user.businessId !== appt.businessId) return "forbidden";
    const previousStatus = appt.status;
    appt.status = status;
    appt.updatedAt = new Date().toISOString();
    return { appointment: appt, previousStatus };
  });
  if (result === "forbidden") return res.status(403).json({ error: "Not allowed" });
  if (!result) return res.status(404).json({ error: "Appointment not found" });
  res.json(result.appointment);
});

module.exports = router;

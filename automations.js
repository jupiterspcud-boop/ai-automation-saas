const express = require("express");
const { nanoid } = require("nanoid");
const { transact, read } = require("./db");
const { requireAuth } = require("./auth-helper");

const router = express.Router();

const TRIGGERS = {
  lead_created: "Lead created",
  lead_status_changed: "Lead status changed",
  appointment_created: "Appointment created",
  manual: "Manual test"
};

const ACTIONS = {
  update_lead_status: "Update lead status",
  add_tag: "Add lead tag",
  create_task: "Create follow-up task",
  human_handoff: "Request human handoff",
  log: "Write automation log"
};

const VALID_STATUSES = ["new", "contacted", "qualified", "won", "lost"];
const VALID_OPERATORS = ["equals", "not_equals", "contains", "gte", "lte"];

function ensureCollections(data) {
  if (!Array.isArray(data.automations)) data.automations = [];
  if (!Array.isArray(data.automationLogs)) data.automationLogs = [];
  if (!Array.isArray(data.tasks)) data.tasks = [];
}

function checkAccess(req, businessId, res) {
  if (req.user.role === "client" && req.user.businessId !== businessId) {
    res.status(403).json({ error: "Not allowed" });
    return false;
  }
  return true;
}

function normalizeAutomation(body = {}) {
  const name = String(body.name || "").trim();
  const trigger = String(body.trigger || "lead_created").trim();
  const description = String(body.description || "").trim();
  const enabled = body.enabled !== false;
  const conditions = Array.isArray(body.conditions) ? body.conditions : [];
  const actions = Array.isArray(body.actions) ? body.actions : [];

  if (!name) throw new Error("Automation name is required");
  if (!TRIGGERS[trigger]) throw new Error("Invalid trigger");
  if (!actions.length) throw new Error("At least one action is required");

  const safeConditions = conditions.map(c => ({
    field: String(c.field || "").trim(),
    operator: String(c.operator || "equals").trim(),
    value: c.value
  }));
  for (const c of safeConditions) {
    if (!c.field) throw new Error("Condition field is required");
    if (!VALID_OPERATORS.includes(c.operator)) throw new Error("Invalid condition operator");
  }

  const safeActions = actions.map(a => ({
    type: String(a.type || "").trim(),
    config: a && typeof a.config === "object" && a.config !== null ? a.config : {}
  }));
  for (const a of safeActions) {
    if (!ACTIONS[a.type]) throw new Error("Invalid action type");
    if (a.type === "update_lead_status" && !VALID_STATUSES.includes(a.config.status)) {
      throw new Error("Invalid lead status action");
    }
    if (a.type === "add_tag" && !String(a.config.tag || "").trim()) {
      throw new Error("Tag is required for add_tag action");
    }
    if (a.type === "create_task" && !String(a.config.title || "").trim()) {
      throw new Error("Task title is required for create_task action");
    }
  }

  return { name, description, trigger, enabled, conditions: safeConditions, actions: safeActions };
}

function getFieldValue(lead, field) {
  if (field.startsWith("answer.")) return lead.answers?.[field.slice(7)];
  if (field === "score") return lead.score;
  return lead[field];
}

function matchesCondition(lead, condition) {
  const actual = getFieldValue(lead, condition.field);
  const expected = condition.value;
  const actualText = String(actual ?? "").toLowerCase();
  const expectedText = String(expected ?? "").toLowerCase();

  switch (condition.operator) {
    case "equals": return actualText === expectedText;
    case "not_equals": return actualText !== expectedText;
    case "contains": return actualText.includes(expectedText);
    case "gte": return Number(actual) >= Number(expected);
    case "lte": return Number(actual) <= Number(expected);
    default: return false;
  }
}

function matchesAutomation(automation, eventType, lead) {
  if (!automation.enabled || automation.trigger !== eventType) return false;
  return (automation.conditions || []).every(c => matchesCondition(lead, c));
}

function applyAction(data, automation, action, lead, eventType) {
  const now = new Date().toISOString();

  if (action.type === "update_lead_status") {
    lead.status = action.config.status;
    lead.updatedAt = now;
  } else if (action.type === "add_tag") {
    lead.tags = Array.isArray(lead.tags) ? lead.tags : [];
    const tag = String(action.config.tag).trim();
    if (!lead.tags.includes(tag)) lead.tags.push(tag);
  } else if (action.type === "create_task") {
    data.tasks.push({
      id: nanoid(10),
      businessId: lead.businessId,
      leadId: lead.id,
      title: String(action.config.title).trim(),
      dueAt: action.config.dueAt || null,
      status: "open",
      source: `automation:${automation.id}`,
      createdAt: now
    });
  } else if (action.type === "human_handoff") {
    lead.humanHandoff = true;
    lead.humanHandoffAt = now;
  }

  data.automationLogs.push({
    id: nanoid(10),
    businessId: lead.businessId,
    automationId: automation.id,
    leadId: lead.id,
    eventType,
    actionType: action.type,
    status: "executed",
    createdAt: now
  });
}

async function runAutomationsForEvent(businessId, eventType, payload = {}) {
  try {
    return await transact(data => {
      ensureCollections(data);
      const lead = data.leads.find(l => l.id === payload.leadId && l.businessId === businessId);
      if (!lead) return { matched: 0, executed: 0 };

      const candidates = data.automations.filter(a => a.businessId === businessId && matchesAutomation(a, eventType, lead));
      let executed = 0;
      for (const automation of candidates) {
        for (const action of automation.actions || []) {
          applyAction(data, automation, action, lead, eventType);
          executed += 1;
        }
        automation.lastRunAt = new Date().toISOString();
        automation.runCount = Number(automation.runCount || 0) + 1;
      }
      return { matched: candidates.length, executed };
    });
  } catch (error) {
    console.error("Automation engine error:", error.message);
    return { matched: 0, executed: 0, error: error.message };
  }
}

router.get("/businesses/:businessId/automations", requireAuth(), (req, res) => {
  const { businessId } = req.params;
  if (!checkAccess(req, businessId, res)) return;
  const data = read();
  res.json((data.automations || []).filter(a => a.businessId === businessId));
});

router.get("/businesses/:businessId/automation-meta", requireAuth(), (req, res) => {
  const { businessId } = req.params;
  if (!checkAccess(req, businessId, res)) return;
  res.json({ triggers: TRIGGERS, actions: ACTIONS, operators: VALID_OPERATORS });
});

router.get("/businesses/:businessId/automation-logs", requireAuth(), (req, res) => {
  const { businessId } = req.params;
  if (!checkAccess(req, businessId, res)) return;
  const data = read();
  const logs = Array.isArray(data.automationLogs) ? data.automationLogs : [];
  res.json(logs.filter(l => l.businessId === businessId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100));
});

router.post("/businesses/:businessId/automations", requireAuth(), async (req, res) => {
  const { businessId } = req.params;
  if (!checkAccess(req, businessId, res)) return;
  try {
    const normalized = normalizeAutomation(req.body);
    const automation = {
      id: nanoid(12), businessId, ...normalized, runCount: 0, lastRunAt: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await transact(data => { ensureCollections(data); data.automations.push(automation); });
    res.status(201).json({ automation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/automations/:automationId", requireAuth(), async (req, res) => {
  const { automationId } = req.params;
  const current = (read().automations || []).find(a => a.id === automationId);
  if (!current) return res.status(404).json({ error: "Automation not found" });
  if (!checkAccess(req, current.businessId, res)) return;

  try {
    const merged = normalizeAutomation({ ...current, ...req.body });
    const updated = await transact(data => {
      ensureCollections(data);
      const automation = data.automations.find(a => a.id === automationId);
      if (!automation) return null;
      Object.assign(automation, merged, { updatedAt: new Date().toISOString() });
      return automation;
    });
    res.json({ automation: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/automations/:automationId", requireAuth(), async (req, res) => {
  const current = (read().automations || []).find(a => a.id === req.params.automationId);
  if (!current) return res.status(404).json({ error: "Automation not found" });
  if (!checkAccess(req, current.businessId, res)) return;
  await transact(data => {
    ensureCollections(data);
    data.automations = data.automations.filter(a => a.id !== req.params.automationId);
  });
  res.json({ ok: true });
});

router.post("/automations/:automationId/test", requireAuth(), async (req, res) => {
  const current = (read().automations || []).find(a => a.id === req.params.automationId);
  if (!current) return res.status(404).json({ error: "Automation not found" });
  if (!checkAccess(req, current.businessId, res)) return;
  const leadId = String(req.body?.leadId || "").trim();
  if (!leadId) return res.status(400).json({ error: "leadId is required for a test" });
  const result = await runAutomationsForEvent(current.businessId, current.trigger, { leadId });
  res.json(result);
});

module.exports = { router, runAutomationsForEvent, TRIGGERS, ACTIONS };

const test = require("node:test");
const assert = require("node:assert/strict");
const { nanoid } = require("nanoid");
const { read, write, transact } = require("../db");
const { runAutomationsForEvent } = require("../automations");

test("lead-created automation executes a follow-up task", async () => {
  const data = read();
  const businessId = `test-${nanoid(6)}`;
  const leadId = `lead-${nanoid(6)}`;
  const automationId = `auto-${nanoid(6)}`;

  data.businesses.push({ id: businessId, name: "Automation Test", modules: {} });
  data.leads.push({
    id: leadId,
    businessId,
    name: "Test Lead",
    phone: "9876543210",
    score: 85,
    tier: "hot",
    status: "new",
    answers: {},
    createdAt: new Date().toISOString()
  });
  data.automations.push({
    id: automationId,
    businessId,
    name: "Hot lead follow-up",
    trigger: "lead_created",
    enabled: true,
    conditions: [{ field: "score", operator: "gte", value: 70 }],
    actions: [{ type: "create_task", config: { title: "Call hot lead" } }],
    runCount: 0,
    lastRunAt: null,
    createdAt: new Date().toISOString()
  });
  write(data);

  try {
    const result = await runAutomationsForEvent(businessId, "lead_created", { leadId });
    assert.equal(result.matched, 1);
    assert.equal(result.executed, 1);
    const after = read();
    const task = after.tasks.find(t => t.businessId === businessId && t.leadId === leadId);
    assert.ok(task);
    assert.equal(task.title, "Call hot lead");
  } finally {
    await transact(db => {
      db.businesses = db.businesses.filter(b => b.id !== businessId);
      db.leads = db.leads.filter(l => l.id !== leadId);
      db.automations = db.automations.filter(a => a.id !== automationId);
      db.tasks = db.tasks.filter(t => t.businessId !== businessId);
      db.automationLogs = db.automationLogs.filter(l => l.businessId !== businessId);
    });
  }
});

test("appointment-created automation can create a follow-up task for the linked lead", async () => {
  const data = read();
  const businessId = `test-${nanoid(6)}`;
  const leadId = `lead-${nanoid(6)}`;
  const automationId = `auto-${nanoid(6)}`;

  data.businesses.push({ id: businessId, name: "Appointment Test", modules: {} });
  data.leads.push({
    id: leadId,
    businessId,
    name: "Booked Lead",
    phone: "9876543210",
    score: 50,
    tier: "warm",
    status: "qualified",
    answers: {},
    createdAt: new Date().toISOString()
  });
  data.automations.push({
    id: automationId,
    businessId,
    name: "Appointment follow-up",
    trigger: "appointment_created",
    enabled: true,
    conditions: [{ field: "status", operator: "equals", value: "qualified" }],
    actions: [{ type: "create_task", config: { title: "Confirm appointment" } }],
    runCount: 0,
    lastRunAt: null,
    createdAt: new Date().toISOString()
  });
  write(data);

  try {
    const result = await runAutomationsForEvent(businessId, "appointment_created", { leadId });
    assert.equal(result.matched, 1);
    assert.equal(result.executed, 1);
    const after = read();
    const task = after.tasks.find(t => t.businessId === businessId && t.leadId === leadId);
    assert.ok(task);
    assert.equal(task.title, "Confirm appointment");
  } finally {
    await transact(db => {
      db.businesses = db.businesses.filter(b => b.id !== businessId);
      db.leads = db.leads.filter(l => l.id !== leadId);
      db.automations = db.automations.filter(a => a.id !== automationId);
      db.tasks = db.tasks.filter(t => t.businessId !== businessId);
      db.automationLogs = db.automationLogs.filter(l => l.businessId !== businessId);
    });
  }
});

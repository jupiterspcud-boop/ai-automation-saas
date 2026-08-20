const { transact, read } = require("./db");
const { MAX_AUTOMATION_RETRIES } = require("./automations");

let workerRunning = false;
let timer = null;

async function processAutomationJobs() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    const now = Date.now();
    await transact(data => {
      if (!Array.isArray(data.automationJobs)) data.automationJobs = [];
      if (!Array.isArray(data.tasks)) data.tasks = [];
      if (!Array.isArray(data.automationLogs)) data.automationLogs = [];

      for (const job of data.automationJobs) {
        if (job.status !== "pending" || !job.runAt || Date.parse(job.runAt) > now) continue;
        const attempts = Number(job.attempts || 0) + 1;
        job.attempts = attempts;
        job.updatedAt = new Date().toISOString();

        try {
          if (job.type !== "create_task") throw new Error(`Unsupported automation job type: ${job.type}`);
          const lead = data.leads.find(l => l.id === job.leadId && l.businessId === job.businessId);
          if (!lead) throw new Error("Lead not found");
          const config = job.config || {};
          const title = String(config.title || "Follow up with lead").trim();
          if (!title) throw new Error("Task title is required");

          data.tasks.push({
            id: require("nanoid").nanoid(10),
            businessId: job.businessId,
            leadId: lead.id,
            title,
            dueAt: config.dueAt || null,
            status: "open",
            source: `automation:${job.automationId}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          job.status = "completed";
          job.completedAt = new Date().toISOString();
          data.automationLogs.push({
            id: require("nanoid").nanoid(10),
            businessId: job.businessId,
            automationId: job.automationId,
            leadId: job.leadId,
            eventType: job.eventType,
            actionType: job.type,
            status: "executed",
            jobId: job.id,
            attempts,
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          job.error = error.message;
          if (attempts >= Number(job.maxAttempts || MAX_AUTOMATION_RETRIES)) {
            job.status = "failed";
            job.failedAt = new Date().toISOString();
            data.automationLogs.push({
              id: require("nanoid").nanoid(10),
              businessId: job.businessId,
              automationId: job.automationId,
              leadId: job.leadId,
              eventType: job.eventType,
              actionType: job.type,
              status: "failed",
              jobId: job.id,
              attempts,
              error: error.message,
              createdAt: new Date().toISOString()
            });
          } else {
            const retryDelay = Math.min(60 * 1000 * Math.pow(2, attempts - 1), 15 * 60 * 1000);
            job.runAt = new Date(Date.now() + retryDelay).toISOString();
            job.status = "pending";
          }
        }
      }
    });
  } catch (error) {
    console.error("Automation worker error:", error.message);
  } finally {
    workerRunning = false;
  }
}

function startAutomationWorker(intervalMs = 15000) {
  if (timer) return;
  processAutomationJobs();
  timer = setInterval(processAutomationJobs, intervalMs);
}

function stopAutomationWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { processAutomationJobs, startAutomationWorker, stopAutomationWorker };

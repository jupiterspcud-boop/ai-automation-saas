const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { transact, read } = require("./db");

const authRoutes = require("./auth");
const businessRoutes = require("./businesses");
const leadRoutes = require("./leads");
const appointmentRoutes = require("./appointments");
const chatbotRoutes = require("./chatbot");
const aiRoutes = require("./ai");
const automationRoutes = require("./automations").router;

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api", leadRoutes);
app.use("/api", appointmentRoutes);
app.use("/api", chatbotRoutes);
app.use("/api", aiRoutes);
app.use("/api", automationRoutes);

app.get("/api/health", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

app.use(express.static(__dirname));

async function ensureVoxBridgeBusiness() {
  const exists = read().businesses.some(b => b.id === "voxbridge");
  if (exists) return;
  await transact(data => {
    if (data.businesses.some(b => b.id === "voxbridge")) return;
    data.businesses.push({
      id: "voxbridge",
      name: "VoxBridge",
      niche: "generic",
      package: "starter",
      modules: {
        ai_receptionist: true,
        whatsapp: false,
        instagram: false,
        facebook: false,
        website_chat: true,
        lead_capture: true,
        lead_qualification: true,
        lead_scoring: true,
        followup: false,
        appointment: true,
        crm: true,
        payment: false,
        invoice: false,
        review: false,
        voice_ai: false,
        human_handoff: true,
        analytics: true,
        ai_reports: false
      },
      passcodeHash: bcrypt.hashSync("VOXBRIDGE-SETUP", 8),
      createdAt: new Date().toISOString()
    });
  });
}

const PORT = process.env.PORT || 3000;
ensureVoxBridgeBusiness()
  .catch(err => console.error("Unable to initialize VoxBridge:", err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`AI Automation SaaS platform running on port ${PORT}`);
    });
  });

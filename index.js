const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
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

// Keep the friendly /demo URL working in addition to /demo.html.
app.get("/demo", (req, res) => res.sendFile(path.join(__dirname, "demo.html")));
app.use(express.static(__dirname));

async function ensureDemoBusinesses() {
  const existing = read().businesses.map(b => b.id);
  const now = new Date().toISOString();
  const defaults = [
    {
      id: "green-acres-realty",
      name: "Green Acres Realty",
      niche: "real_estate",
      package: "starter",
      modules: {
        ai_receptionist: true, whatsapp: false, instagram: false, facebook: false,
        website_chat: true, lead_capture: true, lead_qualification: true,
        lead_scoring: true, followup: false, appointment: true, crm: true,
        payment: false, invoice: false, review: false, voice_ai: false,
        human_handoff: true, analytics: true, ai_reports: false
      },
      passcodeHash: bcrypt.hashSync("GREEN-ACRES-SETUP", 8),
      createdAt: now
    },
    {
      id: "voxbridge",
      name: "VoxBridge",
      niche: "generic",
      package: "starter",
      modules: {
        ai_receptionist: true, whatsapp: false, instagram: false, facebook: false,
        website_chat: true, lead_capture: true, lead_qualification: true,
        lead_scoring: true, followup: false, appointment: true, crm: true,
        payment: false, invoice: false, review: false, voice_ai: false,
        human_handoff: true, analytics: true, ai_reports: false
      },
      passcodeHash: bcrypt.hashSync("VOXBRIDGE-SETUP", 8),
      createdAt: now
    }
  ];

  const missing = defaults.filter(b => !existing.includes(b.id));
  if (!missing.length) return;
  await transact(data => {
    for (const business of missing) {
      if (!data.businesses.some(b => b.id === business.id)) data.businesses.push(business);
    }
  });
}

const PORT = process.env.PORT || 3000;
ensureDemoBusinesses()
  .catch(err => console.error("Unable to initialize demo businesses:", err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`AI Automation SaaS platform running on port ${PORT}`);
    });
  });

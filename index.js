const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const businessRoutes = require("./routes/businesses");
const leadRoutes = require("./routes/leads");
const appointmentRoutes = require("./routes/appointments");
const chatbotRoutes = require("./routes/chatbot");

const app = express();
app.use(cors()); // widget runs on 3rd-party client websites, so CORS must stay open
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api", leadRoutes); // /api/businesses/:id/leads, /api/leads/:id
app.use("/api", appointmentRoutes); // /api/businesses/:id/appointments
app.use("/api", chatbotRoutes); // /api/businesses/:id/chatbot-flow

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Serve the dashboards + embeddable widget as static files
app.use(express.static(path.join(__dirname, "..", "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nAI Automation SaaS platform running:`);
  console.log(`  Admin dashboard  -> http://localhost:${PORT}/admin.html`);
  console.log(`  Client dashboard -> http://localhost:${PORT}/client.html`);
  console.log(`  Widget demo page -> http://localhost:${PORT}/demo.html`);
  console.log(`  Default admin login -> admin / admin123 (change via env vars!)\n`);
});

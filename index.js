const express = require("express");
const cors = require("cors");

const authRoutes = require("./auth");
const businessRoutes = require("./businesses");
const leadRoutes = require("./leads");
const appointmentRoutes = require("./appointments");
const chatbotRoutes = require("./chatbot");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api", leadRoutes);
app.use("/api", appointmentRoutes);
app.use("/api", chatbotRoutes);

app.get("/api/health", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Automation SaaS platform running on port ${PORT}`);
});

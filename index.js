const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const businessRoutes = require("./routes/businesses");
const leadRoutes = require("./routes/leads");
const appointmentRoutes = require("./routes/appointments");
const chatbotRoutes = require("./routes/chatbot");

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

// Static HTML/CSS/JS files are stored at the repository root.
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Automation SaaS platform running on port ${PORT}`);
});

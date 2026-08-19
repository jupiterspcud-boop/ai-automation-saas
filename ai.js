const express = require("express");
const { read } = require("./db");
const { getFlow } = require("./flows");

const router = express.Router();

router.post("/businesses/:businessId/ai-chat", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ enabled: false, error: "AI is not configured" });

  const biz = read().businesses.find(b => b.id === req.params.businessId);
  if (!biz) return res.status(404).json({ error: "Business not found" });
  if (!biz.modules.website_chat && !biz.modules.ai_receptionist) {
    return res.status(403).json({ error: "Chat is disabled for this business" });
  }

  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "Message is required" });

  const flow = getFlow(biz.niche);
  const question = String(req.body?.currentQuestion || "").trim();
  const answers = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : {};

  const system = `You are the helpful AI assistant for ${biz.name}, a ${flow.label} business.\n` +
    `Answer the visitor's question briefly and naturally. Use only information supplied in this prompt; never invent business-specific prices, properties, guarantees, availability, phone numbers, or policies.\n` +
    `If the visitor asks for advice such as "which is better", explain the relevant options in simple language and then ask a short clarification question when needed.\n` +
    `The website chatbot is collecting a lead, so do not end the conversation or ask for unrelated contact details. The existing question flow remains in control.\n` +
    `Current chatbot question: ${question || "none"}\n` +
    `Collected answers: ${JSON.stringify(answers)}`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        instructions: system,
        input: message,
        max_output_tokens: 220,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI API error", response.status, data?.error?.message || data);
      return res.status(502).json({ enabled: true, error: "AI request failed" });
    }

    const text = data.output_text || "";
    if (!text) return res.status(502).json({ enabled: true, error: "AI returned no answer" });
    res.json({ enabled: true, answer: text });
  } catch (err) {
    console.error("AI request error", err.message);
    res.status(502).json({ enabled: true, error: "AI request failed" });
  }
});

module.exports = router;

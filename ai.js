const express = require("express");
const { read } = require("./db");
const { getFlow } = require("./flows");

const router = express.Router();

router.post("/businesses/:businessId/ai-chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
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

  const system = `You are the helpful AI assistant for ${biz.name}, a ${flow.label} business.
Answer the visitor's question briefly and naturally. Use only information supplied in this prompt; never invent business-specific prices, properties, guarantees, availability, phone numbers, or policies.
If the visitor asks for advice such as "which is better", "what is best", "which option should I choose", or Tamil equivalents such as "எது best", explain the relevant options in simple language and give a practical general recommendation based on the visitor's stated goal. Do not pretend to know a specific property or business offering.
For the Real Estate purpose question, explain the difference between Own Use and Investment. Own Use is generally better when the buyer plans to live in the property; Investment is generally better when the goal is rental income or future appreciation. Then ask which goal matches them.
The website chatbot is collecting a lead, so do not end the conversation or ask for unrelated contact details. The existing question flow remains in control.
Current chatbot question: ${question || "none"}
Collected answers: ${JSON.stringify(answers)}`;

  try {
    // Prefer Gemini because the deployed Render service is configured with GEMINI_API_KEY.
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 220, temperature: 0.3 },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Gemini API error", response.status, data?.error?.message || data);
        return res.status(502).json({ enabled: true, error: "AI request failed" });
      }

      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim() || "";
      if (!text) return res.status(502).json({ enabled: true, error: "AI returned no answer" });
      return res.json({ enabled: true, answer: text });
    }

    // Backward-compatible OpenAI fallback if a deployment still uses OPENAI_API_KEY.
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
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
    return res.json({ enabled: true, answer: text });
  } catch (err) {
    console.error("AI request error", err.message);
    return res.status(502).json({ enabled: true, error: "AI request failed" });
  }
});

module.exports = router;

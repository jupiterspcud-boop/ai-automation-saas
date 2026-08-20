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
  const questionId = String(req.body?.currentQuestionId || "").trim();
  const answers = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : {};

  const siteContext = biz.id === "voxbridge"
    ? [
        "VoxBridge provides AI-powered video dubbing and live streaming solutions.",
        "The website describes creating multilingual versions of videos while preserving a natural viewing experience.",
        "The website also describes real-time live streaming and helping content reach audiences across languages.",
        "No public service pricing, delivery guarantee, availability schedule, phone number, or specific customer offer is provided to the assistant."
      ].join(" ")
    : `No additional business-specific facts are available beyond the business name (${biz.name}), niche (${flow.label}), and the configured lead questions.`;

  const system = `You are the website chatbot for ${biz.name}, a ${flow.label} business.
${siteContext}

The chatbot is currently collecting a lead. The current lead question is: ${question || "none"} (id: ${questionId || "none"}). Collected answers so far: ${JSON.stringify(answers)}.

Answer the visitor's MESSAGE only when it is actually a question. Keep the answer short, useful and natural. Then stop; the website widget will repeat the current lead question automatically.

Rules:
1. Never invent business-specific prices, discounts, properties, appointment availability, delivery dates, guarantees, phone numbers, policies, or services that are not in the supplied context.
2. If the visitor asks about VoxBridge services, use only the supplied VoxBridge context. If they ask for pricing, say that pricing depends on scope/requirements and ask them to provide their requirement or budget; never invent a number.
3. If the visitor asks "which is better", "what is best", "எது best", "எது நல்லது", or similar, explain the relevant options using the visitor's stated goal. For Real Estate purpose, Own Use is generally for living in the property; Investment is generally for rental income or future appreciation.
4. If the visitor asks how to do something, explain the general process briefly without pretending the business has a feature that was not supplied.
5. Do not treat the visitor's question as their answer to the current lead field. Do not ask for unrelated contact information.
6. Match the visitor's language when practical (English, Tamil, or Tanglish). Do not switch to a long formal response.
7. If the message is not a real question, do not reinterpret it; give a very short acknowledgement only if needed.
`;

  try {
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 180, temperature: 0.15 },
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
        max_output_tokens: 180,
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

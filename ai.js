const express = require("express");
const { read } = require("./db");
const { getFlow } = require("./flows");

const router = express.Router();

function normalizeTamilDigits(text) {
  const map = {"௦":"0","௧":"1","௨":"2","௩":"3","௪":"4","௫":"5","௬":"6","௭":"7","௮":"8","௯":"9"};
  return String(text || "").normalize("NFC").replace(/[௦-௯]/g, ch => map[ch]).replace(/\s+/g, " ").trim();
}

function knowledgeContext(biz) {
  const items = Array.isArray(biz.knowledge) ? biz.knowledge : [];
  if (!items.length) return "No client-specific knowledge has been added yet. Do not invent business facts, prices, availability, guarantees, or contact details.";
  return items.slice(0, 40).map((item, index) => {
    const title = String(item.title || `Knowledge ${index + 1}`).slice(0, 200);
    const content = String(item.content || "").slice(0, 12000);
    const tags = Array.isArray(item.tags) && item.tags.length ? ` Tags: ${item.tags.join(", ")}.` : "";
    return `KNOWLEDGE ${index + 1} — ${title}.${tags}\n${content}`;
  }).join("\n\n");
}

router.post("/businesses/:businessId/ai-chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ enabled: false, error: "AI is not configured" });

  const biz = read().businesses.find(b => b.id === req.params.businessId);
  if (!biz) return res.status(404).json({ error: "Business not found" });
  if (!biz.modules.website_chat && !biz.modules.ai_receptionist) return res.status(403).json({ error: "Chat is disabled for this business" });

  const message = normalizeTamilDigits(req.body?.message || "");
  if (!message) return res.status(400).json({ error: "Message is required" });

  const flow = getFlow(biz.niche);
  const question = normalizeTamilDigits(req.body?.currentQuestion || "");
  const questionId = String(req.body?.currentQuestionId || "").trim();
  const answers = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : {};
  const clientKnowledge = knowledgeContext(biz);

  const system = `You are the customer-facing website chatbot for ${biz.name}. Your niche is ${flow.label}.

CLIENT KNOWLEDGE BASE — use these client facts as your primary source of truth:
${clientKnowledge}

The visitor is currently completing a lead form. Current lead question: ${question || "none"} (id: ${questionId || "none"}). Answers collected so far: ${JSON.stringify(answers)}.

IMPORTANT LANGUAGE RULES:
- The visitor may speak through a phone microphone. Their speech can arrive as Tamil script, Tanglish, English, or mixed Tamil-English text.
- Treat Tamil script and Tanglish as normal language, not as gibberish.
- Understand the meaning before answering. Do not repeat or translate the visitor's words unless useful.
- Reply in the same language style as the visitor whenever practical. If they use Tamil/Tanglish, answer in simple Tamil/Tanglish.

KNOWLEDGE RULES:
- Answer business-specific questions from the CLIENT KNOWLEDGE BASE above.
- Do not mix information from another business or another tenant.
- If the answer is not present in the knowledge base, clearly say that the available business information does not confirm it and offer to collect the visitor's requirement for follow-up.
- Never invent prices, discounts, packages, guarantees, turnaround times, phone numbers, appointments, or availability.
- You may use general knowledge only to explain general concepts, but never present it as a specific fact about ${biz.name}.

QUESTION ANSWERING:
- Answer the visitor's actual question only when the message is clearly a question or request for information.
- After answering, do not take the question as the lead-field answer. The website widget will ask the current lead question again.
- Keep answers short, direct, and useful.
- If the visitor's message is clearly an answer to the current lead question rather than a question, do not answer it as an FAQ.
- For a non-question lead answer, give at most a brief acknowledgement if needed. Do not derail the lead flow.`;

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
          generationConfig: { maxOutputTokens: 220, temperature: 0.1 },
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
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", instructions: system, input: message, max_output_tokens: 220 }),
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

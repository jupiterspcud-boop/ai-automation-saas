const express = require("express");
const { read } = require("./db");
const { getFlow } = require("./flows");

const router = express.Router();

function normalizeTamilDigits(text) {
  const map = {"௦":"0","௧":"1","௨":"2","௩":"3","௪":"4","௫":"5","௬":"6","௭":"7","௮":"8","௯":"9"};
  return String(text || "").normalize("NFC").replace(/[௦-௯]/g, ch => map[ch]).replace(/\s+/g, " ").trim();
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

  const siteContext = biz.id === "voxbridge"
    ? [
        "VoxBridge provides AI-powered video dubbing and live streaming solutions.",
        "Its website describes creating multilingual versions of videos while preserving a natural viewing experience.",
        "It also describes real-time live streaming and helping content reach audiences across languages.",
        "The supplied website facts do not include public pricing, delivery guarantees, availability schedules, phone numbers, or other unverified commercial promises."
      ].join(" ")
    : `No additional business-specific facts are available beyond the business name (${biz.name}), niche (${flow.label}), and the configured lead questions.`;

  const system = `You are the customer-facing website chatbot for ${biz.name}.
${siteContext}

The visitor is currently completing a lead form. Current lead question: ${question || "none"} (id: ${questionId || "none"}). Answers collected so far: ${JSON.stringify(answers)}.

IMPORTANT LANGUAGE RULES:
- The visitor may speak through a phone microphone. Their speech can arrive as Tamil script, Tanglish, English, or mixed Tamil-English text.
- Treat Tamil script and Tanglish as normal language, not as gibberish.
- Understand the meaning before answering. Do not repeat or translate the visitor's words unless useful.
- Reply in the same language style as the visitor whenever practical. If they use Tamil/Tanglish, answer in simple Tamil/Tanglish.
- Do not confuse a lead answer with a question merely because it contains words such as 'வேண்டும்', 'வேணும்', 'வேணாம்', 'பண்ணுவேன்', 'பண்ணுங்க', 'venum', 'venam', 'pannu', 'pannunga', 'tomorrow', or 'today'.

QUESTION ANSWERING:
- Answer the visitor's actual question only when the message is clearly a question or request for information.
- After answering, do not take the question as the lead-field answer. The website widget will ask the current lead question again.
- Keep answers short, direct, and useful.
- If the visitor asks what VoxBridge does, explain AI video dubbing and live streaming from the supplied context.
- If they ask how AI video dubbing works, give a brief general explanation: source video/audio is processed, speech is translated/dubbed into the target language, and the resulting version is prepared for the intended audience. Do not claim unsupported technical features.
- If they ask about live streaming, explain that VoxBridge focuses on real-time streaming for audiences across languages, without inventing platforms, capacity, or latency numbers.
- If they ask for price/cost, say pricing depends on scope, languages, video duration, and requirements; never invent a price.
- If they ask for an exact service, feature, guarantee, turnaround time, phone number, or availability that is not in the supplied context, say that the website information provided to you does not confirm it and invite them to share their requirement for follow-up.
- Never invent discounts, packages, customer names, phone numbers, appointments, or guarantees.
- If the visitor's message is clearly an answer to the current lead question rather than a question, do not answer it as an FAQ.

Examples of questions that should be understood correctly:
- Tamil: "VoxBridge என்ன செய்கிறது?", "AI dubbing எப்படி வேலை செய்கிறது?", "Live streaming என்ன?", "எவ்வளவு செலவு ஆகும்?"
- Tanglish: "VoxBridge enna service?", "AI dubbing epdi work aagum?", "live streaming na enna?", "evlo cost aagum?"
- Mixed: "Tamil video-ai English-la dub panna mudiyuma?"

For a non-question lead answer, give at most a brief acknowledgement if needed. Do not derail the lead flow.`;

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
          generationConfig: { maxOutputTokens: 180, temperature: 0.1 },
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
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", instructions: system, input: message, max_output_tokens: 180 }),
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

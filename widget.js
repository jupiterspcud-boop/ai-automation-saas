/*
 * AI Automation Platform — embeddable chatbot widget.
 * Usage: <script src="https://YOUR_DOMAIN/widget.js" data-business-id="xxxx"></script>
 * Runs entirely client-side; talks only to the public, unauthenticated
 * endpoints (/chatbot-flow, /leads, /appointments) — safe to embed on any
 * public website.
 */
(function () {
  const scriptTag = document.currentScript;
  const businessId = scriptTag.getAttribute("data-business-id");
  const API_BASE = new URL(scriptTag.src).origin + "/api";

  if (!businessId) {
    console.error("[AI widget] data-business-id is required on the script tag");
    return;
  }

  const ORANGE = "#d9622b";
  const DARK = "#1f1f1f";

  const style = document.createElement("style");
  style.textContent = `
    .aiw-bubble { position: fixed; bottom: 22px; right: 22px; width: 58px; height: 58px;
      border-radius: 50%; background: ${ORANGE}; color: #fff; display: flex; align-items: center;
      justify-content: center; font-size: 26px; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,.25);
      z-index: 999998; border: none; }
    .aiw-window { position: fixed; bottom: 92px; right: 22px; width: 340px; max-height: 480px;
      background: #fff; border-radius: 14px; box-shadow: 0 12px 32px rgba(0,0,0,.25); display: none;
      flex-direction: column; overflow: hidden; z-index: 999999; font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
    .aiw-window.open { display: flex; }
    .aiw-header { background: ${DARK}; color: #fff; padding: 14px 16px; font-weight: 600; font-size: 14px; }
    .aiw-header small { display:block; font-weight:400; opacity:.7; font-size: 11px; margin-top:2px;}
    .aiw-body { flex: 1; padding: 14px; overflow-y: auto; background: #faf8f5; font-size: 14px; }
    .aiw-msg { margin-bottom: 10px; max-width: 85%; padding: 8px 12px; border-radius: 10px; line-height: 1.4; }
    .aiw-msg.bot { background: #fff; border: 1px solid #e7e2da; color: ${DARK}; border-bottom-left-radius: 2px; }
    .aiw-msg.user { background: ${ORANGE}; color: #fff; margin-left: auto; border-bottom-right-radius: 2px; }
    .aiw-input-row { display: flex; border-top: 1px solid #e7e2da; }
    .aiw-input-row input { flex: 1; border: none; padding: 12px; font-size: 14px; outline: none; }
    .aiw-input-row button { background: ${ORANGE}; color: #fff; border: none; padding: 0 16px; cursor: pointer; font-weight: 600; }
    .aiw-done { padding: 14px; text-align:center; font-size: 13px; color: #3a8a5c; }
  `;
  document.head.appendChild(style);

  const bubble = document.createElement("button");
  bubble.className = "aiw-bubble";
  bubble.innerHTML = "💬";
  document.body.appendChild(bubble);

  const win = document.createElement("div");
  win.className = "aiw-window";
  win.innerHTML = `
    <div class="aiw-header">Chat with us<small>Usually replies instantly</small></div>
    <div class="aiw-body" id="aiw-body"></div>
    <div class="aiw-input-row">
      <input id="aiw-input" type="text" placeholder="Type your answer…" />
      <button id="aiw-send">Send</button>
    </div>
  `;
  document.body.appendChild(win);

  bubble.onclick = () => {
    win.classList.toggle("open");
    if (win.classList.contains("open") && !state.started) startFlow();
  };

  const body = win.querySelector("#aiw-body");
  const input = win.querySelector("#aiw-input");
  const sendBtn = win.querySelector("#aiw-send");

  function addMsg(text, who) {
    const m = document.createElement("div");
    m.className = "aiw-msg " + who;
    m.textContent = text;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
  }

  const state = { started: false, flow: null, step: 0, answers: {}, name: "" };

  async function startFlow() {
    state.started = true;
    try {
      const res = await fetch(`${API_BASE}/businesses/${businessId}/chatbot-flow`);
      if (!res.ok) throw new Error("flow unavailable");
      state.flow = await res.json();
      addMsg(state.flow.greeting, "bot");
      setTimeout(() => askNext(), 400);
    } catch (e) {
      addMsg("Sorry, chat is temporarily unavailable. Please call us directly.", "bot");
    }
  }

  function askNext() {
    if (state.step === 0) {
      addMsg("First, what's your name?", "bot");
      return;
    }
    const q = state.flow.questions[state.step - 1];
    if (!q) return finish();
    addMsg(q.text, "bot");
  }

  async function finish() {
    addMsg("Thank you! Our team will reach out to you shortly. 🙌", "bot");
    try {
      const res = await fetch(`${API_BASE}/businesses/${businessId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          phone: state.answers.phone || "",
          answers: state.answers,
          source: "website_chat",
        }),
      });
      const data = await res.json();
      if (data.lead) {
        const doneMsg = document.createElement("div");
        doneMsg.className = "aiw-done";
        doneMsg.textContent = "✓ Your details have been saved.";
        body.appendChild(doneMsg);
      }
    } catch (e) { /* fail silently for the visitor */ }
    input.disabled = true;
    sendBtn.disabled = true;
    input.placeholder = "Conversation complete";
  }

  function isRecommendationQuestion(text) {
    return /\b(best|better|recommend|recommended|which|option)\b/i.test(text) ||
      /(எது|என்ன|சிறந்த|நல்ல|பரிந்துரை|எந்த).*(best|better|option|சிறந்த|நல்ல)/i.test(text) ||
      /(எது|என்ன|சிறந்த|நல்ல|பரிந்துரை)/i.test(text);
  }

  function handlePurposeRecommendation() {
    addMsg(
      "It depends on your goal 🙂 If you're buying for your own living, Own Use is usually the better fit. If you're looking for rental income or future returns, Investment may be better. Which one matches your goal?",
      "bot"
    );
  }

  function handleSend() {
    const val = input.value.trim();
    if (!val) return;
    addMsg(val, "user");
    input.value = "";

    if (state.step === 0) {
      state.name = val;
      state.step += 1;
      setTimeout(() => askNext(), 350);
      return;
    }

    const q = state.flow.questions[state.step - 1];

    // For the Real Estate purpose question, don't treat a recommendation
    // request such as "Which is best?" as the user's actual answer. Explain
    // both options and ask the same question again instead of skipping ahead.
    if (q && q.id === "purpose" && isRecommendationQuestion(val)) {
      setTimeout(() => handlePurposeRecommendation(), 350);
      return;
    }

    if (q) state.answers[q.id] = val;
    state.step += 1;
    setTimeout(() => askNext(), 350);
  }

  sendBtn.onclick = handleSend;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSend(); });
})();

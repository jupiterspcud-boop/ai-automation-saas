/* AI Automation Platform — embeddable chatbot widget */
(function () {
  const scriptTag = document.currentScript;
  const businessId = scriptTag && scriptTag.getAttribute("data-business-id");
  const API_BASE = scriptTag ? new URL(scriptTag.src, location.href).origin + "/api" : location.origin + "/api";
  if (!businessId) { console.error("[AI widget] data-business-id is required"); return; }
  if (window.__AI_WIDGET_LOADED__) return;
  window.__AI_WIDGET_LOADED__ = true;

  const ORANGE = "#d9622b", DARK = "#161b24";
  const style = document.createElement("style");
  style.textContent = `.aiw-bubble{position:fixed!important;bottom:22px!important;right:22px!important;width:60px!important;height:60px!important;border-radius:50%!important;background:${ORANGE}!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:25px!important;cursor:pointer!important;box-shadow:0 10px 28px rgba(0,0,0,.28)!important;z-index:2147483000!important;border:0!important}.aiw-window{position:fixed!important;bottom:94px!important;right:22px!important;width:min(370px,calc(100vw - 28px))!important;height:500px!important;background:#fff!important;border-radius:18px!important;box-shadow:0 20px 60px rgba(0,0,0,.3)!important;display:none!important;flex-direction:column!important;overflow:hidden!important;z-index:2147483001!important;font-family:Arial,sans-serif!important}.aiw-window.open{display:flex!important}.aiw-header{background:${DARK};color:#fff;padding:16px;font-weight:700}.aiw-header small{display:block;font-weight:400;opacity:.72;font-size:12px;margin-top:4px}.aiw-body{flex:1;padding:14px;overflow-y:auto;background:#faf8f5;font-size:14px}.aiw-msg{margin-bottom:10px;max-width:85%;padding:10px 12px;border-radius:12px;line-height:1.45}.aiw-msg.bot{background:#fff;border:1px solid #e7e2da;color:${DARK}}.aiw-msg.user{background:${ORANGE};color:#fff;margin-left:auto}.aiw-input-row{display:flex;border-top:1px solid #e7e2da;background:#fff}.aiw-input-row input{flex:1;min-width:0;border:0;padding:14px;font-size:14px;outline:0}.aiw-input-row button{background:${ORANGE};color:#fff;border:0;padding:0 18px;cursor:pointer;font-weight:700}.aiw-done{padding:12px;text-align:center;font-size:13px;color:#28734d}`;
  document.head.appendChild(style);

  const bubble = document.createElement("button");
  bubble.className = "aiw-bubble";
  bubble.type = "button";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.innerHTML = "💬";
  document.body.appendChild(bubble);

  const win = document.createElement("div");
  win.className = "aiw-window";
  win.innerHTML = `<div class="aiw-header">Chat with us<small>Usually replies instantly</small></div><div class="aiw-body"></div><div class="aiw-input-row"><input type="text" placeholder="Type your answer…"/><button type="button">Send</button></div>`;
  document.body.appendChild(win);

  const body = win.querySelector(".aiw-body");
  const input = win.querySelector("input");
  const sendBtn = win.querySelector("button");
  const state = { started:false, flow:null, step:0, answers:{}, conversation:[], leadSaved:false, name:"", phase:"lead", appointment:{date:"",time:"",notes:""}, appointmentStep:0 };

  function addMsg(text, who) {
    const m = document.createElement("div");
    m.className = "aiw-msg " + who;
    m.textContent = text;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    state.conversation.push({ role: who === "bot" ? "assistant" : "user", text:String(text) });
  }

  function open() {
    win.classList.add("open");
    if (!state.started) startFlow();
    setTimeout(() => input.focus(), 50);
  }
  function close() { win.classList.remove("open"); }
  bubble.onclick = () => win.classList.contains("open") ? close() : open();
  window.AIWidgetOpen = open;
  window.AIWidgetClose = close;
  window.dispatchEvent(new Event("aiwidgetready"));

  async function startFlow() {
    state.started = true;
    try {
      const r = await fetch(`${API_BASE}/businesses/${encodeURIComponent(businessId)}/chatbot-flow`);
      if (!r.ok) throw Error("flow unavailable");
      state.flow = await r.json();
      addMsg(state.flow.greeting || "Hi! How can I help you?", "bot");
      setTimeout(askNext, 250);
    } catch (e) {
      addMsg("Sorry, chat is temporarily unavailable. Please try again shortly.", "bot");
    }
  }

  function currentQuestion() {
    if (!state.flow || !Array.isArray(state.flow.questions)) return null;
    return state.flow.questions[state.step - 1] || null;
  }

  function askNext() {
    if (state.step === 0) {
      addMsg("First, what's your name?", "bot");
      return;
    }
    const q = currentQuestion();
    if (!q) return finishLead();
    addMsg(q.text, "bot");
  }

  async function saveLead() {
    if (state.leadSaved || !state.flow) return;
    try {
      const r = await fetch(`${API_BASE}/businesses/${encodeURIComponent(businessId)}/leads`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          name:state.name,
          phone:state.answers.phone || "",
          answers:state.answers,
          conversation:state.conversation,
          source:"website_chat"
        })
      });
      const d = await r.json();
      if (d.lead) {
        state.leadSaved = true;
        const x = document.createElement("div");
        x.className = "aiw-done";
        x.textContent = "✓ Your details have been saved.";
        body.appendChild(x);
      }
    } catch (e) {}
  }

  async function finishLead() {
    const canBook = !!(state.flow && state.flow.modulesEnabled && state.flow.modulesEnabled.appointment);
    if (canBook) {
      state.phase = "appointment_offer";
      addMsg("Would you like to book an appointment? (Yes / No)", "bot");
    } else {
      await finishConversation();
    }
  }

  async function finishConversation() {
    if (state.phase === "done" || state.phase === "saving") return;
    addMsg("Thank you! Our team will reach out to you shortly. 🙌", "bot");
    state.phase = "saving";
    await saveLead();
    state.phase = "done";
    input.disabled = true;
    sendBtn.disabled = true;
    input.placeholder = "Conversation complete";
  }

  // Detect normal English, Tamil and Tanglish questions before saving an answer.
  // This intentionally covers phrases such as "enna venum", "ethu best",
  // "epdi pannuva", "sollunga", "enna price", "which is better", etc.
  function looksLikeQuestion(text) {
    const t = String(text || "").trim().toLowerCase();
    if (!t) return false;
    if (/[?？]/.test(t)) return true;
    const words = t.replace(/[^a-z0-9\u0B80-\u0BFF₹$%\s]/gi, " ").split(/\s+/).filter(Boolean);
    const questionWords = [
      "what","whats","which","why","how","when","where","who","whose","can","could","would","should","is","are","do","does","did","will","shall","may","best","better","recommend","recommendation","price","cost","rate","detail","details","explain","tell","suggest","option","options",
      "enna","ennanga","ethenna","ethu","edhu","entha","ethanai","epdi","eppadi","eppo","engae","enga","yaaru","yaru","yen","yean","sollu","sollunga","sollungalen","venuma","venumaa","pannalama","pannalaama","pannu","pannuva","pannuvanga","kidaikuma","kidaikkuma","mudiyuma","mudiyumaa","evlo","evalo","vilai","rate","best"
    ];
    if (words.some(w => questionWords.includes(w))) return true;
    // Common Tamil/Tanglish question endings.
    if (/(^|\s)(aa|ah|a|ma|mma|nu|ngala|ngalaa|la|le|ya)\s*$/i.test(t) && words.length >= 2) return true;
    return false;
  }

  function normalizeLocation(v) {
    const raw = String(v || "").trim();
    const key = raw.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
    const a = {
      london:"London", londan:"London", londen:"London", londn:"London", landon:"London",
      chennai:"Chennai", madras:"Chennai", bangalore:"Bengaluru", bengaluru:"Bengaluru", bangalor:"Bengaluru",
      mumbai:"Mumbai", bombay:"Mumbai", delhi:"Delhi", dilli:"Delhi", hyderabad:"Hyderabad", hydrabad:"Hyderabad", dubai:"Dubai"
    };
    return a[key] || raw;
  }

  function normalizePurpose(v) {
    const t = String(v || "").trim().toLowerCase();
    if (/^(own\s*use|ownuse|personal|self|use|living|own)$/i.test(t)) return "Own Use";
    if (/^(investment|invest|rental|rent|income|business)$/i.test(t)) return "Investment";
    return "";
  }

  function questionType(q) {
    const id = String((q && q.id) || "").toLowerCase();
    const text = String((q && q.text) || "").toLowerCase();
    const s = id + " " + text;
    if (/phone|mobile|whatsapp|contact|number/.test(s)) return "phone";
    if (/budget|price|cost|amount|range/.test(s)) return "budget";
    if (/purpose|use|goal|looking.*for|reason/.test(s)) return "purpose";
    if (/location|city|area|place|where/.test(s)) return "location";
    if (/bhk|bedroom|beds|room/.test(s)) return "bhk";
    if (/email|mail/.test(s)) return "email";
    return "text";
  }

  function validateAnswer(q, value) {
    const v = String(value || "").trim();
    const type = questionType(q);
    if (!v) return { ok:false, message:"Please enter an answer so I can continue." };
    if (looksLikeQuestion(v)) return { ok:false, question:true };

    if (type === "phone") {
      const digits = v.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        return { ok:false, message:"Please enter a valid phone number (10–15 digits)." };
      }
      return { ok:true, value:digits };
    }

    if (type === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok:false, message:"Please enter a valid email address." };
      return { ok:true, value:v };
    }

    if (type === "purpose") {
      const purpose = normalizePurpose(v);
      if (!purpose) return { ok:false, message:"Please choose one: Own Use or Investment." };
      return { ok:true, value:purpose };
    }

    if (type === "bhk") {
      const m = v.match(/(?:studio|1|2|3|4|5)\s*(?:bhk|bed(?:room)?s?|beds?)?/i);
      if (!m || !/(studio|[1-5])/i.test(m[0])) return { ok:false, message:"Please enter a valid option such as Studio, 1 BHK, 2 BHK or 3 BHK." };
      const normalized = /^studio/i.test(m[0]) ? "Studio" : `${m[0].match(/[1-5]/)[0]} BHK`;
      return { ok:true, value:normalized };
    }

    if (type === "budget") {
      // Do not accept vague/invalid entries such as "500 cash".
      // Accept ₹50 lakh, 50L, 1 crore, 1cr, 5000000, etc.
      const hasNumber = /\d/.test(v);
      const hasUnit = /(lakh|lac|lakhs|l|crore|cr|k|million|mn|thousand|₹|rs\.?|inr|usd|\$)/i.test(v);
      const hasInvalidCash = /\bcash\b/i.test(v) && !/(₹|rs\.?|inr|\$|usd)/i.test(v);
      if (!hasNumber || hasInvalidCash || (!hasUnit && !/^[\d,]+(?:\.\d+)?$/.test(v))) {
        return { ok:false, message:"Please enter your budget clearly, for example ₹50 lakh, 50L, 1 crore, or ₹50,00,000." };
      }
      return { ok:true, value:v };
    }

    if (type === "location") return { ok:true, value:normalizeLocation(v) };
    return { ok:true, value:v };
  }

  async function askAI(text, q) {
    try {
      const r = await fetch(`${API_BASE}/businesses/${encodeURIComponent(businessId)}/ai-chat`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          message:text,
          currentQuestion:q ? q.text : "",
          answers:state.answers
        })
      });
      const d = await r.json();
      if (r.ok && d.answer) {
        addMsg(d.answer, "bot");
        return true;
      }
    } catch (e) {}
    return false;
  }

  async function handleAppointmentOffer(v) {
    if (/^(no|n|இல்லை|வேண்டாம்|vena|vendam)$/i.test(v)) return finishConversation();
    if (/^(yes|y|ஆம்|ஆமாம்|வேண்டும்|venum)$/i.test(v)) {
      state.phase = "appointment";
      state.appointmentStep = 0;
      return askAppointmentNext();
    }
    addMsg("Please type Yes or No.", "bot");
  }

  function askAppointmentNext() {
    if (state.appointmentStep === 0) addMsg("What date would you prefer? (YYYY-MM-DD)", "bot");
    else if (state.appointmentStep === 1) addMsg("What time would you prefer?", "bot");
    else addMsg("Any note for the team? (Optional — type No if none)", "bot");
  }

  async function bookAppointment() {
    try {
      const r = await fetch(`${API_BASE}/businesses/${encodeURIComponent(businessId)}/appointments`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          name:state.name,
          phone:state.answers.phone || "",
          date:state.appointment.date,
          time:state.appointment.time,
          notes:state.appointment.notes
        })
      });
      if (!r.ok) throw Error("booking failed");
      addMsg(`Appointment request saved for ${state.appointment.date} at ${state.appointment.time}. ✅`, "bot");
    } catch (e) {
      addMsg("We couldn't complete the booking right now, but our team will contact you.", "bot");
    }
    await finishConversation();
  }

  async function handleSend() {
    const val = input.value.trim();
    if (!val || ["done","saving","booking"].includes(state.phase)) return;

    addMsg(val, "user");
    input.value = "";

    if (state.phase === "appointment_offer") return handleAppointmentOffer(val);

    if (state.phase === "appointment") {
      if (state.appointmentStep === 0) state.appointment.date = val;
      else if (state.appointmentStep === 1) state.appointment.time = val;
      else state.appointment.notes = /^(no|none|இல்லை|வேண்டாம்)$/i.test(val) ? "" : val;
      state.appointmentStep++;
      if (state.appointmentStep <= 2) { setTimeout(askAppointmentNext, 200); return; }
      return bookAppointment();
    }

    // Name is the only free-form field before the configured questions.
    if (state.step === 0) {
      if (looksLikeQuestion(val)) {
        const answered = await askAI(val, null);
        if (!answered) addMsg("Sure — please tell me your name first, and I'll help with that question right after.", "bot");
        setTimeout(askNext, 200);
        return;
      }
      state.name = val;
      state.step++;
      setTimeout(askNext, 250);
      return;
    }

    const q = currentQuestion();
    if (!q) return finishLead();

    // A question is NOT an answer. Answer it with AI and keep the user on the same field.
    if (looksLikeQuestion(val)) {
      const answered = await askAI(val, q);
      if (!answered) {
        const type = questionType(q);
        if (type === "purpose") addMsg("For personal use, Own Use is usually best. For rental income or future growth, Investment may be better.", "bot");
        else addMsg("I can help with that. Let me know your answer for the question above, or ask me and I'll explain.", "bot");
      }
      setTimeout(() => addMsg(q.text, "bot"), 200);
      return;
    }

    // Validate the answer before advancing the flow.
    const checked = validateAnswer(q, val);
    if (!checked.ok) {
      if (checked.question) {
        const answered = await askAI(val, q);
        if (!answered) addMsg("Sure, I can explain that. Please also give me your answer to the question above.", "bot");
        setTimeout(() => addMsg(q.text, "bot"), 200);
      } else {
        addMsg(checked.message, "bot");
        setTimeout(() => addMsg(q.text, "bot"), 200);
      }
      return;
    }

    state.answers[q.id] = checked.value;
    state.step++;
    setTimeout(askNext, 250);
  }

  sendBtn.onclick = handleSend;
  input.addEventListener("keydown", e => { if (e.key === "Enter") handleSend(); });
})();

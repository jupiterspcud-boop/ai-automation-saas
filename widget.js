/* AI Automation Platform — embeddable chatbot widget */
(function () {
  const scriptTag = document.currentScript;
  const businessId = scriptTag && scriptTag.getAttribute("data-business-id");
  const API_BASE = scriptTag ? new URL(scriptTag.src, location.href).origin + "/api" : location.origin + "/api";
  if (!businessId || window.__AI_WIDGET_LOADED__) return;
  window.__AI_WIDGET_LOADED__ = true;

  const ORANGE = "#d9622b", DARK = "#161b24";
  const style = document.createElement("style");
  style.textContent = `.aiw-bubble{position:fixed!important;bottom:22px!important;right:22px!important;width:60px!important;height:60px!important;border-radius:50%!important;background:${ORANGE}!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:25px!important;cursor:pointer!important;box-shadow:0 10px 28px rgba(0,0,0,.28)!important;z-index:2147483000!important;border:0!important}.aiw-window{position:fixed!important;bottom:94px!important;right:22px!important;width:min(390px,calc(100vw - 28px))!important;height:min(560px,calc(100vh - 120px))!important;background:#fff!important;border-radius:18px!important;box-shadow:0 20px 60px rgba(0,0,0,.3)!important;display:none!important;flex-direction:column!important;overflow:hidden!important;z-index:2147483001!important;font-family:Arial,sans-serif!important}.aiw-window.open{display:flex!important}.aiw-header{background:${DARK};color:#fff;padding:16px;font-weight:700}.aiw-header small{display:block;font-weight:400;opacity:.72;font-size:12px;margin-top:4px}.aiw-body{flex:1;padding:14px;overflow-y:auto;background:#faf8f5;font-size:14px}.aiw-msg{margin-bottom:10px;max-width:88%;padding:10px 12px;border-radius:12px;line-height:1.45;white-space:pre-wrap}.aiw-msg.bot{background:#fff;border:1px solid #e7e2da;color:${DARK}}.aiw-msg.user{background:${ORANGE};color:#fff;margin-left:auto}.aiw-input-row{display:flex;border-top:1px solid #e7e2da;background:#fff}.aiw-input-row input{flex:1;min-width:0;border:0;padding:14px;font-size:14px;outline:0}.aiw-input-row button{background:${ORANGE};color:#fff;border:0;padding:0 14px;cursor:pointer;font-weight:700}.aiw-mic{min-width:48px!important;font-size:18px!important}.aiw-mic.listening{background:#a52b2b!important}.aiw-done{padding:12px;text-align:center;font-size:13px;color:#28734d}`;
  document.head.appendChild(style);

  const bubble = document.createElement("button");
  bubble.className = "aiw-bubble";
  bubble.type = "button";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.innerHTML = "💬";
  document.body.appendChild(bubble);

  const win = document.createElement("div");
  win.className = "aiw-window";
  win.innerHTML = `<div class="aiw-header">Chat with us<small>Usually replies instantly • Tamil / English / Tanglish</small></div><div class="aiw-body"></div><div class="aiw-input-row"><input type="text" placeholder="Type or use 🎤…"/><button class="aiw-mic" type="button" title="Speak">🎤</button><button type="button">Send</button></div>`;
  document.body.appendChild(win);

  const body = win.querySelector(".aiw-body");
  const input = win.querySelector("input");
  const micBtn = win.querySelector(".aiw-mic");
  const sendBtn = win.querySelector(".aiw-input-row button:last-child");
  const state = { started:false, flow:null, step:0, answers:{}, conversation:[], leadSaved:false, name:"", phase:"lead", appointment:{date:"",time:"",notes:""}, appointmentStep:0 };

  function addMsg(text, who) {
    const m = document.createElement("div");
    m.className = "aiw-msg " + who;
    m.textContent = String(text || "");
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    state.conversation.push({ role: who === "bot" ? "assistant" : "user", text:String(text || "") });
  }

  function open() { win.classList.add("open"); if (!state.started) startFlow(); setTimeout(() => input.focus(), 50); }
  function close() { win.classList.remove("open"); }
  bubble.onclick = () => win.classList.contains("open") ? close() : open();
  window.AIWidgetOpen = open;
  window.AIWidgetClose = close;

  async function startFlow() {
    state.started = true;
    try {
      const r = await fetch(`${API_BASE}/businesses/${encodeURIComponent(businessId)}/chatbot-flow`);
      if (!r.ok) throw Error("flow unavailable");
      state.flow = await r.json();
      addMsg(state.flow.greeting || "Hi! How can I help you?", "bot");
      setTimeout(askNext, 200);
    } catch (e) { addMsg("Sorry, chat is temporarily unavailable. Please try again shortly.", "bot"); }
  }

  function currentQuestion() { return state.flow && Array.isArray(state.flow.questions) ? (state.flow.questions[state.step - 1] || null) : null; }
  function askNext() {
    if (state.step === 0) return addMsg("First, what's your name?", "bot");
    const q = currentQuestion();
    if (!q) return finishLead();
    addMsg(q.text, "bot");
  }

  async function saveLead() {
    if (state.leadSaved || !state.flow) return;
    try {
      const r = await fetch(`${API_BASE}/businesses/${encodeURIComponent(businessId)}/leads`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:state.name,phone:state.answers.phone || "",answers:state.answers,conversation:state.conversation,source:"website_chat"}) });
      const d = await r.json();
      if (d.lead) { state.leadSaved = true; const x=document.createElement("div"); x.className="aiw-done"; x.textContent="✓ Your details have been saved."; body.appendChild(x); }
    } catch (e) {}
  }

  async function finishLead() {
    if (state.flow && state.flow.modulesEnabled && state.flow.modulesEnabled.appointment) { state.phase="appointment_offer"; addMsg("Would you like to book an appointment? (Yes / No)","bot"); }
    else await finishConversation();
  }
  async function finishConversation() {
    if (["done","saving"].includes(state.phase)) return;
    addMsg("Thank you! Our team will reach out to you shortly. 🙌","bot");
    state.phase="saving"; await saveLead(); state.phase="done"; input.disabled=true; sendBtn.disabled=true; micBtn.disabled=true; input.placeholder="Conversation complete";
  }

  // Speech-to-text is optional and runs in the visitor's browser. Tamil is used
  // for recognition so spoken Tamil becomes Tamil text before validation/AI.
  let recognition = null;
  if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = "ta-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => micBtn.classList.add("listening");
    recognition.onend = () => micBtn.classList.remove("listening");
    recognition.onerror = () => micBtn.classList.remove("listening");
    recognition.onresult = e => {
      let text = "";
      for (let i=e.resultIndex;i<e.results.length;i++) text += e.results[i][0].transcript;
      input.value = text.trim();
      if (e.results[e.results.length-1].isFinal) setTimeout(() => input.focus(), 50);
    };
    micBtn.onclick = () => { try { recognition.start(); } catch(e) {} };
  } else {
    micBtn.disabled = true;
    micBtn.title = "Voice input is not supported in this browser";
  }

  function tamilDigitsToArabic(v) {
    const map = {"௦":"0","௧":"1","௨":"2","௩":"3","௪":"4","௫":"5","௬":"6","௭":"7","௮":"8","௯":"9"};
    return String(v || "").replace(/[௦-௯]/g, ch => map[ch]);
  }

  function normalizeVoiceText(v) {
    let t = tamilDigitsToArabic(String(v || "").normalize("NFC")).trim();
    t = t.replace(/\s+/g, " ");
    return t;
  }

  function looksLikeQuestion(text) {
    const original = normalizeVoiceText(text);
    const t = original.toLowerCase();
    if (!t) return false;
    if (/[?？]/.test(t)) return true;

    const clean = t.replace(/[^a-z0-9\u0B80-\u0BFF₹$%\s]/gi," ").replace(/\s+/g," ").trim();
    const words = clean.split(" ").filter(Boolean);
    if (!words.length) return false;
    const first = words[0];

    const english = new Set(["what","whats","which","why","how","when","where","who","whose","can","could","would","should","is","are","do","does","did","will","shall","may","tell","explain","recommend"]);
    const tanglish = new Set(["enna","ennanga","ethu","edhu","entha","ethanai","epdi","eppadi","eppo","enga","engae","yaaru","yaru","yen","yean","evlo","evalo","sollu","sollunga","sollungalen","neeye","nee"]);
    const tamil = new Set(["என்ன","எது","எந்த","எத்தனை","எப்படி","எப்போது","எப்போ","எங்கே","எங்கு","யார்","ஏன்","எவ்வளவு","சொல்லுங்க","சொல்லு","நீங்களே","நீயே"]);
    if (english.has(first) || tanglish.has(first) || tamil.has(first)) return true;

    const joined = words.join(" ");
    const phrases = ["neeye sollu","nee sollu","what is","what are","what does","how does","how much","how many","which is","which one","can you","could you","tell me","enna price","enna vilai","ethu best","edhu best","entha option","entha one","epdi pann","eppadi pann","evlo aagum","என்ன விலை","எது best","எது நல்லது","எப்படி செய்வது","எப்போது வேண்டும்","எவ்வளவு ஆகும்"];
    if (phrases.some(p => joined === p || joined.startsWith(p + " "))) return true;

    // Do not classify ordinary lead answers such as "venum", "pannunga",
    // "tomorrow", or "எப்பவே அனுப்பு" as questions unless they contain a
    // clear interrogative marker/phrase.
    return false;
  }

  function questionType(q) {
    const s = `${String(q && q.id || "").toLowerCase()} ${String(q && q.text || "").toLowerCase()}`;
    if (/phone|mobile|whatsapp|contact|number|மொபைல்|போன்|தொலைபேசி|நம்பர்/.test(s)) return "phone";
    if (/budget|price|cost|amount|range|budget|பட்ஜெட்|விலை|செலவு/.test(s)) return "budget";
    if (/purpose|goal|looking|reason|பயன்பாடு|நோக்கம்/.test(s)) return "purpose";
    if (/location|city|area|place|where|இடம்|நகரம்|ஊர்/.test(s)) return "location";
    if (/bhk|bedroom|beds|room/.test(s)) return "bhk";
    if (/email|mail/.test(s)) return "email";
    return "text";
  }

  function normalizePurpose(v) {
    const t=String(v||"").trim().toLowerCase();
    if (/^(own\s*use|ownuse|personal|self|living|own|சொந்த பயன்பாடு|சொந்த பயன்பாட்டுக்கு)$/.test(t)) return "Own Use";
    if (/^(investment|invest|rental|rent|income|business|முதலீடு|வாடகை)$/.test(t)) return "Investment";
    return "";
  }

  function validateAnswer(q, value) {
    const v=normalizeVoiceText(value); const type=questionType(q);
    if (!v) return {ok:false,message:"Please enter an answer so I can continue."};
    if (type === "phone") {
      let digits=v.replace(/\D/g,"");
      if (digits.length<10 || digits.length>15) return {ok:false,message:"Please enter a valid phone number (10–15 digits)."};
      return {ok:true,value:digits};
    }
    if (type === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return {ok:false,message:"Please enter a valid email address."};
      return {ok:true,value:v};
    }
    if (type === "purpose") {
      const p=normalizePurpose(v); if (!p) return {ok:false,message:"Please choose Own Use or Investment."}; return {ok:true,value:p};
    }
    if (type === "bhk") {
      const m=v.match(/(?:studio|1|2|3|4|5)\s*(?:bhk|bed(?:room)?s?|beds?)?/i); if (!m) return {ok:false,message:"Please enter Studio, 1 BHK, 2 BHK or 3 BHK."};
      return {ok:true,value:/^studio/i.test(m[0])?"Studio":`${m[0].match(/[1-5]/)[0]} BHK`};
    }
    if (type === "budget") {
      const hasNumber=/\d/.test(v), currency=/\b(rupee|rupees|rs|inr|usd|dollar|dollars)\b/i.test(v), unit=/(lakh|lac|lakhs|crore|cr|million|mn|thousand|k|₹|\$|ரூபாய்|லட்சம்|கோடி)/i.test(v), numericOnly=/^[\d,]+(?:\.\d+)?$/.test(v);
      if (!hasNumber || (!currency && !unit && !numericOnly)) return {ok:false,message:"Please enter your budget clearly, for example ₹50 lakh, 50L, 1 crore, or 200 rupees."};
      return {ok:true,value:v};
    }
    return {ok:true,value:v};
  }

  async function askAI(text,q) {
    try {
      const r=await fetch(`${API_BASE}/businesses/${encodeURIComponent(businessId)}/ai-chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:normalizeVoiceText(text),currentQuestion:q?q.text:"",currentQuestionId:q?q.id:"",answers:state.answers})});
      const d=await r.json(); if(r.ok&&d.answer){addMsg(d.answer,"bot");return true;}
    } catch(e) {}
    return false;
  }

  async function handleAppointmentOffer(v) {
    const a=normalizeVoiceText(v).toLowerCase().replace(/[.!?]+$/g,"");
    if (/^(no|n|இல்லை|வேண்டாம்|வேணாம்|vena|vendam|venam)$/.test(a)) return finishConversation();
    if (/^(yes|y|ஆம்|ஆமாம்|வேண்டும்|வேணும்|venum)$/.test(a)) { state.phase="appointment"; state.appointmentStep=0; return askAppointmentNext(); }
    addMsg("Please type Yes or No.","bot");
  }
  function askAppointmentNext(){ if(state.appointmentStep===0)addMsg("What date would you prefer? (YYYY-MM-DD)","bot"); else if(state.appointmentStep===1)addMsg("What time would you prefer?","bot"); else addMsg("Any note for the team? (Optional — type No if none)","bot"); }
  async function bookAppointment(){ try { const r=await fetch(`${API_BASE}/businesses/${encodeURIComponent(businessId)}/appointments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:state.name,phone:state.answers.phone||"",date:state.appointment.date,time:state.appointment.time,notes:state.appointment.notes})}); if(!r.ok)throw Error(); addMsg(`Appointment request saved for ${state.appointment.date} at ${state.appointment.time}. ✅`,"bot"); } catch(e){addMsg("We couldn't complete the booking right now, but our team will contact you.","bot");} await finishConversation(); }

  async function handleSend() {
    const raw=input.value.trim(); if(!raw||["done","saving","booking"].includes(state.phase))return;
    const val=normalizeVoiceText(raw); addMsg(val,"user"); input.value="";
    if(state.phase==="appointment_offer")return handleAppointmentOffer(val);
    if(state.phase==="appointment"){
      if(state.appointmentStep===0)state.appointment.date=val; else if(state.appointmentStep===1)state.appointment.time=val; else state.appointment.notes=/^(no|none|இல்லை|வேண்டாம்)$/i.test(val)?"":val;
      state.appointmentStep++; if(state.appointmentStep<=2){setTimeout(askAppointmentNext,200);return;} return bookAppointment();
    }
    if(state.step===0){
      if(looksLikeQuestion(val)){const answered=await askAI(val,null);if(!answered)addMsg("Sure — please tell me your name first, and I'll help with that question right after.","bot");setTimeout(askNext,200);return;}
      state.name=val;state.step++;setTimeout(askNext,250);return;
    }
    const q=currentQuestion(); if(!q)return finishLead();
    if(looksLikeQuestion(val)){
      const answered=await askAI(val,q);
      if(!answered){const type=questionType(q);if(type==="budget")addMsg("The right budget depends on your requirements and scope. Please tell me the budget you are comfortable with.","bot");else addMsg("I can help with that. I’ll answer your question first, then we can continue with the details.","bot");}
      setTimeout(()=>addMsg(q.text,"bot"),200); return;
    }
    const checked=validateAnswer(q,val); if(!checked.ok){addMsg(checked.message,"bot");setTimeout(()=>addMsg(q.text,"bot"),200);return;}
    state.answers[q.id]=checked.value;state.step++;setTimeout(askNext,250);
  }

  sendBtn.onclick=handleSend;
  input.addEventListener("keydown",e=>{if(e.key==="Enter")handleSend();});
})();

const API = "/api";
let token = localStorage.getItem("adminToken") || "";
let META = null; // niches + packages, fetched once
let businesses = [];

function authHeaders() {
  return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const res = await fetch(`${API}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    document.getElementById("loginError").textContent = data.error;
    return;
  }
  token = data.token;
  localStorage.setItem("adminToken", token);
  boot();
}

function logout() {
  localStorage.removeItem("adminToken");
  token = "";
  document.getElementById("app").style.display = "none";
  document.getElementById("login").style.display = "block";
}

async function boot() {
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "block";
  META = await fetch(`${API}/businesses/meta`).then((r) => r.json());
  fillSelect("bizNiche", META.niches.map((n) => [n.id, n.label]));
  fillSelect("bizPackage", Object.entries(META.packages).map(([id, p]) => [id, `${p.label} (Setup ₹${p.setup})`]));
  await loadBusinesses();
}

function fillSelect(id, pairs) {
  const el = document.getElementById(id);
  el.innerHTML = pairs.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
}

async function loadBusinesses() {
  const res = await fetch(`${API}/businesses`, { headers: authHeaders() });
  if (res.status === 401) return logout();
  businesses = await res.json();
  renderList();
}

function renderList() {
  const el = document.getElementById("businessList");
  if (!businesses.length) {
    el.innerHTML = `<div class="card muted">No businesses yet. Click "+ New Business" to onboard your first client.</div>`;
    return;
  }
  el.innerHTML = `
    <table>
      <tr><th>Name</th><th>Niche</th><th>Package</th><th>Created</th><th></th></tr>
      ${businesses.map((b) => `
        <tr>
          <td>${b.name}</td>
          <td>${label(b.niche)}</td>
          <td>${META.packages[b.package]?.label || b.package}</td>
          <td>${new Date(b.createdAt).toLocaleDateString()}</td>
          <td><button class="btn small" onclick="openDetail('${b.id}')">Manage</button></td>
        </tr>
      `).join("")}
    </table>`;
}

function label(nicheId) {
  return META.niches.find((n) => n.id === nicheId)?.label || nicheId;
}

function openCreate() {
  document.getElementById("createPanel").style.display = "block";
  document.getElementById("app").style.display = "none";
}
function closeCreate() {
  document.getElementById("createPanel").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("createResult").innerHTML = "";
}

async function createBusiness() {
  const name = document.getElementById("bizName").value.trim();
  const niche = document.getElementById("bizNiche").value;
  const pkg = document.getElementById("bizPackage").value;
  if (!name) return alert("Business name is required");

  const res = await fetch(`${API}/businesses`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, niche, package: pkg }),
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error);

  document.getElementById("createResult").innerHTML = `
    <div class="card" style="margin-top:14px; border-color:var(--ok)">
      <strong>${data.business.name} created.</strong><br/>
      Business ID (for the embed widget): <code>${data.business.id}</code><br/>
      Client login passcode (shown once — save it!): <code>${data.passcode}</code>
    </div>`;
  await loadBusinesses();
}

async function openDetail(id) {
  document.getElementById("createPanel").style.display = "none";
  document.getElementById("app").style.display = "none";
  document.getElementById("detailPanel").style.display = "block";

  const [biz, leads, appts, analytics] = await Promise.all([
    fetch(`${API}/businesses/${id}`, { headers: authHeaders() }).then((r) => r.json()),
    fetch(`${API}/businesses/${id}/leads`, { headers: authHeaders() }).then((r) => r.json()),
    fetch(`${API}/businesses/${id}/appointments`, { headers: authHeaders() }).then((r) => r.json()),
    fetch(`${API}/businesses/${id}/analytics`, { headers: authHeaders() }).then((r) => r.json()),
  ]);

  const modulesHtml = Object.entries(biz.modules).map(([key, on]) => `
    <div class="module-row">
      <span>${moduleLabel(key)}</span>
      <label class="switch">
        <input type="checkbox" ${on ? "checked" : ""} onchange="toggleModule('${id}', '${key}', this.checked)">
        <span class="slider"></span>
      </label>
    </div>`).join("");

  const leadsHtml = leads.length ? `
    <table>
      <tr><th>Name</th><th>Phone</th><th>Score</th><th>Status</th><th>Source</th><th>When</th></tr>
      ${leads.map((l) => `
        <tr>
          <td>${l.name}</td>
          <td>${l.phone || "—"}</td>
          <td><span class="badge ${l.tier}">${l.tier.toUpperCase()} ${l.score}</span></td>
          <td>
            <select onchange="updateLeadStatus('${l.id}', this.value)">
              ${["new","contacted","qualified","won","lost"].map(s => `<option value="${s}" ${s===l.status?"selected":""}>${s}</option>`).join("")}
            </select>
          </td>
          <td>${l.source}</td>
          <td>${new Date(l.createdAt).toLocaleString()}</td>
        </tr>`).join("")}
    </table>` : `<div class="card muted">No leads captured yet. Embed the chatbot widget on their website to start capturing leads.</div>`;

  const apptHtml = appts.length ? `
    <table>
      <tr><th>Name</th><th>Phone</th><th>Date</th><th>Time</th><th>Status</th></tr>
      ${appts.map((a) => `<tr><td>${a.name}</td><td>${a.phone || "—"}</td><td>${a.date}</td><td>${a.time || "—"}</td><td><span class="badge status">${a.status}</span></td></tr>`).join("")}
    </table>` : `<div class="card muted">No appointments booked yet.</div>`;

  document.getElementById("detailContent").innerHTML = `
    <h1>${biz.name}</h1>
    <p class="sub">${label(biz.niche)} · ${META.packages[biz.package]?.label} package</p>

    <div class="grid cols-4">
      <div class="card stat"><div class="num">${analytics.totalLeads}</div><div class="label">Total Leads</div></div>
      <div class="card stat"><div class="num">${analytics.byTier.hot || 0}</div><div class="label">Hot Leads</div></div>
      <div class="card stat"><div class="num">${analytics.totalAppointments}</div><div class="label">Appointments</div></div>
      <div class="card stat"><div class="num">${analytics.conversionRate}%</div><div class="label">Conversion</div></div>
    </div>

    <h2>Embed this business's chatbot</h2>
    <div class="card">
      <p class="muted" style="margin-top:0">Paste this on the client's website, right before <code>&lt;/body&gt;</code>:</p>
      <code style="display:block; background:#f2ede6; padding:12px; border-radius:8px; font-size:13px;">
        &lt;script src="${location.origin}/widget.js" data-business-id="${biz.id}"&gt;&lt;/script&gt;
      </code>
      <p class="hint">Client login passcode was shown once when this business was created. To reset it, delete and recreate the business (this MVP doesn't yet support passcode reset).</p>
    </div>

    <h2>Modules (turn features on/off for this client)</h2>
    <div class="card module-list">${modulesHtml}</div>

    <h2>Leads (CRM)</h2>
    ${leadsHtml}

    <h2>Appointments</h2>
    ${apptHtml}
  `;
}

function moduleLabel(key) {
  const map = {
    ai_receptionist: "AI Receptionist", whatsapp: "WhatsApp", instagram: "Instagram",
    facebook: "Facebook", website_chat: "Website Chat", lead_capture: "Lead Capture",
    lead_qualification: "Lead Qualification", lead_scoring: "Lead Scoring", followup: "Follow-up",
    appointment: "Appointment Booking", crm: "CRM", payment: "Payment", invoice: "Invoice",
    review: "Review Automation", voice_ai: "Voice AI", human_handoff: "Human Handoff",
    analytics: "Analytics", ai_reports: "AI Reports",
  };
  return map[key] || key;
}

async function toggleModule(bizId, key, checked) {
  await fetch(`${API}/businesses/${bizId}/modules`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ modules: { [key]: checked } }),
  });
}

async function updateLeadStatus(leadId, status) {
  await fetch(`${API}/leads/${leadId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
}

function backToList() {
  document.getElementById("detailPanel").style.display = "none";
  document.getElementById("app").style.display = "block";
  loadBusinesses();
}

if (token) boot();

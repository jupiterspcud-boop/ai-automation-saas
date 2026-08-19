# AI Automation SaaS — Core Platform (MVP)

Oru **multi-tenant AI automation platform** — ungaloda agency-oda ella clients-um (Real Estate, Hospital, Salon, etc.) idhu ondru-la sேர்th manage pannalam.

## Idhula yenna yenna irukku (already working)

- **Multi-tenant businesses** — ovvoru client-ku thani account, thani chatbot flow, thani data.
- **18-module ON/OFF system** — Admin dashboard-la ovvoru client-kum modules (WhatsApp, AI Receptionist, CRM, etc.) toggle pannalam.
- **Niche-based AI chatbot flows** — Real Estate, Hospital, Salon, Education, Car Dealer, Generic — ovvoru niche-kum vera vera qualifying questions already built-in (`server/lib/flows.js`).
- **Automatic Lead Scoring** — Hot/Warm/Cold, transparent rule-based (easy-a edit pannalam).
- **CRM** — lead status pipeline: New → Contacted → Qualified → Won/Lost.
- **Appointment booking** API.
- **Admin dashboard** (`/admin.html`) — create clients, toggle modules, view all leads/appointments/analytics.
- **Client dashboard** (`/client.html`) — business owner login-a paartha, avangaloda leads/appointments/analytics mattum.
- **Embeddable chatbot widget** (`/widget.js`) — oru single `<script>` tag, edha website-lum paste pannalam.
- **4 package tiers** (Starter/Growth/Pro/Enterprise) already modeled in the pricing metadata.

## Yeppadi run pannuradhu (local)

```bash
npm install
npm start
```

Then open:
- `http://localhost:3000/admin.html` — login: `admin` / `admin123`
- `http://localhost:3000/demo.html` — chatbot widget live demo
- `http://localhost:3000/client.html` — business-owner login (use the passcode shown when you create a business in Admin)

Data is stored in `server/data/db.json` (plain JSON file — no database server to install). Delete that file to reset everything.

## Yeppadi oru client-ai onboard pannuradhu

1. Admin dashboard-la login pannunga.
2. "+ New Business" → name, niche, package select pannunga.
3. Save pannina udane, **Business ID** + **one-time passcode** kaamikkum — idhai client-ku kudunga (passcode client login-ku).
4. "Manage" → embed code kaamikkum:
   ```html
   <script src="https://YOUR_DOMAIN/widget.js" data-business-id="THEIR_BUSINESS_ID"></script>
   ```
5. Idhai client-oda website-la `</body>` mudivukku munnadi paste pannunga — chatbot bubble automatic-a varum, leads automatic-a CRM-la sேரும்.

## Yengu deploy pannuradhu (production)

Idhu oru plain Node.js/Express app — evlo host-lum run pannalam. Easiest options:

- **Railway.app** or **Render.com** — GitHub repo connect pannunga, "Deploy" click pannunga, automatic-a build aagum. Free tier-um irukku.
- **A VPS** (Hostinger, DigitalOcean, AWS Lightsail) — `pm2` illa `systemd` vachu `node server/index.js` run pannunga, Nginx reverse-proxy vachu ungaloda domain-ku point pannunga.

Deploy pannumbodhu, indha environment variables set pannunga (mukkiyam):

```
JWT_SECRET=<oru random long string>
ADMIN_USER=<ungaloda admin username>
ADMIN_PASSWORD=<strong password>
```

## Ippo mock-a irukura parts — real business-ku eppadi replace pannuradhu

| Idhu ippo | Enna panni irukku | Real production-ku enna venum |
|---|---|---|
| **WhatsApp module** | Toggle mattum irukku, actual message anupathu | [WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) — Meta Business account, phone number verify pannanum, webhook connect pannanum |
| **Instagram/Facebook modules** | Toggle mattum | [Meta Graph API](https://developers.facebook.com/docs/messenger-platform) — Page connect pannanum |
| **AI Receptionist / Voice AI** | Illai — text chatbot mattum irukku | Voice-ku [Twilio](https://www.twilio.com/) illa similar + a speech-to-text/TTS provider; text-ku ChatGPT/Claude API vachi rule-based flow-ai smarter-a maathalam |
| **Payment / Invoice** | Toggle mattum | [Razorpay](https://razorpay.com/docs/) illa [Stripe](https://stripe.com/docs) — India-ku Razorpay easier |
| **SMS/Email follow-up** | Illai | Twilio (SMS) / Resend illa SendGrid (Email) |
| **Login/Auth** | Simple demo JWT + hardcoded admin | Production-ku proper password reset, rate-limiting, HTTPS-only cookies venum |
| **Database** | JSON file | Client base valarardhukku, Postgres-ku maathunga (route function names same-a vachu `server/lib/db.js` mattum replace pannunga) |

## Code structure

```
server/
  index.js          — Express app entrypoint
  lib/
    db.js            — JSON file "database" (swap for Postgres later)
    flows.js         — niche-wise chatbot questions + lead scoring rules
    auth.js          — JWT helpers
  routes/
    auth.js           — admin + client login
    businesses.js      — create/list businesses, module toggles
    leads.js            — lead capture, CRM status, analytics
    appointments.js      — booking
    chatbot.js            — public chatbot-flow config for the widget
public/
  admin.html/js       — agency admin dashboard
  client.html/js      — business-owner dashboard
  widget.js            — the embeddable chatbot (the actual product clients embed)
  demo.html             — see the widget on a mock client website
```

## Adding a new niche (e.g. Restaurant, Gym)

Oru vari kooda backend logic maathama, `server/lib/flows.js`-la oru new entry add pannunga:

```js
restaurant: {
  label: "Restaurant",
  greeting: "Hi! Table book pannalama?",
  questions: [
    { id: "party_size", text: "Evlo pேrukku table venum?" },
    { id: "date", text: "Yentha date?" },
    { id: "time", text: "Yentha time?" },
    { id: "phone", text: "Phone number sollunga." },
  ],
},
```

Save pannina udane, adhu Admin dashboard-la niche dropdown-la automatic-a varum.

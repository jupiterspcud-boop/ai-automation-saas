// Niche-specific chatbot flows. Each question has an id (used as the key in
// lead.answers) and a "weight" map used by scoreLead() below.
// Add a new niche here and it's instantly available to any business that
// selects it — no code changes needed elsewhere.

const FLOWS = {
  real_estate: {
    label: "Real Estate",
    greeting: "Hi! I can help you find the right property. A few quick questions 🙂",
    questions: [
      { id: "property_type", text: "Enna property paakaringa? (Apartment / Villa / Plot / Commercial)" },
      { id: "budget", text: "Ungaloda budget range enna?" },
      { id: "location", text: "Yentha location/area venum?" },
      { id: "bhk", text: "Evlo BHK venum? (1BHK / 2BHK / 3BHK+)" },
      { id: "purpose", text: "Own use-a illa Investment-a?" },
      { id: "loan", text: "Home loan venuma?" },
      { id: "timeline", text: "Eppo vaanga plan pannirukeenga? (Immediately / 1-3 months / Just exploring)" },
    ],
  },
  hospital: {
    label: "Hospital / Clinic",
    greeting: "Hi! Let's book your appointment quickly.",
    questions: [
      { id: "department", text: "Yentha department? (Cardiology / Dental / General / Dermatology / Other)" },
      { id: "doctor_pref", text: "Specific doctor venuma, illa yaaraachum irundhaal podhuma?" },
      { id: "preferred_date", text: "Yentha date-la appointment venum?" },
      { id: "preferred_time", text: "Morning / Afternoon / Evening?" },
      { id: "phone", text: "Confirmation-ku ungaloda phone number sollunga." },
    ],
  },
  salon: {
    label: "Salon / Beauty",
    greeting: "Hi! Booking eduthukalama?",
    questions: [
      { id: "service", text: "Yentha service venum? (Haircut / Facial / Spa / Bridal / Other)" },
      { id: "staff_pref", text: "Specific staff venuma?" },
      { id: "preferred_date", text: "Yentha date?" },
      { id: "preferred_time", text: "Yentha time?" },
      { id: "phone", text: "Phone number sollunga, confirmation anupren." },
    ],
  },
  education: {
    label: "Education / Coaching",
    greeting: "Hi! Course details help pannaren.",
    questions: [
      { id: "course", text: "Yentha course-la interest?" },
      { id: "eligibility", text: "Ungaloda current qualification enna?" },
      { id: "batch_pref", text: "Weekday / Weekend batch venuma?" },
      { id: "timeline", text: "Eppo start panna plan?" },
      { id: "phone", text: "Phone number sollunga, counsellor call pannuvanga." },
    ],
  },
  car_dealer: {
    label: "Car / Bike Dealer",
    greeting: "Hi! Right vehicle kandupidikka help pannaren.",
    questions: [
      { id: "vehicle_type", text: "Car-a Bike-a? Evlo budget?" },
      { id: "fuel", text: "Petrol / Diesel / EV?" },
      { id: "finance", text: "Finance/Loan venuma?" },
      { id: "test_drive", text: "Test drive book pannanuma?" },
      { id: "phone", text: "Phone number sollunga." },
    ],
  },
  generic: {
    label: "General Business",
    greeting: "Hi! Ungalukku evlo help venum sollunga.",
    questions: [
      { id: "requirement", text: "Enna venum ungalukku?" },
      { id: "budget", text: "Budget range enna?" },
      { id: "timeline", text: "Eppo venum?" },
      { id: "phone", text: "Phone number sollunga, follow-up pannuvom." },
    ],
  },
};

function getFlow(niche) {
  return FLOWS[niche] || FLOWS.generic;
}

function listNiches() {
  return Object.entries(FLOWS).map(([id, f]) => ({ id, label: f.label }));
}

// Very simple, transparent scoring rule (matches the "Lead Scoring" chapter
// of the playbook: budget given, urgent timeline, contact info present).
function scoreLead(answers = {}) {
  let score = 30; // base score for completing the flow at all
  const vals = Object.values(answers).join(" ").toLowerCase();

  if (answers.budget || answers.vehicle_type) score += 20;
  if (/immediat|urgent|asap|this week|today/.test(vals)) score += 25;
  else if (/1-3 month|month|soon/.test(vals)) score += 12;
  if (answers.phone && /\d{7,}/.test(answers.phone)) score += 15;
  if (answers.timeline && !/just exploring|not sure/.test(vals)) score += 10;

  score = Math.max(0, Math.min(100, score));
  let tier = "cold";
  if (score >= 70) tier = "hot";
  else if (score >= 45) tier = "warm";
  return { score, tier };
}

module.exports = { FLOWS, getFlow, listNiches, scoreLead };

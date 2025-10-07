export type Lang = "en" | "hi" | "hinglish";

function t(lang: Lang, en: string, hi: string, hinglish?: string): string {
  if (lang === "hi") return hi;
  if (lang === "hinglish") return hinglish || hi;
  return en;
}

function detectDomain(
  text: string,
):
  | "fitness"
  | "study"
  | "career"
  | "finance"
  | "habit"
  | "productivity"
  | "mindset"
  | "general" {
  const q = text.toLowerCase();
  const has = (w: string) => q.includes(w);
  if (
    [
      "workout",
      "exercise",
      "gym",
      "diet",
      "weight",
      "fat",
      "run",
      "walk",
      "protein",
      "calorie",
    ].some(has)
  )
    return "fitness";
  if (
    [
      "study",
      "exam",
      "learn",
      "learning",
      "revision",
      "notes",
      "class",
      "school",
      "college",
      "padh",
      "padayi",
      "padhna",
    ].some(has)
  )
    return "study";
  if (
    [
      "job",
      "career",
      "interview",
      "resume",
      "portfolio",
      "project",
      "skill",
      "skills",
      "freelance",
    ].some(has)
  )
    return "career";
  if (
    [
      "money",
      "budget",
      "expense",
      "expenses",
      "save",
      "saving",
      "invest",
      "investment",
      "debt",
    ].some(has)
  )
    return "finance";
  if (
    [
      "habit",
      "habits",
      "routine",
      "streak",
      "discipline",
      "aadat",
      "aadatein",
    ].some(has)
  )
    return "habit";
  if (
    [
      "time",
      "schedule",
      "focus",
      "deep work",
      "pomodoro",
      "plan",
      "planning",
      "productivity",
    ].some(has)
  )
    return "productivity";
  if (
    [
      "motivation",
      "mindset",
      "confidence",
      "stress",
      "anxiety",
      "overwhelm",
      "self",
    ].some(has)
  )
    return "mindset";
  return "general";
}

export function ruleBasedCoach(message: string, lang: Lang): string {
  const domain = detectDomain(message || "");

  const tiny = t(
    lang,
    "Tiny step (10–15 min): start now with one small action.",
    "Chhota step (10–15 min): abhi se ek simple kaam shuru karein.",
    "Chhota step (10–15 min): abhi se ek simple kaam shuru karo.",
  );

  const steps: Record<string, string[]> = {
    fitness: [
      t(
        lang,
        "Decide 3 workout slots this week (20–30 min).",
        "Is hafte 3 workout slots fix karein (20–30 min).",
        "Is week 3 workout slots fix karo (20–30 min).",
      ),
      t(
        lang,
        "Pick one simple plan: walk 20 min or 3 bodyweight moves x3 sets.",
        "Ek simple plan choose karein: 20 min walk ya 3 bodyweight moves x3 sets.",
        "Ek simple plan choose karo: 20 min walk ya 3 bodyweight moves x3 sets.",
      ),
      t(
        lang,
        "Prep tonight: fill bottle, keep shoes ready, block calendar.",
        "Aaj raat prep: bottle fill, shoes ready, calendar block.",
        "Aaj raat prep: bottle fill, shoes ready, calendar block.",
      ),
      t(
        lang,
        "Track with a 7‑day habit tick and one-line note.",
        "7‑din habit tick aur ek line note rakhein.",
        "7‑din habit tick aur ek line note rakho.",
      ),
    ],
    study: [
      t(
        lang,
        "Set a clear topic and 2 sub‑topics for this week.",
        "Is hafte ke liye ek clear topic aur 2 sub‑topics fix karein.",
        "Is week ek clear topic aur 2 sub‑topics fix karo.",
      ),
      t(
        lang,
        "Use 2×25‑min focus blocks with 5‑min breaks (Pomodoro).",
        "2×25‑min focus blocks + 5‑min breaks use karein (Pomodoro).",
        "2×25‑min focus blocks + 5‑min breaks (Pomodoro) use karo.",
      ),
      t(
        lang,
        "End each session with 3 bullet summary + next action.",
        "Har session ke end me 3 bullet summary + next action likhein.",
        "Har session end me 3 bullet summary + next action likho.",
      ),
      t(
        lang,
        "Weekly review on Sunday: what worked, what to change.",
        "Sunday ko weekly review: kya kaam kiya, kya change karna hai.",
        "Sunday ko weekly review: kya kaam kiya, kya change karna hai.",
      ),
    ],
    career: [
      t(
        lang,
        "Pick one skill and define a 7‑day micro‑project.",
        "Ek skill choose karke 7‑din ka micro‑project define karein.",
        "Ek skill choose karke 7‑din ka micro‑project define karo.",
      ),
      t(
        lang,
        "Daily 30‑min practice + push small updates.",
        "Roz 30‑min practice + chhote updates push karein.",
        "Roz 30‑min practice + chhote updates push karo.",
      ),
      t(
        lang,
        "Update resume/portfolio this week with 1 new proof.",
        "Is hafte resume/portfolio me 1 naya proof add karein.",
        "Is week resume/portfolio me 1 naya proof add karo.",
      ),
      t(
        lang,
        "Reach out to 1 person for feedback.",
        "Feedback ke liye 1 insaan se reach out karein.",
        "Feedback ke liye 1 person se reach out karo.",
      ),
    ],
    finance: [
      t(
        lang,
        "List top 5 expenses and mark 2 to reduce 20%.",
        "Top 5 expenses list karein, 2 ko 20% reduce mark karein.",
        "Top 5 expenses list karo, 2 ko 20% reduce mark karo.",
      ),
      t(
        lang,
        "Create a simple weekly budget + daily note.",
        "Simple weekly budget banayein + daily note likhein.",
        "Simple weekly budget banao + daily note likho.",
      ),
      t(
        lang,
        "Automate one small saving/invest transfer.",
        "Ek chhota saving/invest transfer automate karein.",
        "Ek chhota saving/invest transfer automate karo.",
      ),
    ],
    habit: [
      t(
        lang,
        "Choose one keystone habit linked to an existing cue.",
        "Ek keystone habit choose karein jo kisi existing cue se linked ho.",
        "Ek keystone habit choose karo jo existing cue se linked ho.",
      ),
      t(
        lang,
        "Make it 2‑minute starter; increase slowly.",
        "Use 2‑minute starter banayein; dheere‑dheere badhayein.",
        "Use 2‑minute starter banao; dheere‑dheere badhao.",
      ),
      t(
        lang,
        "Track streak; miss day → restart next day (no guilt).",
        "Streak track karein; miss ho to next day restart (guilt nahi).",
        "Streak track karo; miss ho to next day restart (guilt nahi).",
      ),
    ],
    productivity: [
      t(
        lang,
        "Plan tomorrow tonight: top‑3 tasks only.",
        "Kal ki planning aaj raat: sirf top‑3 tasks.",
        "Kal ki planning aaj raat: sirf top‑3 tasks.",
      ),
      t(
        lang,
        "Use 2 deep‑work blocks; put phone away.",
        "2 deep‑work blocks; phone door rakhein.",
        "2 deep‑work blocks; phone door rakho.",
      ),
      t(
        lang,
        "After lunch: 10‑min walk to reset energy.",
        "Lunch ke baad 10‑min walk energy reset ke liye.",
        "Lunch ke baad 10‑min walk energy reset ke liye.",
      ),
    ],
    mindset: [
      t(
        lang,
        "Name the feeling; write 2 lines about trigger.",
        "Feeling ka naam likhein; trigger par 2 line likhein.",
        "Feeling ka naam likho; trigger par 2 line likho.",
      ),
      t(
        lang,
        "Do 4‑7‑8 breathing (3 rounds).",
        "4‑7‑8 breathing karein (3 rounds).",
        "4‑7‑8 breathing karo (3 rounds).",
      ),
      t(
        lang,
        "Set 1 small win for today to restore momentum.",
        "Aaj ke liye 1 chhoti jeet set karein.",
        "Aaj ke liye 1 chhoti jeet set karo.",
      ),
    ],
    general: [
      t(
        lang,
        "Write 1 goal for this week and the first tiny action.",
        "Is hafte ka 1 goal likhein aur pehla chhota action decide karein.",
        "Is week ka 1 goal likho aur pehla chhota action decide karo.",
      ),
      t(
        lang,
        "Block calendar for that action (15–30 min).",
        "Us action ke liye calendar block karein (15–30 min).",
        "Us action ke liye calendar block karo (15–30 min).",
      ),
      t(
        lang,
        "Share progress update daily in one line.",
        "Roz ek line me progress update likhein.",
        "Roz ek line me progress update likho.",
      ),
    ],
  };

  const header = t(
    lang,
    "Got it — here is a simple plan you can start today:",
    "Samajh gaya — aaj se shuru karne ke liye yeh simple plan hai:",
    "Samajh gaya — aaj se start karne ke liye yeh simple plan hai:",
  );

  const askNext = t(
    lang,
    "If you want, tell me your time availability and I’ll tailor it.",
    "Agar aap batayein ki roz kitna time de sakte hain, main plan aur behtar bana dunga.",
    "Agar tum batao ki roz kitna time de sakte ho, main plan aur better bana dunga.",
  );

  const list = steps[domain];
  const bullets = list
    .slice(0, 4)
    .map((s) => `- ${s}`)
    .join("\n");

  return [header, bullets, `- ${tiny}`, "", askNext].join("\n");
}

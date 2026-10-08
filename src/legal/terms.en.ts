// English twin of TERMS (terms.ts). Same shape, section ids, bullet counts,
// version and effective date. A translation only: the Hebrew version governs,
// and any substantive change is made in terms.ts first.
//
// Allowed tokens: {{operatorName}}, {{contact}}. Never write an email here.

import type { LegalDocument } from "./types";

export const TERMS_EN: LegalDocument = {
  slug: "terms",
  title: "Hamenoa Terms of Use",
  shortTitle: "Terms of use",
  version: 4,
  effectiveDate: "2026-09-24",
  intro:
    "This English version is provided for convenience. If it differs from the Hebrew version, the Hebrew version governs. Welcome to Hamenoa — a free public pilot of an app that builds fitness workouts. This document explains what the service is, what is expected of you, and the limits of each side's responsibility. It is written to be read on a phone: short paragraphs, no small print. It is addressed to people of all genders. The privacy policy is a separate, complementary document, and both are accepted together.",
  sections: [
    {
      id: "service",
      title: "What the service is, and the pilot stage",
      paragraphs: [
        "\"Hamenoa\" (the \"app\" or the \"service\") is a web app in Hebrew that builds a complete fitness workout — warm-up, strength, conditioning, endurance or cardio, and cool-down — based on the time, place and equipment available to you. The workout is built by an automatic rules engine running on the server. There is no person and no artificial intelligence behind it, and no one reviews a specific workout before it is shown to you.",
        "The service is in a free public pilot stage. There are no payments, no subscriptions and no ads. The purpose of the pilot is to learn and improve, so features may change, be added or disappear, and the whole service may be discontinued (see \"The service as is\").",
        "The app is operated by {{operatorName}} — a private individual, not a company (the \"operator\").",
      ],
    },
    {
      id: "eligibility",
      title: "Who the service is for",
      paragraphs: [
        "The service is intended for adults aged 18 and over with legal capacity. If you are not yet 18, do not use the app — not even through another person's account.",
        "By signing up you confirm that these conditions are met. If it turns out that an account belongs to a minor, the operator will delete it and the information collected in it.",
      ],
    },
    {
      id: "account",
      title: "Your account",
      paragraphs: [
        "You sign in to the app with a Google account (the sign-in flow receives from Google a stable identifier, an email address and a display name — not a password), or with a personal invitation code the operator gave you. An invitation code is personal and may not be transferred.",
        "An account is for use by one person. You are responsible for keeping access to your Google account and your invitation code safe, and for telling the operator if you suspect someone else has used your account. Actions taken in your account are treated as yours, unless you reported otherwise.",
        "The sign-in cookie is valid for 30 days, and you can sign out at any time from the account menu.",
      ],
    },
    {
      id: "not-medical",
      title: "Not medical advice",
      paragraphs: [
        "Nothing in the app — workout plans, weight recommendations, metrics, charts, exercise explanations or voice cues — is medical, physiotherapy, nutritional or other professional advice, and it is not a substitute for examination and advice from a doctor, physiotherapist or personal trainer who knows you and your condition.",
        "If you are unsure whether physical activity — or a specific exercise — suits your condition, ask a professional, not the app.",
      ],
    },
    {
      id: "health-screen",
      title: "Health screening and consulting a doctor",
      paragraphs: [
        "Before your first workout there is a short health questionnaire (yes/no questions). It is meant to identify situations in which it is common to get medical clearance before starting to train. The questionnaire is not a diagnosis and does not detect every possible condition — it is only a signpost.",
        "If the answer to any question is \"yes\", our recommendation is clear: see a doctor and get clearance for physical activity before you start. You can continue without such clearance, but only after explicitly confirming that you understood the recommendation — and the decision, and the responsibility for it, are yours.",
        "Even when all answers are \"no\", it is recommended to consult a doctor if you have not trained for a long time, if you have an ongoing medical condition, or if your health changes. In that case you can, and should, update the questionnaire from the account menu.",
      ],
    },
    {
      id: "assumption-of-risk",
      title: "Assumption of risk",
      paragraphs: [
        "Physical activity — especially strength training with weights and high-intensity training — inherently carries a risk of injury to muscles, tendons, joints and bones, and in rare cases also of serious events such as a cardiac event. The risk exists even when you train correctly, and increases when you train tired, ill, injured or with incorrect technique.",
        "Using the app is your confirmation that these risks are known to and understood by you, that the decision to train is your free decision, and that you accept the risks inherent in the physical activity you choose to do.",
        "Assumption of risk concerns the risks inherent in the activity itself. It does not apply to damage caused by the operator's fault where the law does not allow exemption from it (see \"Limitation of liability\").",
      ],
    },
    {
      id: "listen-to-body",
      title: "Listening to your body, and stop signs",
      paragraphs: [
        "The app cannot see you and does not know how your body feels at any given moment — only you have that information. So the first rule comes before any plan: when your body says stop, you stop. Stop the workout immediately and seek medical help — and in an emergency call 101 — if any of these signs appear:",
      ],
      bullets: [
        "Pain, pressure or burning in the chest, arm, neck or jaw.",
        "Severe shortness of breath that does not pass with a short rest.",
        "Dizziness, blurred vision or feeling faint.",
        "An irregular pulse or a strong, pounding heartbeat at rest.",
        "Sharp, sudden pain in a muscle, joint or bone.",
        "Severe nausea, paleness or a cold sweat not explained by the effort.",
      ],
    },
    {
      id: "listen-to-body-after",
      title: "After a stopped workout",
      paragraphs: [
        "Do not return to a workout that was stopped because of such a sign without a medical check. Unusual pain, swelling or limited movement that persists after the workout is also a reason for a check — not for returning to training.",
        "The app lets you skip an exercise, shorten a workout or stop it at any point. No \"score\" is worth an injury.",
      ],
    },
    {
      id: "technique",
      title: "Correct technique, equipment and environment",
      paragraphs: [
        "The app shows a name, an image and short instructions for each exercise. These are a memory aid, not personal coaching. You are responsible for making sure your technique is correct — and if in doubt, for learning the exercise from a qualified instructor or choosing an exercise you know.",
        "You are also responsible for the equipment and environment: a bar, weights, machines and floor that are in good condition and suitable for the load; clear space; and someone who can help when lifting heavy. The operator does not know the gym or place where you train, and is not responsible for its equipment and facilities.",
        "If an exercise does not suit you — because of an injury, missing equipment, or simply not feeling right — skip it or swap it. You can mark pain or discomfort during a workout (in the \"Station taken\" window), and workouts will avoid that exercise for the next two weeks — but your judgment on the spot always overrides the plan.",
      ],
    },
    // N15: factual availability update; no new liability or data-processing terms.
    {
      id: "personal-games",
      title: "Personal fitness through games",
      paragraphs: [
        "Personal workouts are built from games according to your time, equipment and ability. A game rule, score or reward is never a reason to increase load, shorten rest or continue when you should stop.",
        "The arena, social challenges and professional workspace are unavailable at this stage. You cannot join them, add guests or share workouts with trainers through the app. Information retained from earlier use remains subject to the privacy policy and your export and deletion rights.",
      ],
    },
    {
      id: "personalization-limits",
      title: "Limits of personalization",
      paragraphs: [
        "Plans and recommendations are calculated automatically from the data you provided and from your workout history: initial calibration, sets you logged, effort ratings, and pain marks you made during a workout. What was not reported is not taken into account. A medical condition, a fresh injury, a sleepless night or a new medication: the app does not know about them unless you updated it, and even then it does not assess a medical condition.",
        "Weight recommendations are derived from history and calibration, and can be wrong — too light and also too heavy. A recommendation is a starting point for your judgment, not an instruction. If a weight feels too heavy, go lighter.",
        "There may also be errors in the content: an inaccurate description, an image that does not exactly match the variation, or a calculation fault. We fix things when they are reported, and welcome reports through the feedback option in the app.",
      ],
    },
    {
      id: "as-is",
      title: "The service as is, changes and discontinuation",
      paragraphs: [
        "The service is provided as is and as available, with no commitment to continuous availability, accuracy, completeness, permanent retention of data, or fitness for a particular purpose. This is a pilot: faults, outages and changes are part of it.",
        "The operator may change, suspend or discontinue the service or parts of it at any time. If the whole service is closed, the operator will try to give advance notice and allow export of personal information. Export is available at any time from the account menu in any case.",
        "Nothing in this section derogates from rights granted by law that cannot be contracted out of.",
      ],
    },
    {
      id: "liability",
      title: "Limitation of liability",
      paragraphs: [
        "The operator makes an effort for the app to be accurate and safe, but it is an aid for independent training, and you use it at your own discretion and in accordance with the sections above.",
        "To the maximum extent permitted by law, the operator will not be liable for indirect, consequential or special damage, loss of data, loss of income or other loss arising from use of the app, reliance on its content, its unavailability or a fault in it.",
        "Nothing in these terms exempts the operator from liability that the law does not allow exemption from — in particular not from liability for bodily injury caused by the operator's negligence, for damage caused intentionally, or for breach of a duty under the Protection of Privacy Law. Where the law limits the validity of a term in this section, the term will apply to the narrower extent the law permits, and the remaining terms will stay in force.",
        "Have a problem? We recommend contacting us first ({{contact}}). Most things are resolved by talking, and this does not derogate from any of your rights under the law.",
      ],
    },
    {
      id: "fair-use",
      title: "Fair use",
      paragraphs: [
        "The app is intended for personal use, in good faith and in accordance with the law. Do not use it to harm the service, the operator or other users. In particular:",
      ],
      bullets: [
        "Do not try to access an account, data or admin interface that is not yours, and do not bypass authorization and security mechanisms.",
        "Do not deliberately overload the service (scans, mass requests, automated tools), and do not interfere with its operation.",
        "Do not copy, duplicate, reverse engineer or distribute the code, the content library or the engine beyond what the law explicitly permits.",
        "Do not use the service to provide training or advice services to others, as if it were a substitute for professional judgment.",
        "Do not give another person your invitation code or access to your account.",
      ],
    },
    {
      id: "fair-use-enforcement",
      title: "Violations and responsible disclosure",
      paragraphs: [
        "Violating the fair-use rules may lead to blocking or deletion of the account, without derogating from any other remedy under the law.",
        "Found a security hole? We welcome responsible disclosure ({{contact}}) — not exploitation. Such a report made in good faith will not be considered a violation.",
      ],
    },
    {
      id: "ip",
      title: "Intellectual property",
      paragraphs: [
        "The app's code, design, engine, texts, Hebrew exercise instructions, original illustrations and names (\"Hamenoa\" and the names of the original workouts) are the property of the operator, or of whoever permitted the operator to use them, and are protected by copyright and intellectual property law. Using the app grants a personal, limited, non-exclusive and non-transferable license to use it for personal training purposes — and nothing more.",
        "The exercise library is based in part on open sources under a permissive license. The exact attribution and licensing are detailed in the CREDITS file on the site. Content taken from an open source is subject to that source's license.",
        "Your information — workout logs, feedback and personal data — remains yours. The operator receives permission to use it only for the purposes detailed in the privacy policy. Feedback and ideas sent to the operator may be applied to improve the product, with no obligation of compensation or attribution.",
      ],
    },
    {
      id: "termination",
      title: "Account deletion and termination",
      paragraphs: [
        "You can stop using the service at any moment. The \"Delete account\" button in the account menu immediately deletes the account and all data associated with it; backup copies are deleted within 30 days after that. Before deleting, it is worth exporting your information (a JSON file) from the same menu.",
        "The operator may close or restrict an account if these terms were breached, if required by law, or if the service is discontinued. Where possible, notice will be sent in advance, except when the breach is serious or when the law prevents it.",
        "Sections that by their nature continue to apply after termination — intellectual property, limitation of liability, governing law and jurisdiction — will remain in force.",
      ],
    },
    {
      id: "changes",
      title: "Changes to the terms and re-acceptance",
      paragraphs: [
        "The operator may update these terms and the privacy policy — for example following a new feature, a change in the law or the end of the pilot. Each version has a number and an effective date, shown at the top of the document.",
        "A substantive change requires re-acceptance: on your next sign-in to the app the updated terms will be shown, and continuing depends on accepting them. Anyone who does not agree can export their information and delete the account. Changes that are not substantive (wording, error corrections, contact details) take effect when published on the site.",
        "Your acceptance — its time and the version number accepted — is stored in your account.",
      ],
    },
    {
      id: "law",
      title: "Governing law and jurisdiction",
      paragraphs: [
        "These terms and the use of the app are governed solely by Israeli law. Jurisdiction in any matter relating to them lies with the competent court in Israel.",
        "If a term is found void or unenforceable, the remaining terms will stay in force. Not enforcing a term in a particular case is not a waiver of it.",
        "These terms, together with the privacy policy and the health questionnaire, are the entire agreement between you and the operator regarding the service.",
      ],
    },
    {
      id: "contact",
      title: "Contact",
      paragraphs: [
        "Questions about the terms, reporting a fault, a request about your personal information or any other inquiry — {{contact}}. The operator, {{operatorName}}, tries to answer within a reasonable time; for inquiries about personal information, the time limits in the privacy policy apply.",
        "Feedback on workouts can also be sent directly from the app.",
      ],
    },
  ],
};

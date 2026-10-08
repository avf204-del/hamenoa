// English twin of PRIVACY (privacy.ts). Same shape, section ids, bullet
// counts, version and effective date. A translation only: the Hebrew version
// governs, and any substantive change is made in privacy.ts first.
//
// Allowed tokens: {{operatorName}}, {{contact}}. Never write an email here.

import type { LegalDocument } from "./types";

export const PRIVACY_EN: LegalDocument = {
  slug: "privacy",
  title: "Hamenoa Privacy Policy",
  shortTitle: "Privacy policy",
  version: 6,
  effectiveDate: "2026-09-27",
  intro:
    "This English version is provided for convenience. If it differs from the Hebrew version, the Hebrew version governs. This policy explains what information the \"Hamenoa\" app collects, why, who sees it, where it is stored, and what your rights are. It was written under the Israeli Protection of Privacy Law, 5741-1981 (including Amendment 13) and the regulations under it, in language you can read on a phone. Some of the information collected is health information — information of special sensitivity — so we ask for explicit consent and explain here exactly what it involves.",
  sections: [
    {
      id: "operator",
      title: "Who is responsible for the information",
      paragraphs: [
        "The controller of the app's database (the \"operator\") is {{operatorName}} — a private individual, not a company. There is no additional team, and no parent company, partners or investors who get access to the information.",
        "How to reach us about anything to do with the information: {{contact}}.",
      ],
    },
    {
      id: "data-collected",
      title: "What information is collected",
      paragraphs: [
        "The app collects only information needed to build workouts, track progress and operate the service. The information is provided by you or created by your use:",
      ],
      bullets: [
        "Account details: display name, email address and a stable Google identifier (when signing in with Google), or a display name only (when signing in with an invitation code); and the time of the last sign-in. A password is never stored by us.",
        "Body data (optional): weight and height.",
        "Fitness and ability data: max reps, pace, working weights, the maximum tested in calibration, and an ability level derived from them.",
        "Full workout logs: every set (weight × reps), times, scores, effort rating (\"How hard was it?\") and enjoyment rating.",
        "Pain or discomfort marks you made during a workout (the exercise and the time), and workout preferences.",
        "The health questionnaire: yes/no answers to questions about heart condition, chest pain, dizziness, bone and joint problems, blood pressure or heart medication, pregnancy and any other reason — and the confirmation to continue, if given.",
        "Usage data (internal measurement): usage events such as viewing the landing page, signing up, accepting the terms, calibration, creating/starting/finishing a workout and feedback; the path on the site; and a timestamp.",
        "Free-text feedback you sent, and inquiries you sent to the operator.",
        "Acceptance data: the time you accepted the terms and privacy policy and the version number accepted.",
        "Earlier use of a shared training workspace may leave accepted associations, tags and restrictions with who updated them, schedules, change versions and comments. The professional workspace is inactive; previously accepted restrictions still inform your personal workout.",
      ],
    },
    {
      id: "sensitive-data",
      title: "Information of special sensitivity",
      paragraphs: [
        "Health questionnaire answers are information about health, and so they are \"information of special sensitivity\" under the Protection of Privacy Law. We also treat pain marks you made during a workout and body data (weight, height) this way, although their legal classification is less clear-cut.",
        "Such information gets special attention: it is collected only with explicit consent and used for the purposes in the section \"What the information is used for\". Trainers and managers have no access through a shared workspace at this stage. Body data, pain marks and questionnaire answers are not shared through the archived features. The information is deleted with the account.",
        "What is not collected: your IP address is not stored in our usage data (it is used only for temporary rate limiting in the server's memory, without storage). Reading out cues during a workout happens on your device, and no voice is recorded. Beyond the list above, the app does not collect information.",
      ],
    },
    {
      id: "mandatory",
      title: "Do you have to provide it, and what happens if you don't",
      paragraphs: [
        "There is no legal obligation to provide us with any information; providing it depends on your will and consent. A field that is not required can be left empty — provide only what you are comfortable providing.",
        "However, without some of the information the service simply cannot work:",
      ],
      bullets: [
        "Without account details (Google or an invitation code) you cannot sign in.",
        "Without accepting the terms and privacy policy, and without answering the health questionnaire, you cannot start a workout.",
        "Without initial calibration and workout logs, the engine cannot adjust weights and plans.",
        "Body data (weight, height) is optional — you can skip it.",
      ],
    },
    {
      id: "purposes",
      title: "What the information is used for",
      paragraphs: ["The information is used only for these purposes:"],
      bullets: [
        "Building workouts and tailoring them to you: weights, exercises, formats and avoiding an exercise where you marked pain.",
        "Tracking progress: history, personal records, charts and summaries.",
        "Retaining plans and records from earlier use and applying previously accepted restrictions to your personal workout. Sharing through the professional workspace is inactive.",
        "Operating the account and sign-in, and keeping the required legal acceptances.",
        "Health screening before the first workout — to show you a recommendation to see a doctor when there is a warning sign.",
        "Support and answering inquiries and feedback.",
        "Operations, quality checks and product improvement: understanding how the app is used, finding faults, and improving the engine with real data.",
        "Security: rate limiting, preventing misuse and logging access.",
        "Complying with legal obligations.",
      ],
    },
    {
      id: "not-used-for",
      title: "What the information is not used for",
      paragraphs: [
        "The information is not used for advertising, marketing or profiling for advertising purposes, and it is not sold. The app makes no automated decisions with legal or similar effect on you.",
        "We do not send marketing email. Operational messages — for example about a change in the terms or discontinuation of the service — may be sent to the email address in the account.",
      ],
    },
    {
      id: "legal-basis",
      title: "The basis: informed consent, and how to withdraw it",
      paragraphs: [
        "The basis for collecting and processing the information is your consent — informed consent given by ticking the box on the acceptance screen, after you were shown the terms, this policy and a plain-language summary. The consent explicitly includes the collection of health information, and the health questionnaire itself includes a reminder of this.",
        "You can withdraw your consent at any time. The way to do so is to delete the account — from the account menu or by contacting us. From the moment of deletion the information is deleted, and backup copies are deleted within 30 days after that. Withdrawing consent means you cannot continue using the service, because it cannot work without the information. It does not affect the lawfulness of processing done before it.",
        "Limited processing may also take place without consent where the law requires it — for example responding to a lawful demand from a competent authority.",
      ],
    },
    {
      id: "recipients",
      title: "Who has access to the information",
      paragraphs: [
        "The operator. The operator has full access to all users' data, fully identified, through an admin dashboard for operations, support, quality checks and product improvement. The operator has no additional team. The operator can see your logs, body data and health questionnaire answers, and undertakes to look only when there is an operational need.",
        "The professional workspace is archived and gives trainers or managers no access to other accounts. Earlier associations and records may remain in your account; retaining them grants no access permission. Account export and deletion still cover the personal information retained.",
        "Infrastructure providers. Three providers process information for us, each in a defined role:",
      ],
      bullets: [
        "Google — the sign-in provider only. Google verifies your identity and gives us an identifier, an email address and a name. Google does not receive workout or health data from us. Google's privacy policy also applies to signing in with Google.",
        "Neon — the managed database provider (Postgres). All the information is stored with it, in a data center in Frankfurt, Germany.",
        "Railway — the cloud provider on which the app server runs and where one of the two backup copies is stored. Technical traffic logs of such a provider may include an IP address, under its own policy.",
      ],
    },
    {
      id: "no-transfer",
      title: "No sale and no transfer",
      paragraphs: [
        "The providers process information for us under their agreements and policies, and may not use it for their own purposes. Workouts are not shared through the archived professional workspace. Beyond these providers, information is not sold or rented and is not transferred to another party unless the law requires it (for example a court order or a lawful demand from a competent authority). In such a case we will notify you if the law allows.",
        "If in the future a provider or partner who gets access to the information joins, the policy will be updated first, and for a substantive change consent will be requested again.",
      ],
    },
    {
      id: "transfer",
      title: "Transfer of information outside Israel",
      paragraphs: [
        "The information is stored and processed outside Israel: the database in Germany (European Union); the app server and one of the backups with Railway — a cloud whose data centers may be located outside Israel; and sign-in verification with Google.",
        "Germany is a country whose data protection law is at a level that allows transfer under the Protection of Privacy Regulations (Transfer of Data to Databases Abroad), 5761-2001. For transfers to providers in other countries we rely on your explicit consent on the acceptance screen and on the providers' information security commitments in their agreements. Ticking the consent box includes consent to this transfer.",
      ],
    },
    {
      id: "backups",
      title: "Backups",
      paragraphs: [
        "So that your information is not lost in a fault, a daily backup of the database is made. Each backup may contain all the information of all users, including health information.",
        "Backups are kept for 30 days and then deleted. They are stored in two places: in Railway's storage, and in a copy on the operator's personal computer. Important to know: the copy on the personal computer is outside the cloud, and the operator is responsible for securing it; it is under the operator's sole control and is not accessible to anyone else.",
        "When you delete an account, the information is deleted immediately from the active database, and also disappears from the backups within 30 days at most — when the backups that contained it are deleted.",
      ],
    },
    {
      id: "security",
      title: "Information security",
      paragraphs: [
        "What there is: an encrypted connection (HTTPS) for all communication; a signed sign-in cookie inaccessible to browser scripts (httpOnly); server authorization on each access to an account or accepted shared training workspace, including after revocation; rate limiting against automated attempts; and a managed database. The actively associated people described above can also access shared training information.",
        "What there isn't: there is no commercial security certification or standard (such as ISO 27001 or SOC 2), no external security audit, and no security team. This is a pilot by a private individual, and the database is small. We act according to the obligations that apply to such a database under the Protection of Privacy Regulations (Data Security), 5777-2017, and try to go beyond them — but no system is completely immune.",
        "So: do not provide information in the app that is not needed, especially not in free-text fields (feedback, inquiries) — there is no need to write diagnoses or medical details there beyond the questionnaire. If we learn of a security incident that affected your information, we will notify you promptly and report to the Privacy Protection Authority as required by law.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies, local storage and measurement",
      paragraphs: [
        "The app uses only what is needed for it to work. There are no advertising cookies, no third-party tracking cookies, and no external analytics tool (not Google Analytics or anything like it). The full list:",
      ],
      bullets: [
        "hamenoa_session — the sign-in cookie, signed and httpOnly, valid for 30 days and renewed when a signed-in user returns to the app in the last week of its validity. After 30 days without renewal you need to sign in again. Without it you cannot stay signed in.",
        "nonce cookie — a short-lived technical cookie (10 minutes) that protects the Google sign-in flow against forgery. Deleted when sign-in completes.",
        "localStorage — the theme and color, muting of read-out cues and dismissing the install prompt are stored on the device. Workout preferences and the weight inventory are also stored in the account so they are remembered across devices. While a set is being saved, a temporary copy tied to the account and the workout is stored on the device, to allow resending after a connection problem. The copy is removed after confirmation from the server, on signing out or on deleting the account; you can also remove it from the pending entries screen.",
        "Browser cache (service worker) — the app files and exercise images, so the screen loads fast and works without a network too. No personal data.",
        "sessionStorage — a random, temporary visit identifier that makes it possible to link a landing page view to the sign-up that follows it. Deleted when you close the tab, and does not identify you across visits.",
      ],
    },
    {
      id: "analytics",
      title: "Internal measurement",
      paragraphs: [
        "Internal measurement records basic usage events on our server — which steps in the flow you went through, and when — to understand where the product works and where it doesn't. This data is kept only by us, without an IP address, and is not transferred to any third party.",
        "You can block or delete cookies in your browser settings, but without the sign-in cookie you cannot stay signed in.",
      ],
    },
    // N15: historical data remains covered; no expansion of collection or access.
    {
      id: "social",
      title: "Earlier data from archived features",
      paragraphs: [
        "The arena, social challenges and professional workspace are inactive. You cannot join them, add participants or share new information through them.",
        "Earlier use may leave nicknames, membership, roles, teams, choices and results, as well as guest confirmations. Guest location and IP addresses were not collected; guest health questionnaire answers were not stored, only completion and flag indicators.",
        "Account export includes your personal information from these features. Account deletion removes it from the active database. Guest nickname and cookie cleanup after 30 days from the end of an arena and time-limited backup retention continue as described in this policy.",
      ],
    },
    {
      id: "retention",
      title: "How long the information is kept",
      paragraphs: [
        "The information is kept as long as the account exists, so that your workout history and progress are available.",
        "Deleting the account (the \"Delete account\" button in the account menu) immediately deletes all information associated with the account from the active database. Backup copies that contained the information are deleted within 30 days at most.",
        "Internal measurement events (for example \"workout completed\") remain for statistics, but the account identifier is removed from them on deletion — they are no longer linked to you and you cannot be identified through them.",
        "Information that the law requires to be kept — for example to respond to a lawful demand that was received — will be kept only for as long as required and for that purpose only.",
        "If the service is closed, the operator will try to give advance notice to allow export, and the information will be deleted afterwards.",
      ],
    },
    {
      id: "rights",
      title: "Your rights and how to exercise them",
      paragraphs: [
        "Under the Protection of Privacy Law and this policy you have rights in your information. You can exercise most of them yourself, immediately, from within the app:",
      ],
      bullets: [
        "Access: all your information is shown in the app — logs, ability data, settings and the health questionnaire — and you can export it as a JSON file from the account menu.",
        "Correction: body data, ability, preferences and questionnaire answers can be edited in the app's screens and in the account menu. If something cannot be corrected yourself, write to us and we will correct it.",
        "Deletion: the \"Delete account\" button deletes everything, immediately.",
        "Export: a JSON file with all your personal information, from the account menu.",
        "Withdrawing consent: deleting the account withdraws consent; you can also contact us and we will delete it for you.",
      ],
    },
    {
      id: "rights-how",
      title: "How to contact us, and how quickly we will answer",
      paragraphs: [
        "To contact us on any of these matters: {{contact}}. We will answer within 30 days at most, as required by law — and usually much sooner. To protect the information, we will ask to verify that the request comes from the account holder (for example from the email address in the account).",
        "If you believe one of your rights was infringed, you can also contact the Privacy Protection Authority. Contacting us first may resolve the matter faster, but it is not a condition.",
      ],
    },
    {
      id: "minors",
      title: "Minors",
      paragraphs: [
        "The service is intended for adults aged 18 and over only. We do not knowingly collect information about minors. If we find that an account belongs to someone who is not yet 18, we will delete the account and the information.",
        "A parent or guardian who believes a minor has signed up — please contact us ({{contact}}), and we will handle it immediately.",
      ],
    },
    {
      id: "changes",
      title: "Changes to the policy",
      paragraphs: [
        "The policy may be updated — for example if a provider is added, a new feature collects additional information, or the law changes. Each version has a number and an effective date at the top of the document.",
        "A substantive change — in particular expanding the types of information, the purposes or who has access to it — will not take effect for your information without renewed consent: on your next sign-in the new version will be shown, and continuing depends on accepting it. Anyone who does not agree can export their information and delete the account. Changes that are not substantive take effect when published.",
      ],
    },
    {
      id: "contact",
      title: "Contact and complaints",
      paragraphs: [
        "For any question, request or complaint about privacy: {{contact}}. The person responsible for the information: {{operatorName}}.",
        "You can also contact the Privacy Protection Authority at the Ministry of Justice, which is the body that supervises implementation of the law in Israel.",
      ],
    },
  ],
};

// English twin of CONSENT_SUMMARY (summary.ts). Same shape and point count.
// A translation only: the Hebrew version governs.

import type { CONSENT_SUMMARY } from "./summary";

export const CONSENT_SUMMARY_EN: typeof CONSENT_SUMMARY = {
  title: "Before we start — in short",
  intro:
    "This is a plain-language summary of the terms of use and the privacy policy. It does not replace them: the full documents are available through the links here, and at any time from the account menu.",
  points: [
    "Hamenoa is a free pilot that automatically builds workouts for you based on the data you provided, for adults aged 18 and over. It is not medical advice and not a personal trainer.",
    "Physical activity carries a risk of injury. Your training is your responsibility: technique, equipment, environment — and stopping when something doesn't feel right.",
    "Before your first workout you answer a short health questionnaire. If a warning sign comes up, we will recommend getting a doctor's clearance before you start; you can continue without it, but that is your decision.",
    "We store: account details, body and fitness data, full workout logs, pain marks you made during a workout, health questionnaire answers, and basic usage data. Some of this is health information, of special sensitivity.",
    "The operator — a private individual, not a company — sees all your data, fully identified, for operations, support and improvement. If you accept a coach or gym invitation, your associated trainers and managers can view and edit workout, performance and tag data until you revoke membership; health questionnaire answers are not shown to them.",
    "The information is stored with cloud providers outside Israel (the database in Germany) and in backups, including a copy on the operator's personal computer. There is no commercial security certification.",
    "No ads, no tracking cookies and no third-party analytics — only a sign-in cookie and internal measurement without an IP address.",
    "At any moment you can export your information or delete the account — and that deletes everything (backups are deleted within 30 days). The service is provided as is, and may change or stop.",
  ],
  checkboxLabel:
    "I have read the terms of use and the privacy policy and I agree to them — including the collection and storage of the health information I will provide.",
  button: "Accept and continue",
  note: "The acceptance is recorded in your account with a timestamp and the documents' version number. If the documents change substantively, we will ask you to accept them again.",
};

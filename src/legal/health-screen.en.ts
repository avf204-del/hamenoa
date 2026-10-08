// English twin of the health questionnaire (health-screen.ts). These are
// safety questions: same ids, same order, faithful plain translation.
// A translation is not a substantive change — HEALTH_SCREEN_VERSION stays.

import type { HEALTH_TEXTS, HealthQuestion } from "./health-screen";

export const HEALTH_QUESTIONS_EN: HealthQuestion[] = [
  {
    id: "heart-condition",
    text: "Have you ever been diagnosed with heart disease or a heart problem?",
    detail:
      "For example: coronary heart disease, heart failure, an arrhythmia, a congenital defect, or past heart surgery or catheterization.",
  },
  {
    id: "chest-pain-exertion",
    text: "Have you felt pain, pressure or discomfort in your chest during physical effort?",
    detail: "Climbing stairs, walking fast, running or lifting a load.",
  },
  {
    id: "chest-pain-rest",
    text: "In the past month, have you felt chest pain or pressure at rest, not during effort?",
  },
  {
    id: "dizziness-fainting",
    text: "In the past year, have you lost your balance because of dizziness, or fainted?",
    detail: "Not including mild dizziness from fast breathing during intense effort.",
  },
  {
    id: "musculoskeletal",
    text: "Do you have a bone, joint or back problem that could get worse with physical activity?",
    detail:
      "For example: a herniated disc, an injury that has not yet healed, active arthritis, or ongoing pain that limits movement.",
  },
  {
    id: "bp-heart-medication",
    text: "Do you have a regular prescription for blood pressure or heart medication?",
    detail: "Including medication you take even if your blood pressure is under control thanks to it.",
  },
  {
    id: "pregnancy",
    text: "Are you pregnant, or have you given birth in the past six months?",
    detail: "If the question does not apply to you, the answer is \"no\".",
  },
  {
    id: "other-reason",
    text: "Is there any other reason you should be careful with physical activity?",
    detail:
      "For example: recent surgery or hospitalization, a chronic illness (diabetes, asthma, kidney disease), or a doctor who advised you to avoid exertion.",
  },
];

export const HEALTH_TEXTS_EN: typeof HEALTH_TEXTS = {
  title: "A short health questionnaire before your first workout",
  intro:
    "Eight yes/no questions. They help identify situations in which it is worth getting medical clearance before you start training. The questionnaire is not a diagnosis and does not replace medical judgment — when in doubt, ask a doctor.",
  allClear:
    "Based on your answers, there is no sign that requires medical clearance before you start. Still — start gradually, and if something feels wrong, stop. If your health changes, update the questionnaire from the account menu.",
  flagged:
    "The answer to at least one question is \"yes\". In this situation we strongly recommend that you see a doctor and get clearance for physical activity before you start training — and show the doctor the questions you marked. You can continue without clearance, but that is your decision and your responsibility: the app cannot assess your medical condition.",
  ackLabel:
    "I understand the recommendation to see a doctor. I choose to continue at my own responsibility, and I will stop immediately if I feel unwell.",
  continueLabel: "Continue",
  emergencyTitle: "Stop immediately and seek medical help (in an emergency: call 101) if any of these appear:",
  emergency: [
    "Pain, pressure or burning in the chest, arm, neck or jaw.",
    "Severe shortness of breath that does not pass with a short rest.",
    "Dizziness, blurred vision or feeling faint.",
    "An irregular pulse or a strong, pounding heartbeat at rest.",
    "Sharp, sudden pain in a muscle, joint or bone.",
    "Severe nausea, paleness or a cold sweat not explained by the effort.",
  ],
  updateNote:
    "You can update your answers at any time from the account menu. The answers are health information (information of special sensitivity), are stored in your account under the privacy policy, and are visible only to you and the operator.",
};

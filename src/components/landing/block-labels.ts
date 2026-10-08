// The landing page still describes the workout as five parts. These labels
// exist only for that page: its copy must be rewritten to match the new
// workout structure before the public launch (docs/PLAN.md).
import type { Locale } from "@/i18n";

type LandingBlock = "warmup" | "strength" | "metcon" | "cardio" | "cooldown";

export const BLOCK_LABELS: Record<LandingBlock, string> = {
  warmup: "חימום",
  strength: "כוח",
  metcon: "אימון עצים",
  cardio: "אירובי",
  cooldown: "שחרור",
};

const BLOCK_LABELS_EN: Record<LandingBlock, string> = {
  warmup: "Warm-up",
  strength: "Strength",
  metcon: "Conditioning",
  cardio: "Cardio",
  cooldown: "Cool-down",
};

export function blockLabel(type: LandingBlock, locale: Locale = "he"): string {
  return (locale === "en" ? BLOCK_LABELS_EN : BLOCK_LABELS)[type];
}

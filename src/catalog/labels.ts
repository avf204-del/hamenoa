// Interface words for the exercise catalog, Hebrew and English.
// Components never hard-code these terms; they read them from here.

import { kgToDisplay, translator, unitLabel, weightText, type Locale, type Units } from "@/i18n";
import type { LoadClass, LocationKind, Modality, Pattern, StationType, SystemicCost } from "@/catalog/types";

/** Canonical display order of movement patterns. */
export const PATTERN_ORDER: Pattern[] = [
  "squat", "hinge", "pushH", "pushV", "pullV", "pullH",
  "lunge", "carry", "core", "locomotion",
];

export const PATTERN_LABELS: Record<Pattern, string> = {
  squat: "סקוואט",
  hinge: "ציר ירך",
  pushV: "דחיקה אנכית",
  pushH: "דחיקה אופקית",
  pullV: "משיכה אנכית",
  pullH: "משיכה אופקית",
  lunge: "לאנג'",
  carry: "נשיאה",
  core: "ליבה",
  locomotion: "תנועה",
};

export const PATTERN_LABELS_EN: Record<Pattern, string> = {
  squat: "Squat",
  hinge: "Hip hinge",
  pushV: "Vertical push",
  pushH: "Horizontal push",
  pullV: "Vertical pull",
  pullH: "Horizontal pull",
  lunge: "Lunge",
  carry: "Carry",
  core: "Core",
  locomotion: "Locomotion",
};

export function patternLabel(pattern: Pattern, locale: Locale = "he"): string {
  return (locale === "en" ? PATTERN_LABELS_EN : PATTERN_LABELS)[pattern];
}

export const MODALITY_LABELS: Record<Modality, string> = {
  cardio: "דופק",
  gymnastics: "משקל גוף",
  weights: "משקולות",
};

export const MODALITY_LABELS_EN: Record<Modality, string> = {
  cardio: "Cardio",
  gymnastics: "Bodyweight",
  weights: "Weights",
};

export function modalityLabel(modality: Modality, locale: Locale = "he"): string {
  return (locale === "en" ? MODALITY_LABELS_EN : MODALITY_LABELS)[modality];
}

export const STATION_LABELS: Record<StationType, string> = {
  fixed: "תחנה קבועה",
  portable: "ציוד נייד",
  none: "בלי ציוד",
};

export const STATION_LABELS_EN: Record<StationType, string> = {
  fixed: "Fixed station",
  portable: "Portable equipment",
  none: "No equipment",
};

export function stationLabel(station: StationType, locale: Locale = "he"): string {
  return (locale === "en" ? STATION_LABELS_EN : STATION_LABELS)[station];
}

export const LOAD_LABELS: Record<LoadClass, string> = {
  bodyweight: "משקל גוף",
  light: "קל",
  moderate: "בינוני",
  heavy: "כבד",
};

export const LOAD_LABELS_EN: Record<LoadClass, string> = {
  bodyweight: "Bodyweight",
  light: "Light",
  moderate: "Moderate",
  heavy: "Heavy",
};

export function loadLabel(load: LoadClass, locale: Locale = "he"): string {
  return (locale === "en" ? LOAD_LABELS_EN : LOAD_LABELS)[load];
}

export const COST_LABELS: Record<SystemicCost, string> = {
  low: "עומס נמוך",
  med: "עומס בינוני",
  high: "עומס גבוה",
};

export const COST_LABELS_EN: Record<SystemicCost, string> = {
  low: "Low load",
  med: "Moderate load",
  high: "High load",
};

export function costLabel(cost: SystemicCost, locale: Locale = "he"): string {
  return (locale === "en" ? COST_LABELS_EN : COST_LABELS)[cost];
}

export const LOCATION_KIND_LABELS: Record<LocationKind, string> = {
  gym: "חדר כושר",
  home: "בית",
  park: "גן כושר",
};

export const LOCATION_KIND_LABELS_EN: Record<LocationKind, string> = {
  gym: "Gym",
  home: "Home",
  park: "Outdoor gym",
};

/** The place name for any stored kind, including an old or unknown one. */
export function locationLabel(kind: string, locale: Locale = "he"): string {
  return ((locale === "en" ? LOCATION_KIND_LABELS_EN : LOCATION_KIND_LABELS) as Record<string, string>)[kind] ?? kind;
}

/** Singular/plural beside a number: "חזרה אחת", "3 חזרות". */
export function repsLabel(n: number, locale: Locale = "he"): string {
  if (locale === "en") return n === 1 ? "rep" : "reps";
  return n === 1 ? "חזרה" : "חזרות";
}

/** A weight with its unit. Kilograms print as stored; pounds are rounded. */
export function weightLabel(kg: number, units: Units = "kg", locale: Locale = "he"): string {
  return units === "kg" ? `${kg} ${unitLabel("kg", locale)}` : weightText(kg, units, locale);
}

/** The number alone (the unit is rendered beside it). */
export function weightFigure(kg: number, units: Units = "kg"): string {
  return units === "kg" ? String(kg) : String(Math.round(kgToDisplay(kg, units) * 2) / 2);
}

/** "12", "30 שנ׳" / "30 sec": an amount with its unit. */
export function amountLabel(value: number, unit: "reps" | "sec" | "cal", locale: Locale = "he"): string {
  const t = translator(locale);
  if (unit === "sec") return t(`${value} שנ׳`, `${value} sec`);
  if (unit === "cal") return t(`${value} קל׳`, `${value} cal`);
  return `${value}`;
}

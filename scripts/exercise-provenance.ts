import fs from "node:fs";
import path from "node:path";

/** Content attribution, not a license claim for separately sourced exercise images. */
export interface ProvenanceManifest {
  title: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  /** Description of translation/adaptation, or an explicit statement of no changes. */
  changes: string;
  attribution?: string;
  licenseNote?: string;
}

export function isProvenanceId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]*$/.test(value);
}

export function loadProvenanceManifest(
  provenanceId: string,
  root = process.cwd(),
): ProvenanceManifest {
  if (!isProvenanceId(provenanceId)) throw new Error(`provenanceId לא תקין: ${provenanceId}`);
  const file = path.join(root, "data", "sources", provenanceId, "manifest.json");
  const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  return parseProvenanceManifest(provenanceId, raw);
}

/** Shared validation for imports and statically bundled public attribution. */
export function parseProvenanceManifest(provenanceId: string, raw: unknown): ProvenanceManifest {
  if (!isProvenanceId(provenanceId)) throw new Error(`provenanceId לא תקין: ${provenanceId}`);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${provenanceId}: manifest חייב להיות אובייקט`);
  }
  const fields = raw as Record<string, unknown>;
  const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
  // An optimistic license string cannot override unresolved archive evidence.
  // This catalog's approved import scope excludes NC and SA content.
  if (fields.licenseEvidence != null && (typeof fields.licenseEvidence !== "object" || Array.isArray(fields.licenseEvidence))) {
    throw new Error(`${provenanceId}: licenseEvidence לא תקין; הייבוא חסום`);
  }
  const evidence = fields.licenseEvidence && typeof fields.licenseEvidence === "object"
    ? fields.licenseEvidence as Record<string, unknown> : {};
  const reviewFlags = [fields.requiresReview, fields.reviewRequired, evidence.requiresReview, evidence.reviewRequired];
  const reviewStatuses = [fields.reuseStatus, fields.licenseStatus, evidence.reuseStatus, evidence.status, evidence.resolution];
  if (reviewFlags.some((value) => value != null && typeof value !== "boolean") ||
      reviewStatuses.some((value) => value != null && typeof value !== "string")) {
    throw new Error(`${provenanceId}: שדות בירור רישוי לא תקינים; הייבוא חסום`);
  }
  const requiresReview = reviewFlags.some((value) => value === true);
  const reviewStatus = reviewStatuses
    .map((value) => text(value).replaceAll("_", " ")).join(" ");
  if (requiresReview || /\b(pending|unresolved|unverified|unknown|blocked|conflicting|ambiguous|requires[\s_-]?review|needs[\s_-]?review)\b/i.test(reviewStatus)) {
    throw new Error(`${provenanceId}: זכויות השימוש ממתינות לבירור; הייבוא חסום`);
  }
  for (const value of [fields.license, fields.licenseId, fields.licenseUrl]) {
    if (/\b(NC|SA)\b|non[\s-]?commercial|share[\s-]?alike/i.test(text(value).replaceAll("_", " "))) {
      throw new Error(`${provenanceId}: רישיון NC/SA אינו מאושר לייבוא`);
    }
  }
  const author = text(fields.author) || text(fields.authors) || (Array.isArray(fields.authors)
    ? fields.authors.map((item) => text(item) || (item && typeof item === "object" ? text(item.name) : "")).filter(Boolean).join(", ")
    : "");
  const files = Array.isArray(fields.files) ? fields.files : [];
  const sourceFile = files.find((file) => file && typeof file === "object" && !String(file.path ?? file.file).toLowerCase().includes("license") && text(file.url));
  const license = text(fields.license) || text(fields.licenseId);
  const original = provenanceId === "forceapp-original" && !/\bcc[ -]?by\b/i.test(license);
  const attributionFields = fields.attribution && typeof fields.attribution === "object"
    ? fields.attribution as Record<string, unknown> : {};
  const attribution = text(fields.attribution) || text(attributionFields.text);
  const manifest: ProvenanceManifest = {
    title: text(fields.title),
    author: author || attribution,
    sourceUrl: text(fields.sourceUrl) || text(fields.url) || text(sourceFile?.url),
    license,
    licenseUrl: text(fields.licenseUrl) || (license === "Unlicense" ? "https://unlicense.org/" : ""),
    changes: text(fields.changes) || text(attributionFields.changesHe) || (original
      ? "תוכן שנכתב לפרויקט; פרטי המקור במניפסט."
      : "עיבוד לרשומת אימון בעברית; פירוט השינויים אינו מתועד במניפסט."),
    ...(attribution ? { attribution } : {}),
    ...(text(fields.licenseNote) ? { licenseNote: text(fields.licenseNote) } : {}),
  };
  const required = original
    ? ["title", "author", "license"] as const
    : ["title", "author", "sourceUrl", "license", "licenseUrl"] as const;
  for (const field of required) {
    if (!manifest[field]) {
      throw new Error(`${provenanceId}: manifest חסר ${field}`);
    }
  }
  for (const field of ["sourceUrl", "licenseUrl"] as const) {
    if (!manifest[field] && original) continue;
    const url = new URL(manifest[field]);
    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error(`${provenanceId}: ${field} חייב להיות קישור HTTP(S)`);
    }
  }
  return manifest;
}

export function provenanceLicenseNote(manifest: ProvenanceManifest): string {
  return [
    `${manifest.title} — ${manifest.author}.`,
    manifest.sourceUrl ? `מקור: ${manifest.sourceUrl}.` : "",
    `רישיון: ${manifest.license}${manifest.licenseUrl ? ` (${manifest.licenseUrl})` : ""}.`,
    manifest.attribution ? `ייחוס: ${manifest.attribution}.` : "",
    manifest.licenseNote ? `הערת המקור: ${manifest.licenseNote}` : "",
    `שינויים: ${manifest.changes}`,
  ].filter(Boolean).join(" ");
}

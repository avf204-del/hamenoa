"use client";

// עורך המאגר: טבלת התרגילים המתויגת עם עריכה במקום.
// שמירה עוברת דרך /api/admin/exercises/[slug] — מעדכנת מסד + YAML יחד.
// שורות סגורות ממומואיזציה כדי שהקלדה בטופס לא תרנדר את כל 73 הכרטיסים.

import { memo, useCallback, useMemo, useState } from "react";
import { EQUIPMENT_LABELS } from "@/lib/equipment";
import {
  COST_LABELS,
  LOAD_LABELS,
  MODALITY_LABELS,
  PATTERN_LABELS,
  PATTERN_ORDER,
  STATION_LABELS,
} from "@/catalog/labels";
import type { Pattern } from "@/catalog/types";
import { XIcon } from "@/components/icons";
import { TRAINING_TYPE_LABELS, trainingTypeLabel } from "@/lib/training-types";
import ExerciseInfoSheet from "@/components/ExerciseInfoSheet";
import type { ExerciseInfoMap } from "@/lib/exercise-info";

export type ExerciseRow = {
  slug: string;
  nameHe: string;
  nameEn: string;
  sourceId: string;
  licenseNote: string;
  trainingType: string;
  provenanceId: string | null;
  modality: string;
  pattern: string;
  equipment: string[];
  stationType: string;
  skillLevel: number;
  loadClass: string;
  repPaceSecPerRep: number;
  systemicCost: string;
  constraints: string[];
  substitutes: string[];
  scalingEasier: string | null;
  scalingHarder: string | null;
  instructionsHe: string;
  /** מועד הוספה למאגר, "YYYY-MM-DD" — null אם tagging.yaml לא נטען */
  addedOn: string | null;
  /** נתיב תמונה ממוזערת ציבורי, אם קיימת */
  thumbnail: string | null;
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const CONSTRAINT_LABELS: Record<string, string> = {
  noise: "רעש",
  ceiling: "תקרה גבוהה",
  space: "שטח",
};

const inputCls =
  "w-full rounded-(--r-s) border border-line bg-sunken px-2.5 py-2 text-sm text-fg focus:border-accent";

function sortRows(rows: ExerciseRow[]): ExerciseRow[] {
  return [...rows].sort(
    (a, b) =>
      PATTERN_ORDER.indexOf(a.pattern as Pattern) -
        PATTERN_ORDER.indexOf(b.pattern as Pattern) ||
      a.skillLevel - b.skillLevel ||
      a.nameHe.localeCompare(b.nameHe, "he"),
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-fg-3">{label}</span>
      {children}
    </label>
  );
}

/** כותרת כרטיס תרגיל — ממומואיזציה: שורה סגורה לא מתרנדרת בהקלדה בכרטיס אחר */
const RowCard = memo(function RowCard({
  row,
  isOpen,
  flash,
  isNew,
  onToggle,
  onInfo,
  hasInfo,
  children,
}: {
  row: ExerciseRow;
  isOpen: boolean;
  flash: boolean;
  isNew: boolean;
  onToggle: (slug: string) => void;
  onInfo: (slug: string) => void;
  hasInfo: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-(--r-m) border border-line bg-raised [box-shadow:var(--raise-edge)]">
      <button
        type="button"
        onClick={() => onToggle(row.slug)}
        aria-expanded={isOpen}
        aria-controls={`exercise-panel-${row.slug}`}
        className="flex w-full items-center gap-3 p-3.5 text-start"
      >
        {row.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- תמונה מקומית סטטית מ-public, לא דורשת אופטימיזציה
          <img
            src={row.thumbnail}
            alt=""
            className="h-12 w-12 shrink-0 rounded-(--r-s) bg-sunken object-cover"
          />
        ) : (
          <span className="h-12 w-12 shrink-0 rounded-(--r-s) bg-sunken" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold">{row.nameHe}</span>
            <span className="text-[11px] text-fg-3" dir="ltr">
              {row.nameEn}
            </span>
            {row.sourceId === "original" && !row.provenanceId && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                מקורי
              </span>
            )}
            {isNew && (
              <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-medium text-ok">
                חדש
              </span>
            )}
            {flash && (
              <span role="status" className="text-[11px] font-medium text-ok">
                נשמר ✓
              </span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-fg-3">
            <span className="rounded-full bg-sunken px-2 py-0.5">
              {trainingTypeLabel(row.trainingType)}
            </span>
            <span className="rounded-full bg-sunken px-2 py-0.5">
              {MODALITY_LABELS[row.modality as keyof typeof MODALITY_LABELS]}
            </span>
            <span className="rounded-full bg-sunken px-2 py-0.5">
              רמה <span className="num">{row.skillLevel}</span>
            </span>
            <span className="rounded-full bg-sunken px-2 py-0.5">
              {LOAD_LABELS[row.loadClass as keyof typeof LOAD_LABELS]}
            </span>
            <span className="rounded-full bg-sunken px-2 py-0.5">
              <span className="num">{row.repPaceSecPerRep}</span> שנ׳/חזרה
            </span>
            <span className="rounded-full bg-sunken px-2 py-0.5">
              {STATION_LABELS[row.stationType as keyof typeof STATION_LABELS]}
            </span>
            {row.equipment.map((eq) => (
              <span key={eq} className="rounded-full bg-sunken px-2 py-0.5">
                {EQUIPMENT_LABELS[eq as keyof typeof EQUIPMENT_LABELS] ?? eq}
              </span>
            ))}
          </span>
        </span>
        <span className="text-xs text-fg-3">{isOpen ? "סגור" : "ערוך"}</span>
      </button>
      <div className="px-3.5 pb-3">
        <button
          type="button"
          onClick={() => onInfo(row.slug)}
          disabled={!hasInfo}
          aria-label={`הסבר ותמונות: ${row.nameHe}`}
          className="min-h-9 rounded-(--r-s) border border-line px-3 py-2 text-xs font-semibold text-accent hover:bg-sunken disabled:opacity-50"
        >
          הסבר ותמונות
        </button>
      </div>
      {children}
    </div>
  );
});

export default function ExerciseEditor({
  initialRows,
  exerciseInfo,
  validationErrors,
  latestDate,
  readOnly = false,
}: {
  initialRows: ExerciseRow[];
  exerciseInfo: ExerciseInfoMap;
  validationErrors: string[];
  latestDate: string | null;
  readOnly?: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [infoSlug, setInfoSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExerciseRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [patternFilter, setPatternFilter] = useState<string>("all");
  const [trainingTypeFilter, setTrainingTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const bySlug = useMemo(
    () => new Map(rows.map((r) => [r.slug, r] as const)),
    [rows],
  );
  const previewInfo = useMemo(() => {
    if (!infoSlug || !exerciseInfo[infoSlug]) return null;
    const row = bySlug.get(infoSlug);
    if (!row) return null;
    // Preview saved text with the server's complete frame metadata, never an unsaved draft.
    return { ...exerciseInfo[infoSlug], nameHe: row.nameHe, nameEn: row.nameEn,
      instructionsHe: row.instructionsHe, licenseNote: row.licenseNote,
      trainingType: row.trainingType, trainingTypeLabel: trainingTypeLabel(row.trainingType) };
  }, [infoSlug, exerciseInfo, bySlug]);

  // גלי עדכון קיימים, מהחדש לישן — לסינון "קיבוץ לפי מועד עדכון"
  const updateDates = useMemo(
    () =>
      [...new Set(rows.map((r) => r.addedOn).filter((d): d is string => !!d))].sort(
        (a, b) => b.localeCompare(a),
      ),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (trainingTypeFilter !== "all" && (r.trainingType ?? "base") !== trainingTypeFilter) return false;
    if (patternFilter !== "all" && r.pattern !== patternFilter) return false;
    if (dateFilter !== "all" && r.addedOn !== dateFilter) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      r.nameHe.includes(q) ||
      r.nameEn.toLowerCase().includes(q) ||
      r.slug.includes(q)
    );
  });

  // תלוי ב-rows/openSlug (משתנים רק בפתיחה/שמירה) — הקלדה בטיוטה לא
  // מייצרת פונקציה חדשה, ולכן שורות סגורות לא מתרנדרות תוך כדי הקלדה.
  const toggle = useCallback(
    (slug: string) => {
      if (openSlug === slug) {
        setOpenSlug(null);
        setDraft(null);
        setSaveErrors([]);
        return;
      }
      const row = rows.find((r) => r.slug === slug);
      if (!row) return;
      setOpenSlug(slug);
      setDraft({ ...row });
      setSaveErrors([]);
      setSavedFlash(null);
    },
    [rows, openSlug],
  );

  const close = () => {
    setOpenSlug(null);
    setDraft(null);
    setSaveErrors([]);
  };

  const set = <K extends keyof ExerciseRow>(key: K, value: ExerciseRow[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const toggleIn = (key: "equipment" | "constraints", value: string) =>
    setDraft((d) => {
      if (!d) return d;
      const list = d[key].includes(value)
        ? d[key].filter((v) => v !== value)
        : [...d[key], value];
      return { ...d, [key]: list };
    });

  const save = async () => {
    if (readOnly) return;
    if (!draft) return;
    setSaving(true);
    setSaveErrors([]);
    try {
      const res = await fetch(`/api/admin/exercises/${draft.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameHe: draft.nameHe,
          nameEn: draft.nameEn,
          modality: draft.modality,
          pattern: draft.pattern,
          equipment: draft.equipment,
          stationType: draft.stationType,
          skillLevel: draft.skillLevel,
          loadClass: draft.loadClass,
          repPaceSecPerRep: draft.repPaceSecPerRep,
          systemicCost: draft.systemicCost,
          constraints: draft.constraints,
          substitutes: draft.substitutes,
          scalingEasier: draft.scalingEasier,
          scalingHarder: draft.scalingHarder,
          instructionsHe: draft.instructionsHe,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSaveErrors(data.errors ?? ["השמירה נכשלה"]);
        return;
      }
      // מיון מחדש — שינוי דפוס/רמה מזיז את הכרטיס לקבוצה הנכונה
      setRows((rs) =>
        sortRows(rs.map((r) => (r.slug === draft.slug ? draft : r))),
      );
      setSavedFlash(draft.slug);
      setTimeout(() => setSavedFlash(null), 2000);
    } catch {
      setSaveErrors(["השרת לא הגיב — בדוק שהוא רץ"]);
    } finally {
      setSaving(false);
    }
  };

  const scalingOptionsFor = (currentSlug: string) => (
    <>
      <option value="">— אין (קצה שרשרת) —</option>
      {rows
        .filter((r) => r.slug !== currentSlug)
        .map((r) => (
          <option key={r.slug} value={r.slug}>
            {r.nameHe}
          </option>
        ))}
    </>
  );

  return (
    <div className="mt-5">
      {validationErrors.length === 0 ? (
        <div className="rounded-(--r-s) bg-ok-soft px-3.5 py-2.5 text-sm font-medium text-ok">
          אפס תרגילים עם תיוג חסר — הוולידציה עוברת נקי.
        </div>
      ) : (
        <div
          role="alert"
          className="rounded-(--r-s) bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
        >
          <span className="font-semibold">
            {validationErrors.length} בעיות תיוג:
          </span>
          <ul className="mt-1 list-inside list-disc text-xs">
            {validationErrors.slice(0, 10).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <Field label="סוג התרגיל">
          <select className={inputCls} value={trainingTypeFilter}
            onChange={(e) => setTrainingTypeFilter(e.target.value)}>
            <option value="all">כל סוגי התרגילים</option>
            {Object.entries(TRAINING_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
      </div>
      <div
        role="group"
        aria-label="סינון לפי דפוס תנועה"
        className="mt-4 flex flex-wrap items-center gap-1.5"
      >
        {["all", ...Object.keys(PATTERN_LABELS)].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPatternFilter(p)}
            aria-pressed={patternFilter === p}
            className={`min-h-9 rounded-full px-3 py-2 text-xs font-medium transition-colors duration-(--t-quick) ${
              patternFilter === p
                ? "bg-accent text-on-accent"
                : "border border-line bg-raised text-fg-2 hover:text-fg"
            }`}
          >
            {p === "all"
              ? "הכל"
              : PATTERN_LABELS[p as keyof typeof PATTERN_LABELS]}
          </button>
        ))}
      </div>
      {updateDates.length > 1 && (
        <div
          role="group"
          aria-label="סינון לפי מועד עדכון"
          className="mt-2 flex flex-wrap items-center gap-1.5"
        >
          {["all", ...updateDates].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDateFilter(d)}
              aria-pressed={dateFilter === d}
              className={`min-h-9 rounded-full px-3 py-2 text-xs font-medium transition-colors duration-(--t-quick) ${
                dateFilter === d
                  ? "bg-accent text-on-accent"
                  : "border border-line bg-raised text-fg-2 hover:text-fg"
              }`}
            >
              {d === "all" ? (
                "כל המועדים"
              ) : (
                <>
                  עודכן <span className="num">{formatDate(d)}</span>
                  {d === latestDate && " · חדש"}
                </>
              )}
            </button>
          ))}
        </div>
      )}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש לפי שם…"
        aria-label="חיפוש תרגיל לפי שם"
        dir="auto"
        className={`${inputCls} mt-3`}
      />

      <div className="mt-4 space-y-2">
        {filtered.map((row, index) => {
          const showHeader =
            index === 0 || filtered[index - 1].pattern !== row.pattern;
          const isOpen = openSlug === row.slug;
          const d = isOpen && draft ? draft : row;
          return (
            <div key={row.slug}>
              {showHeader && patternFilter === "all" && (
                <div className="mb-2 mt-5 text-xs font-bold text-fg-3">
                  {PATTERN_LABELS[row.pattern as keyof typeof PATTERN_LABELS] ??
                    row.pattern}
                </div>
              )}
              <RowCard
                row={row}
                isOpen={isOpen}
                flash={savedFlash === row.slug}
                isNew={!!latestDate && row.addedOn === latestDate}
                onToggle={toggle}
                onInfo={setInfoSlug}
                hasInfo={!!exerciseInfo[row.slug]}
              >
                {isOpen && draft ? (
                  <div
                    id={`exercise-panel-${row.slug}`}
                    className="border-t border-line p-3.5"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="שם בעברית">
                        <input className={inputCls} value={d.nameHe}
                          onChange={(e) => set("nameHe", e.target.value)} />
                      </Field>
                      <Field label="שם באנגלית">
                        <input className={inputCls} dir="ltr" value={d.nameEn}
                          onChange={(e) => set("nameEn", e.target.value)} />
                      </Field>
                      <Field label="דפוס תנועה">
                        <select className={inputCls} value={d.pattern}
                          onChange={(e) => set("pattern", e.target.value)}>
                          {Object.entries(PATTERN_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="מודאליות">
                        <select className={inputCls} value={d.modality}
                          onChange={(e) => set("modality", e.target.value)}>
                          {Object.entries(MODALITY_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="סוג תחנה">
                        <select className={inputCls} value={d.stationType}
                          onChange={(e) => set("stationType", e.target.value)}>
                          {Object.entries(STATION_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="מחלקת עומס">
                        <select className={inputCls} value={d.loadClass}
                          onChange={(e) => set("loadClass", e.target.value)}>
                          {Object.entries(LOAD_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="רמת מיומנות (1-5)">
                        <select className={inputCls} value={d.skillLevel}
                          onChange={(e) => set("skillLevel", Number(e.target.value))}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="שניות לחזרה">
                        <input type="number" step="0.5" min="0.5" max="40"
                          className={`${inputCls} num`} dir="ltr"
                          value={d.repPaceSecPerRep}
                          onChange={(e) => set("repPaceSecPerRep", Number(e.target.value))} />
                      </Field>
                      <Field label="עומס מערכתי">
                        <select className={inputCls} value={d.systemicCost}
                          onChange={(e) => set("systemicCost", e.target.value)}>
                          {Object.entries(COST_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="mt-3">
                      <span className="mb-1 block text-[11px] font-semibold text-fg-3">ציוד נדרש</span>
                      <div role="group" aria-label="ציוד נדרש" className="flex flex-wrap gap-1.5">
                        {Object.entries(EQUIPMENT_LABELS).map(([slug, label]) => (
                          <button key={slug} type="button" onClick={() => toggleIn("equipment", slug)}
                            aria-pressed={d.equipment.includes(slug)}
                            className={`min-h-8 rounded-full px-2.5 py-1.5 text-[11px] transition-colors duration-(--t-quick) ${
                              d.equipment.includes(slug)
                                ? "bg-accent-soft font-medium text-accent"
                                : "border border-line text-fg-3 hover:text-fg-2"
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="mb-1 block text-[11px] font-semibold text-fg-3">אילוצי סביבה</span>
                      <div role="group" aria-label="אילוצי סביבה" className="flex flex-wrap gap-1.5">
                        {Object.entries(CONSTRAINT_LABELS).map(([slug, label]) => (
                          <button key={slug} type="button" onClick={() => toggleIn("constraints", slug)}
                            aria-pressed={d.constraints.includes(slug)}
                            className={`min-h-8 rounded-full px-2.5 py-1.5 text-[11px] transition-colors duration-(--t-quick) ${
                              d.constraints.includes(slug)
                                ? "bg-accent-soft font-medium text-accent"
                                : "border border-line text-fg-3 hover:text-fg-2"
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label="גרסה קלה יותר">
                        <select className={inputCls} value={d.scalingEasier ?? ""}
                          onChange={(e) => set("scalingEasier", e.target.value || null)}>
                          {scalingOptionsFor(d.slug)}
                        </select>
                      </Field>
                      <Field label="גרסה קשה יותר">
                        <select className={inputCls} value={d.scalingHarder ?? ""}
                          onChange={(e) => set("scalingHarder", e.target.value || null)}>
                          {scalingOptionsFor(d.slug)}
                        </select>
                      </Field>
                    </div>

                    <div className="mt-3">
                      <span className="mb-1 block text-[11px] font-semibold text-fg-3">
                        תחליפים — מדורגים לפי קרבת אפקט
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {d.substitutes.map((sub) => (
                          <span key={sub}
                            className="flex items-center gap-0.5 rounded-full bg-accent-soft ps-2.5 text-[11px] font-medium text-accent">
                            {bySlug.get(sub)?.nameHe ?? sub}
                            <button type="button" aria-label={`הסר את ${bySlug.get(sub)?.nameHe ?? sub}`}
                              className="flex h-8 w-8 items-center justify-center"
                              onClick={() => set("substitutes", d.substitutes.filter((s) => s !== sub))}>
                              <XIcon size={12} />
                            </button>
                          </span>
                        ))}
                        <select
                          aria-label="הוספת תחליף"
                          className="min-h-8 rounded-full border border-line bg-sunken px-2 py-1 text-[11px] text-fg-2"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) set("substitutes", [...d.substitutes, e.target.value]);
                          }}>
                          <option value="">+ הוסף</option>
                          {rows
                            .filter((r) => r.slug !== d.slug && !d.substitutes.includes(r.slug))
                            .map((r) => (
                              <option key={r.slug} value={r.slug}>{r.nameHe}</option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Field label="הוראות ביצוע בעברית">
                        <textarea rows={6} className={inputCls} value={d.instructionsHe}
                          onChange={(e) => set("instructionsHe", e.target.value)} />
                      </Field>
                    </div>

                    <p className="mt-2 text-[10px] text-fg-3" dir="ltr">
                      source: {row.sourceId} · provenance: {row.provenanceId ?? "—"} · {row.licenseNote}
                    </p>

                    {saveErrors.length > 0 && (
                      <div
                        role="alert"
                        className="mt-3 rounded-(--r-s) bg-danger-soft px-3 py-2 text-xs text-danger"
                      >
                        {saveErrors.map((e) => (
                          <div key={e}>{e}</div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={save} disabled={saving || readOnly}
                        className="rounded-(--r-s) bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition-colors duration-(--t-quick) hover:bg-accent-hi disabled:opacity-60">
                        {saving ? "שומר…" : "שמירה"}
                      </button>
                      <button type="button" onClick={close}
                        className="rounded-(--r-s) border border-line px-4 py-2.5 text-sm text-fg-2 hover:text-fg">
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : null}
              </RowCard>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-(--r-m) border border-dashed border-line-strong p-6 text-center text-sm text-fg-3">
            אין תרגילים שמתאימים לסינון.
          </div>
        )}
      </div>
      <ExerciseInfoSheet info={previewInfo} onClose={() => setInfoSlug(null)} />
    </div>
  );
}

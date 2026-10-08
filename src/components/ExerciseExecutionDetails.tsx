import type { ExerciseExecution, LoadUnit } from '@/catalog/execution';

const MODES = {
  simultaneous: ['שני הצדדים יחד', 'Both sides together'],
  'single-side': ['צד אחד ואז החלפה', 'One side, then switch'],
  alternating: ['צדדים לסירוגין', 'Alternating sides'],
  asymmetric: ['ביצוע א־סימטרי', 'Asymmetric execution'],
} as const;
const COUNT = {
  'per-side': ['לכל צד בנפרד', 'Per side'],
  total: ['סך הכול', 'Total'],
  'paired-cycle': ['זוג צדדים הוא חזרה אחת', 'A pair of sides is one rep'],
  none: ['ללא ספירת חזרות', 'No rep count'],
} as const;
const UNITS: Record<LoadUnit | 'multiple-components', [string, string]> = {
  bodyweight: ['משקל גוף', 'Bodyweight'],
  'kg-total': ['ק״ג בסך הכול', 'Total kg'],
  'kg-per-hand': ['ק״ג לכל משקולת יד', 'Kg per handheld implement'],
  'assistance-kg': ['ק״ג סיוע', 'Assistance kg'],
  'band-level': ['רמת גומייה לפי דגם', 'Band level by model'],
  'multiple-components': ['כמה רכיבי עומס נפרדים', 'Multiple independent load components'],
};
const BANDS: Record<string, [string, string]> = {
  'long-loop': ['גומייה ארוכה סגורה', 'Long loop band'],
  'long-band-with-compatible-grip': ['גומייה ארוכה עם אחיזה מתאימה', 'Long band with compatible grip'],
  'mini-loop': ['גומיית מיני סגורה', 'Mini loop band'],
};
const BENCHES: Record<string, [string, string]> = {
  incline: ['שיפוע חיובי', 'Incline'], flat: ['שטוח', 'Flat'],
  'seat-and-backrest': ['מושב ומשענת', 'Seat and backrest'],
  preacher: ['ספסל כומר', 'Preacher bench'], decline: ['שיפוע שלילי', 'Decline'],
};

/** Display approved metadata; this component never makes personal load selections. */
export default function ExerciseExecutionDetails({ execution: e, locale, current = true }: {
  execution: ExerciseExecution;
  locale: 'he' | 'en';
  current?: boolean;
}) {
  const language = locale === 'he' ? 0 : 1;
  const t = (he: string, en: string) => language === 0 ? he : en;
  const fields: [string, string][] = [
    [t('אופן הביצוע', 'Execution'), MODES[e.executionMode][language]],
    [t('ספירת חזרות', 'Rep count'), COUNT[e.repCountBasis][language]],
    [t('ספירת זמן', 'Time count'), COUNT[e.timeCountBasis][language]],
    [t('יחידת מינון במיפוי', 'Mapped dose unit'), e.doseUnit === 'sec' ? t('שניות', 'Seconds') : t('חזרות', 'Reps')],
    [t('יחידות מינון אפשריות', 'Supported dose units'), e.allowedDoseUnits.map(unit => unit === 'sec' ? t('שניות', 'Seconds') : t('חזרות', 'Reps')).join(' / ')],
    [t('בחירת עומס לגרסה', 'Load selection for this variation'), e.loadChoice === 'none' ? t('לא דרושה בחירת משקל', 'No weight selection needed') : t('לפי רכיבי העומס והציוד הזמין', 'By load components and available equipment')],
    [t('עומס', 'Load'), UNITS[e.loadUnit][language]],
    [t('מספר משקולות או כלים', 'Implement count'), String(e.implementsCount)],
    ...(e.weightIncludesBar === null ? [] : [[t('משקל כולל מוט', 'Weight includes bar'), e.weightIncludesBar ? t('כן', 'Yes') : t('לא', 'No')] as [string, string]]),
  ];
  if (e.band) fields.push([t('גומיות', 'Bands'), `${BANDS[e.band.family]?.[language] ?? e.band.family} × ${e.band.count} · ${e.band.role === 'assistance' ? t('סיוע', 'Assistance') : t('התנגדות', 'Resistance')}`]);
  if (e.bench) {
    const angle = e.bench.degrees !== null ? `${e.bench.degrees}°`
      : e.bench.minDegrees !== undefined && e.bench.maxDegrees !== undefined ? `${e.bench.minDegrees}°–${e.bench.maxDegrees}°`
        : t('כיוון לפי הציוד', 'Equipment setting');
    fields.push([t('ספסל וזווית', 'Bench and angle'), `${BENCHES[e.bench.kind]?.[language] ?? e.bench.kind} · ${angle}`]);
  }
  const sourceNotes: [string, string][] = [
    [t('גובה כבל', 'Pulley height'), e.pulleyHeight],
    [t('כיוון מושב', 'Seat setting'), e.machineSeatSetting],
    [t('אחיזה', 'Grip'), e.grip],
    [t('תמיכה והכנה', 'Support and setup'), e.supportAndSetup],
    [t('הערות ביצוע', 'Execution notes'), e.configurationNotes],
  ];
  if (e.band) sourceNotes.push([t('עיגון גומייה', 'Band anchor'), e.band.anchor], [t('דגם ורמה', 'Band model and level'), e.band.notes]);
  if (e.bench) sourceNotes.push([t('הערות ספסל', 'Bench notes'), e.bench.notes]);
  return (
    <details className="mt-4 rounded-(--r-s) border border-line p-3 text-sm text-fg-2">
      <summary className="cursor-pointer font-bold">{t('פרמטרים לביצוע', 'Execution parameters')}</summary>
      {!current && <p role="status" className="mt-2 text-danger">{t('ההוראות נערכו אחרי סקירת המיפוי. יש לבדוק מחדש את הפרמטרים המוצגים.', 'Instructions changed after this mapping was reviewed. Recheck the displayed parameters.')}</p>}
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {fields.map(([label, value]) => <div key={label}><dt className="font-bold">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}
      </dl>
      {e.components.length > 1 && <ul className="mt-3 space-y-1">
        {e.components.map(c => <li key={c.id}>{c.id} × {c.count} · {UNITS[c.unit][language]}{c.includesBar ? ` · ${t('כולל מוט', 'Including bar')}` : ''}{c.notes ? ` · ${c.notes}` : ''}</li>)}
      </ul>}
      <dl className="mt-3 space-y-3">
        {sourceNotes.map(([label, value]) => <div key={label}><dt className="font-bold">{label}</dt><dd dir="rtl" lang="he" className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{value}</dd></div>)}
      </dl>
      {e.evidence.sourceImages.length > 0 && <div className="mt-4">
        <p className="font-bold">{t('תמונות המקור', 'Source photos')}</p>
        <ul className="mt-2 flex flex-wrap gap-3">
          {e.evidence.sourceImages.map((file, i) => <li key={file}><a href={`/free-exercise-db/${file}`} target="_blank" rel="noreferrer" className="text-accent underline">{t(`תמונת מקור ${i + 1}`, `Source photo ${i + 1}`)}</a></li>)}
        </ul>
      </div>}
    </details>
  );
}

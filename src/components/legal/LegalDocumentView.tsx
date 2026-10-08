import type { LegalDocument } from "@/legal";
import { translator, type Locale } from "@/i18n";
import { formatEffectiveDate, sectionAnchor } from "./legal-format";

// תצוגת מסמך משפטי מלא (סבב 35, D-5) — תנאי השימוש ומדיניות הפרטיות.
//
// רכיב שרת טהור: הוא מקבל מסמך **ממולא** (‏fillDocument(TERMS, operatorInfo())
// נעשה בעמוד) ולא נוגע בסביבה בעצמו. אין כאן שום ניסוח — רק רינדור: הנוסח
// כולו חי ב-src/legal ונבדק שם.
//
// הטיפוגרפיה נבחרה לקריאה בטלפון: שורות קצרות, ריווח נדיב בין פסקאות,
// כותרות סעיף בולטות. לפני הסעיפים יש תוכן עניינים — מסמך בן עשרים סעיפים
// בלי מפה הוא קיר טקסט.
//
// ‏`headingLevel` קובע את מדרג הכותרות כולו (ראה למטה): במצב האישור של
// ‏/terms המסמך הוא סעיף בתוך עמוד ולא העמוד עצמו.

export default function LegalDocumentView({
  doc,
  headingLevel = 1,
  locale = "he",
}: {
  doc: LegalDocument;
  /** שפת התצוגה של המסגרת (שורת הגרסה, תוכן העניינים). המסמך עצמו כבר בשפה. */
  locale?: Locale;
  /**
   * רמת הכותרת של שם המסמך. ברירת המחדל 1 — המסמך הוא כל העמוד.
   * במצב האישור של `/terms` הכותרת הראשית כבר שייכת לתקציר ההסכמה, והמסמך
   * המלא יושב תחתיו כסעיף; שני h1 באותו עמוד שוברים את מבנה הכותרות
   * לקוראי מסך (ביקורת סבב 35, UX-5). כל שאר הרמות נגזרות מכאן.
   */
  headingLevel?: 1 | 2;
}) {
  const Title = headingLevel === 2 ? "h2" : "h1";
  const Heading = headingLevel === 2 ? "h3" : "h2";
  const t = translator(locale);

  return (
    <article className="pb-2">
      <Title className="text-[1.75rem] font-bold leading-snug">{doc.title}</Title>

      <p className="mt-2 text-xs text-fg-3">
        {t("גרסה", "Version")} <span className="num">{doc.version}</span>
        <span aria-hidden="true"> · </span>
        {t("בתוקף מ-", "Effective from ")}<span className="num">{formatEffectiveDate(doc.effectiveDate, locale)}</span>
      </p>

      <p className="mt-4 text-[0.95rem] leading-relaxed text-fg-2">{doc.intro}</p>

      <nav
        aria-label={t(`תוכן העניינים של ${doc.shortTitle}`, `Contents: ${doc.shortTitle}`)}
        className="mt-6 rounded-(--r-m) border border-line bg-raised p-4 [box-shadow:var(--raise-edge)]"
      >
        <Heading className="text-sm font-bold">{t("מה יש כאן", "What's here")}</Heading>
        {/* יעד מגע של 44 פיקסלים לכל שורה בתוכן העניינים (ביקורת סבב 35,
            UX-7): הקישורים היו בגובה שורת טקסט אחת, בתוך רשימה של עשרים
            פריטים צפופים — הפספוס בטלפון היה ודאי */}
        <ol className="mt-1.5 space-y-0.5">
          {doc.sections.map((section, index) => (
            <li key={section.id} className="flex gap-2 text-sm leading-relaxed">
              <span className="num flex min-h-11 shrink-0 items-center text-fg-3">
                {index + 1}.
              </span>
              <a
                href={`#${sectionAnchor(doc.slug, section.id)}`}
                className="inline-flex min-h-11 items-center text-fg-2 underline decoration-line-strong underline-offset-4 transition-colors duration-(--t-quick) hover:text-fg"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 space-y-8">
        {doc.sections.map((section, index) => (
          <section
            key={section.id}
            id={sectionAnchor(doc.slug, section.id)}
            className="scroll-mt-20"
          >
            <Heading className="text-base font-bold leading-snug text-fg">
              <span className="num me-1.5 text-fg-3">{index + 1}.</span>
              {section.title}
            </Heading>

            <div className="mt-2 space-y-2.5">
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-[0.95rem] leading-relaxed text-fg-2"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {section.bullets && section.bullets.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex gap-2 text-[0.95rem] leading-relaxed text-fg-2"
                  >
                    <span aria-hidden="true" className="shrink-0 text-fg-3">
                      •
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

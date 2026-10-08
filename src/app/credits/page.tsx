import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/public/PublicShell";
import { currentUser } from "@/lib/current-user";
import { PUBLIC_EXERCISE_CREDITS } from "@/lib/public-exercise-credits";

// קרדיטים ורישוי (ביקורת סבב 35, ממצא LEGAL-5). סעיף הקניין הרוחני
// בתנאי השימוש מפנה ל"קובץ CREDITS באתר" — ועד כה הקובץ הזה היה רק
// בשורש מאגר הקוד, בלי עמוד ובלי קישור. זה העמוד שהסעיף מפנה אליו.
//
// התוכן הוא התמצית הציבורית של CREDITS.md: מה נלקח ממקור פתוח, באיזה
// רישיון, מה נכתב כאן מאפס, ומה במפורש לא בשימוש. הפירוט המלא (ביקורת
// התמונות, רשימת ההרחבות) נשאר במאגר הקוד — כאן מה שנוגע למי שקורא
// את התנאים ורוצה לדעת מאיפה הגיע מה שהוא רואה.

export const metadata: Metadata = {
  title: "קרדיטים ורישוי",
  description:
    "מאיפה מגיע מאגר התרגילים של המנוע, באיזה רישיון, ומה נכתב ואויר כאן מאפס.",
  robots: { index: true, follow: true },
};

interface Section {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

const SECTIONS: Section[] = [
  {
    title: "מאגר התרגילים",
    paragraphs: [
      "חלק מרשומות אימון הבסיס — מזהה, שם באנגלית, ציוד ומטא-דאטה של שרירים ורמה — מבוססות על Free Exercise DB, מאגר בנחלת הכלל (רישיון Unlicense). הרישיון אינו דורש ייחוס; הקרדיט כאן ניתן מרצון.",
      "תמונות של שלבי הביצוע שמופיעות ליד תרגיל הן תוכן חזותי מקורי שנוצר עבור המנוע (בכלי AI ליצירת תמונות) ואינן מגיעות מהמאגר הפתוח — ראו את פרטי הרישוי בקובץ CREDITS שבמאגר הקוד.",
    ],
    bullets: ["המקור: github.com/yuhonas/free-exercise-db", "הרישיון: Unlicense (נחלת הכלל)"],
  },
  {
    title: "מה נכתב כאן מאפס",
    paragraphs: [
      "הוראות אימון הבסיס, התיוג שמניע את הרכבת האימון ומנוע החוקים נכתבו עבור הפרויקט. הוראות היוגה, הריקוד והקפוארה כוללות עיבודים לעברית ממקורות CC BY, עם ייחוס ופירוט שינויים בהמשך העמוד.",
      "תוכן מקורי של הפרויקט אינו מוצע כאן ברישיון פתוח; רישיונות המקורות החיצוניים חלים על התוכן המיוחס להם.",
      "לתרגילים שאין להם רשומה או צילום נכון במקור הפתוח נוצרו כאן רשומות ואיורים מקוריים, בסגנון אחיד ובמספר שלבים המותאם לתנועה.",
    ],
  },
  {
    title: "מה במפורש לא בשימוש",
    paragraphs: [
      "תוכן ברישיונות NC או SA אינו נכלל בקטלוג הפעיל. במקורות הכוללים מדיה של צדדים שלישיים, העיבוד מוגבל לטקסט המיוחס להלן ואינו כולל את המדיה.",
      "שמות האימונים והמדדים באפליקציה הם שמות של המנוע, ואינם לקוחים משום שיטה או מותג אימון.",
    ],
  },
];

export default async function CreditsPage() {
  const user = await currentUser();

  return (
    <PublicShell user={user ? { name: user.name } : null}>
      <div className="py-8">
        <h1 className="text-[1.75rem] font-bold leading-snug">קרדיטים ורישוי</h1>
        <p className="mt-2.5 leading-relaxed text-fg-2">
          מאיפה מגיע מה שאתה רואה במסך, ובאיזה רישיון.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title} className="mt-9">
            <h2 className="text-lg font-bold leading-snug">{section.title}</h2>
            {section.paragraphs.map((text) => (
              <p key={text} className="mt-2.5 leading-relaxed text-fg-2">
                {text}
              </p>
            ))}
            {section.bullets && (
              <ul className="mt-3 space-y-1.5">
                {section.bullets.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-[0.95rem] leading-relaxed text-fg-2"
                  >
                    <span aria-hidden="true" className="shrink-0 text-fg-3">
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="mt-9">
          <h2 className="text-lg font-bold leading-snug">מקורות היוגה, הריקוד והקפוארה</h2>
          <p className="mt-2.5 leading-relaxed text-fg-2">
            תרגום ועיבוד לעברית: ForceApp. נבחרו משימות תנועה ונוספו הוראות,
            מינון ותיוג בעריכה. לא הועתקו מהמקורות תמונות, סרטונים, מוזיקה או
            כוריאוגרפיה מוטמעת. אין בעיבוד טענת טיפול או חסות מטעם היוצרים.
          </p>
          <ul className="mt-3 space-y-5">
            {PUBLIC_EXERCISE_CREDITS.map((source) => (
              <li key={source.id} className="text-[0.95rem] leading-relaxed text-fg-2">
                <a href={source.sourceUrl} className="font-semibold text-accent underline underline-offset-4">
                  <bdi>{source.title}</bdi>
                </a>
                <p className="mt-1"><bdi>{source.author}</bdi></p>
                <p className="mt-1">
                  רישיון: <a href={source.licenseUrl} className="text-accent underline underline-offset-4"><bdi>{source.license}</bdi></a>
                  {" · "}עיבוד לעברית: ForceApp
                </p>
                <details className="mt-1">
                  <summary className="cursor-pointer">פירוט השינויים והייחוס</summary>
                  <p className="mt-1">{source.changes}</p>
                  {source.attribution && <p className="mt-1" dir="auto">{source.attribution}</p>}
                  {source.licenseNote && <p className="mt-1">{source.licenseNote}</p>}
                </details>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 border-t border-line pt-5 text-sm leading-relaxed text-fg-2">
          שאלה על מקור או על רישיון?{" "}
          <Link
            href="/contact"
            className="font-semibold text-accent underline decoration-line-strong underline-offset-4 transition-opacity duration-(--t-quick) hover:opacity-80"
          >
            צור קשר
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}

// מסך הכניסה אחרי הפתיחה לציבור (החלטה 35, D-4/D-18).
//
// עד סבב 35 מסך הכניסה הכריז שהאפליקציה סגורה ושאין הרשמה עצמית. עכשיו
// זה פשוט לא נכון — ואי-אמת במסך הראשון היא הבאג הגרוע ביותר שיש. הבדיקה
// כאן היא נעילת מקור: היא קוראת את שני הקבצים כטקסט ומוודאת שהניסוח הישן
// לא חוזר בעריכה עתידית, ושהמסלולים שהוכרעו באמת קיימים.
//
// למה טקסט ולא רינדור: אין בפרויקט הזה סביבת DOM לבדיקות (vitest רץ ב-node
// בלי jsdom), והדרישה כאן היא על **מה כתוב במסך**, לא על התנהגות.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const PAGE = "src/app/login/page.tsx";
const FORM = "src/components/LoginForm.tsx";

const pageSrc = read(PAGE);
const formSrc = read(FORM);

/** הניסוחים של המוצר הסגור — אף אחד מהם לא שייך למסך של מוצר ציבורי */
const FORBIDDEN = [
  "פרטית",
  "נסיין",
  "בהזמנה אישית בלבד",
  "אין הרשמה עצמית",
];

describe("מסך הכניסה — שפת מוצר ציבורי", () => {
  it.each(FORBIDDEN)('הביטוי "%s" לא מופיע במסך הכניסה', (phrase) => {
    expect(pageSrc).not.toContain(phrase);
    expect(formSrc).not.toContain(phrase);
  });

  it("הכותרת אומרת שההרשמה פתוחה וחינמית", () => {
    expect(pageSrc).toContain("כניסה עם Google. הפיילוט חינם; בכניסה הראשונה מאשרים תנאים וממלאים שאלון בריאות.");
    expect(pageSrc).toContain("Sign in with Google. The pilot is free; first-time users accept the terms and complete a health questionnaire.");
  });
});

describe("מסך הכניסה — שלושת המסלולים", () => {
  it("גוגל הוא הכפתור הראשי, ומזהה הביקור נוסע איתו", () => {
    expect(formSrc).toContain("המשך עם גוגל");
    expect(formSrc).toContain('from "@/lib/pilot-client"');
    expect(formSrc).toContain("withVisit(googleHref)");
  });

  it("קוד ההזמנה והסיסמה מכווצים מאחורי גילוי מדורג", () => {
    expect(formSrc).toContain("יש לך קוד הזמנה?");
    expect(formSrc).toContain("כניסת מפעיל");
  });

  it("‏?owner=1 פותח את שדה הסיסמה ישירות", () => {
    expect(pageSrc).toContain('firstParam(owner) === "1"');
    expect(pageSrc).toContain("ownerEntry={ownerEntry}");
    expect(formSrc).toMatch(/ownerEntry\s*\?\s*"password"/);
  });

  it("חוזה השליחה לא השתנה: { code } או { password } ל-/api/auth/login", () => {
    expect(formSrc).toContain('fetch("/api/auth/login"');
    expect(formSrc).toMatch(/\{ code: value \}\s*:\s*\{ password: value \}/);
  });

  it("משתמש חדש שנוצר בקוד עדיין נוחת ב-/?welcome=1", () => {
    expect(formSrc).toContain('data.created ? "/?welcome=1" : next');
  });

  // סבב 37: הכתובת נושאת **קוד** ולא נוסח, והנוסח נקבע ברשימה סגורה
  it("שגיאת גוגל שחוזרת בכתובת מוצגת למשתמש — רק אם היא ברשימה", () => {
    expect(pageSrc).toContain("googleErrorMessage(googleError, display.locale)");
    expect(pageSrc).toContain("googleError={googleErrorText}");
    expect(pageSrc).not.toContain("firstParam(googleError)");
    expect(formSrc).toContain('role="alert"');
  });
});

describe("מסך הכניסה — משפטי ונגישות", () => {
  it("יש קישורים לתנאי השימוש ולמדיניות הפרטיות", () => {
    for (const src of [pageSrc, formSrc]) {
      expect(src).toContain('href="/terms"');
      expect(src).toContain('href="/privacy"');
    }
    expect(formSrc).toContain("בהמשך תתבקש לאשר את");
  });

  it("לכל שדה יש תווית קשורה, ויעדי המגע לא קטנים מ-44 פיקסלים", () => {
    expect(formSrc).toContain('htmlFor="secret"');
    expect(formSrc).toContain('id="secret"');
    expect(formSrc).toContain("min-h-11");
  });

  it("כל הצבעים מגיעים מהטוקנים — אין ערך צבע קשיח בקבצים האלה", () => {
    for (const src of [pageSrc, formSrc]) {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/\brgba?\(/);
    }
  });
});

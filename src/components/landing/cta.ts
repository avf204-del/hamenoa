// היעד של כל כפתור "התחל" בעמודים הציבוריים (D-3/D-13).
//
// כשכניסת גוגל דלוקה — הקישור יוצא ישר לזרימת ההרשמה, בלי מסך ביניים.
// כשהיא כבויה (פיתוח מקומי בלי GOOGLE_CLIENT_ID) — מסך הכניסה הרגיל,
// כדי שהעמוד לא יציע כפתור שמוביל ל-404.
//
// טהור בכוונה: גם רכיב שרת (PublicShell, Landing) וגם בדיקה יכולים לקרוא
// לו, והדגל עצמו נקרא במקום אחד — googleAuthEnabled() בצד השרת.

export interface StartTarget {
  href: string;
  label: string;
}

export function startTarget(googleEnabled: boolean, locale: "he" | "en" = "he"): StartTarget {
  const en = locale === "en";
  return googleEnabled
    ? { href: "/api/auth/google?next=%2F", label: en ? "Start free with Google" : "מתחילים בחינם עם גוגל" }
    : { href: "/login", label: en ? "Start free" : "מתחילים בחינם" };
}

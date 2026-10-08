import type { MetadataRoute } from "next";

// המניפסט של האפליקציה (SPEC סעיף 12, M7) — Next מגיש אותו ב-
// /manifest.webmanifest, שכבר פתוח ב-matcher של src/proxy.ts, כך
// שהדפדפן קורא אותו גם לפני שנכנסים.
//
// הצבעים כאן הם העתק מוקפא של --bg-app ו---accent מ-src/styles/tokens.css:
// קובץ JSON של מניפסט לא יכול לקרוא משתני CSS. מקור האמת נשאר tokens.css —
// אם הערכים שם משתנים, מעדכנים גם כאן (ובאייקונים שב-public/icons).
const BG_APP = "#12161c";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "המנוע — אימון שלם וחדש בכל פעם",
    short_name: "המנוע",
    description:
      "אימון שלם וחדש, בכל פעם — לפי הזמן, המקום ומה שזמין לך.",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BG_APP,
    // צבע סרגל המערכת: הרקע הכהה, לא צבע המבטא — המבטא שמור לפעולה ולטיימר
    theme_color: BG_APP,
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // תצוגות מקדימות (פריט 22, findings סבב 30): בלעדיהן כרום באנדרואיד
    // מציג רק את דיאלוג ההתקנה הבסיסי, לא את חלון ה-bottom-sheet העשיר עם
    // התצוגות המקדימות. שלושה צילומי מסך-טלפון (390×844, ערכת הכהה) של
    // נתוני דמו מקומיים בלבד — בית, אימון חי, התקדמות. הנתיב פתוח ב-matcher
    // של src/proxy.ts (כל *.png פטור משכבת הכניסה) כך שהם נגישים גם בלי כניסה.
    screenshots: [
      {
        src: "/screenshots/home-2026-09-15.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "מסך הבית — בונים את האימון שלי",
      },
      {
        src: "/screenshots/live-workout-2026-09-15.png",
        sizes: "375x812",
        type: "image/png",
        form_factor: "narrow",
        label: "אימון חי — שעון האימון, התקדמות בבלוק ורשימת התרגילים",
      },
      {
        src: "/screenshots/progress.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "התקדמות — מדד הכושר, הציר וכיסוי הקבוצות ב-28 יום",
      },
    ],
    shortcuts: [
      {
        name: "בנה לי אימון",
        short_name: "אימון חדש",
        url: "/new",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "ההתקדמות שלי",
        short_name: "התקדמות",
        url: "/progress",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}

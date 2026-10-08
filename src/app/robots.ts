import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, REDIRECTED_ROUTES, SITE_URL } from "@/components/landing/site";

// המנוע הוא אפליקציה מאחורי כניסה עם חלון ראווה ציבורי אחד (D-13).
// לכן החוק הוא הפוך מהרגיל: חוסמים הכול, ופותחים במפורש רק את חמשת
// הנתיבים הציבוריים.
//
// דקדוק שהוא כל ההבדל (ביקורת סבב 35, SEC-4): כללי robots הם התאמת
// **תחילית**, והתנגשות נפתרת לפי הכלל הארוך יותר; בתיקו מנצח ה-Allow.
// לכן `Allow: /` ליד `Disallow: /` פתח בפועל את כל האתר — בדיוק ההפך
// מהכוונה. השורש נכתב לכן כ-`/$` (עוגן סוף, נתמך בגוגל ובבינג), שמתאים
// רק לדף הבית עצמו ומשאיר את `Disallow: /` בתוקף לכל השאר.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // ‏REDIRECTED_ROUTES (סבב 41): כתובות שנמחקו ומפנות 308 ל-"/".
      // הן לא ב-sitemap ולא נתיב ציבורי, אבל חייבות להיות מותרות לסריקה —
      // סורק שמכבד robots לא מביא כתובת חסומה, ולכן לא היה רואה את
      // ההפניה, והכתובת הישנה הייתה נשארת באינדקס במקום להתאחד.
      allow: [
        ...PUBLIC_ROUTES.map((route) => (route === "/" ? "/$" : route)),
        ...REDIRECTED_ROUTES,
      ],
      disallow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

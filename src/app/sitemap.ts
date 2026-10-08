import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/components/landing/site";

// בדיוק חמשת הנתיבים הציבוריים — אותה רשימה שמופיעה ב-robots.ts, ממקור
// אחד. כל שאר המסכים מאחורי הכניסה ואין להם מה לחפש כאן.
//
// lastModified הוא זמן הבנייה (הקובץ הזה נבנה סטטית): הוא מסמן למנוע
// החיפוש שהעמודים התרעננו בפריסה, בלי לשקר על תאריך קבוע בקוד.
const BUILT_AT = new Date();

const PRIORITY: Record<string, number> = {
  "/": 1,
  "/contact": 0.5,
  "/terms": 0.3,
  "/privacy": 0.3,
  "/credits": 0.2,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: route === "/" ? SITE_URL : `${SITE_URL}${route}`,
    lastModified: BUILT_AT,
    changeFrequency: route === "/" ? ("weekly" as const) : ("monthly" as const),
    priority: PRIORITY[route] ?? 0.5,
  }));
}

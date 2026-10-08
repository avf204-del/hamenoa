import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Hebrew } from "next/font/google";
import ServiceWorkerBridge from "@/components/pwa/ServiceWorkerBridge";
import { SITE_URL } from "@/components/landing/site";
import "./globals.css";

const plexSans = IBM_Plex_Sans_Hebrew({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["hebrew", "latin"],
  variable: "--font-plex",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // בסיס לכל כתובת יחסית במטא-דאטה (og:image, canonical) — בלעדיו Next
  // מזהיר ומייצר כתובות localhost. הערך מגיע מ-APP_URL עם נפילה לכתובת
  // הפריסה הנוכחית (src/components/landing/site.ts).
  metadataBase: new URL(SITE_URL),
  title: {
    default: "המנוע",
    template: "%s — המנוע",
  },
  description: "מגיעים לאימון עם כיוון — בונים אימון לפי הזמן והמקום ומתקדמים צעד אחרי צעד.",
  applicationName: "המנוע",
  // הצהרת icons מבטלת את הקישור שמוסכמת הקובץ app/icon.svg מייצרת לבד,
  // ולכן ה-favicon חוזר לכאן במפורש (הקובץ עצמו נשאר app/icon.svg, שמוגש
  // ב-/icon.svg). כל הכתובות יציבות וללא חתימה — כך שהמניפסט, ה-service
  // worker וה-matcher של src/proxy.ts מסכימים על אותם נתיבים.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "המנוע",
    // הכותרת העליונה מצוירת על רקע האפליקציה עצמו
    statusBarStyle: "black-translucent",
  },
  // "המנוע" הוא אפליקציה אישית — אין סיבה שתופיע בתוצאות חיפוש
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#12161c" },
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
  ],
};

// מחיל את ערכת הנושא ואת צבע המבטא לפני הציור הראשון — בלי הבזק. כהה-ראשון:
// בלי העדפה שמורה ובלי העדפת מערכת בהירה — כהה. אותו מנגנון בדיוק גם למבטא
// (החלטה D7): כתום הוא ברירת המחדל ולא מקבל data-accent בכלל, ולכן כשאין
// ערך שמור או שהוא לא אחת מ-5 הפלטות החלופיות — לא נוגעים ב-attribute.
// רשימת ה-attributes כאן חייבת להישאר זהה ל-ACCENT_PALETTES ב-src/lib/accent.ts
// (tests/accent.test.ts נועל את ההתאמה) — קוד ה-inline לא יכול לייבא TS.
const themeInit = `(function(){try{var p=localStorage.getItem("hamenoa-theme");var t=p==="dark"||p==="light"?p:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t;document.documentElement.dataset.themePreference=p==="dark"||p==="light"?p:"system";}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.dataset.themePreference="dark";}try{var a=localStorage.getItem("engine.accent");var v=["blue","green","purple","pink","turquoise"];if(a&&v.indexOf(a)!==-1){document.documentElement.dataset.accent=a;}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerBridge />
      </body>
    </html>
  );
}

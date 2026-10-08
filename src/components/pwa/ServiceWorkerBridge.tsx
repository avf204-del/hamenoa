"use client";

// גשר ה-PWA (SPEC סעיף 12, M7). קומפוננטה בלי תצוגה, בפריסה השורשית,
// ושתי משימות לה:
// 1. רישום /sw.js — כדי שניווט בלי רשת יינחת על מסך האופליין המעוצב
//    ולא על שגיאת הדפדפן. נדחה ל-load: בחדר כושר ברשת סלולרית איטית,
//    בקשת ה-sw לא מתחרה על התור עם הנכסים של המסך הראשון.
// 2. לכידת אירוע ההתקנה מהרגע הראשון — הוא נורה פעם אחת ולא בהכרח
//    במסך שבו כרטיס ההתקנה מוצג (ראה install-store).

import { useEffect } from "react";
import { startInstallCapture } from "@/components/pwa/install-store";

export default function ServiceWorkerBridge() {
  useEffect(() => {
    startInstallCapture();
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // בפיתוח אין טעם: הנכסים לא חתומים והמטמון רק מבלבל
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // אין הרשאה, אין HTTPS, או שהנתיב חסום — האפליקציה עובדת בלעדיו
        });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

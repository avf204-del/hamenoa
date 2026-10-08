"use client";

// כפתור/קישור "התחל" — היחיד שיוצא מהעמודים הציבוריים אל זרימת ההרשמה.
//
// שני דברים קורים כאן ולא בשרת:
// • מזהה הביקור (visitId) נולד ב-sessionStorage של הדפדפן, ולכן אי אפשר
//   לרנדר אותו בשרת בלי לשבור הידרציה. ה-href מרונדר בשרת נקי, ומקבל את
//   ‏?v=<visitId> מיד אחרי ההידרציה — הרבה לפני שיש למישהו סיכוי ללחוץ.
//   ‏useSyncExternalStore הוא הדפוס הנכון לזה (וגם מה שThemeToggle עושה):
//   snapshot לשרת = הקישור הנקי, snapshot ללקוח = הקישור עם המזהה, בלי
//   setState בתוך effect (שגם אסור בלינט של הפרויקט).
// • האירוע landing_cta נשלח בלחיצה (fetch עם keepalive, בולע שגיאות).
//
// מייבא אך ורק מ-src/lib/pilot-client.ts — מודול טהור בלי מסד ובלי Prisma.

import { useSyncExternalStore } from "react";
import { trackEvent, withVisit } from "@/lib/pilot-client";

/** אין מקור חיצוני שמשתנה: המזהה נקבע פעם אחת ללשונית ולא זז */
const subscribe = () => () => {};

export default function CtaLink({
  href,
  placement,
  className,
  children,
}: {
  href: string;
  /** איפה בעמוד נלחץ — נשמר כ-props של האירוע (hero / header / final) */
  placement: string;
  className?: string;
  children: React.ReactNode;
}) {
  const target = useSyncExternalStore(
    subscribe,
    () => withVisit(href),
    () => href,
  );

  return (
    <a
      href={target}
      className={className}
      onClick={() => trackEvent("landing_cta", { placement })}
    >
      {children}
    </a>
  );
}

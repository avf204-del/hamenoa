"use client";

// צפייה בדף הנחיתה (D-8). אירוע אחד, פעם אחת לכל טעינה — ה-ref מגן מפני
// ה-mount הכפול של React במצב פיתוח, כדי שהמונה בלוח הפיילוט לא יתנפח.
// אין כאן שום UI: הרכיב מחזיר null ויושב בראש העמוד.

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/pilot-client";

export default function LandingTracker() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent("landing_view");
  }, []);

  return null;
}

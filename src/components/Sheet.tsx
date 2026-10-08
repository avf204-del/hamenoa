"use client";

// גיליון תחתון (bottom sheet) — הדפוס המרכזי לפעולות במסך טלפון.
// כשהוא סגור, inert מוציא אותו מסדר הפוקוס ומעץ הנגישות;
// בפתיחה הפוקוס עובר לכפתור הסגירה ובסגירה חוזר לאלמנט הקודם.
//
// M1 (סבב 37, לפי החלטה D-E): מרונדר דרך createPortal ישירות ל-
// document.body — פתרון מחלקתי לבאג ה-containing block. תיבת הדיאלוג
// נושאת translate-y-0/translate-y-full כל עוד היא פתוחה (לא רק בזמן
// מעבר חולף), וכל ערך translate שאינו none הופך אלמנט ל-containing
// block לצאצאי position:fixed. גיליון שנפתח בתוך children של גיליון
// אחר (למשל ExerciseInfoSheet בתוך "האימון המלא") נמדד עד כה מול תיבת
// ה-Sheet החיצוני ולא מול המסך המלא — ה-scrim לא כיסה את כל המסך.
// עם portal, ה-DOM האמיתי של כל Sheet הוא תמיד ילד ישיר של body בלי
// קשר לאן הוא ממוקם בעץ ה-React, כך שהבעיה נפתרת מהשורש לכל Sheet
// קיים ועתידי, בלי לגעת בכל אתר-קריאה.
//
// נעילת הגלילה עברה ל-useBodyScrollLock (M2): מונה-הפניות משותף בין
// כל מופעי Sheet, כדי ששני גיליונות פתוחים בו-זמנית לא ישחררו בטעות
// את נעילת הגלילה זה של זה כשרק אחד מהם נסגר.
//
// **סדר הערימה (ביקורת סבב 37, גל 2).** ה-portal פתר את ה-containing
// block אבל הפך את סדר הערימה של גיליון-בתוך-גיליון: React מצרף את
// הצאצאים לפני ההורה (commit ב-post-order), ולכן ה-portal הפנימי נדחף
// ל-document.body **לפני** החיצוני — ובסדר DOM עם אותו z-index בדיוק,
// האחרון מנצח. במוצר יש מקרה כזה אחד והוא בדיוק זה שהתיקון בא לשרת:
// ‏"האימון המלא" (Sheet) שבתוכו PlanView שבתוכו ExerciseInfoSheet (Sheet).
// הפתרון: כל Sheet יודע את עומק הקינון שלו דרך context ומקבל z-index
// עולה, כך שהסדר נכון בלי תלות בסדר ההכנסה ל-body.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/icons";
import { useBodyScrollLock } from "@/components/useBodyScrollLock";
import { useLocale } from "@/i18n/client";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

/**
 * ה-z-index של גיליון ברמה העליונה. מעל כל מה שמרחף במוצר (סרגל תחתון
 * ‏z-40, כותרות דביקות z-30/z-40) ומתחת לשום דבר.
 */
export const SHEET_BASE_Z = 50;

/** עומק הקינון של הגיליון הנוכחי — 0 לגיליון שאינו בתוך גיליון אחר */
const SheetDepthContext = createContext(0);

/** ה-z-index בפועל לפי עומק — פונקציה טהורה כדי שתהיה ניתנת לבדיקה */
export function sheetZIndex(depth: number): number {
  return SHEET_BASE_Z + Math.max(0, Math.floor(depth));
}

// אין מקור חיצוני שמשתנה: "מחובר בצד הלקוח" עובר מ-false ל-true פעם
// אחת ולא זז שוב — useSyncExternalStore הוא הדפוס של הפרויקט לזה (כמו
// ThemeToggle/InstallPrompt/CtaLink), בלי setState בתוך effect (אסור
// בלינט של הפרויקט).
const subscribeNever = () => () => {};
const getMountedClient = () => true;
const getMountedServer = () => false;

export default function Sheet({ open, onClose, title, children }: SheetProps) {
  const depth = useContext(SheetDepthContext);
  const { t } = useLocale();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  // onClose העדכני נשמר ב-ref: זהות משתנה שלו (למשל מהורה שמרנדר כל שנייה
  // עם טיימר) לא מריצה מחדש את אפקט הפוקוס — אחרת הפוקוס נגנב בכל טיק
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      // Only the uppermost open sheet handles keyboard navigation. Nested
      // exercise details must not close or focus the sheet underneath.
      const topPanel = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')]
        .filter((element) => !element.closest('[inert]'))
        .sort((a, b) => Number(a.parentElement?.style.zIndex ?? 0) - Number(b.parentElement?.style.zIndex ?? 0))
        .at(-1);
      if (topPanel !== panel) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
      if (e.key === "Tab") {
        const targets = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
          .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
        const first = targets[0];
        const last = targets.at(-1);
        const active = document.activeElement;
        if (first && last && (!panel.contains(active) || (e.shiftKey ? active === first : active === last))) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const previous = previousFocusRef.current;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  // ה-portal זמין רק אחרי mount בצד הלקוח — ב-SSR אין document.body.
  // כל מופעי Sheet באפליקציה נטענים סגורים (open=false) לפני שהמשתמש
  // בוחר לפתוח אותם, כך שאין הבדל ויזואלי בהמתנה הקצרה הזו ל-mount.
  const mounted = useSyncExternalStore(
    subscribeNever,
    getMountedClient,
    getMountedServer,
  );
  if (!mounted) return null;

  return createPortal(
    <div
      inert={!open}
      style={{ zIndex: sheetZIndex(depth) }}
      className={`fixed inset-0 overflow-hidden ${open ? "" : "pointer-events-none"}`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-scrim transition-opacity duration-(--t-slow) ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] max-w-md flex-col rounded-t-(--r-l) border-t border-line bg-overlay px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 transition-transform duration-(--t-slow) ease-(--ease) ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-line-strong" />
        <div className="mb-2.5 flex shrink-0 items-center justify-between">
          <h2 className="min-w-0 flex-1 text-base font-bold leading-snug">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("סגירה", "Close")}
            className="-me-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-(--r-s) text-fg-3 transition-colors duration-(--t-quick) hover:bg-raised hover:text-fg"
          >
            <XIcon size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* גיליון שייפתח מתוך התוכן הזה יושב רמה אחת מעל — ראה ההערה
              על סדר הערימה בראש הקובץ */}
          <SheetDepthContext.Provider value={depth + 1}>
            {children}
          </SheetDepthContext.Provider>
        </div>
      </div>
    </div>,
    document.body,
  );
}

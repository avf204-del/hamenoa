// שכבת הכניסה (החלטה 20): כל בקשה עוברת כאן לפני המסכים וה-API.
// ‏Next 16: הקובץ הזה החליף את middleware.ts (אותה התנהגות, שם חדש).
//
// אבן דרך 8 (החלטה 21) — שתי אכיפות שיושבות כאן ולא במקום אחר:
// • **תפקיד:** ‏/admin לבעלים בלבד. נגזר מהאסימון החתום, בלי מסד.
// • **ביטול גישה:** משתמש שהבעלים ביטל נחסם כאן. האסימון שלו עדיין חתום
//   ובתוקף, ורכיב מסך שעוטף את `currentUser()` ב-catch בולע את החסימה —
//   אז זו הנקודה היחידה שלא ניתן לעקוף. הבדיקה עוברת דרך מטמון קצר
//   (`src/lib/access.ts`), ולכן היא לא סיבוב למסד בכל בקשה.
//
// הבידוד עצמו — איזה נתונים כל משתמש רואה — נאכף בשרת, לא כאן.
import { NextResponse, type NextRequest } from "next/server";
import { userAccessAllowed } from "@/lib/access";
import { AUTH_COOKIE, authEnabled, cookieSecure, readToken, renewedToken, SESSION_TTL_SEC } from "@/lib/auth";

/** נתיבים שחייבים להישאר פתוחים כדי שאפשר יהיה בכלל להיכנס */
// ‏sw.js ו-offline.html חייבים להיטען גם בלי כניסה: הדפדפן מבקש אותם לפני
// שיש עוגייה (רישום ה-service worker) וגם כשאין רשת — הפניה ל-/login שם
// שוברת את ה-PWA של M7.
//
// החלטה 35: הפנים הציבוריות של המוצר נפתחות כאן — דף הנחיתה, המסמכים
// המשפטיים, יצירת קשר, ונכסי הסריקה של מנועי החיפוש והרשתות.
// ‏"/" הוא **התאמה מדויקת בלבד** (ראה isPublicPath): קידומת הייתה פותחת את
// כל האפליקציה. /health דווקא נשאר סגור — הוא שאלון אישי של משתמש מזוהה.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  // כניסת גוגל (פריט 1): שני הנתיבים משרתים משתמש שעדיין לא מזוהה, כמו
  // /login עצמו — ה-callback מקבל את החזרה מגוגל לפני שיש עוגייה.
  "/api/auth/google",
  "/api/auth/google/callback",
  "/terms",
  "/privacy",
  "/contact",
  "/credits",
  "/api/pilot/event",
  "/api/contact",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/twitter-image",
  "/sw.js",
  "/offline.html",
];

/**
 * עמוד "השיטה" הציבורי נמחק כליל בסבב 41 (D-8) — מסמך המתודה נשאר רק
 * לבעלים (‏/admin/method). כתובת ישנה (מקושרת/סומנה במנועי חיפוש) לא
 * מקבלת 404 או מסך כניסה — היא מפנה קבוע ל-"/", בלי תלות במצב הכניסה
 * (גם אורח וגם משתמש מזוהה). ‏308 (לא 307): התוכן לא חוזר לכתובת הזו.
 */
function isRemovedMethodPath(pathname: string): boolean {
  return pathname === "/method" || pathname.startsWith("/method/");
}

/**
 * נתיב ציבורי: התאמה מדויקת, או קידומת של תת-עץ. השורש הוא היוצא מן הכלל
 * היחיד — הוא מותאם רק במדויק, אחרת הרשימה הזו הייתה פותחת את הכול.
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** אזור הבעלים: עורך התרגילים, הסימולטור, וניהול ההזמנות */
function isAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  );
}

/**
 * The previous app lived under /experience (and older links under /session,
 * /progress and friends). Installed home-screen icons and saved links still
 * point there, so a signed-in GET lands on the current home instead of a 404.
 */
const LEGACY_APP_PATHS = ["/experience", "/session", "/progress", "/status", "/calendar", "/ability", "/new"];

function legacyAppRedirect(request: NextRequest): NextResponse | null {
  if (request.method !== "GET") return null;
  const { pathname } = request.nextUrl;
  const legacy = LEGACY_APP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return legacy ? NextResponse.redirect(new URL("/workout", request.url)) : null;
}

/** אין כניסה: ‏API מקבל 401, מסך מופנה ל-/login עם היעד שביקש */
function signedOut(request: NextRequest, clearCookie: boolean): NextResponse {
  const { pathname, search } = request.nextUrl;
  const response = pathname.startsWith("/api/")
    ? NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 })
    : (() => {
        const login = new URL("/login", request.url);
        if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
        return NextResponse.redirect(login);
      })();

  // עוגייה של משתמש שבוטל לא תשתפר מעצמה — מוחקים כדי שהדפדפן יפסיק לשלוח
  if (clearCookie) {
    response.cookies.set({
      name: AUTH_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(request),
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // **לפני** בדיקת הנתיבים הציבוריים (ביקורת סבב 37, SEC2): עד הסבב הזה
  // הסדר היה הפוך, ולכן דף הנחיתה, המסמכים המשפטיים וראוטי ה-API הציבוריים
  // חמקו מה-503 — ובלי APP_PASSWORD "/" הפך למסך הבית הפרטי של הבעלים לכל
  // מבקר. גם /login נעצר כאן: בלי APP_PASSWORD אין כניסה אפשרית בכלל
  // (הסיסמה לא תואמת לעולם, /api/auth/login מחזיר 503 בעצמו, וכניסת גוגל
  // כבויה), ומסך כניסה שאי אפשר להיכנס דרכו מטעה יותר משהוא עוזר.
  if (!authEnabled()) {
    // בפרודקשן אין מצב פתוח: מסד אמיתי בלי סיסמה = חשיפה. נעצרים בגלוי.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "המנוע לא הוגדר: חסר APP_PASSWORD בסביבת ההרצה.",
        { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    }
    return legacyAppRedirect(request) ?? NextResponse.next();
  }

  if (isRemovedMethodPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url), 308);
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const claims = readToken(request.cookies.get(AUTH_COOKIE)?.value);

  if (claims) {
    // אסימון v1 (לפני אבן דרך 8) אינו נושא מזהה. הוא של הבעלים לפי הגדרה,
    // והבעלים אינו בר-ביטול — ההזמנות מבטלות נסיינים בלבד.
    if (claims.userId && !(await userAccessAllowed(claims.userId))) {
      return signedOut(request, true);
    }
    if (isAdminPath(pathname) && claims.role !== "owner") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { ok: false, error: "האזור הזה פתוח לבעלים בלבד" },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
    const legacy = legacyAppRedirect(request);
    if (legacy) return legacy;
    const response = NextResponse.next();
    const renewed = request.method === "GET" && !pathname.startsWith("/api/")
      ? renewedToken(request.cookies.get(AUTH_COOKIE)?.value) : null;
    if (renewed) response.cookies.set({ name: AUTH_COOKIE, value: renewed, httpOnly: true, sameSite: "lax", secure: cookieSecure(request), path: "/", maxAge: SESSION_TTL_SEC });
    return response;
  }

  return signedOut(request, false);
}

export const config = {
  // הכול חוץ מנכסים סטטיים (‏_next, אייקונים, ותמונות התרגילים ב-public)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?)$).*)",
  ],
};

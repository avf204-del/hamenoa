// Service worker של "המנוע" (SPEC סעיף 12, M7) — נכתב ביד, בלי ספריות.
//
// שני עקרונות שקובעים את כל מה שלמטה:
//
// 1. **אף פעם לא שומרים נתונים אישיים.** ‏/api/** ודפי HTML של האפליקציה
//    לא נכנסים למטמון בשום מצב. אימון, סטים והתקדמות חייבים להיות טריים —
//    מטמון של אימון אתמול במסך של היום גרוע מהודעת שגיאה. זה גם מה שמונע
//    מדפים מכויילים לשרוד יציאה מהחשבון (החלטה 20).
// 2. **קליפה בלבד**: מה שנשמר הוא מסך האופליין המעוצב והנכסים הסטטיים
//    (‏JS/CSS עם חתימה, אייקונים, תמונות תרגילים) — כך שניווט בלי רשת
//    נוחת על מסך מוסבר ולא על שגיאת הדפדפן.

// Exercise filenames stay stable; bump when replacing shipped imagery.
const VERSION = "v3-images-20260917";
const SHELL_CACHE = `hamenoa-shell-${VERSION}`;
const ASSET_CACHE = `hamenoa-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";

/** נכסי הקליפה — חייבים להיות זמינים גם בהפעלה קרה בלי רשת */
const SHELL_ASSETS = [OFFLINE_URL, "/icon.svg", "/icons/icon-192.png"];

/** תקרה למטמון הנכסים — תמונות התרגילים רבות; לא ממלאים את המכשיר */
const ASSET_LIMIT = 160;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // כל נכס בנפרד: נכס אחד שנכשל לא מפיל את ההתקנה כולה
      await Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("hamenoa-") && key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/** נכס סטטי שבטוח לשמור: חתום בחתימה או תמונה שלא משתנה */
function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/exercises/") ||
    url.pathname.startsWith("/warmup/")
  );
}

/** מגזם את מטמון הנכסים לפי סדר הכניסה */
async function trimAssetCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= ASSET_LIMIT) return;
  await Promise.all(keys.slice(0, keys.length - ASSET_LIMIT).map((key) => cache.delete(key)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // נתונים אישיים — תמיד מהרשת, לעולם לא מהמטמון
  if (url.pathname.startsWith("/api/")) return;

  // ניווט: רשת-קודם, ובכישלון — מסך האופליין. דפי האפליקציה עצמם
  // לא נשמרים (הם מכילים נתונים אישיים ותלויים בהרשאה).
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await caches.match(OFFLINE_URL, { cacheName: SHELL_CACHE });
          return (
            cached ??
            new Response("אין חיבור.", {
              status: 503,
              headers: { "content-type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  if (!isCacheableAsset(url)) return;

  // נכסים סטטיים: מטמון-קודם. הכתובות של Next חתומות בחתימה, ולכן
  // גרסה חדשה מביאה כתובת חדשה — אין סכנה של נכס ישן שנתקע.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      // רק תשובה תקינה ולא-מופנית: הפניה ל-/login פירושה שההרשאה פגה,
      // ואסור שהיא תיתקע במטמון במקום הנכס עצמו.
      if (response.ok && !response.redirected && response.type === "basic") {
        const cache = await caches.open(ASSET_CACHE);
        await cache.put(request, response.clone());
        await trimAssetCache(cache);
      }
      return response;
    })(),
  );
});

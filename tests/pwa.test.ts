// שער ה-PWA (SPEC סעיף 12, M7 — "הוספה למסך הבית עובדת").
//
// ההתקנה נכשלת בשקט: מניפסט עם אייקון חסר, צבע שנסחף מהטוקנים, או נכס
// שנחסם בשכבת הכניסה — הכול נראה תקין בקוד ופשוט לא מתקין במכשיר.
// שלוש המחלקות האלה נבדקות כאן, כי אין דרך לתפוס אותן ב-typecheck.

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../src/app/manifest";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");

/** רוחב/גובה מכותרת ה-IHDR של PNG — בלי תלות בספריית תמונות */
function pngDimensions(file: string): [number, number] {
  const buf = readFileSync(file);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

/** ערך טוקן מ-src/styles/tokens.css (ערכת הכהה, :root) */
function darkToken(name: string): string {
  const css = readFileSync(path.join(ROOT, "src/styles/tokens.css"), "utf8");
  // עד הסלקטור של המצב הבהיר — לא עד האזכור הראשון שלו בהערת הפתיחה
  const light = css.indexOf(':root[data-theme="light"]');
  const scope = light === -1 ? css : css.slice(0, light);
  const match = scope.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`הטוקן --${name} לא נמצא ב-tokens.css`);
  return match[1].trim();
}

/**
 * ה-matcher של src/proxy.ts — נתיב שמתאים לו עובר בשכבת הכניסה, ולכן
 * מוחזר כהפניה ל-/login כשאין עוגייה. הדפדפן ומערכת ההפעלה מושכים את
 * המניפסט והאייקונים מחוץ להקשר מחובר, ולכן הם חייבים להיות פתוחים.
 */
/** הנתיבים שה-proxy מעביר הלאה גם בלי עוגייה (PUBLIC_PATHS) */
function proxyPublicPaths(): string[] {
  const source = readFileSync(path.join(ROOT, "src/proxy.ts"), "utf8");
  const block = source.match(/const PUBLIC_PATHS = \[([\s\S]*?)\]/);
  if (!block) throw new Error("PUBLIC_PATHS של proxy.ts לא נמצא");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** נגיש בלי כניסה: או שה-matcher לא תופס אותו, או שהוא ברשימה הפתוחה */
function reachableWithoutAuth(pathname: string): boolean {
  return !proxyBlocks(pathname) || proxyPublicPaths().includes(pathname);
}

function proxyBlocks(pathname: string): boolean {
  const source = readFileSync(path.join(ROOT, "src/proxy.ts"), "utf8");
  const matcher = source.match(/"(\/\(\(\?![\s\S]*?)"/);
  if (!matcher) throw new Error("ה-matcher של proxy.ts לא נמצא");
  return new RegExp(`^${matcher[1].replace(/\\\\/g, "\\")}$`).test(pathname);
}

describe("מניפסט ה-PWA", () => {
  const app = manifest();

  it("נושא את מה שהדפדפן דורש כדי להציע התקנה", () => {
    expect(app.name).toBeTruthy();
    expect(app.short_name).toBeTruthy();
    expect(app.start_url).toBe("/");
    expect(app.display).toBe("standalone");
    // עברית מימין לשמאל גם בשם שעל מסך הבית ובמסך הפתיחה
    expect(app.lang).toBe("he");
    expect(app.dir).toBe("rtl");
  });

  it("כולל 192, 512 ואייקון maskable — שלושתם נדרשים באנדרואיד", () => {
    const icons = app.icons ?? [];
    expect(icons.some((i) => i.sizes === "192x192")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(true);
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("כל אייקון שמוצהר קיים בפועל ב-public", () => {
    const declared = [
      ...(app.icons ?? []).map((icon) => icon.src),
      ...(app.shortcuts ?? []).flatMap((s) => (s.icons ?? []).map((i) => i.src)),
      "/icons/apple-touch-icon.png", // מוצהר ב-metadata של layout.tsx
    ];
    for (const src of new Set(declared)) {
      expect(existsSync(path.join(PUBLIC, src)), `חסר הקובץ ${src}`).toBe(true);
    }
  });

  it("צבעי המניפסט לא נסחפים מ-tokens.css", () => {
    // מקור האמת הוא tokens.css; המניפסט הוא JSON ולא יכול לקרוא משתני CSS
    expect(app.background_color).toBe(darkToken("bg-app"));
    expect(app.theme_color).toBe(darkToken("bg-app"));
  });

  // פריט 22 (findings סבב 30): בלי screenshots, אנדרואיד מציג רק את דיאלוג
  // ההתקנה הבסיסי — לא את ה-bottom-sheet העשיר עם התצוגות המקדימות.
  describe("screenshots", () => {
    const shots = app.screenshots ?? [];

    it("יש לפחות שני צילומים, כולם form_factor narrow ו-PNG", () => {
      expect(shots.length).toBeGreaterThanOrEqual(2);
      for (const shot of shots) {
        expect(shot.form_factor).toBe("narrow");
        expect(shot.type).toBe("image/png");
        expect(shot.label, `חסר label ב-${shot.src}`).toBeTruthy();
      }
    });

    it("כל קובץ שמוצהר קיים בפועל, מתחת ל-300KB", () => {
      for (const shot of shots) {
        const file = path.join(PUBLIC, shot.src);
        expect(existsSync(file), `חסר הקובץ ${shot.src}`).toBe(true);
        expect(statSync(file).size, `${shot.src} גדול מדי`).toBeLessThan(300 * 1024);
      }
    });

    it("הממדים בפועל של כל PNG תואמים למה שמוצהר ב-sizes", () => {
      for (const shot of shots) {
        const [w, h] = pngDimensions(path.join(PUBLIC, shot.src));
        expect(`${w}x${h}`, `הממדים בפועל של ${shot.src}`).toBe(shot.sizes);
      }
    });
  });
});

describe("קליפת האופליין", () => {
  it("מסך האופליין ו-service worker קיימים", () => {
    expect(existsSync(path.join(PUBLIC, "offline.html"))).toBe(true);
    expect(existsSync(path.join(PUBLIC, "sw.js"))).toBe(true);
  });

  it("ה-service worker לא נוגע ב-API — נתונים אישיים לא נשמרים במטמון", () => {
    const sw = readFileSync(path.join(PUBLIC, "sw.js"), "utf8");
    expect(sw).toContain('url.pathname.startsWith("/api/")');
  });

  it("מסך האופליין עצמאי — בלי נכס חיצוני שלא יגיע בלי רשת", () => {
    const html = readFileSync(path.join(PUBLIC, "offline.html"), "utf8");
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/);
    expect(html).not.toMatch(/<script[^>]+src=/);
    // תמונות מותרות רק כ-SVG מוטבע, לא כבקשת רשת
    expect(html).not.toMatch(/<img\b/);
  });
});

describe("שכבת הכניסה לא חוסמת את נכסי ההתקנה", () => {
  const publicPaths = [
    "/manifest.webmanifest",
    "/icon.svg",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/maskable-512.png",
    "/icons/apple-touch-icon.png",
  ];

  for (const pathname of publicPaths) {
    it(`${pathname} נגיש בלי עוגיית כניסה`, () => {
      expect(proxyBlocks(pathname)).toBe(false);
    });
  }

  // ‏M7: הדפדפן מבקש את השניים האלה בלי עוגייה — בזמן רישום ה-service
  // worker, וכשאין רשת. הפניה ל-/login שם שוברת את מצב הלא-מקוון.
  for (const pathname of ["/sw.js", "/offline.html"]) {
    it(`${pathname} נגיש בלי עוגיית כניסה`, () => {
      expect(reachableWithoutAuth(pathname)).toBe(true);
    });
  }

  it("מסכי האפליקציה וה-API כן עוברים בשכבת הכניסה", () => {
    expect(reachableWithoutAuth("/progress")).toBe(false);
    expect(reachableWithoutAuth("/api/progress")).toBe(false);
    // שפיות הפוכה: אם הביטוי נשבר וכולם "פתוחים", הבדיקות למעלה חסרות ערך
    expect(proxyBlocks("/progress")).toBe(true);
    expect(proxyBlocks("/api/progress")).toBe(true);
  });
});

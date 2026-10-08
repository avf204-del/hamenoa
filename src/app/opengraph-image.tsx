import { ImageResponse } from "next/og";

// תמונת השיתוף (D-13). כשמישהו שולח את הקישור בוואטסאפ או מצייץ אותו,
// זו התמונה שנראית — ולכן היא נבנית מהמותג עצמו ולא מצילום מסך מוקטן.
//
// ‏**חריג מוצהר לכלל "אין צבע קשיח בקומפוננטה":** את ה-ImageResponse מרנדר
// satori בשרת, בלי CSS ובלי משתני CSS — הוא לא יכול לקרוא את
// src/styles/tokens.css. לכן הערכים כאן הם העתק קפוא של הטוקנים, בדיוק
// כמו manifest.ts שמקבע את אותם צבעים. שינוי בטוקנים מחייב עדכון ידני
// כאן; אין לזה שום צרכן אחר.
const BG = "#12161c"; // --bg-app (כהה)
const FG = "#f2f5f9"; // --fg (כהה)
const FG_2 = "#9fabbc"; // --fg-2 (כהה)
const ACCENT = "#ff6b35"; // --accent (ברירת המחדל, כתום)

export const alt = "המנוע — אימון שלם וחדש, בכל פעם.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * הגופן העברי נמשך מ-Google Fonts בזמן ריצה: satori חייב קובץ גופן ממשי,
 * ובלי גלִיפים עבריים כל הטקסט יוצא ריק. ה-User-Agent העתיק הוא הטריק
 * המקובל — ל-UA מודרני גוגל מחזירה woff2, שסאטורי דוחה במפורש
 * ("Unsupported OpenType signature wOF2"); ל-"Mozilla/4.0" היא מחזירה ttf.
 * גם UA של Chrome ישן כבר מקבל woff, ולכן דווקא הערך הזה, והביטוי למטה
 * דורש format('truetype') ולא מסתפק בכתובת הראשונה. התוצאה נשמרת ב-scope
 * של המודול, כך שהמשיכה קורית פעם אחת לתהליך ולא בכל בקשה.
 *
 * שתי הקשחות (ביקורת סבב 35, SEC-5):
 * • **פסק זמן של 4 שניות לכל משיכה.** בלעדיו בקשה ל-‎/opengraph-image
 *   נתלית כמה זמן שגוגל תרצה, ומחזיקה עובד של השרת. ‏satori יסתדר עם
 *   גופן ברירת המחדל — תמונה בלי עברית טובה מבקשה שלא חוזרת.
 * • **כישלון לא נכנס למטמון.** הגרסה הקודמת שמרה גם `null` לכל חיי
 *   התהליך: תקלת רשת אחת בעליית השרת הייתה מקפיאה תמונת שיתוף שבורה עד
 *   הפריסה הבאה. עכשיו רק הצלחה מלאה נשמרת, וכישלון מנוסה בבקשה הבאה.
 */
const LEGACY_UA = "Mozilla/4.0";
const FETCH_TIMEOUT_MS = 4000;

async function fetchFont(weight: number): Promise<ArrayBuffer | null> {
  try {
    const cssResponse = await fetch(
      `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@${weight}`,
      {
        headers: { "User-Agent": LEGACY_UA },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!cssResponse.ok) return null;
    const css = await cssResponse.text();
    const url = css.match(
      /src:\s*url\((https:\/\/[^)]+)\)\s*format\('truetype'\)/,
    )?.[1];
    if (!url) return null;
    const fontResponse = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!fontResponse.ok) return null;
    return await fontResponse.arrayBuffer();
  } catch {
    // בלי רשת, או מעבר לפסק הזמן — נופלים לגופן ברירת המחדל של satori
    return null;
  }
}

/**
 * ‏**satori לא מיישם דו-כיווניות.** אומת חזותית בסבב 35: גם עם
 * `direction: "rtl"` על העוטף וגם עם אותו סגנון על אלמנט הטקסט עצמו,
 * הגלִיפים מסודרים משמאל לימין לפי הסדר הלוגי, ו"המנוע" יוצא "עונמה".
 * לכן הטקסט כאן נמסר כבר בסדר החזותי: היפוך תווים של מחרוזת עברית טהורה
 * נותן בדיוק את רצף הגלִיפים הנכון משמאל לימין, כולל מיקום הפסיק והנקודה
 * הסופית. מותר רק לטקסט עברי טהור בלי ספרות ובלי לטינית — אין כאלה כאן,
 * וזה כל השימוש בקובץ הזה. שאר האפליקציה לא מושפעת: היא HTML אמיתי עם
 * dir="rtl".
 */
function visualRtl(text: string): string {
  return [...text].reverse().join("");
}

type Fonts = [ArrayBuffer | null, ArrayBuffer | null];

/** רק תוצאה מוצלחת נשמרת; כישלון נשאר null ויינסה שוב בבקשה הבאה */
let loadedFonts: Fonts | null = null;
let inFlight: Promise<Fonts> | null = null;

function loadFonts(): Promise<Fonts> {
  if (loadedFonts) return Promise.resolve(loadedFonts);
  inFlight ??= Promise.all([fetchFont(700), fetchFont(400)])
    .then((fonts) => {
      if (fonts[0] && fonts[1]) loadedFonts = fonts;
      return fonts;
    })
    .catch((): Fonts => [null, null])
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export default async function Image() {
  const [bold, regular] = await loadFonts();

  const fonts = [
    bold && { name: "Plex", data: bold, style: "normal" as const, weight: 700 as const },
    regular && {
      name: "Plex",
      data: regular,
      style: "normal" as const,
      weight: 400 as const,
    },
  ].filter((font) => font !== null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
          direction: "rtl",
          fontFamily: "Plex",
          position: "relative",
        }}
      >
        {/* זוהר המבטא — אותו רעיון של --accent-soft, בערך קפוא */}
        <div
          style={{
            position: "absolute",
            top: -260,
            width: 900,
            height: 900,
            borderRadius: 450,
            background:
              "radial-gradient(circle, rgba(255,107,53,0.16) 0%, rgba(255,107,53,0) 68%)",
            display: "flex",
          }}
        />
        {/* טבעת המותג — אותה צורה כמו icon.svg, בלי תלות בקובץ */}
        <div
          style={{
            display: "flex",
            width: 96,
            height: 96,
            borderRadius: 48,
            border: `9px solid ${ACCENT}`,
          }}
        />
        <div
          style={{
            display: "flex",
            marginTop: 34,
            fontSize: 112,
            fontWeight: 700,
            color: FG,
            letterSpacing: -2,
          }}
        >
          {visualRtl("המנוע")}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 50,
            fontWeight: 400,
            color: FG_2,
          }}
        >
          {visualRtl("אימון שלם וחדש, בכל פעם.")}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 46,
            fontSize: 28,
            fontWeight: 400,
            color: ACCENT,
          }}
        >
          {visualRtl("פיילוט פתוח · חינם")}
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined },
  );
}

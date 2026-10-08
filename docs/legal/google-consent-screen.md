# מסך ההסכמה של Google — מעבר מ-Testing ל-Published

מדריך לבעלים, צעד-צעד. המטרה: לאפשר לכל בעל חשבון גוגל להיכנס לאפליקציה (לא רק ל-100 "משתמשי בדיקה"), בלי תהליך אימות (verification) של גוגל.

## למה זה בכלל צריך לקרות

כל עוד האפליקציה במצב **Testing**:
- רק חשבונות שהוספת ידנית לרשימת ה-Test users יכולים להיכנס (עד 100).
- כל אחד אחר רואה שגיאה בסגנון "Access blocked: hamenoa has not completed the Google verification process" — וזה סוף הדרך עבורו.

במצב **In production** (אחרי Publish) — כל אחד יכול להיכנס.

## למה לא נדרש אימות (ומה קורה אם אני טועה)

האפליקציה מבקשת שלושה scopes בלבד: `openid`, `email`, `profile` (בקונסולה הם מופיעים גם כ-`.../auth/userinfo.email` ו-`.../auth/userinfo.profile`). גוגל מסווגת אותם כ-**non-sensitive**. לפי המדיניות של גוגל, אפליקציה שמבקשת רק scopes כאלה **לא נדרשת לעבור בדיקת אימות** כדי לעבור ל-production, ומסך ההסכמה שלה לא מציג אזהרת "app not verified".

**אם אני טועה, או אם המדיניות של גוגל השתנתה,** זה מה שתראה:
- בלחיצה על Publish יופיע דיאלוג שאומר שהאפליקציה תצטרך אימות, או ש-Verification Center יראה סטטוס "Needs verification".
- משתמשים חדשים יראו מסך "**Google hasn't verified this app**" עם קישור קטן "Advanced" ← "Go to hamenoa (unsafe)". הכניסה עדיין אפשרית, אבל זה מסך שמבריח אנשים.

ברוב המקרים הסיבה לכך היא **לא ה-scopes** אלא אחד משניים: העלית לוגו (זה מפעיל "brand verification"), או שה-Authorized domain לא מאומת. שני אלה מטופלים בשלבים למטה.

## לפני שמתחילים — מה צריך להיות מוכן

1. **הדפים המשפטיים חיים וציבוריים** (בלי התחברות): 
   - https://hamenoa-production.up.railway.app/privacy
   - https://hamenoa-production.up.railway.app/terms
   
   לבדוק בחלון גלישה בסתר שהם נפתחים. (הבנאי צריך לוודא שהנתיבים האלה פתוחים ב-`src/proxy.ts`.)
2. **דוא"ל תמיכה** מוחלט. חייב להיות **חשבון גוגל שלך** או **Google Group** שאתה בעלים/מנהל שלו — הקונסולה מציעה רק כאלה ברשימה הנפתחת. אותה כתובת צריכה להיות ב-`SUPPORT_EMAIL` באפליקציה, כדי שמה שגוגל מציגה ומה שהמדיניות מציגה יהיו זהים.
3. **שם האפליקציה** כפי שיופיע למשתמש במסך של גוגל: "המנוע". אם הקונסולה תסרב לשם בעברית (לא צפוי, אבל ראינו מקרים של תווים לא לטיניים שנדחים בשדות מסוימים) — "HaMenoa" באנגלית, והשם העברי בתיאור.

## השלבים

הממשק של גוגל שינה שם ב-2024/2025: "OAuth consent screen" נמצא היום תחת **Google Auth Platform**. אם אתה רואה את הממשק הישן ("APIs & Services ← OAuth consent screen"), אותם שדות קיימים שם בעמוד אחד.

### שלב 1 — פתיחת הפרויקט
1. https://console.cloud.google.com — לבחור את הפרויקט שבו נוצר ה-OAuth client של המנוע (למעלה, בבורר הפרויקטים).
2. בתפריט: **Google Auth Platform** (או חיפוש "OAuth consent screen" בשורת החיפוש).

### שלב 2 — Branding (מיתוג)
למלא / לוודא:
- **App name:** המנוע
- **User support email:** הכתובת מהסעיף "לפני שמתחילים".
- **App logo:** **להשאיר ריק.** העלאת לוגו מפעילה דרישת brand verification, שהיא תהליך ידני ומיותר בפיילוט. בלי לוגו, גוגל מציגה את שם האפליקציה בלבד.
- **App domain:**
  - Application home page: `https://hamenoa-production.up.railway.app`
  - Application privacy policy link: `https://hamenoa-production.up.railway.app/privacy`
  - Application terms of service link: `https://hamenoa-production.up.railway.app/terms`
- **Authorized domains:** ראה שלב 3 — זה השדה הבעייתי.
- **Developer contact information:** אותו דוא"ל (או כל דוא"ל שגוגל תשלח אליו הודעות על הפרויקט).
- שמירה (Save).

### שלב 3 — Authorized domains (הסיכון העיקרי)
גוגל דורשת שהדומיינים של שלושת הקישורים למעלה יופיעו ברשימת **Authorized domains**, ושהם יהיו "top private domain" — כלומר דומיין שאתה בעליו, לא תת-דומיין של שירות אחסון.

מה לנסות, לפי הסדר:
1. להזין **`hamenoa-production.up.railway.app`**. יש סיכוי טוב שזה יתקבל: `up.railway.app` רשום (לפי הבנתנו) ב-Public Suffix List, ולכן גוגל אמורה להתייחס ל-`hamenoa-production.up.railway.app` כדומיין רשום בפני עצמו. אם התקבל — לשמור ולהמשיך לשלב 4.
2. אם הקונסולה מסרבת ("must be a top private domain" או דומה) ומציעה `railway.app` — **אל תזין `railway.app`**: זה לא דומיין שלך, ואם גוגל תבקש אימות בעלות דרך Search Console לא תוכל לספק אותו.
3. **הפתרון היציב: דומיין משלך.** לקנות דומיין (למשל דרך Cloudflare Registrar או כל רשם), לחבר אותו ל-Railway (Settings ← Domains ← Custom Domain; Railway נותן רשומת CNAME להוסיף אצל הרשם, ומנפיק תעודת HTTPS לבד), ואז:
   - לעדכן את שלושת הקישורים בשלב 2 לדומיין החדש,
   - להזין את הדומיין החדש ב-Authorized domains,
   - לעדכן את ה-Redirect URI ב-OAuth client (שלב 5),
   - לעדכן את כתובת האתר במסמכים/README ובמשתני הסביבה של האפליקציה אם יש כאלה שמכילים את הכתובת.
   
   הערה: גם ללא דרישה של גוגל, דומיין משלך הוא הדבר הנכון לפיילוט ציבורי — הכתובת של Railway יכולה להשתנות, והמסמכים המשפטיים מפנים אליה.

### שלב 4 — Data Access (scopes)
1. **Google Auth Platform ← Data Access** (בממשק הישן: "Scopes" בעמוד ה-consent screen).
2. לוודא שהרשימה מכילה **רק**:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
3. אם יש שם משהו נוסף (למשל scope שנוסף בטעות בניסויים) — להסיר. כל scope שמסומן "sensitive" או "restricted" ידרוש אימות.
4. שמירה.

### שלב 5 — Clients (ה-OAuth client עצמו)
1. **Google Auth Platform ← Clients** (בממשק הישן: Credentials ← OAuth 2.0 Client IDs).
2. לפתוח את ה-client של המנוע (Web application).
3. **Authorized JavaScript origins:** `https://hamenoa-production.up.railway.app` (או הדומיין החדש).
4. **Authorized redirect URIs:** להשאיר את הנתיב שכבר רשום מאז שלב הבדיקות (הנתיב שהאפליקציה משתמשת בו לחזרה מגוגל) — **לא לשנות את הנתיב**, רק להחליף דומיין אם עברת לדומיין משלך. אם משנים, האפליקציה תפסיק לעבוד עד שיתאימו.
5. שמירה. ה-Client ID וה-Client secret לא משתנים.

### שלב 6 — Audience: הפרסום עצמו
1. **Google Auth Platform ← Audience**.
2. **User type:** External (כבר כך, אחרת לא היו משתמשי בדיקה).
3. **Publishing status: Testing** ← לחיצה על **Publish app**.
4. יופיע דיאלוג אישור. שני תרחישים:
   - **"Your app will be available to any user with a Google Account"** (או נוסח דומה) בלי אזכור verification — **Confirm**. זה התרחיש הצפוי עם scopes לא-רגישים.
   - הדיאלוג מציין שהאפליקציה תצטרך verification — **עדיין אפשר לאשר** (הפרסום עצמו לא נחסם), אבל צריך להבין למה: לחזור לשלב 2 (לוגו?) ולשלב 4 (scope רגיש?) ולתקן, ואז לבדוק ב-Verification Center.
5. אחרי הפרסום הסטטוס משתנה ל-**In production**. רשימת ה-Test users כבר לא רלוונטית (אבל לא מזיקה).

### שלב 7 — Verification Center
1. **Google Auth Platform ← Verification Center**.
2. הסטטוס הצפוי: **"Verification not required"** או ש"אין פעולות נדרשות".
3. אם מופיע **"Needs verification"** — ללחוץ לפרטים. הסיבות הנפוצות: לוגו שהועלה (להסיר ב-Branding), scope רגיש (להסיר ב-Data Access), או Authorized domain לא מאומת (שלב 3). לא לשלוח בקשת verification לפני שמנסים להסיר את הסיבה.

### שלב 8 — בדיקה אמיתית
1. חלון גלישה בסתר.
2. להיכנס ל-https://hamenoa-production.up.railway.app ← כניסה עם גוגל ← **חשבון גוגל שאינו ברשימת ה-Test users** (אם אין לך כזה — לבקש מחבר).
3. מה צריך לראות: מסך של גוגל "Sign in to המנוע" / "המנוע wants to access your Google Account" עם שורות "See your primary Google Account email address" ו-"See your personal info", וקישורים ל-Privacy policy ו-Terms of service בתחתית (הקישורים צריכים להוביל לדפים שלנו). אישור ← חזרה לאפליקציה מחוברים.
4. אם רואים "**Google hasn't verified this app**" — לא לסמן שהכול בסדר. לחזור לשלב 7. הכניסה תעבוד דרך "Advanced", אבל משתמשים רגילים לא יעברו את המסך הזה.
5. לבדוק גם מטלפון (Safari באייפון, Chrome באנדרואיד) — זה המסך שרוב האנשים יראו.

## דברים שכדאי לדעת אחרי הפרסום

- **התוקף של הפרסום** לא פג. אין צורך לחדש.
- **שינוי דומיין** = לחזור על שלבים 2, 3, 5, 8.
- **הוספת scope** בעתיד (למשל Calendar) — כל scope רגיש יחזיר את האפליקציה לצורך באימות. לא להוסיף בלי סיבה.
- **מדיניות הפרטיות חייבת להזכיר את השימוש בנתוני גוגל** — היא מזכירה (סעיף "מי נחשף למידע": גוגל מוסרת מזהה, דוא"ל ושם; לא מקבלת נתוני אימון). לא לשנות את זה בלי לעדכן גם כאן.
- **מדיניות "Limited Use"** של גוגל חלה על restricted scopes בלבד — לא רלוונטית לנו.
- **Refresh tokens:** במצב Testing גוגל מפקיעה refresh tokens אחרי 7 ימים. האפליקציה לא משתמשת ב-refresh tokens (הכניסה מנפיקה עוגיית התחברות משלנו ל-30 יום), אז זה לא השפיע — ואחרי הפרסום גם לא רלוונטי.
- **הודעות מגוגל** על הפרויקט מגיעות לכתובת ה-Developer contact. לשים לב לדוא"ל בשם "Google Cloud Platform" / "OAuth" — לפעמים זו דרישה לעדכן משהו לפני תאריך יעד.

# המנוע

אפליקציית ווב לאימוני כושר: בוחרים מקום וזמן, מקבלים אימון של חימום, כמה משחקונים ושחרור. כל משחקון שואל שאלה אחת, רץ מול שעון ונותן תוצאה לנצח בפעם הבאה.

- הוראות עבודה: [CLAUDE.md](CLAUDE.md)
- הצורה של אימון: [docs/CONTRACT.md](docs/CONTRACT.md)
- מה נעשה ומה נשאר: [docs/PLAN.md](docs/PLAN.md)

## הרצה מקומית

דרוש Node.js 22 ומעלה.

```sh
corepack enable
pnpm install
pnpm db:local        # מסד מקומי, משאירים פתוח בטרמינל נפרד
pnpm db:setup        # סכמה ומאגר התרגילים
pnpm dev             # http://localhost:3000
```

בפיתוח מקומי בלי `APP_PASSWORD` האפליקציה פתוחה בלי כניסה. בסביבת ענן (Codespaces): `pnpm cloud:setup`, `pnpm cloud:dev`, והסיסמה ב־`pnpm cloud:password`.

## בדיקות

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

בדיקה חיה של ה־API ושל מסך האימון בדפדפן (ניתוק, שגיאת שרת, לחיצה כפולה, אימון שנסגר). היא מוחקת את אימוני המשתמש ומשנה נתונים, ולכן רצה רק מול שרת ומסד מקומיים שאפשר לזרוק, ורק עם אישור מפורש:

```sh
# בטרמינלים נפרדים: pnpm db:local, ואז APP_PASSWORD=... pnpm dev
LIVE_CHECK=throwaway-local-data APP_PASSWORD=... DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres pnpm check:live
```

הדפדפן הוא Chromium של Playwright; אם הוא מותקן במקום אחר, `CHROMIUM_PATH` מצביע אליו.

## פריסה

Railway, לפי [docs/ops/RAILWAY.md](docs/ops/RAILWAY.md). בייצור חובה להגדיר `APP_PASSWORD`; בלעדיו השרת מחזיר 503 בכוונה. משתני הסביבה מתועדים ב־`.env.example`.

## מקורות ורישוי

מאגר התרגילים מבוסס על מקורות פתוחים; הפירוט ב־[CREDITS.md](CREDITS.md).

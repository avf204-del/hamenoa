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

## פריסה

Railway, לפי [docs/ops/RAILWAY.md](docs/ops/RAILWAY.md). בייצור חובה להגדיר `APP_PASSWORD`; בלעדיו השרת מחזיר 503 בכוונה. משתני הסביבה מתועדים ב־`.env.example`.

## מקורות ורישוי

מאגר התרגילים מבוסס על מקורות פתוחים; הפירוט ב־[CREDITS.md](CREDITS.md).

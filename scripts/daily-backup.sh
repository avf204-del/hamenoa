#!/bin/zsh
# גיבוי יומי מהמחשב של הבעלים אל backups/ (החלטה 20, שלב ג').
#
# זה הנתיב השני של הגיבוי: הראשון הוא שירות ה-cron ב-Railway, שכותב מדי
# יום לווליום שלו. שני הנתיבים קוראים מאותו מסד מנוהל (Neon) וכותבים
# לשני מקומות נפרדים — פלטפורמה אחת נופלת, העותק השני שורד.
#
# מותקן כ-LaunchAgent בשם com.hamenoa.daily-backup (ראה README, "גיבוי").
# הרצה ידנית: ‏zsh scripts/daily-backup.sh
#
# מקור מחרוזת החיבור: ‏.env.deploy (מחוץ לגיט). בלעדיו הגיבוי מדלג בשקט
# ומחזיר כישלון כדי שהתזמון לא ידווח על הצלחה בלי גיבוי.
set -u

cd "${0:A:h}/.." || exit 1
LOG="backups/daily-backup.log"
mkdir -p backups

if [[ ! -f .env.deploy ]]; then
  echo "$(date '+%Y-%m-%d %H:%M') דילוג: אין .env.deploy" >> "$LOG"
  exit 1
fi

set -a
source ./.env.deploy
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "$(date '+%Y-%m-%d %H:%M') דילוג: אין DATABASE_URL" >> "$LOG"
  exit 1
fi

# ל-launchd יש PATH מצומצם שאין בו node/pnpm — מוסיפים את המיקומים המוכרים
export PATH="$HOME/.local/node/bin:$HOME/Library/pnpm:/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v pnpm > /dev/null; then
  echo "$(date '+%Y-%m-%d %H:%M') ⚠️ נכשל: pnpm לא נמצא ב-PATH" >> "$LOG"
  exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M') --- גיבוי יומי מהמסד המקוון" >> "$LOG"
pnpm backup:inventory --apply >> "$LOG" 2>&1 || exit 1
if pnpm db:backup --keep 30 >> "$LOG" 2>&1; then
  echo "$(date '+%Y-%m-%d %H:%M') הסתיים בהצלחה" >> "$LOG"
else
  # ‏status הוא משתנה שמור (read-only) ב-zsh — הצבה אליו הייתה שוברת בשקט
  # את נתיב רישום-השגיאה עצמו (הפלט לא נכתב, וההרצה נעצרת בלי הודעה ב-log).
  rc=$?
  echo "$(date '+%Y-%m-%d %H:%M') ⚠️ נכשל (קוד $rc)" >> "$LOG"
  exit 1
fi

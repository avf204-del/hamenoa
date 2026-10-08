// Display-only cooldown content; deliberately not a selectable exercise or mobility drill.
import { drillKey } from "./drill-keys";

export const WALKING_DRILL = {
  id: "walking-easy",
  nameHe: "הליכה קלה",
  instructionsHe:
    "1. התחל ללכת בקצב קל ונוח, במקום או במרחב פנוי.\n" +
    "2. שמור על גו זקוף וכתפיים משוחררות, והנע את הידיים בטבעיות.\n" +
    "3. האט בהדרגה ותן לנשימה להירגע.\n" +
    "שים לב: זו הליכה רגועה לשחרור, בלי ריצה או הרמת ברכיים גבוהה.",
};

export const WALKING_INFO_KEY = drillKey(WALKING_DRILL.id);

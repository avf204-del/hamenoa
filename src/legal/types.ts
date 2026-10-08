// טיפוסי המסמכים המשפטיים (סבב 35 — פיילוט ציבורי).
//
// הקבצים בתיקייה הזו טהורים: בלי React/Next/Prisma, כדי שאפשר יהיה לבדוק
// את התוכן ב-Vitest ולרנדר אותו גם בשרת וגם בלקוח בלי תלויות.
//
// הטקסטים משתמשים בשני טוקנים בלבד — {{operatorName}} ו-{{contact}} —
// שממולאים בזמן ריצה מ-operatorInfo() דרך fillDocument() (ראה index.ts).
// אין לכתוב במסמכים כתובת דוא"ל מפורשת.

export interface LegalSection {
  /** מזהה יציב לעוגן ולבדיקות (ייחודי בתוך המסמך). */
  id: string;
  title: string;
  /** פסקאות קצרות, בסדר הצגה. */
  paragraphs: string[];
  /** רשימת נקודות אופציונלית, מוצגת אחרי הפסקאות. */
  bullets?: string[];
}

export interface LegalDocument {
  slug: "terms" | "privacy";
  title: string;
  shortTitle: string;
  /** גרסת המסמך. שינוי מהותי = העלאה, יחד עם LEGAL_VERSION ב-index.ts. */
  version: number;
  /** תאריך תחילה, YYYY-MM-DD. */
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
}

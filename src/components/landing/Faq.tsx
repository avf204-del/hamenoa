// שאלות נפוצות — <details> טהור, בלי JavaScript ובלי מצב.
//
// הסמן המובנה של הדפדפן מוסתר (list-none + ::-webkit-details-marker) ובמקומו
// יש פלוס שנעשה מינוס בפתיחה: שני פסים, והאנכי מתכווץ ב-group-open. הבחירה
// הזו מכוונת ל-RTL — חץ היה צריך להתהפך, פלוס הוא סימטרי וקורא נכון בשני
// הכיוונים. המיקום נעשה במאפיין לוגי (start-*), לא ב-left/right.

export interface FaqItem {
  q: string;
  a: React.ReactNode;
}

export default function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <details
          key={item.q}
          className="group rounded-(--r-m) border border-line bg-raised px-4 [box-shadow:var(--raise-edge)]"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-start text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
            <span>{item.q}</span>
            <span aria-hidden className="relative h-3 w-3 shrink-0">
              <span className="absolute inset-x-0 top-[5px] h-0.5 rounded-full bg-accent" />
              <span className="absolute inset-y-0 start-[5px] w-0.5 rounded-full bg-accent transition-transform duration-(--t-quick) ease-(--ease) group-open:scale-y-0" />
            </span>
          </summary>
          <div className="pb-4 text-sm leading-relaxed text-fg-2">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

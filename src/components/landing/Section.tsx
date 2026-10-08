// סעיף בדף הנחיתה: קו-על קצר, כותרת, פסקת פתיחה ותוכן. קיים כדי שכל
// הסעיפים ישמרו על אותו קצב אנכי ואותה היררכיה טיפוגרפית — הרושם הראשון
// של המוצר לא יכול להיות אוסף של כותרות בגדלים אקראיים.

export default function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 pt-14 md:pt-20">
      {eyebrow && (
        <p className="text-xs font-semibold tracking-wide text-accent">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1.5 text-[1.5rem] font-bold leading-snug md:text-[1.75rem]">
        {title}
      </h2>
      {lead && (
        <p className="mt-2.5 max-w-[46ch] leading-relaxed text-fg-2">{lead}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

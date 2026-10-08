import Image from "next/image";

// מסגרת טלפון ב-CSS בלבד — בלי תמונת מסגרת ובלי ספרייה. הצילומים עצמם
// כבר 390×844 (יחס טלפון מדויק), כך שהמסגרת רק עוטפת אותם.
//
// הזוהר מאחור נבנה מ-var(--accent-soft) בלבד, כדי שהוא יתחלף יחד עם צבע
// המבטא שהמשתמש בחר וישרוד גם במצב הבהיר. הוא aria-hidden ו-pointer-events
// none — קישוט טהור שלא נכנס לעץ הנגישות ולא חוסם לחיצה.

export default function PhoneFrame({
  src,
  alt,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative mx-auto w-full max-w-[264px] ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(58%_46%_at_50%_38%,var(--accent-soft),transparent_72%)]"
      />
      <div className="rounded-[2.25rem] border border-line-strong bg-raised px-2 pb-2 pt-3 [box-shadow:var(--raise-edge)]">
        <div
          aria-hidden
          className="mx-auto mb-2 h-1 w-12 rounded-full bg-line-strong"
        />
        <div className="overflow-hidden rounded-[1.7rem] border border-line bg-app">
          <Image
            src={src}
            alt={alt}
            width={390}
            height={844}
            sizes="(min-width: 768px) 264px, 68vw"
            priority={priority}
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}

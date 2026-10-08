// סט אייקונים פנימי — בלי ספריות חיצוניות. קו 1.75, קצוות מעוגלים, currentColor.
// אייקון כיווני מקבל את המחלקה rtl-flip ומתהפך אוטומטית ב-RTL (ראה globals.css).

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** סימן המותג: גלגל תנופה עם מחוג */
export function Mark({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="40 13.4"
        transform="rotate(-45 12 12)"
      />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}

export function Flame(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3c1.6 2.6 4.5 4.6 4.5 8.6a4.5 4.5 0 0 1-9 0c0-1.9.9-3.4 1.9-4.5.3 1 .8 1.8 1.6 2.3-.2-2.2 0-4.3 1-6.4z" />
    </Svg>
  );
}

export function Dumbbell(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9.5v5M7 7v10M17 7v10M20 9.5v5M7 12h10" />
    </Svg>
  );
}

export function Waves(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 8c2-1.8 3.7-1.8 5.7 0s3.6 1.8 5.6 0 3.7-1.8 5.7 0" />
      <path d="M3.5 12.5c2-1.8 3.7-1.8 5.7 0s3.6 1.8 5.6 0 3.7-1.8 5.7 0" />
      <path d="M3.5 17c2-1.8 3.7-1.8 5.7 0s3.6 1.8 5.6 0 3.7-1.8 5.7 0" />
    </Svg>
  );
}

export function Bolt(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 2.5 5.5 13H11l-1 8.5L17.5 11H12l1-8.5z" />
    </Svg>
  );
}

export function Sparkle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.5 13.7 9l4.5 1.7-4.5 1.7L12 16.9l-1.7-4.5-4.5-1.7L10.3 9 12 4.5z" />
      <path d="M18.5 16.5v3M17 18h3" />
    </Svg>
  );
}

export function Wind(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8.5h8a2.3 2.3 0 1 0-2.3-2.3" />
      <path d="M4 12.5h13.5a2.3 2.3 0 1 1-2.3 2.3" />
      <path d="M4 16.5h6a2 2 0 1 1-2 2" />
    </Svg>
  );
}

export function ChartLine(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 4v14a2 2 0 0 0 2 2h14" />
      <path d="M8.5 14.5l3.2-3.2 2.6 2.6 5-5.2" />
      <circle cx="19.3" cy="8.7" r="0.5" fill="currentColor" />
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" />
    </Svg>
  );
}

export function Clock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function MapPin(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s-6.5-5.3-6.5-10.2a6.5 6.5 0 0 1 13 0C18.5 15.7 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </Svg>
  );
}

export function Battery(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="8" width="15" height="8" rx="2" />
      <path d="M21 10.5v3" />
      <path d="M6.5 10.5v3M9.5 10.5v3" />
    </Svg>
  );
}

export function Sun(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M3 12h2M19 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </Svg>
  );
}

export function Moon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a7 7 0 0 0 10 10z" />
    </Svg>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="12" rx="2" />
      <path d="M9.5 20.5h5M12 17v3.5" />
    </Svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Svg>
  );
}

/** רמקול פתוח — הקול דולק. כיווני: הגלים מתהפכים ב-RTL */
export function SpeakerIcon({ className, ...props }: IconProps) {
  return (
    <Svg {...props} className={`rtl-flip ${className ?? ""}`}>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4z" />
      <path d="M15 9.8a3.2 3.2 0 0 1 0 4.4M17.8 7.2a6.8 6.8 0 0 1 0 9.6" />
    </Svg>
  );
}

/** רמקול מושתק — אותו גוף, והגלים מוחלפים ב-X */
export function SpeakerOffIcon({ className, ...props }: IconProps) {
  return (
    <Svg {...props} className={`rtl-flip ${className ?? ""}`}>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4z" />
      <path d="M15 9.8l5 4.4M20 9.8l-5 4.4" />
    </Svg>
  );
}

/** מצביע לכיוון ההתחלה הלוגית (ב-RTL: ימינה) — לניווט "אחורה" */
export function ChevronStart({ className, ...props }: IconProps) {
  return (
    <Svg {...props} className={`rtl-flip ${className ?? ""}`}>
      <path d="M14.5 6.5 9 12l5.5 5.5" />
    </Svg>
  );
}

/** מצביע לכיוון הסוף הלוגי (ב-RTL: שמאלה) — לניווט "קדימה" */
export function ChevronEnd({ className, ...props }: IconProps) {
  return (
    <Svg {...props} className={`rtl-flip ${className ?? ""}`}>
      <path d="M9.5 6.5 15 12l-5.5 5.5" />
    </Svg>
  );
}

export function TableIcon({ className, ...props }: IconProps) {
  return (
    <Svg {...props} className={`rtl-flip ${className ?? ""}`}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M9.5 9.5v10" />
    </Svg>
  );
}

export function StackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 20 8l-8 4.5L4 8l8-4.5z" />
      <path d="M4 12.5 12 17l8-4.5" />
      <path d="M4 16.5 12 21l8-4.5" />
    </Svg>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 4.5v6M5 14.5v5M12 4.5v3M12 11.5v8M19 4.5v9M19 17.5v2" />
      <circle cx="5" cy="12.2" r="1.8" />
      <circle cx="12" cy="9.2" r="1.8" />
      <circle cx="19" cy="15.2" r="1.8" />
    </Svg>
  );
}

export function ClipboardIcon({ className, ...props }: IconProps) {
  return (
    <Svg {...props} className={`rtl-flip ${className ?? ""}`}>
      <rect x="5.5" y="4.5" width="13" height="16" rx="2" />
      <path d="M9.5 4.5a2.5 2.5 0 0 1 5 0" />
      <path d="M9 10.5h6M9 14h6M9 17.5h3.5" />
    </Svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.4a3.2 3.2 0 0 1 0 5.2" />
      <path d="M17.5 14.9c1.9.6 3 2.3 3 4.6" />
    </Svg>
  );
}

/** מד מחוג — "כמה טוב", בניגוד ל-ChartLine שהוא מגמה לאורך זמן */
export function GaugeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 17.5a9 9 0 1 1 17 0" />
      <path d="M12 17.5 16.5 10" />
      <circle cx="12" cy="17.5" r="1.4" />
    </Svg>
  );
}

/** מטרה — "יכולות": מה שאתה מסוגל, לא מגמה, לא מבנה */
export function TargetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** ספר פתוח — "השיטה": עמוד הסבר, לא מסמך רשמי */
export function BookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 6.8c-1.7-1.4-3.9-2.1-6-2.1-.6 0-1 .4-1 1v11.6c0 .6.4 1 1 1 2.1 0 4.3.7 6 2.1" />
      <path d="M12 6.8c1.7-1.4 3.9-2.1 6-2.1.6 0 1 .4 1 1v11.6c0 .6-.4 1-1 1-2.1 0-4.3.7-6 2.1" />
    </Svg>
  );
}

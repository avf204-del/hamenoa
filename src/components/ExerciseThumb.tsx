// תמונה ממוזערת של תרגיל — או צ'יפ אייקון כשאין תמונה (6 התרגילים המקוריים).
// טהורה: עובדת בשרת ובלקוח. unoptimized: קבצים סטטיים מקומיים, בלי שרת אופטימיזציה.

import Image from "next/image";
import { Dumbbell } from "@/components/icons";
import type { ExerciseInfo } from "@/lib/exercise-info";

export default function ExerciseThumb({
  info,
  size = 40,
}: {
  info: ExerciseInfo | undefined;
  size?: number;
}) {
  const src = info?.images[0];
  if (!src) {
    return (
      <span
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-(--r-s) border border-line bg-sunken text-fg-3"
        style={{ width: size, height: size }}
      >
        <Dumbbell size={Math.round(size * 0.5)} />
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-(--r-s) border border-line bg-[#FFF5E8] object-contain"
      style={{ width: size, height: size }}
    />
  );
}

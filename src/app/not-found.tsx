import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/components/icons";
import { translator } from "@/i18n";
import { displayPrefs } from "@/i18n/server";

// כתובת שלא קיימת — או אימון שנמחק (‏notFound() מ-/session/[id]).
// המסך הזה חי מחוץ לפריסת האפליקציה (אין כאן ניווט תחתון), ולכן הוא
// מביא את סימן המותג ואת הדרך חזרה בעצמו.

export const metadata: Metadata = { title: "לא נמצא" };

export default async function NotFound() {
  const { locale } = await displayPrefs();
  const t = translator(locale);
  return (
    <div lang={locale} dir={locale === "he" ? "rtl" : "ltr"} className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <Mark size={44} className="text-accent" />
      <h1 className="mt-5 text-2xl font-bold">{t("הדף הזה לא קיים", "This page doesn't exist")}</h1>
      <p className="mt-2 max-w-[32ch] leading-relaxed text-fg-2">
        {t("אולי האימון נמחק, או שהקישור השתנה. מסך הבית תמיד יודע איפה הכול.", "Maybe the workout was deleted, or the link changed. The home screen always knows where everything is.")}
      </p>
      <Link
        href="/"
        className="mt-7 min-h-14 w-full max-w-xs rounded-(--r-m) bg-accent px-6 py-4 text-lg font-bold text-on-accent transition-colors duration-(--t-quick) hover:bg-accent-hi"
      >
        {t("חזרה הביתה", "Back home")}
      </Link>
      <Link
        href="/calendar"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent"
      >
        {t("או ללוח השנה וההיסטוריה", "Or to the calendar and history")}
      </Link>
    </div>
  );
}

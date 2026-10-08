"use client";
// Language choice available before sign-in and consent (C1): stores the
// display cookie only; after sign-in the experience profile takes over.
import { useRouter } from "next/navigation";
import { useLocale, writeDisplayCookies } from "@/i18n/client";

export default function LanguageToggle() {
  const router = useRouter();
  const { locale, units, timeZone } = useLocale();
  const next = locale === "he" ? "en" : "he";
  return (
    <button
      type="button"
      lang={next}
      onClick={() => {
        writeDisplayCookies({ locale: next, units, timeZone });
        router.refresh();
      }}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line px-3 text-sm font-semibold text-fg-2 transition-colors duration-(--t-quick) hover:bg-raised"
      aria-label={locale === "he" ? "Switch to English" : "מעבר לעברית"}
    >
      {locale === "he" ? "EN" : "עב"}
    </button>
  );
}

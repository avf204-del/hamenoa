"use client";

// The account menu: language and appearance, the player's data (export and
// "Delete account", the exact name the legal texts use), and signing out.

import Link from "next/link";
import { useState } from "react";
import DeleteAccountSheet from "@/components/account/DeleteAccountSheet";
import LanguageToggle from "@/components/LanguageToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useLocale } from "@/i18n/client";

const row = "flex min-h-14 items-center justify-between gap-3 px-4 text-base";

export default function AccountPanel({ name, isOwner }: { name: string; isOwner: boolean }) {
  const { t } = useLocale();
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function signOut() {
    if (leaving) return;
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    // A full navigation on purpose: everything held in memory is dropped with the session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
      <header className="flex items-center justify-between">
        <Link href="/workout" className="text-sm text-fg-2 hover:text-fg">{t("חזרה לאימון", "Back to the workout")}</Link>
      </header>
      <h1 className="mt-6 text-3xl font-bold">{t("החשבון שלי", "My account")}</h1>
      <p className="mt-1 text-fg-2">{name}</p>

      <section className="mt-6 divide-y divide-line rounded-(--r-l) border border-line bg-raised">
        <div className={row}>
          <span>{t("שפה", "Language")}</span>
          <LanguageToggle />
        </div>
        <div className={row}>
          <span>{t("מראה", "Appearance")}</span>
          <ThemeToggle />
        </div>
        <Link href="/health?update=1" className={row}>{t("עדכון שאלון הבריאות", "Update the health questionnaire")}</Link>
      </section>

      <section className="mt-4 divide-y divide-line rounded-(--r-l) border border-line bg-raised">
        <a href="/api/me/export" download className={row}>{t("ייצוא הנתונים שלי", "Export my data")}</a>
        <button type="button" onClick={() => setDeleting(true)} className={`${row} w-full text-danger`}>
          {t("מחק חשבון", "Delete account")}
        </button>
      </section>

      <section className="mt-4 divide-y divide-line rounded-(--r-l) border border-line bg-raised">
        <Link href="/terms" className={row}>{t("תנאי שימוש", "Terms of use")}</Link>
        <Link href="/privacy" className={row}>{t("מדיניות פרטיות", "Privacy policy")}</Link>
        <Link href="/contact" className={row}>{t("צור קשר", "Contact")}</Link>
        {isOwner && <Link href="/admin" className={row}>{t("ניהול", "Admin")}</Link>}
      </section>

      <button type="button" onClick={signOut} disabled={leaving} className="mt-6 min-h-14 w-full rounded-(--r-m) border border-line text-base font-semibold text-fg-2 hover:text-fg disabled:opacity-60">
        {leaving ? t("יוצא…", "Signing out…") : t("יציאה", "Sign out")}
      </button>

      <DeleteAccountSheet open={deleting} onClose={() => setDeleting(false)} />
    </div>
  );
}

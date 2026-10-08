import type { Metadata } from "next";
import AccountPanel from "@/components/account/AccountPanel";
import { LocaleProvider } from "@/i18n/client";
import { displayPrefs } from "@/i18n/server";
import { requireUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "החשבון שלי" };

// Reachable by any signed-in user, also before the terms and the health
// screen are completed: leaving or deleting the account must never depend on
// accepting anything first.
export default async function AccountPage() {
  const user = await requireUser();
  const prefs = await displayPrefs();
  return (
    <LocaleProvider {...prefs}>
      <AccountPanel name={user.name} isOwner={user.role === "owner"} />
    </LocaleProvider>
  );
}

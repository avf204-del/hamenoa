import { redirect } from "next/navigation";
import { LocaleProvider } from "@/i18n/client";
import { displayPrefs } from "@/i18n/server";
import { requireUser } from "@/lib/current-user";
import { onboardingRedirect } from "@/lib/onboarding";

// Every workout screen sits behind the same entry chain: a signed-in user who
// has accepted the current terms and completed the current health screen.
export default async function WorkoutLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const next = onboardingRedirect(user);
  if (next) redirect(next);
  const prefs = await displayPrefs();
  return <LocaleProvider {...prefs}>{children}</LocaleProvider>;
}

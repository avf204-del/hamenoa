import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Landing from "@/components/landing/Landing";
import { currentUser } from "@/lib/current-user";
import { displayPrefs } from "@/i18n/server";
import { translator } from "@/i18n";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const user = await currentUser();
  const { locale } = await displayPrefs();
  const t = translator(locale);
  // absolute: התבנית של השורש ("%s — המנוע") הייתה מכפילה את שם המוצר
  if (user) return { title: { absolute: t("המנוע", "Hamenoa") } };

  const title = t("המנוע — מגיעים לאימון עם כיוון", "Hamenoa — come to your workout with direction");
  const description = t(
    "בונים אימון לפי הזמן והמקום, רואים מה עושים ומתקדמים צעד אחרי צעד. פיילוט פתוח, חינם.",
    "Build a workout for your time and place, see what to do and progress step by step. An open pilot, free.",
  );

  return {
    title: { absolute: title },
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "he_IL",
      title,
      description,
      url: "/",
      siteName: t("המנוע", "Hamenoa"),
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Home({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await currentUser()) redirect("/workout");
  const { deleted } = await searchParams;
  return <Landing deleted={(Array.isArray(deleted) ? deleted[0] : deleted) === "1"} />;
}

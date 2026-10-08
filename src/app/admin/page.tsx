import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** The owner's start page: what exists and where to manage it. */
export default async function AdminHome() {
  const [exercises, users, invites] = await Promise.all([
    prisma.exercise.count(),
    prisma.user.count(),
    prisma.invite.count(),
  ]);
  const cards = [
    { href: "/admin/exercises", title: "מאגר התרגילים", figure: exercises, note: "עריכת תיוג, ציוד והוראות" },
    { href: "/admin/invites", title: "הזמנות", figure: invites, note: "קודי הזמנה והרשמה" },
  ];
  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-2xl font-bold">ניהול</h1>
      <p className="text-fg-2">
        <span className="num">{users}</span> משתמשים רשומים.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-2xl border border-line bg-raised p-5 transition-colors duration-(--t-quick) hover:border-accent">
            <div className="text-sm text-fg-2">{card.title}</div>
            <div className="num mt-1 text-3xl font-bold">{card.figure}</div>
            <div className="mt-2 text-sm text-fg-2">{card.note}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

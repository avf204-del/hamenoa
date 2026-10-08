import type { ReactNode } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Mark } from "@/components/icons";

const LINKS = [
  { href: "/admin/exercises", label: "תרגילים" },
  { href: "/admin/invites", label: "הזמנות" },
  { href: "/workout", label: "חזרה לאפליקציה" },
];

/** The owner's work area: wider than the app, no bottom navigation. */
export default function AdminFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Mark size={22} className="text-accent" />
          <span className="font-bold">המנוע</span>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent">מצב ניהול</span>
        </Link>
        <nav className="flex items-center gap-3">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-fg-2 transition-colors duration-(--t-quick) hover:text-fg">
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

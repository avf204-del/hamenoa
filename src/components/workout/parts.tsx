"use client";

// Building blocks shared by the workout screens. Colour, type and spacing
// come from the design tokens only.

import type { ReactNode } from "react";
import ExerciseThumb from "@/components/ExerciseThumb";
import type { ExerciseInfo } from "@/lib/exercise-info";

/** One phone-width column: content scrolls, the actions stay under the thumb. */
export function Screen({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col px-5 pt-5 pb-6">{children}</main>
      {actions && (
        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-app px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
          {actions}
        </div>
      )}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  tone = "accent",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** "calm" is for a button that is waiting, such as during a rest. */
  tone?: "accent" | "calm";
}) {
  const look =
    tone === "calm" || disabled
      ? "border border-line bg-raised text-fg-2"
      : "bg-accent text-on-accent hover:bg-accent-hi active:scale-[0.99]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-16 w-full items-center justify-center gap-2 rounded-(--r-m) px-6 text-xl font-bold transition-[background-color,transform] duration-(--t-quick) ${look}`}
    >
      {children}
    </button>
  );
}

export function QuietButton({ children, onClick, danger = false }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 w-full items-center justify-center rounded-(--r-m) px-4 text-base font-medium transition-colors duration-(--t-quick) ${
        danger ? "text-danger hover:bg-danger-soft" : "text-fg-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

/** An exercise in a list: picture, name, and what is asked of it. Opens "how to". */
export function ExerciseRow({
  info,
  name,
  detail,
  onOpen,
}: {
  info: ExerciseInfo | undefined;
  name: string;
  detail?: ReactNode;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <ExerciseThumb info={info} size={52} />
      <span className="min-w-0 flex-1 text-start">
        <span className="block truncate font-medium">{name}</span>
        {detail && <span className="block text-sm text-fg-2">{detail}</span>}
      </span>
    </>
  );
  if (!onOpen) return <div className="flex items-center gap-3 py-2">{body}</div>;
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-(--r-s) py-2 transition-colors duration-(--t-quick) hover:bg-raised">
      {body}
    </button>
  );
}

/** A titled group inside a screen. */
export function Group({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-(--r-l) border border-line bg-raised px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        {aside && <span className="num text-sm text-fg-2">{aside}</span>}
      </div>
      <div className="mt-1">{children}</div>
    </section>
  );
}

"use client";

// ניהול קודי ההזמנה (אבן דרך 8, החלטה 21; מסלול משני מאז החלטה 35) —
// המסך של הבעלים בלבד. ההצטרפות הרגילה היא הרשמה עצמית עם גוגל; הקודים
// כאן נועדו למי שאין לו חשבון גוגל, להכנסה אישית, ולפתיחה כשההרשמה סגורה.
// כל קוד עובד פעם אחת; מתאמן שננעל בחוץ מקבל קוד חדש על אותה שורה וחוזר
// לנתונים שלו. הצבעים והצורות רק דרך הטוקנים.

import { useState } from "react";
import { formatDay } from "@/lib/format";

export interface InviteRow {
  id: string;
  code: string;
  label: string;
  createdAt: string;
  usedAt: string | null;
  revoked: boolean;
  user: { id: string; name: string; lastSeenAt: string | null; sessions: number } | null;
}

/** מצב שורה אחת — מה הבעלים צריך לדעת במבט אחד */
function statusOf(invite: InviteRow): { text: string; cls: string } {
  if (invite.revoked) {
    return { text: "הגישה בוטלה", cls: "bg-danger-soft text-danger" };
  }
  if (invite.usedAt === null) {
    return invite.user
      ? { text: "קוד חדש — ממתין לכניסה", cls: "bg-accent-soft text-accent" }
      : { text: "ממתין לשימוש", cls: "bg-accent-soft text-accent" };
  }
  return { text: "נוצל", cls: "bg-ok-soft text-ok" };
}

const day = (iso: string) => formatDay(iso.slice(0, 10));

export default function InvitesManager({ initial }: { initial: InviteRow[] }) {
  const [invites, setInvites] = useState(initial);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** קריאה אחת ל-API עם טיפול אחיד בשגיאות — התשובה תמיד { ok, error? } */
  async function call<T>(
    url: string,
    init: RequestInit,
    key: string,
  ): Promise<T | null> {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      let data: { ok?: boolean; error?: string } & Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        setError(`שגיאת שרת (סטטוס ${res.status}) — בדוק את לוג השרת`);
        return null;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "הפעולה נכשלה");
        return null;
      }
      return data as T;
    } catch {
      setError("השרת לא הגיב");
      return null;
    } finally {
      setBusy(null);
    }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = label.trim();
    if (!name) return;
    const data = await call<{ invite: InviteRow }>(
      "/api/admin/invites",
      { method: "POST", body: JSON.stringify({ label: name }) },
      "create",
    );
    if (!data) return;
    setInvites((rows) => [data.invite, ...rows]);
    setLabel("");
    setNotice(`הקוד של ${data.invite.label} מוכן — העתק ושלח לו.`);
  };

  const reissue = async (invite: InviteRow) => {
    const data = await call<{ invite: InviteRow }>(
      `/api/admin/invites/${invite.id}`,
      { method: "PATCH", body: JSON.stringify({ reissue: true }) },
      invite.id,
    );
    if (!data) return;
    setInvites((rows) => rows.map((r) => (r.id === invite.id ? data.invite : r)));
    setNotice(`קוד חדש ל${invite.label}. הקוד הקודם כבר לא עובד.`);
  };

  const setRevoked = async (invite: InviteRow, revoked: boolean) => {
    const done = await call(
      `/api/admin/invites/${invite.id}`,
      { method: "PATCH", body: JSON.stringify({ revoked }) },
      invite.id,
    );
    if (!done) return;
    setInvites((rows) =>
      rows.map((r) => (r.id === invite.id ? { ...r, revoked } : r)),
    );
    setNotice(
      revoked
        ? `הגישה של ${invite.label} בוטלה.`
        : `הגישה של ${invite.label} הוחזרה.`,
    );
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice(`הקוד ${code} הועתק.`);
      setError(null);
    } catch {
      // חיבור לא-מאובטח (http מהטלפון) חוסם את הלוח — אומרים את זה במפורש
      setError("הדפדפן לא איפשר העתקה — סמן את הקוד והעתק ידנית.");
    }
  };

  return (
    <div className="mt-5 space-y-5">
      <form
        onSubmit={create}
        className="rounded-(--r-m) border border-line bg-raised p-4 [box-shadow:var(--raise-edge)]"
      >
        <label htmlFor="invite-label" className="text-sm font-bold">
          הזמנת מתאמן חדש
        </label>
        <p className="mt-1 text-xs leading-relaxed text-fg-3">
          השם הוא לזיהוי שלך בלבד — המתאמן לא רואה אותו ולא רואה אף אחד אחר.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            id="invite-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            placeholder="למשל: דני מהעבודה"
            className="min-w-48 flex-1 rounded-(--r-s) border border-line bg-sunken px-3 py-2.5 text-sm text-fg placeholder:text-fg-3 focus:border-line-strong focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy !== null || label.trim() === ""}
            className="rounded-(--r-s) bg-accent px-5 py-2.5 text-sm font-bold text-on-accent transition-colors duration-(--t-quick) hover:bg-accent-hi disabled:opacity-60"
          >
            {busy === "create" ? "מנפיק…" : "הנפק קוד"}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {error && (
          <div
            role="alert"
            className="rounded-(--r-s) bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
          >
            {error}
          </div>
        )}
        {notice && !error && (
          <div className="rounded-(--r-s) bg-ok-soft px-3.5 py-2.5 text-sm text-ok">
            {notice}
          </div>
        )}
      </div>

      {invites.length === 0 ? (
        <div className="rounded-(--r-m) border border-dashed border-line-strong p-6 text-center text-sm text-fg-2">
          עוד לא הנפקת קוד. רוב המצטרפים נרשמים לבד עם גוגל — קוד נועד למי
          שאתה מכניס אישית.
        </div>
      ) : (
        <ul className="space-y-3">
          {invites.map((invite) => {
            const status = statusOf(invite);
            const working = busy === invite.id;
            return (
              <li
                key={invite.id}
                className="rounded-(--r-m) border border-line bg-raised p-4 [box-shadow:var(--raise-edge)]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-bold">{invite.label}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.cls}`}
                  >
                    {status.text}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code
                    dir="ltr"
                    className="num rounded-(--r-s) bg-sunken px-3 py-2 text-base font-bold tracking-widest text-fg"
                  >
                    {invite.code}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(invite.code)}
                    className="rounded-(--r-s) border border-line px-3 py-2 text-xs text-fg-2 transition-colors duration-(--t-quick) hover:border-line-strong hover:text-fg"
                  >
                    העתק
                  </button>
                </div>

                <p className="mt-2.5 text-xs leading-relaxed text-fg-3">
                  הונפק ב-<span className="num">{day(invite.createdAt)}</span>
                  {invite.usedAt && (
                    <>
                      {" · נוצל ב-"}
                      <span className="num">{day(invite.usedAt)}</span>
                    </>
                  )}
                  {invite.user && (
                    <>
                      {" · "}
                      <span className="num">{invite.user.sessions}</span> אימונים
                      {invite.user.lastSeenAt && (
                        <>
                          {" · נכנס לאחרונה ב-"}
                          <span className="num">{day(invite.user.lastSeenAt)}</span>
                        </>
                      )}
                    </>
                  )}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {!invite.revoked && (
                    <button
                      type="button"
                      onClick={() => reissue(invite)}
                      disabled={working}
                      className="rounded-(--r-s) border border-line px-3 py-2 text-xs text-fg-2 transition-colors duration-(--t-quick) hover:border-line-strong hover:text-fg disabled:opacity-60"
                    >
                      {working ? "מנפיק…" : "הנפק קוד חדש"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRevoked(invite, !invite.revoked)}
                    disabled={working}
                    className={`rounded-(--r-s) border px-3 py-2 text-xs transition-colors duration-(--t-quick) disabled:opacity-60 ${
                      invite.revoked
                        ? "border-line text-fg-2 hover:border-line-strong hover:text-fg"
                        : "border-transparent bg-danger-soft text-danger"
                    }`}
                  >
                    {invite.revoked ? "החזר גישה" : "בטל גישה"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

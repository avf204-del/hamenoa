"use client";

// טופס יצירת הקשר (החלטה 35, D-11). רכיב לקוח, אבל בלי שום ייבוא שרת:
// הוולידציה מגיעה מ-@/lib/feedback — מודול טהור שרץ בשני הצדדים, כך
// שהודעת השגיאה שהמשתמש רואה לפני השליחה זהה לזו שהשרת היה מחזיר.
//
// שדה `website` הוא מלכודת דבש: מוסתר מבני אדם (גודל אפס, מחוץ לסדר
// הפוקוס, aria-hidden, autoComplete off) ומולא כמעט תמיד רק ע"י בוט.
// השרת עונה לו 204 ולא שומר כלום — הבוט "מצליח" ולא מנסה שוב אחרת.

import { useState } from "react";
import { validateContact } from "@/lib/feedback";
import { useLocale } from "@/i18n/client";
import { localizeApiError } from "@/i18n/api-errors";
import type { Locale } from "@/i18n";

// הודעות הוולידציה והראוט של יצירת הקשר באנגלית; כל השאר דרך localizeApiError.
const CONTACT_ERRORS_EN: readonly [RegExp, string][] = [
  [/^השם לא תקין$/, "The name isn't valid."],
  [/^השם ארוך מדי — עד (\d+) תווים$/, "The name is too long — up to $1 characters."],
  [/^כתובת המייל לא תקינה$/, "The email address isn't valid."],
  [/^כתובת המייל ארוכה מדי — עד (\d+) תווים$/, "The email address is too long — up to $1 characters."],
  [/^כתובת המייל לא נראית תקינה$/, "The email address doesn't look valid."],
  [/^צריך לכתוב הודעה$/, "Please write a message."],
  [/^כתוב לנו עוד קצת — לפחות כמה מילים$/, "Tell us a bit more — at least a few words."],
  [/^ההודעה ארוכה מדי — עד (\d+) תווים$/, "The message is too long — up to $1 characters."],
  [/^נשלחו כבר כמה פניות מכאן\. נסה שוב בעוד (\d+) דקות\.$/, "Several messages were already sent from here. Try again in $1 minutes."],
  [/^הטופס עמוס כרגע\. נסה שוב בעוד שעה\.$/, "The form is busy right now. Try again in an hour."],
];

function contactError(message: string, locale: Locale): string {
  if (locale === "en") {
    for (const [re, en] of CONTACT_ERRORS_EN) {
      if (re.test(message)) return message.replace(re, en);
    }
  }
  return localizeApiError(message, locale);
}

const FIELD =
  "mt-1.5 w-full rounded-(--r-s) border border-line bg-sunken px-3 py-2.5 text-sm text-fg transition-colors duration-(--t-quick) focus:border-accent focus:outline-none";

export default function ContactForm() {
  const { t, locale } = useLocale();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const payload = { name, email, message, website };
    const check = validateContact(payload);
    if (check.ok === false) {
      setError(contactError(check.error, locale));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      // 204 = מלכודת הדבש. מבחינת מי שממלא את הטופס זו הצלחה רגילה.
      if (res.status === 204) {
        setSent(true);
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ? contactError(data.error, locale) : t("השליחה נכשלה. נסה שוב.", "Sending failed. Please try again."));
        return;
      }
      setSent(true);
    } catch {
      setError(t("אין חיבור לשרת.", "Can't reach the server."));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        className="mt-6 rounded-(--r-m) border border-line bg-raised p-5 text-center [box-shadow:var(--raise-edge)]"
      >
        <p className="font-bold">{t("הפנייה נשלחה. תודה.", "Your message was sent. Thank you.")}</p>
        <p className="mt-2 text-sm leading-relaxed text-fg-2">
          {t("קראנו כל מילה. אם השארת כתובת מייל — נחזור אליך.", "We read every word. If you left an email address, we'll get back to you.")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6" noValidate>
      <label htmlFor="contact-name" className="block text-sm font-semibold">
        {t("השם שלך", "Your name")}{" "}
        <span className="font-normal text-fg-3">{t("(לא חובה)", "(optional)")}</span>
      </label>
      <input
        id="contact-name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        maxLength={80}
        className={FIELD}
      />

      <label htmlFor="contact-email" className="mt-4 block text-sm font-semibold">
        {t("כתובת מייל", "Email address")}{" "}
        <span className="font-normal text-fg-3">{t("(רק אם תרצה תשובה)", "(only if you'd like a reply)")}</span>
      </label>
      <input
        id="contact-email"
        name="email"
        type="email"
        dir="ltr"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        maxLength={120}
        className={`${FIELD} text-start`}
      />

      <label htmlFor="contact-message" className="mt-4 block text-sm font-semibold">
        {t("מה רצית לספר לנו?", "What did you want to tell us?")}
      </label>
      <textarea
        id="contact-message"
        name="message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        maxLength={2000}
        className={`${FIELD} resize-y leading-relaxed`}
      />

      {/* מלכודת דבש — מוסתרת מבני אדם ומקוראי מסך כאחד */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        className="pointer-events-none absolute h-0 w-0 overflow-hidden border-0 p-0 opacity-0"
      />

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-(--r-s) bg-danger-soft px-3 py-2 text-sm leading-relaxed text-danger"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-(--r-m) bg-accent px-6 py-3.5 text-center text-base font-bold text-on-accent transition-[background-color] duration-(--t-quick) hover:bg-accent-hi disabled:opacity-60"
      >
        {busy ? t("שולח…", "Sending…") : t("שליחה", "Send")}
      </button>
    </form>
  );
}

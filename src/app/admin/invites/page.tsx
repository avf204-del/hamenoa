import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import InvitesManager from "@/components/admin/InvitesManager";
import { currentUser } from "@/lib/current-user";
import { listInvites, type InviteRow } from "@/lib/invites";

export const metadata: Metadata = { title: "הזמנות" };

// מסך ניהול — תמיד נתונים טריים מהמסד
export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  // ה-proxy כבר חוסם את /admin לכל מי שאינו בעלים; זו שכבה שנייה, במקום
  // שיש בו גישה למסד — משתמש שבוטל לא ייכנס גם אם האסימון שלו עוד בתוקף.
  const user = await currentUser();
  if (!user || user.role !== "owner") redirect("/");

  // מסד שעוד לא הוקם (dev לפני db:setup) — מצב-ריק במקום מסך שגיאה
  let invites: InviteRow[] = [];
  try {
    invites = await listInvites();
  } catch {
    invites = [];
  }

  return (
    <div className="pb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">הזמנות</h1>
        <Link href="/admin" className="text-sm text-fg-2 hover:text-fg">
          חזרה למצב ניהול
        </Link>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-fg-2">
        המסלול הראשי להצטרפות הוא הרשמה עצמית עם גוגל (החלטה 35). הקודים כאן
        הם המסלול המשני: למי שאין לו חשבון גוגל, למי שאתה רוצה להכניס אישית,
        ולפתיחה מחדש כשההרשמה סגורה.{" "}
        <strong className="font-semibold text-fg">כל קוד עובד פעם אחת.</strong>{" "}
        אם מתאמן ננעל בחוץ — ניקה את הדפדפן, החליף טלפון — הנפק לו קוד חדש
        באותה שורה: הקוד הישן מת, והוא חוזר בדיוק לאימונים ולנתונים שלו.
        הנתונים של כל אחד מבודדים לגמרי, ואף אחד לא רואה אף אחד אחר.
      </p>
      <InvitesManager initial={invites} />
    </div>
  );
}

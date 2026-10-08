import type { Metadata } from "next";
import AdminFrame from "@/components/admin/AdminFrame";
import { requireOwner } from "@/lib/current-user";

export const metadata: Metadata = { title: "מצב ניהול" };

// פריסת מצב הניהול: רחבה יותר, בלי ניווט תחתון — כלי עבודה למפתח/בעלים.
//
// **שער הבעלים לכל התת-עץ** (ביקורת סבב 37): רוב מסכי /admin קוראים
// ‏`requireOwner()` בעצמם, אבל שלושה — עורך התרגילים, המחולל והסימולטור —
// נשענו אך ורק על ה-proxy, שגוזר את התפקיד מה**אסימון החתום** (בן חודש)
// ולא מהמסד. משתמש שתפקידו הורד במסד המשיך לשאת אסימון owner ונכנס אליהם.
// השער כאן חל על כל מה שמתחת ל-/admin, וקורא ל-currentUser() הממוזער
// פר-בקשה — כך שלמסכים שכבר קוראים לו זו לא שאילתה נוספת.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwner();

  return <AdminFrame>{children}</AdminFrame>;
}

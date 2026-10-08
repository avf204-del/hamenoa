import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, cookieSecure } from "@/lib/auth";

// יציאה: מוחקים את העוגייה. הבקשה הבאה תיחסם ב-proxy ותועבר ל-/login.
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(request),
    path: "/",
    maxAge: 0,
  });
  return response;
}

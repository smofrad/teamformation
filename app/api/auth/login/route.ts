import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  STAFF_NAME_COOKIE_NAME,
  getConfiguredPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string; staffName?: string } | null;
  const submittedPassword = body?.password?.trim();

  if (!submittedPassword || submittedPassword !== getConfiguredPassword()) {
    return NextResponse.json({ message: "Invalid password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  const staffName = body?.staffName?.trim().slice(0, 60) ?? "";

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: AUTH_COOKIE_VALUE,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  response.cookies.set({
    name: STAFF_NAME_COOKIE_NAME,
    value: encodeURIComponent(staffName),
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}

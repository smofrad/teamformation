import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const AUTH_COOKIE_NAME = "conference_staff_auth";
export const STAFF_NAME_COOKIE_NAME = "conference_staff_name";
export const AUTH_COOKIE_VALUE = "staff-ok";

export function getConfiguredPassword() {
  return process.env.STAFF_ACCESS_PASSWORD?.trim() || "demo1234";
}

export async function isStaffAuthenticated() {
  const cookieStore = await cookies();

  return cookieStore.get(AUTH_COOKIE_NAME)?.value === AUTH_COOKIE_VALUE;
}

export async function requireStaffAuth() {
  const authenticated = await isStaffAuthenticated();

  if (!authenticated) {
    redirect("/login");
  }
}

export async function getStaffName() {
  const cookieStore = await cookies();
  const value = cookieStore.get(STAFF_NAME_COOKIE_NAME)?.value;

  return value ? decodeURIComponent(value) : "";
}

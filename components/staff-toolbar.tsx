"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function StaffToolbar({
  title,
  subtitle,
  showAdmin = true,
}: {
  title: string;
  subtitle: string;
  showAdmin?: boolean;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Conference check-in</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="max-w-xl text-sm text-slate-600">{subtitle}</p>
      </div>

      <div className="flex shrink-0 gap-2">
        {showAdmin ? (
          <Link className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/admin">
            Admin
          </Link>
        ) : null}
        <button className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-slate-700" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

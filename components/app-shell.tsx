"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Globe2, LayoutDashboard, Settings2, Sparkles } from "lucide-react";

import { useDemoSession } from "@/components/demo-session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "Roadmap", icon: Compass },
  { href: "/views", label: "Views", icon: Sparkles },
  { href: "/public", label: "Public", icon: Globe2 },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { name, setName } = useDemoSession();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/80 bg-background/80 backdrop-blur">
        <div className="app-frame flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Roadmap Studio</div>
            <div>
              <p className="text-sm font-semibold">Ship a roadmap people can actually read</p>
              <p className="text-sm text-muted-foreground">Fast local MVP with public sharing and import/export.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="info">Demo mode</Badge>
            <input
              defaultValue={name}
              aria-label="Demo user"
              onBlur={(event) => setName(event.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
            />
            <Button asChild variant="outline">
              <Link href="/public">Open public roadmap</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="app-frame py-8">
        <nav className="mb-8 flex gap-2 overflow-x-auto rounded-2xl border border-border bg-white/80 p-2 shadow-soft">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                  active && "bg-slate-950 text-white hover:bg-slate-950 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </div>
  );
}

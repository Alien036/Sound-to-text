"use client";

import {
  Coins,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Settings2,
  Upload,
  Users,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useBalance } from "@/lib/hooks/use-me";
import { cn } from "@/lib/utils";
import { CreditBadge, Logo } from "./common";
import { Button } from "./ui/button";

const NAV = [
  { href: "/dashboard", label: "Genel bakış", icon: LayoutDashboard },
  { href: "/upload", label: "Yeni yükleme", icon: Upload },
  { href: "/jobs", label: "İşlerim", icon: ListChecks },
  { href: "/credits", label: "Krediler", icon: Coins },
];

const ADMIN_NAV = [
  { href: "/alien", label: "Kullanıcılar & Token", icon: Users },
  { href: "/admin/jobs", label: "Tüm işler", icon: Workflow },
  { href: "/admin/pricing", label: "Fiyatlandırma", icon: Settings2 },
];

function NavLink({ href, label, icon: Icon }: (typeof NAV)[number]) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon className={cn("size-4", active && "text-brand-300")} />
      {label}
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const showAdminNav = isAdmin || pathname.startsWith("/alien") || pathname.startsWith("/admin");
  return (
    <div className="flex h-full flex-col bg-ink-900 px-4 py-5" onClick={(e) => {
      if ((e.target as HTMLElement).closest("a")) onNavigate?.();
    }}>
      <Logo light className="px-2" />

      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((n) => (
          <NavLink key={n.href} {...n} />
        ))}
      </nav>

      {showAdminNav && (
        <>
          <p className="mb-2 mt-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Yönetim
          </p>
          <nav className="flex flex-col gap-1">
            {ADMIN_NAV.map((n) => (
              <NavLink key={n.href} {...n} />
            ))}
          </nav>
        </>
      )}

      <div className="mt-auto rounded-2xl bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-500 text-sm font-semibold text-white">
            {(user?.displayName ?? user?.email ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.displayName ?? "Hesabım"}</p>
            <p className="truncate text-xs text-ink-400">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            title="Çıkış yap"
            className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { balance } = useBalance();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            <Sidebar onNavigate={() => setOpen(false)} />
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-1.5 text-ink-300 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-100 bg-ink-50/80 px-4 backdrop-blur sm:px-8">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
          <Menu />
        </Button>
        <Logo className="lg:hidden" />
        <div className="ml-auto flex items-center gap-3">
          <CreditBadge balance={balance} />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/upload">
              <Upload /> Yükle
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}

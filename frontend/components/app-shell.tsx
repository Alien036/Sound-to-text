"use client";

import {
  Coins,
  KeyRound,
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
import { AnimatePresence, motion, SPRING_SNAPPY } from "./ui/motion";

const NAV = [
  { href: "/dashboard", label: "Genel bakış", icon: LayoutDashboard },
  { href: "/upload", label: "Yeni yükleme", icon: Upload },
  { href: "/jobs", label: "İşlerim", icon: ListChecks },
  { href: "/credits", label: "Krediler", icon: Coins },
];

const ADMIN_NAV = [
  { href: "/alien", label: "Kullanıcılar & Token", icon: Users },
  { href: "/admin/keys", label: "Lisans anahtarları", icon: KeyRound },
  { href: "/admin/jobs", label: "Tüm işler", icon: Workflow },
  { href: "/admin/pricing", label: "Fiyatlandırma", icon: Settings2 },
];

function NavLink({
  href,
  label,
  icon: Icon,
  pillId,
}: (typeof NAV)[number] & { pillId: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
        active ? "text-brand-700" : "text-ink-500 hover:text-ink-900",
      )}
    >
      {active && (
        <motion.span
          layoutId={pillId}
          transition={SPRING_SNAPPY}
          className="absolute inset-0 -z-10 rounded-xl bg-brand-50/90 ring-1 ring-inset ring-brand-200/60"
        />
      )}
      <Icon
        className={cn(
          "size-4 transition-transform duration-200 group-hover:scale-110",
          active ? "text-brand-500" : "text-ink-400 group-hover:text-ink-700",
        )}
      />
      <span className="transition-transform duration-200 group-hover:translate-x-0.5">{label}</span>
    </Link>
  );
}

function Sidebar({
  pillId,
  onNavigate,
}: {
  pillId: string;
  onNavigate?: () => void;
}) {
  const { user, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const showAdminNav = isAdmin || pathname.startsWith("/alien") || pathname.startsWith("/admin");

  return (
    <div
      className="flex h-full flex-col border-r border-ink-200/60 bg-white/95 px-4 py-5 backdrop-blur-xl"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) onNavigate?.();
      }}
    >
      <Logo className="px-2" />

      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((n) => (
          <NavLink key={n.href} {...n} pillId={pillId} />
        ))}
      </nav>

      {showAdminNav && (
        <>
          <p className="mb-2 mt-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Yönetim
          </p>
          <nav className="flex flex-col gap-1">
            {ADMIN_NAV.map((n) => (
              <NavLink key={n.href} {...n} pillId={pillId} />
            ))}
          </nav>
        </>
      )}

      <div className="mt-auto rounded-2xl border border-ink-200/60 bg-ink-50/40 p-3 transition-colors hover:bg-ink-50/80">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-semibold text-white shadow-xs shadow-brand-500/25">
            {(user?.displayName ?? user?.email ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">{user?.displayName ?? "Hesabım"}</p>
            <p className="truncate text-xs text-ink-400">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            title="Çıkış yap"
            className="cursor-pointer rounded-lg p-2 text-ink-400 transition-all hover:bg-white hover:text-ink-900 hover:shadow-xs"
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
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 lg:block">
        <Sidebar pillId="sidebar-desktop" />
      </aside>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="absolute inset-y-0 left-0 w-72 shadow-2xl shadow-ink-900/15"
            >
              <Sidebar pillId="sidebar-mobile" onNavigate={() => setOpen(false)} />
              <button
                onClick={() => setOpen(false)}
                className="absolute right-3 top-5 cursor-pointer rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-900"
              >
                <X className="size-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200/50 bg-white/75 px-4 backdrop-blur-xl sm:px-8">
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

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8"
      >
        {children}
      </motion.main>
    </div>
  );
}

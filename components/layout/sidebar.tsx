"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart2,
  Beaker,
  CalendarDays,
  ChevronDown,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Microscope,
  Package,
  Receipt,
  Scan,
  Settings,
  ShoppingCart,
  Stethoscope,
  Users,
  X,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CpUser, UserRole } from "@/types/index";

// ─── Nav configuration ────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "OPD",
    items: [
      { label: "OPD Dashboard", href: "/opd", icon: Activity },
      { label: "Patients", href: "/opd/patients", icon: Users },
      { label: "Doctors", href: "/opd/doctors", icon: Stethoscope },
      { label: "Visit Log", href: "/opd/visits", icon: CalendarDays },
    ],
  },
  {
    label: "Pharmacy",
    items: [
      { label: "Inventory", href: "/pharmacy/inventory", icon: Package },
      { label: "Sales", href: "/pharmacy/sales", icon: ShoppingCart },
    ],
  },
  {
    label: "Laboratory",
    items: [
      { label: "Overview", href: "/lab", icon: FlaskConical },
      { label: "Tests", href: "/lab/tests", icon: FlaskConical },
      { label: "Catalog", href: "/lab/catalog", icon: Beaker },
      { label: "Chemicals", href: "/lab/chemicals", icon: Beaker },
      { label: "Equipment", href: "/lab/equipment", icon: Microscope },
      { label: "Expenses", href: "/lab/expenses", icon: Receipt },
      { label: "Reports", href: "/lab/reports", icon: BarChart2 },
    ],
  },
  {
    label: "X-Ray",
    items: [
      { label: "Overview", href: "/xray", icon: Scan },
      { label: "Revenue", href: "/xray/revenue", icon: Zap },
      { label: "Partners", href: "/xray/partners", icon: Users },
      { label: "Expenses", href: "/xray/expenses", icon: Receipt },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Expenses", href: "/expenses", icon: Receipt },
      { label: "Payments", href: "/payments", icon: CreditCard },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "All Reports", href: "/reports", icon: BarChart2 },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        adminOnly: true,
      },
    ],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  userRole: UserRole;
  user?: Pick<CpUser, "full_name" | "email" | "role">;
  onClose?: () => void;
  mobile?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar({ userRole, user, onClose, mobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = user
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() ?? "")
        .join("")
    : "U";

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header — logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 group"
          onClick={onClose}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 transition-all group-hover:bg-primary/15 overflow-hidden">
            <Image src="/logo.jpeg" alt="Pulse" width={32} height={32} className="w-full h-full object-cover" priority />
          </div>
          <div>
            <p className="text-foreground font-bold text-sm tracking-tight leading-none">Pulse</p>
            <p className="text-primary/70 text-[10px] mt-0.5 font-semibold tracking-[0.15em] uppercase">Pulse of Your Business</p>
          </div>
        </Link>

        {mobile && onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.adminOnly || userRole === "admin"
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="mb-4">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-border hover:text-foreground"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" />
                        )}
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer — user info + logout */}
      <div className="border-t border-sidebar-border px-3 py-3">
        {user ? (
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>

            {/* Name + email */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground leading-tight">
                {user.full_name}
              </p>
              <p className="truncate text-[10px] capitalize text-muted-foreground leading-tight">
                {user.role}
              </p>
            </div>

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-border hover:text-destructive"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="text-center text-[10px] text-muted-foreground/50">
            ClinicPulse v1.0
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Collapsible nav group (optional utility) ─────────────────────────────────

interface SidebarNavGroupProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarNavGroup({
  label,
  children,
  defaultOpen = true,
}: SidebarNavGroupProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        {label}
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{children}</div>}
    </div>
  );
}

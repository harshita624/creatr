"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2, CalendarDays, Clapperboard, DollarSign,
  FileText, Kanban, LayoutDashboard, Menu,
  PenTool, Radio, Settings, TrendingUp,
  Users, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";

const NAV_ITEMS = [
  { title: "Dashboard",     href: "/dashboard",              icon: LayoutDashboard          },
  { title: "Create Post",   href: "/dashboard/create",       icon: PenTool,   badge: "draft" },
  { title: "My Posts",      href: "/dashboard/posts",        icon: FileText                  },
  { title: "Workspace",     href: "/dashboard/workspace",    icon: Kanban                    },
  { title: "Calendar",      href: "/dashboard/calendar",     icon: CalendarDays              },
  { title: "Trends",        href: "/dashboard/trends",       icon: TrendingUp                },
  { title: "Media Studio",  href: "/dashboard/media",        icon: Radio                     },
  { title: "Monetization",  href: "/dashboard/monetization", icon: DollarSign                },
  { title: "Followers",     href: "/dashboard/followers",    icon: Users                     },
  { title: "Community",     href: "/dashboard/community",    icon: Users                     },
];

const QUICK_LINKS = [
  { title: "Feed",  href: "/feed",  icon: LayoutDashboard },
  { title: "Reels", href: "/reels", icon: Clapperboard    },
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: draftPost } = useConvexQuery(api.posts.getUserDraft);

  // Guards the Clerk UserButton so it only renders client-side, after
  // hydration has completed. Clerk's UserButton needs auth/session state
  // that doesn't exist yet during SSR, which is what was causing the
  // hydration mismatch. Rendering an identical, static placeholder until
  // `mounted` flips true guarantees the server HTML and the client's first
  // paint match exactly — the swap to the real UserButton then happens as
  // a normal post-hydration re-render, not during hydration itself.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const isActive = (href) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <div className="creator-shell">
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-full w-[272px] flex-col",
          "border-r border-white/70 bg-white/90 shadow-[4px_0_32px_rgba(94,72,112,0.12)]",
          "backdrop-blur-2xl",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-300 via-rose-300 to-violet-300 shadow-md shadow-orange-200/60 transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="CreateK" className="h-full w-full rounded-xl" />
            </div>
            <div>
              <p className="text-base font-black bg-gradient-to-r from-orange-500 via-rose-500 to-violet-500 bg-clip-text text-transparent leading-none">
                CreateK
              </p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Creator workspace</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 no-scrollbar">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 will-change-transform",
                    active
                      ? "bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300 text-white shadow-md shadow-rose-200/40"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}>
                    <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-slate-400")} />
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.badge === "draft" && draftPost && (
                      <Badge className="ml-auto border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-bold text-amber-700">
                        Draft
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick links */}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Public</p>
            {QUICK_LINKS.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                  <item.icon className="h-4 w-4 shrink-0 text-slate-400" />
                  {item.title}
                </div>
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 p-3">
          <Link href="/dashboard/settings">
            <div className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
              isActive("/dashboard/settings")
                ? "bg-gradient-to-r from-orange-300 to-violet-300 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}>
              <Settings className="h-4 w-4 shrink-0 text-slate-400" />
              Settings
            </div>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-10 flex min-h-screen flex-col ml-0 lg:ml-[272px]">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-[56px] shrink-0 items-center justify-between gap-3 border-b border-white/60 bg-white/85 px-4 shadow-sm backdrop-blur-xl lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/feed"
            className="hidden flex-1 max-w-lg items-center gap-2.5 rounded-2xl bg-slate-100/80 px-4 py-2 text-sm text-slate-400 hover:bg-white hover:text-slate-700 hover:shadow-sm transition-all duration-200 sm:flex"
          >
            <BarChart2 className="h-4 w-4 shrink-0" />
            <span>Search the feed, creators, and trends</span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="text-sm font-black bg-gradient-to-r from-orange-500 to-violet-500 bg-clip-text text-transparent lg:hidden">
              CreateK
            </span>
            {mounted ? (
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8 ring-2 ring-orange-200 ring-offset-1 hover:ring-violet-300 transition-all",
                  },
                }}
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-8 w-8 rounded-full bg-slate-200 ring-2 ring-orange-200 ring-offset-1 animate-pulse"
              />
            )}
          </div>
        </header>

        <main className="flex-1 page-enter">{children}</main>
      </div>
    </div>
  );
}
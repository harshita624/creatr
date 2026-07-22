"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Authenticated, Unauthenticated } from "convex/react";
import { useQuery } from "convex/react";
import { UserButton, SignInButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import {
  Bell, Clapperboard, Home,
  LayoutDashboard, MessageCircle, PlusSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationsPanel from "./notifications-panel";

export default function FeedNav() {
  const pathname          = usePathname();
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = useQuery(api.notifications.getUnreadCount) ?? 0;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#dbdbdb] bg-white">
        <div className="mx-auto flex h-[56px] max-w-[975px] items-center justify-between px-4">

          {/* Logo */}
          <Link href="/feed" className="shrink-0 transition-opacity hover:opacity-80">
            <span className="text-xl font-black italic bg-gradient-to-r from-orange-500 via-rose-500 to-violet-600 bg-clip-text text-transparent select-none">
              CreateK
            </span>
          </Link>

          {/* Center nav — desktop only */}
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "/feed",             icon: Home,         label: "Home"   },
              { href: "/reels",            icon: Clapperboard, label: "Reels"  },
              { href: "/dashboard/create", icon: PlusSquare,   label: "Create" },
            ].map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} title={label}
                  className="group relative flex h-[56px] w-[56px] items-center justify-center transition-colors hover:bg-slate-50">
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-all duration-150",
                      active ? "text-[#262626]" : "text-[#737373] group-hover:text-[#262626]"
                    )}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  {active && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[#262626]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-1">
            <Authenticated>
              {/* Studio button — visible on ALL screen sizes */}
              <Link href="/dashboard"
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-slate-700 hover:scale-[1.02] active:scale-[0.98]">
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Studio</span>
              </Link>

              {/* Message icon */}
              <button className="hidden items-center justify-center h-[44px] w-[44px] rounded-xl text-[#262626] transition-colors hover:bg-slate-100 sm:flex">
                <MessageCircle className="h-[22px] w-[22px]" />
              </button>

              {/* Bell with badge */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifs((v) => !v)}
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-xl text-[#262626] transition-colors hover:bg-slate-100"
                  aria-label="Notifications"
                >
                  <Bell className="h-[22px] w-[22px]" />
                  {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <NotificationsPanel onClose={() => setShowNotifs(false)} />
                )}
              </div>

              {/* Avatar */}
              <div className="ml-1">
                <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
              </div>
            </Authenticated>

            <Unauthenticated>
              <SignInButton mode="modal">
                <button className="rounded-xl bg-[#0095f6] px-4 py-1.5 text-sm font-bold text-white transition-all hover:bg-[#1877f2] hover:scale-[1.02] active:scale-[0.98]">
                  Log in
                </button>
              </SignInButton>
            </Unauthenticated>
          </div>

        </div>
      </header>
      {/* Click-away overlay for notifications */}
      {showNotifs && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifs(false)}
        />
      )}
    </>
  );
}
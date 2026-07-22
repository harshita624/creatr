"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Compass, Home, PlusSquare, User } from "lucide-react";
import { Authenticated } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const me = useQuery(api.users.getCurrentUser);

  const items = [
    {
      href: "/feed",
      icon: Home,
      label: "Home",
      active: pathname === "/feed",
    },
    {
      href: "/reels",
      icon: Clapperboard,
      label: "Reels",
      active: pathname === "/reels",
    },
    {
      href: "/dashboard/create",
      icon: PlusSquare,
      label: "Create",
      isCreate: true,
      active: pathname.startsWith("/dashboard/create"),
    },
    {
      href: "/dashboard/trends",
      icon: Compass,
      label: "Explore",
      active: pathname.startsWith("/dashboard/trends"),
    },
    {
      href: me?.username ? `/${me.username}` : "/dashboard/settings",
      icon: User,
      label: "Profile",
      active: !!me?.username && pathname === `/${me.username}`,
    },
  ];

  return (
    <Authenticated>
      <nav
        className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-100 bg-white sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-14 items-center justify-around px-2">
          {items.map(({ href, icon: Icon, label, active, isCreate }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-1 flex-col items-center justify-center h-full gap-0.5"
            >
              {isCreate ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-violet-500">
                  <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
                </div>
              ) : (
                <Icon
                  className={`h-6 w-6 transition-all duration-150 ${
                    active ? "text-slate-900 scale-110" : "text-slate-400"
                  }`}
                  strokeWidth={active ? 2.5 : 1.8}
                  fill={active && !isCreate ? "currentColor" : "none"}
                />
              )}
            </Link>
          ))}
        </div>
      </nav>
    </Authenticated>
  );
}
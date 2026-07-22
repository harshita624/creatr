"use client"
import { useStoreUser } from "@/hooks/use-store-user";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { BarLoader } from "react-spinners";
import { Button } from "./ui/button";
import { LayoutDashboard, Search, Sparkles } from "lucide-react";

// Known static top-level routes that are NOT a dynamic /[username] page.
// If you add new static top-level pages later (e.g. /settings, /explore),
// add their first path segment here too — otherwise, if that page ever grows
// a sub-route (e.g. /settings/billing), it'll be mistaken for a post-detail
// page below and have its floating header hidden incorrectly.
const STATIC_FIRST_SEGMENTS = [
  "dashboard", "reels", "feed",
  "check-price", "contribute", "bargain", "scam-check", "translate",
  "auth",
];

const Header = () => {
  const { isLoading, isAuthenticated } = useStoreUser();
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const segments = path.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const isDynamicUserRoute = firstSegment && !STATIC_FIRST_SEGMENTS.includes(firstSegment);

  // Hide the floating pill on dashboard, reels, AND feed
  // (feed has its own Instagram-style FeedNav)
  //
  // ALSO hide it on individual post pages: /[username]/[postId]
  // (exactly 2 segments, first segment isn't a known static route) —
  // that page builds its own sticky Instagram-style header (back arrow,
  // title, share button), same situation as feed/reels above.
  //
  // Profile pages (/[username] — exactly 1 segment) are intentionally NOT
  // hidden here: that page has no header of its own and already reserves
  // space for this floating pill via `pt-24` on its content wrapper.
  if (
    path.includes("/dashboard") ||
    path.startsWith("/reels") ||
    path.startsWith("/feed") ||
    (isDynamicUserRoute && segments.length === 2)
  ) {
    return null;
  }

  return (
    <header className="fixed top-3 sm:top-5 left-1/2 transform -translate-x-1/2 z-50 w-full sm:w-[92%] lg:w-[82%] xl:w-[74%] px-2 sm:px-4 transition-all duration-300">
      <div
        className={`
          backdrop-blur-2xl bg-white/82 
          border border-white/80 hover:border-orange-200
          rounded-[1.75rem] px-4 sm:px-5 md:px-7 py-2.5 sm:py-3
          flex items-center justify-between gap-2 
          shadow-[0_18px_60px_rgba(94,72,112,0.14)]
          hover:shadow-[0_24px_70px_rgba(94,72,112,0.18)]
          transition-all duration-500 ease-out
          ${scrolled ? "bg-white/90 shadow-xl" : "bg-white/85"}
          relative overflow-hidden group
        `}
      >
        {/* Hover shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-100/0 via-rose-100/40 to-cyan-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-violet-300/20 to-transparent" />

        {/* Logo */}
        <Link href={isAuthenticated ? "/feed" : "/"} className="flex-shrink-0 relative group/logo">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-300 to-violet-300 blur-xl rounded-full opacity-0 group-hover/logo:opacity-50 transition-opacity duration-300" />
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-orange-300 via-rose-300 to-violet-300 flex items-center justify-center shadow-lg shadow-orange-200 group-hover/logo:shadow-xl transition-all duration-300 group-hover/logo:scale-105">
              <img src="/logo.png" alt="CreateK logo" className="rounded-full" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-orange-500 via-rose-500 to-violet-500 bg-clip-text text-transparent">
                CreateK
              </h1>
            </div>
          </div>
        </Link>

        {/* Search bar */}
        <Link
          href="/feed"
          className="hidden md:flex max-w-md flex-1 items-center gap-3 rounded-2xl bg-slate-100/80 px-4 py-2.5 text-sm text-slate-500 hover:bg-white hover:text-slate-800"
        >
          <Search className="h-4 w-4" />
          Search creators, posts, and trends
        </Link>

        {/* Landing page nav links */}
        {path === "/" && (
          <div className="hidden lg:flex space-x-6 justify-center">
            {["Features", "Testimonials"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="relative text-gray-700 font-semibold text-sm transition-all duration-300 hover:text-orange-600 group/link"
              >
                <span className="relative z-10">{item}</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-400 via-rose-400 to-violet-400 group-hover/link:w-full transition-all duration-300 rounded-full" />
              </Link>
            ))}
          </div>
        )}

        {/* Auth buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-shrink-0 relative z-10">
          <Authenticated>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/dashboard" className="group/dash">
                <Button
                  variant="outline"
                  size="sm"
                  className="quiet-button hidden sm:flex items-center px-3 sm:px-4 font-semibold"
                >
                  <LayoutDashboard className="h-4 w-4 mr-1.5 sm:mr-2 transition-transform duration-300 group-hover/dash:rotate-12" />
                  <span className="hidden md:inline text-sm font-bold">Dashboard</span>
                </Button>
              </Link>
              <div className="relative group/user">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-fuchsia-400 blur-lg rounded-full opacity-0 group-hover/user:opacity-30 transition-opacity duration-300" />
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox:
                        "w-9 h-9 sm:w-10 sm:h-10 ring-2 ring-orange-200 ring-offset-2 ring-offset-white hover:ring-violet-300 transition-all duration-300",
                    },
                  }}
                />
              </div>
            </div>
          </Authenticated>

          <Unauthenticated>
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs sm:text-sm px-3 sm:px-4 text-gray-700 hover:text-orange-700 hover:bg-orange-50 backdrop-blur-sm border border-transparent hover:border-orange-200 transition-all duration-300 font-semibold rounded-xl"
              >
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button
                size="sm"
                className="soft-button relative whitespace-nowrap text-xs sm:text-sm px-4 sm:px-5 border-0 font-bold group/signup overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover/signup:translate-x-[100%] transition-transform duration-700" />
                <Sparkles className="h-3.5 w-3.5 mr-1.5 inline-block group-hover/signup:rotate-180 transition-transform duration-500" />
                <span className="relative z-10">Get Started</span>
              </Button>
            </SignUpButton>
          </Unauthenticated>
        </div>

        {/* Loading bar */}
        {isLoading && (
          <div className="fixed bottom-0 left-0 w-full z-40 flex justify-center">
            <div className="w-[95%] h-1.5 bg-violet-100 rounded-full overflow-hidden backdrop-blur-sm shadow-lg">
              <BarLoader width="100%" color="#8B5CF6" height={6} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
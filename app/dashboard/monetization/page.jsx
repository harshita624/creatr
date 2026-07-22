"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BadgeDollarSign, CheckCircle2, CreditCard,
  Gift, HandCoins, Loader2, Package,
  RefreshCw, ShieldCheck, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { toast } from "sonner";

const tools = [
  { title: "Memberships",    icon: Users,      text: "Offer members-only posts, live rooms, and community access." },
  { title: "Tips",           icon: Gift,        text: "Let fans support your best work with one-time donations."   },
  { title: "Paid posts",     icon: CreditCard,  text: "Mark premium articles, videos, or downloads as paid.",   live: true },
  { title: "Digital products",icon: Package,    text: "Prepare ebooks, templates, presets, and guides for sale." },
  { title: "Sponsors",       icon: HandCoins,   text: "Track sponsored posts and brand collaboration ideas."      },
  { title: "Creator safety", icon: ShieldCheck, text: "Keep comments, access, and paid content controlled."       },
];

export default function MonetizationPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MonetizationPageContent />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
    </div>
  );
}

function MonetizationPageContent() {
  const searchParams = useSearchParams();

  const { data: analytics } = useConvexQuery(api.dashboard.getAnalytics);

  // Safely query payments — will return null/undefined if function doesn't exist yet
  const { data: account, isLoading: accountLoading, error: accountError } =
    useConvexQuery(api.payments.getConnectedAccount);

  const [connecting,     setConnecting]     = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [liveStatus,     setLiveStatus]     = useState(null);

  const revenueEstimate = Math.round(
    ((analytics?.totalFollowers || 0) * 29) +
    ((analytics?.totalViews    || 0) * 0.012)
  );

  const refreshStatus = async () => {
    setCheckingStatus(true);
    try {
      const res  = await fetch("/api/stripe/connect/status");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not check status");
      setLiveStatus(data);
    } catch (err) {
      toast.error(err.message || "Could not check Stripe status");
    } finally { setCheckingStatus(false); }
  };

  useEffect(() => {
    if (account?.stripeAccountId) refreshStatus();
  }, [account?.stripeAccountId]);

  useEffect(() => {
    if (searchParams.get("onboarded") === "true") {
      toast.success("Stripe onboarding updated — checking your status…");
      refreshStatus();
    }
  }, [searchParams]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res  = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start onboarding");
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.message || "Could not start Stripe onboarding");
      setConnecting(false);
    }
  };

  const chargesEnabled  = liveStatus?.chargesEnabled  ?? account?.chargesEnabled  ?? false;
  const payoutsEnabled  = liveStatus?.payoutsEnabled  ?? account?.payoutsEnabled  ?? false;
  const isFullyConnected= chargesEnabled && payoutsEnabled;

  // Stripe not configured
  const stripeUnconfigured = !process.env.NEXT_PUBLIC_APP_URL ||
    (accountError?.message || "").includes("not configured");

  return (
    <div className="space-y-4 p-4 lg:space-y-6 lg:p-8">

      {/* Header */}
      <section className="app-panel overflow-hidden p-5 md:p-7 lg:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 via-orange-300 to-violet-300" />
        <p className="section-label">Creator income</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
              Monetization center
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Connect a payout account and start earning from your content through
              memberships, tips, paid posts, and digital products.
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <BadgeDollarSign className="h-5 w-5 text-emerald-500" />
              Estimated monthly potential
            </div>
            <div className="mt-2 text-4xl font-black text-slate-950">
              ${revenueEstimate.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-slate-500">Based on your followers and views.</p>
          </div>
        </div>
      </section>

      {/* Stripe Connect panel */}
      <section className="app-panel p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Payouts</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Stripe Connect</h2>
            <p className="mt-1 text-sm text-slate-500">
              Connect your Stripe account to receive payments directly.
            </p>
          </div>

          {accountLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          ) : stripeUnconfigured ? (
            <span className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-500">
              Configure Stripe in .env.local to enable payouts
            </span>
          ) : !account ? (
            <Button onClick={handleConnect} disabled={connecting} className="soft-button shrink-0">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Connect with Stripe
            </Button>
          ) : isFullyConnected ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Connected and ready
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
                Setup incomplete
              </span>
              <Button onClick={handleConnect} disabled={connecting} className="soft-button">
                {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
                Finish setup
              </Button>
            </div>
          )}
        </div>

        {account && (
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
            <button onClick={refreshStatus} disabled={checkingStatus}
              className="inline-flex items-center gap-1.5 hover:text-orange-600 transition-colors">
              {checkingStatus
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh status
            </button>
            <span className="text-slate-200">·</span>
            <span>
              Charges {chargesEnabled ? "✓ enabled" : "not yet enabled"} ·
              Payouts {payoutsEnabled  ? "✓ enabled" : "not yet enabled"}
            </span>
          </div>
        )}
      </section>

      {/* Tools grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map(({ title, icon: Icon, text, live }) => (
          <div key={title} className="soft-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                <Icon className="h-5 w-5 text-orange-500" />
              </div>
              {live && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  Live
                </span>
              )}
            </div>
            <h2 className="font-bold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <section className="app-panel p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Start with a paid post</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a post and set Access to "Paid post" in post settings.
              {!isFullyConnected && " Finish Stripe setup above before buyers can check out."}
            </p>
          </div>
          <Link href="/dashboard/create">
            <Button className="soft-button shrink-0">Create paid post</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
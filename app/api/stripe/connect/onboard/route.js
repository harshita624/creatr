import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Pinned so upgrading the stripe package later doesn't silently change
// behavior — bump intentionally if you want newer API features.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export async function POST() {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  try {
    const token = await getToken({ template: "convex" });
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    convex.setAuth(token);

    const user = await currentUser();
    const existing = await convex.query(api.payments.getConnectedAccount);

    let stripeAccountId = existing?.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user?.emailAddresses?.[0]?.emailAddress,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      await convex.mutation(api.payments.setConnectedAccount, {
        stripeAccountId,
        status: "pending",
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/dashboard/monetization?refresh=true`,
      return_url: `${appUrl}/dashboard/monetization?onboarded=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Stripe onboarding error:", error);
    return NextResponse.json({ error: error.message || "Could not start onboarding" }, { status: 500 });
  }
}
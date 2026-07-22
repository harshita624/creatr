import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  // request.text() gives the raw body — App Router route handlers don't
  // auto-parse JSON, so this is already exactly what Stripe's signature
  // check needs, no special config required.
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const postId = session.metadata?.postId;
        const sellerId = session.metadata?.sellerId;
        const buyerUserId = session.metadata?.buyerUserId || undefined;

        if (postId && sellerId) {
          await convex.mutation(api.payments.recordPurchase, {
            postId,
            sellerId,
            buyerUserId,
            buyerEmail: session.customer_email || undefined,
            amountCents: session.amount_total || 0,
            currency: session.currency || "usd",
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent || undefined,
          });
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object;
        await convex.mutation(api.payments.syncAccountStatusByStripeId, {
          stripeAccountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        });
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handling error:", error);
    // Still ack with 200 so Stripe doesn't retry forever on our own bug —
    // the error above is logged for you to follow up on manually.
  }

  return NextResponse.json({ received: true });
}
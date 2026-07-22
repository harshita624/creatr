import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

// Demo default — the platform's cut of every paid post. Adjust freely.
const PLATFORM_FEE_PERCENT = 10;

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { postId, returnPath } = body;
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

    const { userId, getToken } = await auth();
    let buyerEmail;
    let buyerUserId;
    if (userId) {
      const token = await getToken({ template: "convex" });
      convex.setAuth(token);
      const user = await currentUser();
      buyerEmail = user?.emailAddresses?.[0]?.emailAddress;
      const convexUser = await convex.query(api.users.getCurrentUser);
      buyerUserId = convexUser?._id;
    }

    const post = await convex.query(api.payments.getPostForCheckout, { postId });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (post.monetization !== "paid" || !post.priceCents) {
      return NextResponse.json({ error: "This post is not for sale" }, { status: 400 });
    }

    const sellerAccount = await convex.query(api.payments.getConnectedAccountForUser, {
      userId: post.authorId,
    });
    if (!sellerAccount?.chargesEnabled) {
      return NextResponse.json({ error: "The creator hasn't finished setting up payouts yet" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const fallbackPath = returnPath || "/dashboard";
    const applicationFeeAmount = Math.round(post.priceCents * (PLATFORM_FEE_PERCENT / 100));

    const metadata = { postId, sellerId: post.authorId };
    if (buyerUserId) metadata.buyerUserId = buyerUserId;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: buyerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: post.title },
            unit_amount: post.priceCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: sellerAccount.stripeAccountId },
      },
      success_url: `${appUrl}${fallbackPath}?purchase=success`,
      cancel_url: `${appUrl}${fallbackPath}?purchase=cancelled`,
      metadata,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: error.message || "Could not start checkout" }, { status: 500 });
  }
}
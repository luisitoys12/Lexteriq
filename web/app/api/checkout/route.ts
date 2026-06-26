// ============================================================
// LEXTERIQ — API Route: /api/checkout
// Crea sesión de Stripe Checkout y redirige
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const priceId = searchParams.get('priceId');
  const promo = searchParams.get('promo');

  if (!priceId) {
    return NextResponse.json({ error: 'priceId requerido' }, { status: 400 });
  }

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: { trial_period_days: 14 },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://lexteriq.vercel.app'}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://lexteriq.vercel.app'}/pricing?checkout=cancelled`,
      allow_promotion_codes: !promo,
    };

    if (promo) {
      const codes = await stripe.promotionCodes.list({ code: promo, active: true, limit: 1 });
      if (codes.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: codes.data[0].id }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.redirect(session.url!);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

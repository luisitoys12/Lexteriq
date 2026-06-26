// ============================================================
// LEXTERIQ — Supabase Edge Function: stripe-webhook
// Maneja eventos de Stripe y actualiza planes en Supabase
// Deploy: supabase functions deploy stripe-webhook
// Webhook URL: https://<project>.supabase.co/functions/v1/stripe-webhook
// Eventos a registrar en Stripe:
//   - customer.subscription.created
//   - customer.subscription.updated
//   - customer.subscription.deleted
//   - invoice.payment_succeeded
//   - invoice.payment_failed
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

function getPlanFromPriceId(priceId: string): string {
  const priceMap: Record<string, string> = {
    'price_1TmipuHNJduuEGube7oqZDwi': 'pro',
    'price_1Tmiq3HNJduuEGubcXxpL8CR': 'pro',
    'price_1TmiqAHNJduuEGub27cdZt8s': 'business',
    'price_1TmiqHHNJduuEGuba4mzAlef': 'business',
  };
  return priceMap[priceId] || 'free';
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEventAsync
      ? await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET)
      : stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature inválida:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabaseUserId = (event.data.object as any)?.metadata?.supabase_user_id;

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price?.id;
      const plan = getPlanFromPriceId(priceId);
      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;

      if (supabaseUserId) {
        await supabase.from('users').update({
          plan,
          stripe_subscription_id: sub.id,
          trial_ends_at: trialEnd,
          updated_at: new Date().toISOString(),
        }).eq('id', supabaseUserId);
      }
      console.log(`✅ Suscripción ${event.type}: user=${supabaseUserId}, plan=${plan}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      if (supabaseUserId) {
        await supabase.from('users').update({
          plan: 'free',
          stripe_subscription_id: null,
          trial_ends_at: null,
          updated_at: new Date().toISOString(),
        }).eq('id', supabaseUserId);
      }
      console.log(`❌ Suscripción cancelada: user=${supabaseUserId}`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn(`⚠️ Pago fallido: customer=${invoice.customer}, amount=${invoice.amount_due}`);
      // TODO: enviar email de aviso con Resend/Sendgrid
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`💰 Pago exitoso: customer=${invoice.customer}, amount=${invoice.amount_paid}`);
      break;
    }

    default:
      console.log(`Evento no manejado: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});

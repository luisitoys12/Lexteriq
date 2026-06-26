// ============================================================
// LEXTERIQ — Supabase Edge Function: create-checkout
// Crea una sesión de Stripe Checkout segura desde el servidor
// Deploy: supabase functions deploy create-checkout
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar usuario autenticado
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { price_id, promo_code } = await req.json();

    // Obtener o crear customer de Stripe
    let { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single();

    let customerId = userData?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData?.email || user.email!,
        name: userData?.full_name,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    // Construir parámetros del checkout
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_user_id: user.id },
      },
      success_url: `https://lexteriq.com/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://lexteriq.com/pricing?checkout=cancelled`,
      metadata: { supabase_user_id: user.id },
      allow_promotion_codes: true,  // Permite que el usuario ingrese códigos
    };

    // Si viene promo code específico, lo preaplica
    if (promo_code) {
      const promoCodes = await stripe.promotionCodes.list({ code: promo_code, active: true });
      if (promoCodes.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
        delete sessionParams.allow_promotion_codes;
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: checkoutSession.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

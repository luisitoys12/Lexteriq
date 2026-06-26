// ============================================================
// LEXTERIQ — Stripe Service
// Maneja checkout, webhooks y verificación de suscripciones
// ============================================================
import { supabase } from '../config/supabase.js';
import { STRIPE_CONFIG } from '../config/stripe.js';

/**
 * Crea una sesión de Checkout de Stripe para un plan dado
 * Se llama desde el background script o desde la web app
 */
export async function createCheckoutSession({ userId, priceId, promoCode = null }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Usuario no autenticado');

  const body = {
    user_id: userId,
    price_id: priceId,
    ...(promoCode && { promo_code: promoCode }),
  };

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body,
  });

  if (error) throw new Error(`Error creando checkout: ${error.message}`);
  return data; // { url: 'https://checkout.stripe.com/...' }
}

/**
 * Verifica el plan activo de un usuario consultando Supabase
 * (Supabase se actualiza via webhook de Stripe)
 */
export async function getUserPlan(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('plan, trial_ends_at, stripe_subscription_id, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (error) return { plan: 'free', limits: STRIPE_CONFIG.planLimits.free };

  const plan = data.plan || 'free';
  const limits = STRIPE_CONFIG.planLimits[plan] || STRIPE_CONFIG.planLimits.free;

  // Verificar si trial sigue activo
  if (data.trial_ends_at) {
    const trialEnd = new Date(data.trial_ends_at);
    const isTrialActive = trialEnd > new Date();
    return { plan, limits, trial_active: isTrialActive, trial_ends_at: data.trial_ends_at };
  }

  return { plan, limits, trial_active: false };
}

/**
 * Verifica si el usuario puede realizar más análisis este mes
 */
export async function canAnalyze(userId) {
  const { plan, limits } = await getUserPlan(userId);

  if (limits.analyses_per_month === Infinity) return { allowed: true, plan };

  // Contar análisis este mes
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());

  const remaining = limits.analyses_per_month - (count || 0);
  return {
    allowed: remaining > 0,
    remaining,
    limit: limits.analyses_per_month,
    plan,
  };
}

/**
 * Abre la página de precios de Lexteriq en una nueva pestaña
 * Llamado desde el popup cuando el usuario quiere hacer upgrade
 */
export function openPricingPage(plan = 'pro', billing = 'monthly', promoCode = null) {
  const priceId = STRIPE_CONFIG.prices[plan]?.[billing];
  if (!priceId) {
    console.error(`Plan/billing no válido: ${plan}/${billing}`);
    return;
  }

  const baseUrl = 'https://lexteriq.com/pricing';
  const params = new URLSearchParams({ plan, billing });
  if (promoCode) params.set('promo', promoCode);

  chrome.tabs.create({ url: `${baseUrl}?${params.toString()}` });
}

/**
 * Genera la URL de checkout directo (sin pasar por web app)
 * Útil para botones de upgrade dentro de la extensión
 */
export function getPricingInfo() {
  return {
    pro: {
      monthly: { price: '$9.99', period: 'mes', priceId: STRIPE_CONFIG.prices.pro.monthly },
      annual:  { price: '$89.99', period: 'año', priceId: STRIPE_CONFIG.prices.pro.annual, savings: '25%' },
    },
    business: {
      monthly: { price: '$29.99', period: 'mes', priceId: STRIPE_CONFIG.prices.business.monthly },
      annual:  { price: '$287.99', period: 'año', priceId: STRIPE_CONFIG.prices.business.annual, savings: '20%' },
    },
    promoCodes: STRIPE_CONFIG.promoCodes.map(p => p.code),
  };
}

// ============================================================
// LEXTERIQ — Stripe Configuration
// Generado automáticamente — NO editar manualmente los IDs
// ============================================================

export const STRIPE_CONFIG = {
  // ---- PRODUCTOS ----
  products: {
    pro: 'prod_UmHOlnyHrwZ3F2',
    business: 'prod_UmHOUVlLRKv4zB',
  },

  // ---- PRECIOS ----
  prices: {
    pro: {
      monthly: 'price_1TmipuHNJduuEGube7oqZDwi',  // $9.99/mes
      annual:  'price_1Tmiq3HNJduuEGubcXxpL8CR',  // $89.99/año (~25% ahorro)
    },
    business: {
      monthly: 'price_1TmiqAHNJduuEGub27cdZt8s',  // $29.99/mes
      annual:  'price_1TmiqHHNJduuEGuba4mzAlef',  // $287.99/año (~20% ahorro)
    },
  },

  // ---- CUPONES ----
  coupons: {
    beta_launch: 'CjJO3o5c',  // 50% off por 3 meses — máx 100 canjes
  },

  // ---- CÓDIGOS DE PROMOCIÓN BETA ----
  // Estos códigos se usan en el campo de descuento en Checkout
  // Crea más desde: https://dashboard.stripe.com/coupons
  promoCodes: [
    { code: 'LEXBETA2026',   desc: 'Principal lanzamiento beta',    maxUses: 20 },
    { code: 'LEXEARLYBIRD',  desc: 'Early adopters primera ola',    maxUses: 15 },
    { code: 'KUSCREATOR',    desc: 'Comunidad Kusmedios exclusivo',  maxUses: 10 },
    { code: 'LEXVIP2026',    desc: 'VIP acceso exclusivo',          maxUses: 5  },
    { code: 'LEXFRIENDS',    desc: 'Amigos y familia del founder',  maxUses: 10 },
  ],

  // ---- PLAN FREE (sin Stripe) ----
  free: {
    analyses_per_month: 10,
    keywords_limit: 10,
    history_days: 7,
    export_csv: false,
    competitor_analysis: false,
  },

  // ---- LÍMITES POR PLAN ----
  planLimits: {
    free: {
      analyses_per_month: 10,
      keywords_limit: 10,
      history_days: 7,
      export_csv: false,
      competitor_analysis: false,
      api_access: false,
    },
    pro: {
      analyses_per_month: 500,
      keywords_limit: 100,
      history_days: 90,
      export_csv: true,
      competitor_analysis: true,
      api_access: false,
    },
    business: {
      analyses_per_month: Infinity,
      keywords_limit: Infinity,
      history_days: 365,
      export_csv: true,
      competitor_analysis: true,
      api_access: true,
      white_label: true,
      priority_support: true,
    },
  },
};

export default STRIPE_CONFIG;

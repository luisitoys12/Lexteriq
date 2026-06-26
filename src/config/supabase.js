// ============================================
// LEXTERIQ - Supabase Configuration
// Project: luisitoys12's Project (Lexteriq)
// ============================================

export const SUPABASE_URL = 'https://woqkueabensezxjvlzjr.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcWt1ZWFiZW5zZXp4anZsempyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NTk2NDcsImV4cCI6MjA4OTAzNTY0N30.O_rPjlmRYTRTT54lEUvd6gluOYfmzRaUsabQ_hANGl4';

// Plans configuration
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    analyses_per_month: 50,
    features: ['seo_score', 'tags_viewer', '10 keywords', '7 days history']
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price_monthly: 12.99,
    price_yearly: 9.99,
    analyses_per_month: 500,
    trial_days: 14,
    features: ['seo_score', 'tags_viewer', '100 keywords', 'competitor analysis', '90 days history', 'CSV export']
  },
  business: {
    id: 'business',
    name: 'Business',
    price_monthly: 39.99,
    price_yearly: 29.99,
    analyses_per_month: -1, // unlimited
    trial_days: 14,
    features: ['everything in Pro', 'unlimited keywords', '365 days history', 'API access', '5 team seats']
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'contact',
    analyses_per_month: -1,
    requires_contact: true,
    features: ['everything', 'custom seats', 'SLA', 'dedicated support']
  }
};

// Beta closed — requires invitation code
export const BETA_CONFIG = {
  enabled: true,
  trial_days: 14,
  requires_invite: true
};

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { STRIPE_PRICES } from '../../../src/config/stripe-web';

const plans = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    desc: 'Para explorar Lexteriq',
    color: 'border-white/10',
    features: [
      '10 análisis por mes',
      '10 keywords por video',
      '7 días de historial',
      'Score SEO básico',
      'Tags del video',
      'Checklist SEO',
    ],
    locked: ['Análisis de competencia', 'Export CSV', 'Keywords ilimitadas'],
    cta: 'Instalar gratis',
    ctaHref: 'https://chrome.google.com/webstore',
    priceId: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 9.99,
    annualPrice: 89.99,
    desc: 'Para creadores serios',
    color: 'border-[#6c63ff]/50',
    highlight: true,
    features: [
      '500 análisis por mes',
      '100 keywords por video',
      '90 días de historial',
      'Score SEO avanzado',
      'Análisis de competencia',
      'Export CSV',
      'Sugerencias SEO personalizadas',
    ],
    locked: ['API access', 'White-label', 'Soporte prioritario'],
    cta: '14 días gratis → Pro',
    priceIdMonthly: 'price_1TmipuHNJduuEGube7oqZDwi',
    priceIdAnnual: 'price_1Tmiq3HNJduuEGubcXxpL8CR',
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 29.99,
    annualPrice: 287.99,
    desc: 'Para agencias y equipos',
    color: 'border-amber-500/30',
    features: [
      'Análisis ilimitados',
      'Keywords ilimitadas',
      '365 días de historial',
      'Todo de Pro +',
      'API access',
      'White-label',
      'Soporte prioritario',
      'Multi-canal',
    ],
    locked: [],
    cta: '14 días gratis → Business',
    priceIdMonthly: 'price_1TmiqAHNJduuEGub27cdZt8s',
    priceIdAnnual: 'price_1TmiqHHNJduuEGuba4mzAlef',
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const BETA_CODES = ['LEXBETA2026', 'LEXEARLYBIRD', 'KUSCREATOR', 'LEXVIP2026', 'LEXFRIENDS'];

  function applyPromo() {
    if (BETA_CODES.includes(promoCode.toUpperCase())) {
      setPromoApplied(true);
    } else {
      alert('Código inválido. Prueba con LEXBETA2026');
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-16">
      <div className="max-w-5xl mx-auto">
        {/* Back */}
        <Link href="/" className="text-sm text-white/40 hover:text-white/70 transition-colors mb-8 inline-block">← Inicio</Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-3">Planes Lexteriq</h1>
          <p className="text-white/50 mb-6">14 días gratis en Pro y Business. Sin tarjeta para Free.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-white/5 p-1 rounded-xl mb-2">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                billing === 'monthly' ? 'bg-[#6c63ff] text-white' : 'text-white/50 hover:text-white'
              }`}
            >Mensual</button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                billing === 'annual' ? 'bg-[#6c63ff] text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              Anual <span className="ml-1 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">-25%</span>
            </button>
          </div>

          {/* Promo code */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <input
              type="text"
              placeholder="Código beta (ej. LEXBETA2026)"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm w-52 focus:outline-none focus:border-[#6c63ff]/50"
            />
            <button
              onClick={applyPromo}
              className="bg-[#6c63ff]/20 text-[#6c63ff] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#6c63ff]/30 transition-colors"
            >Aplicar</button>
            {promoApplied && <span className="text-green-400 text-sm font-semibold">✓ 50% off por 3 meses</span>}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-7 flex flex-col relative ${
                plan.highlight
                  ? 'bg-[#6c63ff]/[0.07] border-[#6c63ff]/50 ring-1 ring-[#6c63ff]/20'
                  : 'bg-white/[0.02] ' + plan.color
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#6c63ff] text-white text-xs font-bold px-3 py-1 rounded-full">MÁS POPULAR</div>
              )}
              <div className="mb-5">
                <div className="font-bold text-sm text-white/50 mb-1">{plan.name}</div>
                <div className="text-4xl font-black mb-1">
                  {plan.monthlyPrice === 0 ? 'Gratis' : `$${billing === 'monthly' ? plan.monthlyPrice : (plan.annualPrice / 12).toFixed(2)}`}
                  {plan.monthlyPrice > 0 && <span className="text-base font-normal text-white/40">/mes</span>}
                </div>
                {billing === 'annual' && plan.annualPrice > 0 && (
                  <div className="text-xs text-white/40">${plan.annualPrice}/año · facturado anualmente</div>
                )}
                <p className="text-sm text-white/40 mt-2">{plan.desc}</p>
              </div>

              <ul className="flex-1 space-y-2.5 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{f}
                  </li>
                ))}
                {plan.locked?.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/25">
                    <span className="mt-0.5 flex-shrink-0">🔒</span>{f}
                  </li>
                ))}
              </ul>

              <a
                href={plan.ctaHref || `/api/checkout?priceId=${billing === 'monthly' ? plan.priceIdMonthly : plan.priceIdAnnual}&promo=${promoApplied ? promoCode : ''}`}
                className={`block w-full py-3 rounded-xl text-center text-sm font-bold transition-all ${
                  plan.highlight
                    ? 'bg-[#6c63ff] text-white hover:bg-[#5a52d5] hover:shadow-lg hover:shadow-[#6c63ff]/30'
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-white/25 mt-8">
          Precios en USD · Cancela cuando quieras · Código beta: <span className="text-[#6c63ff] font-mono">LEXBETA2026</span>
        </p>
      </div>
    </main>
  );
}

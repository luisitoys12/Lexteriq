import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-sm z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#6c63ff] rounded-lg flex items-center justify-center font-black text-white text-sm">LX</div>
          <span className="font-bold text-lg tracking-tight">Lexteriq</span>
          <span className="text-xs bg-[#6c63ff]/20 text-[#6c63ff] px-2 py-0.5 rounded-full font-semibold">BETA</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-sm text-white/60 hover:text-white transition-colors">Precios</Link>
          <Link href="/login" className="text-sm bg-[#6c63ff] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#5a52d5] transition-colors">Acceder</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-6 py-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-[#6c63ff]/10 border border-[#6c63ff]/20 text-[#6c63ff] px-4 py-1.5 rounded-full text-sm font-medium mb-8">
          🚀 Ahora en beta cerrada — usa código LEXBETA2026
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
          YouTube SEO
          <br />
          <span className="gradient-text">en tiempo real</span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          Analiza cualquier video de YouTube instantáneamente. Score SEO, keywords ocultas, 
          velocidad de crecimiento y análisis de competencia — directo en tu navegador.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://chrome.google.com/webstore"
            className="bg-[#6c63ff] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#5a52d5] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#6c63ff]/30"
          >
            🔌 Instalar extensión gratis
          </a>
          <Link
            href="/pricing"
            className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all"
          >
            Ver planes →
          </Link>
        </div>
        <p className="text-sm text-white/30 mt-4">14 días de Pro gratis · Sin tarjeta requerida en Free</p>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">Todo lo que necesitas para crecer</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: '📊', title: 'Score SEO', desc: 'Puntuación instantánea de qué tan optimizado está cualquier video' },
            { icon: '🔑', title: 'Keywords ocultas', desc: 'Ve los tags y keywords de cualquier video, incluso los que YouTube esconde' },
            { icon: '⚡', title: 'Velocidad de crecimiento', desc: 'Vistas por hora y proyección a 7 días en tiempo real' },
            { icon: '✅', title: 'Checklist SEO', desc: '6 factores verificados: título, descripción, tags, keywords, links y más' },
            { icon: '🏆', title: 'Análisis de competencia', desc: 'Compara con los videos que te ganan el ranking (Pro)' },
            { icon: '📈', title: 'Historial de análisis', desc: 'Guarda y revisa el historial de todos tus videos analizados (Pro)' },
          ].map((f, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-[#6c63ff]/30 transition-all">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-base mb-2">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-black mb-4">Empieza gratis hoy</h2>
        <p className="text-white/50 mb-10">Sin tarjeta de crédito para el plan Free. Pro incluye 14 días de prueba.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { plan: 'Free', price: '$0', desc: '10 análisis/mes', cta: 'Instalar gratis', href: 'https://chrome.google.com/webstore', highlight: false },
            { plan: 'Pro', price: '$9.99', desc: '500 análisis/mes · 14 días gratis', cta: 'Empezar Pro', href: '/pricing', highlight: true },
            { plan: 'Business', price: '$29.99', desc: 'Análisis ilimitados · API access', cta: 'Ver Business', href: '/pricing', highlight: false },
          ].map((p, i) => (
            <div key={i} className={`rounded-2xl p-6 border ${
              p.highlight
                ? 'bg-[#6c63ff]/10 border-[#6c63ff]/40 ring-1 ring-[#6c63ff]/30'
                : 'bg-white/[0.03] border-white/5'
            }`}>
              <div className="text-sm font-semibold text-white/50 mb-1">{p.plan}</div>
              <div className="text-3xl font-black mb-1">{p.price}<span className="text-sm font-normal text-white/40">/mes</span></div>
              <p className="text-xs text-white/40 mb-4">{p.desc}</p>
              <a href={p.href} className={`block w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
                p.highlight
                  ? 'bg-[#6c63ff] text-white hover:bg-[#5a52d5]'
                  : 'bg-white/5 text-white hover:bg-white/10'
              }`}>{p.cta}</a>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 px-6 py-8 text-center text-sm text-white/30">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 bg-[#6c63ff] rounded flex items-center justify-center text-white text-xs font-black">LX</div>
          <span className="font-semibold text-white/50">Lexteriq</span>
        </div>
        <p>© 2026 Lexteriq by Estación Kusmedios · Irapuato, México 🇲🇽</p>
        <div className="flex justify-center gap-4 mt-3">
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacidad</Link>
          <Link href="/terms" className="hover:text-white/60 transition-colors">Términos</Link>
          <a href="mailto:hola@lexteriq.com" className="hover:text-white/60 transition-colors">Contacto</a>
        </div>
      </footer>
    </main>
  );
}

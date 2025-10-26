// frontend/app/page.js
import Link from 'next/link';
import { Leaf, TrendingDown, BarChart3, Zap, ArrowRight, Shield } from 'lucide-react';

export const metadata = {
  title: 'KarbonUyum - Karbon Ayak İzi Yönetim Platformu',
  description: 'Türk KOBİ\'leri için akıllı karbon emisyon hesaplama ve yönetim platformu. Climatiq API ile güncel faktörler, benchmarking ve öneriler.',
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 overflow-hidden">
      {/* Animated Background - Premium blur blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-1/3 -right-40 w-[450px] h-[450px] bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-3xl bg-gradient-to-r from-slate-950/95 via-emerald-900/30 to-slate-950/95 border-b border-emerald-500/20 shadow-2xl relative">
        <div className="container mx-auto px-4 sm:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
              <div className="relative p-2 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl shadow-2xl">
                <Leaf className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <span className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">KarbonUyum</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="px-6 py-2.5 text-emerald-300 hover:text-emerald-200 font-bold transition duration-300">
              Giriş Yap
            </Link>
            <Link href="/register" className="px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl font-bold transition shadow-lg hover:shadow-emerald-500/50 hover:shadow-xl transform hover:scale-105">
              Başla
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-8 py-20 lg:py-32 relative z-10">
        <div className="text-center space-y-10">
          <div className="space-y-6">
            <div className="inline-block px-5 py-2.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 rounded-full text-sm font-bold text-emerald-300 backdrop-blur hover:border-emerald-400/60 transition-all">
              🌱 Türk KOBİ&apos;leri için Akıllı Çözüm
            </div>
            <h1 className="text-6xl lg:text-7xl font-black bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 bg-clip-text text-transparent leading-tight">
              Karbon Ayak İzinizi <span className="text-emerald-400">Yönetin</span>
            </h1>
            <p className="text-xl text-emerald-300/90 max-w-3xl mx-auto font-semibold">
              Climatiq API ile güncel emisyon faktörleri, akıllı öneriler ve sektörsel karşılaştırmalar. CBAM&apos;a hazırlanın, sürdürülebilirliği raporlayın.
            </p>
          </div>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="px-10 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white rounded-2xl font-black text-lg transition shadow-lg hover:shadow-emerald-500/50 hover:shadow-2xl flex items-center gap-2 transform hover:scale-105 active:scale-95">
              Hemen Başlayın <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#features" className="px-10 py-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/40 text-emerald-300 hover:text-emerald-200 rounded-2xl font-bold text-lg transition hover:border-emerald-400/60 hover:bg-emerald-500/30 backdrop-blur">
              Özellikleri Keşfet
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 sm:px-8 py-20 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-black bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 bg-clip-text text-transparent mb-4">Neden KarbonUyum?</h2>
          <div className="w-24 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full shadow-lg mx-auto"></div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: BarChart3, title: 'Akıllı Hesaplama', desc: 'Climatiq API ile güncel emisyon faktörleri. Türkiye-spesifik veriler ve otomatik fallback mekanizması.' },
            { icon: TrendingDown, title: 'Benchmarking', desc: 'Sektörünüzdeki diğer firmalarla anonim karşılaştırma. Verimlilik metriklerini görün ve gelişin.' },
            { icon: Zap, title: 'AI Öneriler', desc: 'Güneş enerjisi, bina yalıtımı ve daha fazlasına dair kişiye özel öneriler. ROI hesaplaması dahil.' },
            { icon: Shield, title: 'Yasal Uyumlu', desc: 'KVKK uyumlu, CBAM hazır. Tüm hesaplamalar şeffaf ve denetlenebilir.' },
            { icon: Leaf, title: 'CSV Desteği', desc: 'Türkçe ondalık desteği. Toplu yükleme, satır-satır hata raporlaması.' },
            { icon: TrendingDown, title: 'GHG Protokolü', desc: 'Scope 1, 2 ve 3 emisyonları hesaplayın. Uluslararası standartlara uyumlu.' },
          ].map((feature, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl h-full">
                <feature.icon className="w-12 h-12 text-emerald-400 mb-4" />
                <h3 className="text-xl font-bold text-emerald-200 mb-3">{feature.title}</h3>
                <p className="text-emerald-300/70 font-semibold">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 sm:px-8 py-20 relative z-10">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-cyan-600/20 rounded-3xl p-16 border-2 border-emerald-500/40 backdrop-blur-xl">
            <div className="grid md:grid-cols-4 gap-8 text-white">
              {[
                { label: 'Aktif KOBİ', value: '50+' },
                { label: 'Hesaplanan Emisyon', value: '10M+' },
                { label: 'CSV Yükleme', value: '500K+' },
                { label: 'Sektör Kuruluşları', value: '20+' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-5xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent mb-2">{stat.value}</div>
                  <div className="text-emerald-300/80 font-bold text-lg">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 sm:px-8 py-20 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-black bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 bg-clip-text text-transparent mb-4">Nasıl Çalışır?</h2>
          <div className="w-24 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full shadow-lg mx-auto"></div>
        </div>
        
        <div className="space-y-8 max-w-3xl mx-auto">
          {[
            { step: '1', title: 'Kaydolun', desc: 'Şirketinizi ve tesislerinizi tanıtın. Sektör bilgisini girin.' },
            { step: '2', title: 'Veri Yükleyin', desc: 'CSV dosyası indirin, doldurun, yükleyin. Türkçe ondalık destekli.' },
            { step: '3', title: 'Hesapla', desc: 'Climatiq API ile otomatik hesaplama. Sonuçlar saniyeler içinde.' },
            { step: '4', title: 'Raporla', desc: 'Dashboard\'da görün, PDF indir, işletme kararları alın.' },
          ].map((item, i) => (
            <div key={i} className="group flex gap-8 items-start relative">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full opacity-0 group-hover:opacity-50 blur-lg transition-opacity duration-300"></div>
                <div className="relative w-14 h-14 bg-gradient-to-br from-emerald-400 to-cyan-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-black text-xl shadow-lg">{item.step}</div>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-2xl font-black text-emerald-200 mb-2">{item.title}</h3>
                <p className="text-emerald-300/80 text-lg font-semibold">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-8 py-20 relative z-10">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-3xl p-16 text-center border-2 border-emerald-500/40 backdrop-blur-xl">
            <h2 className="text-4xl font-black text-emerald-200 mb-6">BİGG Pilot Katılımcısı mısınız?</h2>
            <p className="text-emerald-300/80 text-lg mb-10 max-w-2xl mx-auto font-semibold">
              Türk Sanayisi ve Teknoloji Vakfı (BİGG) işbirliğiyle sunulan bu çözüm, KOBİ&apos;lerin karbon yönetimini basitleştirmektedir.
            </p>
            <Link href="/register" className="px-10 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white rounded-2xl font-black text-lg transition inline-flex items-center gap-2 shadow-lg hover:shadow-emerald-500/50 hover:shadow-2xl transform hover:scale-105">
              Pilot Olarak Katıl <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-500/20 mt-20 py-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                  <div className="relative p-1.5 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg">
                    <Leaf className="w-5 h-5 text-white" />
                  </div>
                </div>
                <span className="text-xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">KarbonUyum</span>
              </div>
              <p className="text-emerald-300/70 font-semibold">Türk KOBİ&apos;leri için karbon yönetim çözümü</p>
            </div>
            <div>
              <h4 className="font-bold text-emerald-200 mb-4">Hızlı Linkler</h4>
              <ul className="space-y-2 text-emerald-300/70 font-semibold">
                <li><Link href="#features" className="hover:text-emerald-300 transition">Özellikler</Link></li>
                <li><Link href="/login" className="hover:text-emerald-300 transition">Giriş Yap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-emerald-200 mb-4">Legal</h4>
              <ul className="space-y-2 text-emerald-300/70 font-semibold">
                <li><Link href="/privacy" className="hover:text-emerald-300 transition">Gizlilik</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-300 transition">Şartlar</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-emerald-200 mb-4">İletişim</h4>
              <ul className="space-y-2 text-emerald-300/70 font-semibold">
                <li>info@karbonuyum.io</li>
                <li>Powered by Climatiq + BİGG</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-emerald-500/20 pt-8 text-center text-emerald-300/60 font-semibold">
            <p>&copy; 2025 KarbonUyum. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// frontend/app/page.js
import Link from 'next/link';
import { Leaf, TrendingDown, BarChart3, Zap, ArrowRight, Shield } from 'lucide-react';

export const metadata = {
  title: 'KarbonUyum - Karbon Ayak İzi Yönetim Platformu',
  description: 'Türk KOBİ\'leri için akıllı karbon emisyon hesaplama ve yönetim platformu. Climatiq API ile güncel faktörler, benchmarking ve öneriler.',
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Leaf className="w-8 h-8 text-green-600 dark:text-green-400" />
            <span className="text-2xl font-bold text-slate-900 dark:text-white">KarbonUyum</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition font-medium">
              Giriş Yap
            </Link>
            <Link href="/register" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition shadow-lg hover:shadow-xl">
              Başla
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full text-sm font-semibold text-green-700 dark:text-green-300">
              🌱 Türk KOBİ&apos;leri için Akıllı Çözüm
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 dark:text-white leading-tight">
              Karbon Ayak İzinizi <span className="text-green-600 dark:text-green-400">Yönetin</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Climatiq API ile güncel emisyon faktörleri, akıllı öneriler ve sektörsel karşılaştırmalar. CBAM&apos;a hazırlanın, sürdürülebilirliği raporlayın.
            </p>
          </div>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition shadow-lg hover:shadow-xl flex items-center gap-2 transform hover:scale-105">
              Hemen Başlayın <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#features" className="px-8 py-4 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-bold text-lg transition hover:bg-slate-300 dark:hover:bg-slate-600">
              Özellikleri Keşfet
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-16">Neden KarbonUyum?</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: BarChart3, title: 'Akıllı Hesaplama', desc: 'Climatiq API ile güncel emisyon faktörleri. Türkiye-spesifik veriler ve otomatik fallback mekanizması.' },
            { icon: TrendingDown, title: 'Benchmarking', desc: 'Sektörünüzdeki diğer firmalarla anonim karşılaştırma. Verimlilik metriklerini görün ve gelişin.' },
            { icon: Zap, title: 'AI Öneriler', desc: 'Güneş enerjisi, bina yalıtımı ve daha fazlasına dair kişiye özel öneriler. ROI hesaplaması dahil.' },
            { icon: Shield, title: 'Yasal Uyumlu', desc: 'KVKK uyumlu, CBAM hazır. Tüm hesaplamalar şeffaf ve denetlenebilir.' },
            { icon: Leaf, title: 'CSV Desteği', desc: 'Türkçe ondalık desteği. Toplu yükleme, satır-satır hata raporlaması.' },
            { icon: TrendingDown, title: 'GHG Protokolü', desc: 'Scope 1, 2 ve 3 emisyonları hesaplayın. Uluslararası standartlara uyumlu.' },
          ].map((feature, i) => (
            <div key={i} className="p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition border border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-600">
              <feature.icon className="w-12 h-12 text-green-600 dark:text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl mx-4 my-12">
        <div className="grid md:grid-cols-4 gap-8 text-white">
          {[
            { label: 'Aktif KOBİ', value: '50+' },
            { label: 'Hesaplanan Emisyon', value: '10M+' },
            { label: 'CSV Yükleme', value: '500K+' },
            { label: 'Sektör Kuruluşları', value: '20+' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-bold mb-2">{stat.value}</div>
              <div className="text-green-100">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-16">Nasıl Çalışır?</h2>
        
        <div className="space-y-8">
          {[
            { step: '1', title: 'Kaydolun', desc: 'Şirketinizi ve tesislerinizi tanıtın. Sektör bilgisini girin.' },
            { step: '2', title: 'Veri Yükleyin', desc: 'CSV dosyası indirin, doldurun, yükleyin. Türkçe ondalık destekli.' },
            { step: '3', title: 'Hesapla', desc: 'Climatiq API ile otomatik hesaplama. Sonuçlar saniyeler içinde.' },
            { step: '4', title: 'Raporla', desc: 'Dashboard\'da görün, PDF indir, işletme kararları alın.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg">{item.step}</div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">BİGG Pilot Katılımcısı mısınız?</h2>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            Türk Sanayisi ve Teknoloji Vakfı (BİGG) işbirliğiyle sunulan bu çözüm, KOBİ&apos;lerin karbon yönetimini basitleştirmektedir.
          </p>
          <Link href="/register" className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition inline-flex items-center gap-2">
            Pilot Olarak Katıl <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="w-6 h-6 text-green-600" />
                <span className="font-bold text-slate-900 dark:text-white">KarbonUyum</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">Türk KOBİ&apos;leri için karbon yönetim çözümü</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4">Hızlı Linkler</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li><Link href="#features" className="hover:text-green-600 dark:hover:text-green-400 transition">Özellikler</Link></li>
                <li><Link href="/login" className="hover:text-green-600 dark:hover:text-green-400 transition">Giriş Yap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-green-600 dark:hover:text-green-400 transition">Gizlilik</a></li>
                <li><a href="#" className="hover:text-green-600 dark:hover:text-green-400 transition">Şartlar</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4">İletişim</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li>info@karbonuyum.io</li>
                <li>Powered by Climatiq + BİGG</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800 pt-8 text-center text-slate-600 dark:text-slate-400">
            <p>&copy; 2025 KarbonUyum. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

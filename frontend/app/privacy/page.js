// frontend/app/privacy/page.js
import Link from 'next/link';
import { Leaf, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Gizlilik Politikası - KarbonUyum',
  description: 'KarbonUyum gizlilik politikası ve kişisel veri koruma bilgileri.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-1/3 -right-40 w-[450px] h-[450px] bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-3xl bg-gradient-to-r from-slate-950/95 via-emerald-900/30 to-slate-950/95 border-b border-emerald-500/20 shadow-2xl relative">
        <div className="container mx-auto px-4 sm:px-8 py-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
              <div className="relative p-2 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl shadow-2xl">
                <Leaf className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <span className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">KarbonUyum</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 px-6 py-2.5 text-emerald-300 hover:text-emerald-200 font-bold transition duration-300">
            <ArrowLeft className="w-5 h-5" />
            Geri Dön
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-8 py-16 relative z-10 max-w-4xl">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 bg-clip-text text-transparent mb-4">Gizlilik Politikası</h1>
          <p className="text-emerald-300/70 font-semibold text-lg">Son güncelleme: Ocak 2025</p>
        </div>

        {/* Content */}
        <div className="space-y-10">
          {/* Section 1 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">1. Veri Toplanması</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                KarbonUyum platformu, kullanıcı hesaplarını oluştururken ve yönetirken kişisel veri toplar. Bu veriler şunları içerir:
              </p>
              <ul className="mt-4 space-y-2 text-emerald-300/70 font-semibold">
                <li>✓ E-posta adresi</li>
                <li>✓ Şirket bilgileri (ad, sektör, lokasyon)</li>
                <li>✓ Tesis verileri</li>
                <li>✓ Karbon emisyon verileri</li>
                <li>✓ Kullanım analitikleri</li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">2. Veri Kullanımı</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                Toplanan veriler aşağıdaki amaçlarla kullanılır:
              </p>
              <ul className="mt-4 space-y-2 text-emerald-300/70 font-semibold">
                <li>✓ Platform hizmetlerinin sunulması</li>
                <li>✓ Karbon hesaplamaları yapılması</li>
                <li>✓ Benchmarking analizleri</li>
                <li>✓ AI önerileri sağlanması</li>
                <li>✓ Hizmet iyileştirmesi ve geliştirme</li>
                <li>✓ Yasal yükümlülüklerin yerine getirilmesi</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">3. Veri Güvenliği</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                Kişisel verileriniz endüstri standardı güvenlik protokolleri ile korunmaktadır:
              </p>
              <ul className="mt-4 space-y-2 text-emerald-300/70 font-semibold">
                <li>✓ SSL/TLS şifreleme</li>
                <li>✓ Veritabanı şifreleme</li>
                <li>✓ Güvenli kimlik doğrulama</li>
                <li>✓ Düzenli güvenlik denetimleri</li>
                <li>✓ Erişim kontrolü ve izleme</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">4. KVKK Uyumluluğu</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                KarbonUyum, Türkiye Kişisel Verileri Koruma Kanunu (KVKK) ile tam uyumlu olarak faaliyet göstermektedir. Kullanıcılar haklarını kullanarak:
              </p>
              <ul className="mt-4 space-y-2 text-emerald-300/70 font-semibold">
                <li>✓ Verilerini öğrenebilir</li>
                <li>✓ Verilerini düzelttirebilir</li>
                <li>✓ Verilerini silebilir</li>
                <li>✓ İşleme itiraz edebilir</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">5. Veri Paylaşımı</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                Kişisel verileriniz aşağıdaki durumlarda üçüncü taraflarla paylaşılabilir:
              </p>
              <ul className="mt-4 space-y-2 text-emerald-300/70 font-semibold">
                <li>✓ Yasal gereklilikler doğrultusunda</li>
                <li>✓ Hizmet sağlayıcılarla (Climatiq vb.)</li>
                <li>✓ Benchmarking analizleri için anonimleştirilmiş veriler</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">6. İletişim</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                Gizlilik politikası hakkında sorularınız için bize ulaşabilirsiniz:
              </p>
              <p className="mt-4 text-emerald-300 font-bold text-lg">
                📧 info@karbonuyum.io
              </p>
            </div>
          </section>
        </div>

        {/* Back Button */}
        <div className="mt-16 text-center">
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl font-bold transition shadow-lg hover:shadow-emerald-500/50 hover:shadow-xl transform hover:scale-105">
            <ArrowLeft className="w-5 h-5" />
            Ana Sayfa&apos;ya Dön
          </Link>
        </div>
      </main>
    </div>
  );
}

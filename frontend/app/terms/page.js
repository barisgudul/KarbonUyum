// frontend/app/terms/page.js
import Link from 'next/link';
import { Leaf, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Hizmet Şartları - KarbonUyum',
  description: 'KarbonUyum hizmet şartları ve kullanıcı sözleşmesi.',
}

export default function TermsPage() {
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
          <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 bg-clip-text text-transparent mb-4">Hizmet Şartları</h1>
          <p className="text-emerald-300/70 font-semibold text-lg">Son güncelleme: Ocak 2025</p>
        </div>

        {/* Content */}
        <div className="space-y-10">
          {/* Section 1 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">1. Hizmet Açıklaması</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                KarbonUyum, Türk KOBİ&apos;leri için karbon emisyon hesaplama, yönetim ve raporlama platformudur. Platform Climatiq API&apos;si ile entegre olarak güncel emisyon faktörleri sağlar, benchmarking analizleri yapar ve AI-destekli öneriler sunmaktadır.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">2. Kullanıcı Sorumlulukları</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed mb-4">
                Platformu kullanarak, aşağıdakileri kabul etmiş olursunuz:
              </p>
              <ul className="space-y-2 text-emerald-300/70 font-semibold">
                <li>✓ Hesap bilgilerinizi doğru ve güncel tutacaksınız</li>
                <li>✓ Şifrenizi gizli tutacak ve kendi sorumluluğunuzda kullanacaksınız</li>
                <li>✓ Platformu yasal amaçlarla kullanacaksınız</li>
                <li>✓ Başkalarının haklarını ihlal etmeyecek faaliyetler yapacaksınız</li>
                <li>✓ Yüklediğiniz verilerin doğruluğu hakkında sorumlu olacaksınız</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">3. Fikri Mülkiyet Hakları</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                KarbonUyum platformu, tasarım, kod ve içeriği dahil olmak üzere tüm fikri mülkiyet hakları bize aittir. Platformu sadece kişisel ve ticari amaçlarınız için kullanabilirsiniz. İzin olmaksızın kopyalama, değiştirme veya dağıtma yasaktır.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">4. Sorumluluk Kısıtı</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                Platform &quot;olduğu gibi&quot; sunulur. Herhangi bir hatadan, eksiklikten veya kesintiden doğan zararlardan sorumlu değiliz. Hesaplamaların doğruluğu, tamlığı veya kullanışlılığı konusunda hiçbir garanti vermeyiz.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">5. Hizmetin Sonlandırılması</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                Şartları ihlal ettiğiniz takdirde hesabınızı herhangi bir uyarı olmaksızın kapatma hakkımız vardır. Hesap kapatıldıktan sonra verilerinize erişim kısıtlanır.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">6. Değişiklikler</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                Bu şartları önceden bildirim yaparak değiştirme hakkını saklı tutarız. Devam eden kullanım, değişiklikleri kabul ettiğiniz anlamına gelir.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">7. Uygulanacak Hukuk</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                Bu şartlar Türkiye Cumhuriyeti kanunları uyarınca yönetilir ve İstanbul mahkemeleri yetkilidir.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-xl">
              <h2 className="text-2xl font-black text-emerald-200 mb-4">8. İletişim</h2>
              <p className="text-emerald-300/70 font-semibold leading-relaxed">
                Hizmet şartları hakkında sorularınız veya şikayetleriniz için bize ulaşabilirsiniz:
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

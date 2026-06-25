import { Metadata } from 'next';
import Link from 'next/link';
import {
  Download, Monitor, Smartphone, CheckCircle2, Sparkles,
  Apple, Zap, Shield, Cpu, HardDrive, Wifi, ArrowRight,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Download Nafaa Desktop App — Pakistan ka POS Solution',
  description:
    'Nafaa desktop app free download karein. Windows aur macOS ke liye. Offline kaam karta hai, thermal printer support, barcode scanner ready.',
  openGraph: {
    title: 'Download Nafaa Desktop App',
    description: 'Pakistan ka best POS — Free download for Windows & Mac',
    images: ['/og/og-default.png'],
  },
};

const APP_VERSION = '1.0.5';
const GITHUB_REPO = 'iamabubakarmalik/nafaa';
const RELEASE_BASE = `https://github.com/${GITHUB_REPO}/releases/latest/download`;

const downloads = [
  {
    platform: 'Windows',
    icon: Monitor,
    color: '#0078d4',
    bgColor: 'from-blue-500 to-blue-700',
    arch: '64-bit (x64)',
    size: '~88 MB',
    extension: '.exe',
    filename: `Nafaa-Setup-${APP_VERSION}.exe`,
    requirements: 'Windows 10 / 11',
    primary: true,
  },
  {
    platform: 'macOS',
    icon: Apple,
    color: '#000000',
    bgColor: 'from-gray-800 to-black',
    arch: 'Apple Silicon (M1/M2/M3)',
    size: '~100 MB',
    extension: '.dmg',
    filename: `Nafaa-${APP_VERSION}-arm64.dmg`,
    requirements: 'macOS 12 Monterey or later',
  },
  {
    platform: 'macOS',
    icon: Apple,
    color: '#000000',
    bgColor: 'from-gray-700 to-gray-900',
    arch: 'Intel (x86_64)',
    size: '~104 MB',
    extension: '.dmg',
    filename: `Nafaa-${APP_VERSION}.dmg`,
    requirements: 'macOS 10.15 Catalina or later',
  },
];

const features = [
  {
    icon: Wifi,
    title: 'Offline-First',
    desc: 'Internet na ho to bhi sales chal sakti hain. Sync automatic ho jata hai jab connection wapas aaye.',
    color: 'from-emerald-500 to-emerald-700',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    desc: 'Native app speed — browser se 10x faster. Bohot saare orders bhi smooth handle karta hai.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: HardDrive,
    title: 'Thermal Printer',
    desc: 'Direct thermal printer support (Epson, Star, Bixolon). 80mm aur 58mm dono paper support.',
    color: 'from-blue-500 to-blue-700',
  },
  {
    icon: Shield,
    title: 'Secure',
    desc: 'Sandboxed Electron. Local encrypted storage. Auto-updates digitally signed.',
    color: 'from-violet-500 to-purple-700',
  },
  {
    icon: Cpu,
    title: 'Barcode Scanner',
    desc: 'USB barcode scanner direct support. Plug & play — koi setup nahi chahiye.',
    color: 'from-rose-500 to-pink-700',
  },
  {
    icon: Sparkles,
    title: 'Auto Updates',
    desc: 'Background mein updates download hote hain. Bas restart karke install kar dein.',
    color: 'from-cyan-500 to-teal-700',
  },
];

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white">
      {/* Hero */}
      <Header />
      <section className="pt-20 pb-12">
        <Container>
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-6">
              <Download className="h-4 w-4" />
              Desktop App — Bilkul Free
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold text-neutral-900 leading-tight">
              Nafaa Desktop App
            </h1>
            <p className="mt-4 text-xl text-neutral-600 leading-relaxed">
              Pakistan ka pehla POS jo <span className="text-emerald-700 font-bold">offline bhi chalta hai</span>. 
              Aap ki dukan ka complete control — bina kisi monthly charges ke desktop app ka.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-neutral-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>100% Free Download</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Version {APP_VERSION}</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Download Cards */}
      <section className="pb-16">
        <Container>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {downloads.map((d) => {
              const Icon = d.icon;
              return (
                <div
                  key={d.platform + d.arch}
                  className={`relative rounded-3xl overflow-hidden border-2 ${
                    d.primary ? 'border-emerald-500 shadow-2xl shadow-emerald-200' : 'border-neutral-200'
                  } bg-white transition-all hover:shadow-2xl hover:-translate-y-1`}
                >
                  {d.primary && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-extrabold px-3 py-1 rounded-bl-2xl">
                      MOST POPULAR
                    </div>
                  )}

                  <div className={`p-6 bg-gradient-to-br ${d.bgColor} text-white`}>
                    <Icon className="h-12 w-12" />
                    <h3 className="mt-3 text-2xl font-extrabold">{d.platform}</h3>
                    <p className="text-sm opacity-90 mt-1">{d.arch}</p>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">File size:</span>
                        <span className="font-bold text-neutral-900">{d.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Format:</span>
                        <span className="font-bold text-neutral-900 font-mono">{d.extension}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Requires:</span>
                        <span className="font-bold text-neutral-900 text-xs">{d.requirements}</span>
                      </div>
                    </div>

                    <a
                      href={`${RELEASE_BASE}/${d.filename}`}
                      download
                      className={`w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-extrabold text-white transition-all ${
                        d.primary
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30'
                          : 'bg-neutral-900 hover:bg-black'
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      Download Now
                    </a>

                    <p className="text-xs text-center text-neutral-500">
                      Free • No signup needed
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-16 bg-neutral-50">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-4xl font-extrabold text-neutral-900">
              Browser version se zyada powerful
            </h2>
            <p className="mt-3 text-lg text-neutral-600">
              Desktop app mein extra features jo aap ke business ke liye game-changer hain
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-3xl p-6 border border-neutral-200 hover:shadow-xl transition-all"
                >
                  <div
                    className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-extrabold text-neutral-900 text-lg">
                    {f.title}
                  </h3>
                  <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Installation Guide */}
      <section className="py-16">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-extrabold text-neutral-900 text-center">
              Installation Guide
            </h2>
            <p className="mt-3 text-lg text-neutral-600 text-center">
              2 minutes mein install ho jaye gi
            </p>

            <div className="mt-12 space-y-6">
              {[
                {
                  step: 1,
                  title: 'Download Karein',
                  desc: 'Apne system ke liye correct version download karein (Windows ya Mac).',
                },
                {
                  step: 2,
                  title: 'File Open Karein',
                  desc: 'Downloaded file pe double-click karein. Windows mein "Windows protected your PC" warning aaye to "More info" → "Run anyway" click karein.',
                },
                {
                  step: 3,
                  title: 'Install Wizard Follow Karein',
                  desc: 'Installation location choose karein (default OK hai), aur "Install" click karein.',
                },
                {
                  step: 4,
                  title: 'Login Karein',
                  desc: 'Desktop pe Nafaa icon ban jaye gi. App khol kar apne credentials se login karein. Bas! 🎉',
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xl">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-neutral-900 text-lg">
                      {s.title}
                    </h3>
                    <p className="text-neutral-600 mt-1 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Mobile App CTA */}
      <section className="py-16 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl font-extrabold">
              Mobile pe bhi available
            </h2>
            <p className="mt-3 text-emerald-100">
              Jate-jate dukan check karni ho? Mobile app abhi launch ho rahi hai.
            </p>
            <div className="mt-6">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-emerald-700 font-extrabold hover:bg-emerald-50 transition-colors"
              >
                Notify Me When Available
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-extrabold text-neutral-900 text-center mb-12">
              Common Questions
            </h2>

            <div className="space-y-4">
              {[
                {
                  q: 'Kya yeh bilkul free hai?',
                  a: 'Haan! Desktop app 100% free hai aur hamesha free rahegi. Bas account ka subscription chahiye (free trial 14 days bhi available).',
                },
                {
                  q: 'Internet ke baghair kaam karega?',
                  a: 'Haan! Aap sales kar sakte hain, products view kar sakte hain, customer details check kar sakte hain — sab kuch offline. Internet wapas aate hi data sync ho jata hai.',
                },
                {
                  q: 'Thermal printer kaise connect karein?',
                  a: 'App ke settings mein "Printer Settings" jaayein, network printer ki IP daalein (printer ke menu se mil jayegi), test karein, aur ready! Epson, Star, Bixolon, sab support hain.',
                },
                {
                  q: 'Updates manually install karne hain?',
                  a: 'Nahi. App khud automatic check karta hai. Naye version available ho to background mein download ho jaata hai. Bas restart karein install ho jaata hai.',
                },
                {
                  q: 'Mera data kahan store hota hai?',
                  a: 'Sab data hamare secure cloud servers pe encrypted store hota hai. Local offline cache bhi maintain hota hai taa-ke internet na ho to bhi access ho.',
                },
              ].map((f, i) => (
                <details
                  key={i}
                  className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden"
                >
                  <summary className="px-6 py-4 cursor-pointer font-bold text-neutral-900 hover:bg-neutral-50 list-none flex items-center justify-between">
                    {f.q}
                    <ArrowRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-6 pb-4 text-neutral-600 leading-relaxed">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-neutral-50">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-extrabold text-neutral-900">
              Abhi shuru karein
            </h2>
            <p className="mt-3 text-lg text-neutral-600">
              Apne competitors se aage rahein. Nafaa Desktop install karein aur professional POS experience hasil karein.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`${RELEASE_BASE}/Nafaa-Setup-${APP_VERSION}.exe`}
                download
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold inline-flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" />
                Download for Windows
              </a>
              <a
                href={`${RELEASE_BASE}/Nafaa-${APP_VERSION}-arm64.dmg`}
                download
                className="px-6 py-3 rounded-2xl bg-neutral-900 hover:bg-black text-white font-extrabold inline-flex items-center gap-2"
              >
                <Apple className="h-4 w-4" />
                Download for Mac
              </a>
            </div>
          </div>
        </Container>
      </section>
      <Footer />
    </main>
  );
}

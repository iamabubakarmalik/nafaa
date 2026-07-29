import { Monitor, Apple, Smartphone, Download as DownloadIcon, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Badge } from '@/components/primitives/Badge';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Download Nafaa — desktop and mobile apps',
  description: 'Download Nafaa for Windows, macOS, iOS, and Android. Offline-first POS with thermal printer and barcode scanner support.',
  path: '/download',
});

const VERSION = '2.1.0';
const RELEASE = 'https://github.com/iamabubakarmalik/nafaa/releases/latest/download';

const platforms = [
  { name: 'Windows', icon: Monitor, arch: '64-bit', size: '~92 MB', file: `Nafaa-Setup-${VERSION}.exe`, req: 'Windows 10 / 11', color: 'from-blue-500 to-blue-700', primary: true },
  { name: 'macOS', icon: Apple, arch: 'Apple Silicon', size: '~104 MB', file: `Nafaa-${VERSION}-arm64.dmg`, req: 'macOS 12+', color: 'from-ink-800 to-ink-950' },
  { name: 'macOS', icon: Apple, arch: 'Intel', size: '~108 MB', file: `Nafaa-${VERSION}.dmg`, req: 'macOS 10.15+', color: 'from-ink-700 to-ink-900' },
];

const features = [
  'Works fully offline — syncs when internet returns',
  'Thermal printer support (Epson, Star, Bixolon)',
  'USB and Bluetooth barcode scanners, plug and play',
  'Auto-updates in background, digitally signed',
  'Native speed — 10x faster than browser',
  'Encrypted local cache for instant startup',
];

export default function DownloadPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="live" size="md" pulse>
              <DownloadIcon className="h-3 w-3" /> v{VERSION} — free download
            </Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto">
              <GradientText variant="brand">Nafaa on every device you own</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Desktop for the counter, mobile for the owner\'s pocket. One account, everything in sync.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="md">
          <Container>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {platforms.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.name + p.arch} className={`relative rounded-3xl overflow-hidden bg-white dark:bg-ink-800 ring-2 ring-inset ${p.primary ? 'ring-brand-500 shadow-brand-glow' : 'ring-ink-100 dark:ring-ink-700/60'} hover:-translate-y-1 hover:shadow-card-hover transition-all`}>
                    {p.primary && (
                      <div className="absolute top-0 right-0 bg-gradient-brand text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-2xl">
                        MOST POPULAR
                      </div>
                    )}
                    <div className={`p-6 bg-gradient-to-br ${p.color} text-white`}>
                      <Icon className="h-10 w-10" />
                      <h3 className="mt-3 font-display font-extrabold text-xl">{p.name}</h3>
                      <p className="text-sm opacity-85">{p.arch}</p>
                    </div>
                    <div className="p-6 space-y-3">
                      <div className="flex justify-between text-sm"><span className="text-ink-500">Size</span><span className="font-bold">{p.size}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-ink-500">Requires</span><span className="font-bold text-xs">{p.req}</span></div>
                      <a href={`${RELEASE}/${p.file}`} download
                        className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition ${p.primary ? 'bg-gradient-brand shadow-brand-glow hover:-translate-y-0.5' : 'bg-ink-900 dark:bg-ink-700 hover:bg-ink-800'}`}>
                        <DownloadIcon className="h-4 w-4" /> Download
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 max-w-3xl mx-auto rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
              <div className="flex items-center gap-3 mb-5">
                <Smartphone className="h-6 w-6 text-brand-600" />
                <h3 className="font-display font-extrabold text-xl">Why the desktop app wins</h3>
              </div>
              <ul className="grid sm:grid-cols-2 gap-3">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-700 dark:text-ink-200">
                    <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </Section>

        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}

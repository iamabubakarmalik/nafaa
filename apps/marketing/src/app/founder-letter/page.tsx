import { Heart, MapPin } from 'lucide-react';
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
  title: 'A letter from the founder — Abubakar Malik',
  description: 'Why we built Nafaa, what we believe, and where we\'re going. A personal letter from founder Abubakar Malik to every Pakistani business owner.',
  path: '/founder-letter',
});

export default function FounderLetterPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-10">
          <AuroraBackground variant="pk" intensity="base" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="pk" size="md">
              <Heart className="h-3.5 w-3.5" /> A personal note
            </Badge>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight max-w-3xl mx-auto">
              <GradientText variant="pk">A letter from the founder</GradientText>
            </h1>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container size="md">
            <div className="rounded-3xl bg-white dark:bg-ink-800 p-8 lg:p-12 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
              <div className="flex items-center gap-4 pb-6 mb-8 border-b border-ink-100 dark:border-ink-700/60">
                <div className="h-16 w-16 rounded-full bg-gradient-brand flex items-center justify-center text-white font-display font-extrabold text-2xl shadow-brand-glow">
                  AM
                </div>
                <div>
                  <div className="font-display font-extrabold text-xl">Abubakar Malik</div>
                  <div className="text-sm text-ink-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> Founder, Nafaa · Gujranwala, Pakistan
                  </div>
                </div>
              </div>

              <div className="prose-nafaa">
                <p><em>Dear Pakistani business owner,</em></p>
                <p>
                  I need to start with a confession — Nafaa wasn't born in a boardroom or a Silicon Valley garage. It was born on a summer night in 2024, sitting on the floor of my cousin's bakery in Gujranwala, watching him spend four hours reconciling a paper register after fourteen hours behind the counter.
                </p>
                <p>
                  He wasn't running a small business — he was running <strong>three</strong>. He had a passion for cakes that made customers travel across the city. And yet, every single night, he was hunched over faded pages, trying to remember who owed what, wondering if today was actually profitable, and going to sleep at 2 AM only to wake up at 6.
                </p>
                <p>
                  I asked him: <em>"Bhai, is se behtar tareeqa nahi hai?"</em>
                </p>
                <p>
                  His answer changed everything: <em>"Software kharida tha. English mein tha. Card leta tha. Khata samajhta hi nahi tha. Wapas notebook pe aa gaya."</em>
                </p>
                <p>
                  That's when I realized — every "solution" for Pakistani businesses was actually a foreign product wearing a translated jacket. QuickBooks doesn't understand udhaar. Tally doesn't speak Urdu. Foreign POS systems don't accept JazzCash. And nobody, <em>nobody</em>, was building for the corner shop in Multan, the bakery in Lahore, the pharmacy in Karachi, or the salon in Peshawar.
                </p>
                <h2>So we built Nafaa.</h2>
                <p>
                  Not adapted for Pakistan. <strong>Built in Pakistan, for Pakistan.</strong> From day one — khata, udhaar, WhatsApp receipts, FBR compliance, Raast payments, offline mode for when the internet dies, and full Urdu because our mothers and fathers deserve technology in their own language.
                </p>
                <p>
                  Today, businesses across 47 Pakistani cities run on Nafaa. From a two-shelf kiryana in Sukkur to a fifty-branch restaurant chain in Karachi. And we're just getting started.
                </p>
                <h2>What we believe</h2>
                <p>
                  We believe every Pakistani business — no matter how small — deserves the same technological power that only multinationals could afford. We believe software should feel <em>obvious</em>, not clever. We believe respecting a shopkeeper's time is the highest form of design.
                </p>
                <p>
                  We believe that when a shopkeeper in Bahawalpur gets home at 9 PM instead of 11 PM because our software saved him two hours — his family wins. And that's what we're really building for.
                </p>
                <h2>Where we're going</h2>
                <p>
                  Nafaa Bazaar just launched — Pakistan's first marketplace built around <em>how Pakistanis actually shop</em>, with bargaining, group buys, live shopping, and auctions. Nafaa Academy teaches business skills in Urdu. Nafaa Capital (coming) will unlock working capital based on your Nafaa data.
                </p>
                <p>
                  The mission is simple: <strong>every Pakistani business, digitally empowered.</strong>
                </p>
                <p>
                  If you're on this page, you're either considering Nafaa or already using it. Either way — thank you. Thank you for trusting a Gujranwala kid with the software that runs your livelihood. We take that responsibility seriously.
                </p>
                <p>
                  You can email me directly at <a href="mailto:abubakar@nafaa.pk">abubakar@nafaa.pk</a>. I read every message. I usually reply within a day. If I don't, WhatsApp me at +92 324 1772933 — same person, faster.
                </p>
                <p>With love from Pakistan,</p>
                <p>
                  <strong>Abubakar Malik</strong><br />
                  <em>Founder, Nafaa</em>
                </p>
              </div>
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

import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { DeepFAQ } from '@/components/home/DeepFAQ';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'FAQ — everything about Nafaa answered',
  description: 'Every question about Nafaa answered: pricing, offline mode, FBR, payments, industries, multi-shop, and data security.',
  path: '/faq',
});

export default function FAQPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-8">
          <AuroraBackground variant="brand" intensity="subtle" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Eyebrow variant="brand">Answers</Eyebrow>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight">
              <GradientText variant="brand">Every question, answered honestly</GradientText>
            </h1>
          </Container>
        </section>
        <DeepFAQ />
        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { fadeUp, viewport } from '@/lib/motion/presets';
import type { IntegrationContent } from '@/lib/data/integration-content';
import { cn } from '@/lib/cn';

export function IntegrationCode({ content }: { content: IntegrationContent }) {
  const { locale } = useLocale();
  const [copied, setCopied] = useState(false);
  const isUr = locale === 'ur';

  if (!content.codeExample) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content.codeExample!.code);
      setCopied(true);
      toast.success(isUr ? 'کوڈ کاپی ہو گیا' : 'Code copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Section variant="subtle" spacing="lg">
      <Container size="md">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
          className="text-center mb-10"
        >
          <Eyebrow variant="brand" icon={<Code2 className="h-3.5 w-3.5" />}>
            {isUr ? 'ڈویلپرز کے لیے' : 'For developers'}
          </Eyebrow>
          <h2 className={cn(
            'mt-4 font-display font-extrabold text-3xl lg:text-4xl tracking-tight',
            isUr && 'font-urdu leading-snug',
          )}>
            {isUr ? 'کوڈ سے مثال' : 'See it in code'}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.5 }}
          className="relative rounded-2xl overflow-hidden bg-ink-950 shadow-2xl ring-1 ring-inset ring-ink-800"
        >
          <div className="flex items-center justify-between px-5 py-3 bg-ink-900 border-b border-ink-800">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-amber-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
              </div>
              <span className="text-xs font-mono text-ink-400 ml-2">
                {content.codeExample.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-ink-500 font-bold">
                {content.codeExample.language}
              </span>
              <button
                onClick={copy}
                className="p-1.5 rounded-lg bg-ink-800 hover:bg-ink-700 text-ink-300 hover:text-white transition-colors"
                aria-label="Copy code"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <pre className="p-5 lg:p-6 overflow-x-auto text-sm leading-relaxed">
            <code className="text-ink-100 font-mono whitespace-pre">{content.codeExample.code}</code>
          </pre>
        </motion.div>
      </Container>
    </Section>
  );
}

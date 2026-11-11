/**
 * The partner's referral link and code: copy, QR code (download as PNG) and
 * a ready WhatsApp message. Shops that sign up through it are counted for
 * this partner.
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Copy, Download, MessageCircle, Share2 } from 'lucide-react';
import { Button, PageHero, PageShell, Skeleton } from '@/design-system/components';
import { useAuthStore } from '@/store/auth.store';
import { referralLink } from '@/lib/constants';
import { copyText } from '@/lib/clipboard';
import { Section } from '@/ui/Section';

const shareText = (link: string, code: string) =>
  `Assalam o alaikum! Apni dukaan ka hisaab asaan banayein. Nafaa se bill, stock, udhaar (khata) aur profit sab mobile par.\n\nIs link se account banayein:\n${link}\n\nYa signup par ye code likhein: ${code}`;

export default function SharePage() {
  const me = useAuthStore((s) => s.me);
  const code = me?.code ?? '';
  const link = referralLink(code);
  const [qr, setQr] = useState('');

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 2, width: 640, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
  }, [link]);

  const copy = async (text: string, what: string) => {
    if (await copyText(text)) toast.success(`${what} copy ho gaya`);
    else toast.error('Copy nahi ho saka. Daba kar khud select karein.');
  };
  const message = shareText(link, code);
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <PageShell>
      <PageHero title="Mera link" subtitle="Is link ya code se Signup karne wali har dukaan aap ke naam hogi" />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Section>
            <p className="text-[0.8125rem] font-medium text-slate-500">Aap ka partner code</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="select-all font-mono text-[2rem] font-extrabold tracking-[0.12em] text-slate-900 sm:text-[2.5rem]">{code}</p>
              <Button variant="secondary" size="lg" onClick={() => void copy(code, 'Code')} leftIcon={<Copy className="h-4 w-4" />}>Copy</Button>
            </div>
            <p className="mt-4 text-[0.8125rem] font-medium text-slate-500">Signup link</p>
            <div className="mt-1 flex items-center gap-2 rounded-2xl bg-slate-50 p-2 ps-3 ring-1 ring-slate-200">
              <p className="min-w-0 flex-1 select-all truncate font-mono text-[0.875rem] text-slate-700">{link}</p>
              <Button size="sm" onClick={() => void copy(link, 'Link')} leftIcon={<Copy className="h-3.5 w-3.5" />}>Copy</Button>
            </div>
          </Section>

          <Section title="WhatsApp par bhejein">
            <div className="whitespace-pre-line rounded-2xl bg-[#e7fbe6] p-3.5 text-[0.9375rem] leading-relaxed text-slate-800 ring-1 ring-green-200">{message}</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-5 text-base font-bold text-white shadow-sm active:scale-[0.99]">
                <MessageCircle className="h-5 w-5" />WhatsApp
              </a>
              {canShare
                ? <Button size="xl" variant="secondary" onClick={() => void navigator.share({ title: 'Nafaa', text: message }).catch(() => undefined)} leftIcon={<Share2 className="h-5 w-5" />}>Kahin aur bhejein</Button>
                : <Button size="xl" variant="secondary" onClick={() => void copy(message, 'Message')} leftIcon={<Copy className="h-5 w-5" />}>Message copy</Button>}
            </div>
          </Section>
        </div>

        <Section title="QR code" action={qr ? <a href={qr} download={`nafaa-${code}.png`} className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700"><Download className="h-4 w-4" />PNG</a> : undefined}>
          <p className="-mt-1 mb-3 text-[0.875rem] text-slate-500">Dukaandar phone ke camera se scan kare to seedha Signup page khulega.</p>
          <div className="mx-auto w-full max-w-xs rounded-3xl bg-white p-3 ring-1 ring-slate-200">
            {qr ? <img src={qr} alt={`QR code: ${link}`} className="aspect-square w-full" /> : <Skeleton className="aspect-square w-full rounded-2xl" />}
            <p className="mt-1 text-center font-mono text-[0.875rem] font-bold tracking-widest text-slate-700">{code}</p>
          </div>
          {qr && (
            <a href={qr} download={`nafaa-${code}.png`} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-base font-bold text-brand-fg shadow-sm">
              <Download className="h-5 w-5" />QR download karein
            </a>
          )}
        </Section>
      </div>
    </PageShell>
  );
}

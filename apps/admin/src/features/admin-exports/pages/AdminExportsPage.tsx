/** Data exports: platform-wide Excel files for shops and payments, built on the server. */

import { useState } from 'react';
import { toast } from 'sonner';
import { Building2, CreditCard, Download, FileSpreadsheet, Lightbulb, ShieldCheck } from 'lucide-react';
import { Button, Card, PageHero, PageShell, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useAuthStore } from '@/store/auth.store';
import { Pill } from '@/features/shared/kit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const EXPORTS = [
  { id: 'tenants', title: 'All shops', icon: Building2, color: '#4f46e5', description: 'Every shop with its plan, usage and referral details.', path: '/admin/exports/tenants', file: 'shops' },
  { id: 'payments', title: 'All payments', icon: CreditCard, color: '#059669', description: 'The last 5,000 plan payments with full details.', path: '/admin/exports/payments', file: 'payments' },
] as const;

export default function AdminExportsPage() {
  const guide = usePageGuide();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (e: (typeof EXPORTS)[number]) => {
    setBusy(e.id);
    try {
      const res = await fetch(`${API_URL}${e.path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error('Download failed');
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: `nafaa-${e.file}-${new Date().toISOString().slice(0, 10)}.xlsx` });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Downloaded');
    } catch {
      toast.error('Download failed. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageShell>
      <PageHero
        title="Data exports"
        chip="Excel files"
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={[{ label: 'Exports', value: String(EXPORTS.length) }, { label: 'Format', value: 'Excel (.xlsx)' }, { label: 'Payments included', value: 'Last 5,000' }]}
      />

      <section className="grid gap-4 sm:grid-cols-2">
        {EXPORTS.map((e) => (
          <Card key={e.id}>
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${e.color}1a`, color: e.color }}><e.icon className="h-5 w-5" /></span>
              <Pill><FileSpreadsheet className="h-3 w-3" /> Excel</Pill>
            </div>
            <h3 className="mt-4 text-[1rem] font-semibold text-slate-900">{e.title}</h3>
            <p className="mt-1 text-[0.8125rem] text-slate-500">{e.description}</p>
            <Button className="mt-5" fullWidth leftIcon={<Download className="h-4 w-4" />} loading={busy === e.id} onClick={() => download(e)}>Download</Button>
          </Card>
        ))}
      </section>

      {guide.isOpen && (
        <PageGuide
          title="Data exports"
          description="Download platform-wide data as Excel files."
          flowTitle="How an export works"
          flow={[
            { label: 'Press Download', hint: 'Asks the server', icon: Download, color: '#4f46e5' },
            { label: 'Server builds file', hint: 'From live data', icon: FileSpreadsheet, color: '#0284c7' },
            { label: 'File saves', hint: 'To your computer', icon: ShieldCheck, color: '#059669' },
          ]}
          steps={[
            { icon: Building2, color: '#4f46e5', title: 'Shops', text: 'One row per shop with plan, usage and referral details. The internal system shop is left out.' },
            { icon: CreditCard, color: '#059669', title: 'Payments', text: 'The most recent 5,000 plan payments. For older ones, use the Payments page filters.' },
            { icon: ShieldCheck, color: '#d97706', title: 'Handle with care', text: 'These files hold customer contact details. Keep them private and delete them when done.' },
          ]}
          tips={['Each list page also has its own Export CSV for the rows you filtered.', 'Large exports can take a few seconds.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

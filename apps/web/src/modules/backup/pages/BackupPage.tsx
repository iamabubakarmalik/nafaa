/**
 * Backup: one JSON file with all the business records, what it holds, when
 * the last one was taken, and a history of backups and file exports. Owner
 * only. Nothing on this page changes or removes data.
 *
 * Keys: D download · 1-2 tabs · G guide.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight, BookOpen, Building2, CheckCircle2, Cloud, Database, Download, FileSpreadsheet, FolderTree, GraduationCap,
  History, Lock, Package, Receipt, ShieldCheck, ShoppingCart, Truck, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Alert, Button, Card, EmptyState, Kbd, KpiCard, KpiRow, PageHero, PageShell, Skeleton, ViewTabs, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { backupApi, type BackupSummary } from '../api/backup.api';

type CountKey = keyof BackupSummary['counts'];
const TABLES: Array<{ key: CountKey; label: string; icon: LucideIcon; color: string }> = [
  { key: 'sales', label: 'Sale ke bill', icon: ShoppingCart, color: '#16a34a' },
  { key: 'products', label: 'Products', icon: Package, color: '#2563eb' },
  { key: 'customers', label: 'Customers', icon: Users, color: '#db2777' },
  { key: 'khataEntries', label: 'Khata entries', icon: BookOpen, color: '#7c3aed' },
  { key: 'purchases', label: 'Purchase', icon: Receipt, color: '#d97706' },
  { key: 'suppliers', label: 'Suppliers', icon: Truck, color: '#ea580c' },
  { key: 'expenses', label: 'Expenses', icon: Wallet, color: '#e11d48' },
  { key: 'stockMovements', label: 'Stock entries', icon: ArrowLeftRight, color: '#0891b2' },
  { key: 'categories', label: 'Categories', icon: FolderTree, color: '#65a30d' },
  { key: 'cashRegisters', label: 'Drawer ke din', icon: Wallet, color: '#0d9488' },
  { key: 'transfers', label: 'Stock transfers', icon: Truck, color: '#0284c7' },
  { key: 'shops', label: 'Branches', icon: Building2, color: '#475569' },
];

const when = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const daysSince = (v: string) => Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000);
const n = (v?: number) => (v ?? 0).toLocaleString('en-PK');

export default function BackupPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [tab, setTab] = useState<'backup' | 'history'>('backup');
  const summary = useQuery({ queryKey: ['backup-summary'], queryFn: backupApi.summary });
  const history = useQuery({ queryKey: ['backup-history'], queryFn: backupApi.history });

  const download = useMutation({
    mutationFn: backupApi.download,
    onMutate: () => toast.info('Backup tayyar ho raha hai…', { description: 'Bara karobar ho to thora waqt lagta hai' }),
    onSuccess: (bytes) => {
      toast.success('Backup download ho gaya', { description: `${(bytes / 1024 / 1024).toFixed(2)} MB — ab ise Drive ya email me rakh dein` });
      qc.invalidateQueries({ queryKey: ['backup-summary'] });
      qc.invalidateQueries({ queryKey: ['backup-history'] });
    },
    onError: () => toast.error('Backup nahi bana — internet check karke dobara koshish karein'),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'd' || e.key === 'D') && !download.isPending) { e.preventDefault(); download.mutate(); }
      if (e.key === '1') setTab('backup');
      if (e.key === '2') setTab('history');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const s = summary.data;
  const total = s ? Object.values(s.counts).reduce((a, b) => a + (b ?? 0), 0) : 0;
  const last = s?.lastBackup ?? null;
  const age = last ? daysSince(last.at) : null;
  const status = age == null ? { label: 'Kabhi nahi liya', tone: 'danger' as const }
    : age === 0 ? { label: 'Aaj liya', tone: 'success' as const }
    : age < 7 ? { label: `${age} din pehle`, tone: 'success' as const }
    : { label: `${age} din pehle`, tone: age < 30 ? 'warning' as const : 'danger' as const };
  const log = history.data ?? [];

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Backup — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Download, color: '#2563eb', title: 'Download karein', text: '"Backup download" ya D dabayein. Saara data ek file me aa jata hai.' },
            { icon: Cloud, color: '#16a34a', title: 'Mehfooz jagah rakhein', text: 'File Google Drive, email ya USB me rakhein — sirf is computer par nahi.' },
            { icon: History, color: '#7c3aed', title: 'Record dekhein', text: 'History tab me har backup aur Excel file ka waqt aur nikaalne wale ka naam.' },
            { icon: FileSpreadsheet, color: '#d97706', title: 'Excel chahiye?', text: 'Accountant ke liye Exports page se alag alag Excel files nikaalein.' },
          ]}
          tips={['Har hafte ek backup lein. 7 din se purana ho to ye page yaad dilata hai.', 'File me customers aur hisaab hai — sirf bharose wale ke paas rakhein.']}
          shortcuts={[['D', 'download'], ['1-2', 'tabs'], ['G', 'guide']]} />
      )}

      <PageHero
        title="Backup"
        chip={<><ShieldCheck />{status.label}</>}
        meta="Poore karobar ka data ek file me — sirf malik ke liye"
        loading={summary.isLoading}
        busy={summary.isFetching && !summary.isLoading}
        actions={<>
          <button type="button" onClick={() => download.mutate()} disabled={download.isPending} title="Download (D)" className={heroPrimaryButton}>
            <Download className="h-4 w-4" />{download.isPending ? 'Ban raha hai…' : 'Backup download'}
          </button>
          <button type="button" onClick={guide.open} aria-label="Guide" title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Kul records', value: n(total) },
          { label: 'Aakhri backup', value: last ? when(last.at) : 'Kabhi nahi', hint: last?.by ?? undefined },
          { label: 'Sale ke bill', value: n(s?.counts.sales) },
        ]}
      />

      <KpiRow>
        {summary.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : TABLES.slice(0, 5).map((t) => (
          <KpiCard key={t.key} icon={t.icon} color={t.color} label={t.label} value={n(s?.counts[t.key])} />
        ))}
      </KpiRow>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd> / <Kbd>2</Kbd> se badlein</>}
        tabs={[{ id: 'backup', label: 'Backup', icon: Database }, { id: 'history', label: 'History', icon: History, count: log.length || null }]} />

      {tab === 'backup' && (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3">
            {status.tone !== 'success' && !summary.isLoading && (
              <Alert tone={status.tone} title={age == null ? 'Abhi tak koi backup nahi liya' : `Aakhri backup ${age} din purana hai`}
                action={<Button size="sm" loading={download.isPending} onClick={() => download.mutate()}><Download className="h-4 w-4" /> Abhi lein</Button>}>
                Computer kharab ya chori ho jaye to apna record mehfooz rahe — har hafte ek backup lein.
              </Alert>
            )}
            <Card className="rounded-3xl" title="Is file me kya hai" description={`${n(total)} records · ${s?.meta.tenantName ?? ''}`}>
              {summary.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : summary.isError ? (
                <EmptyState title="Hisaab load nahi hua" action={<Button variant="secondary" onClick={() => summary.refetch()}>Dobara koshish</Button>} />
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {TABLES.map((t) => (
                    <li key={t.key} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${t.color}17`, color: t.color }}><t.icon className="h-3.5 w-3.5" /></span>
                      <span className="flex-1 text-[0.8125rem] text-slate-700">{t.label}</span>
                      <span className="text-[0.8125rem] font-semibold tabular-nums text-slate-900">{n(s?.counts[t.key])}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[0.75rem] text-slate-500">Saath me: dukaan ki settings, bill ki cheezein, purchase ki cheezein, drawer ki entries aur stock adjustments.</p>
            </Card>
          </div>

          <div className="space-y-3">
            <Card className="rounded-3xl" title="Mehfooz kaise rakhein">
              <ul className="space-y-2 text-[0.8125rem] text-slate-700">
                {[
                  [Cloud, 'File Google Drive ya email par bhi rakhein, sirf is computer par nahi.'],
                  [CheckCircle2, 'Har hafte naya backup — purane bhi rakh sakte hain.'],
                  [Lock, 'File me customers, udhaar aur profit hai — kisi anjaan ko na dein. Malik ka PIN file me nahi jata.'],
                  [Database, 'Is file se data khud wapas nahi dala jata — zaroorat ho to support se baat karein.'],
                ].map(([Icon, text]) => {
                  const I = Icon as LucideIcon;
                  return <li key={text as string} className="flex items-start gap-2.5"><I className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span>{text as string}</span></li>;
                })}
              </ul>
            </Card>
            <Link to="/exports" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 transition hover:ring-brand-300">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><FileSpreadsheet className="h-5 w-5" /></span>
              <span className="flex-1">
                <span className="block text-[0.875rem] font-semibold text-slate-900">Excel files chahiye?</span>
                <span className="block text-[0.75rem] text-slate-500">Sale, khata, stock — period ke hisaab se, Exports page par</span>
              </span>
            </Link>
          </div>
        </div>
      )}

      {tab === 'history' && (history.isLoading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : log.length === 0 ? (
        <div className="rounded-3xl bg-white ring-1 ring-slate-200/80"><EmptyState icon={<History className="h-6 w-6" />} title="Abhi koi backup ya file nahi nikaali" description="Pehla backup lein — yahan us ka record aayega" /></div>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <ul className="divide-y divide-slate-100">
            {log.map((h) => {
              const isBackup = h.action === 'BACKUP_DOWNLOADED';
              return (
                <li key={h.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isBackup ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                    {isBackup ? <Database className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.875rem] font-semibold text-slate-900">{h.description}</p>
                    <p className="text-[0.75rem] text-slate-500">{when(h.createdAt)} · {h.user?.fullName ?? '—'}{isBackup && h.metadata?.bytes ? ` · ${(h.metadata.bytes / 1024 / 1024).toFixed(2)} MB` : ''}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </PageShell>
  );
}

/**
 * Exports: Excel (and sales PDF) files of the business records for any
 * period and the current branch, plus a history of who downloaded which
 * file. Each file shows only to people who may see those records.
 *
 * Keys: / search · 1-2 tabs · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, CalendarRange, Database, Download, FileSpreadsheet, FileText, GraduationCap, History, Package, ShieldCheck,
  ShoppingCart, Truck, Users, Wallet, ArrowLeftRight, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Button, DateRangeMenu, EmptyState, FilterBar, FilterChip, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useAuthStore } from '@core/stores/auth.store';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS, hasPermission, type PermissionKey } from '@core/lib/permissions';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { exportsApi, type ExportFormat, type ExportKind } from '../api/exports.api';

interface FileCard {
  kind: ExportKind;
  title: string;
  text: string;
  icon: LucideIcon;
  color: string;
  permission: PermissionKey;
  /** Follows the chosen period; the others are always the full list. */
  dated: boolean;
  pdf?: boolean;
}

const FILES: FileCard[] = [
  { kind: 'sales', title: 'Bikri', text: 'Har bill: customer, raqam, discount, udhaar, wapsi, payment aur cashier', icon: ShoppingCart, color: '#16a34a', permission: PERMISSIONS.SALES_VIEW, dated: true, pdf: true },
  { kind: 'purchases', title: 'Kharidari', text: 'Supplier ke bill: maal, tax, adaigi aur wapsi', icon: Truck, color: '#d97706', permission: PERMISSIONS.PURCHASES_VIEW, dated: true },
  { kind: 'expenses', title: 'Kharche', text: 'Har kharcha: qism, raqam, tareeqa aur kis ne likha', icon: Wallet, color: '#e11d48', permission: PERMISSIONS.EXPENSES_VIEW, dated: true },
  { kind: 'ledger', title: 'Khata', text: 'Customers ka udhaar aur wasooli, har entry ke baad baqi', icon: BookOpen, color: '#7c3aed', permission: PERMISSIONS.KHATA_VIEW, dated: true },
  { kind: 'stock-movements', title: 'Stock ka aana jana', text: 'Kharid, bikri, wapsi, kharab, transfer — har tabdeeli', icon: ArrowLeftRight, color: '#0891b2', permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW, dated: true },
  { kind: 'products', title: 'Maal (products)', text: 'Saare products: qeemat, stock, barcode aur category', icon: Package, color: '#2563eb', permission: PERMISSIONS.PRODUCTS_VIEW, dated: false },
  { kind: 'customers', title: 'Customers', text: 'Naam, phone, udhaar, credit limit aur loyalty points', icon: Users, color: '#db2777', permission: PERMISSIONS.CUSTOMERS_VIEW, dated: false },
  { kind: 'suppliers', title: 'Suppliers', text: 'Rabta, bank tafseel, kul kharid aur baqi', icon: Truck, color: '#ea580c', permission: PERMISSIONS.SUPPLIERS_VIEW, dated: false },
];

const when = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function ExportsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const startHour = useBusinessDayStart();
  const user = useAuthStore((s) => s.user);
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const [tab, setTab] = useState<'files' | 'history'>('files');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const range = resolveRange(period, startHour);
  const label = range ? rangeLabel(range.from, range.to) : 'Sab waqt';

  const may = (p: PermissionKey) => hasPermission(user?.role, user?.permissions, p);
  const canBackup = usePermission(PERMISSIONS.BACKUP_MANAGE);
  const canCost = usePermission(PERMISSIONS.COST_VIEW);

  const history = useQuery({ queryKey: ['exports-history'], queryFn: exportsApi.history });
  const download = useMutation({
    mutationFn: ({ kind, format, dated }: { kind: ExportKind; format: ExportFormat; title: string; dated: boolean }) =>
      exportsApi.download(kind, format, dated ? range : null),
    onSuccess: (bytes, v) => {
      toast.success(`${v.title} ki file download ho gayi`, { description: `${(bytes / 1024).toFixed(0)} KB${v.dated ? ` · ${label}` : ''}` });
      qc.invalidateQueries({ queryKey: ['exports-history'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const busy = (kind: ExportKind, format: ExportFormat) => download.isPending && download.variables?.kind === kind && download.variables.format === format;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); setTab('files'); setTimeout(() => searchRef.current?.focus(), 30); }
      if (e.key === '1') setTab('files');
      if (e.key === '2') setTab('history');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = search.trim().toLowerCase();
  const files = FILES.filter((f) => may(f.permission) && (!q || `${f.title} ${f.text}`.toLowerCase().includes(q)));
  const log = history.data ?? [];
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const thisMonth = log.filter((h) => new Date(h.createdAt) >= monthStart).length;
  const mine = log.filter((h) => h.user?.fullName === user?.fullName).length;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Exports — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#2563eb', title: 'Muddat chunein', text: 'Bikri, kharidari, kharche, khata aur stock ki files isi muddat ki banti hain.' },
            { icon: FileSpreadsheet, color: '#16a34a', title: 'Excel dabayein', text: 'File foran download hoti hai — Excel, Google Sheets ya phone par khulti hai.' },
            { icon: FileText, color: '#e11d48', title: 'Bikri ka PDF', text: 'Print ke liye tayyar bikri ki list (naye 500 bill). Poori list Excel me.' },
            { icon: History, color: '#7c3aed', title: 'History', text: 'Kis ne kab kaunsi file nikaali — sab yahan likha rehta hai.' },
          ]}
          tips={[
            'Upar branch badalne se file usi branch ki banti hai. "Sab branches" par poora karobar.',
            canCost ? 'Cost aur stock ki qeemat sirf un files me aati hai jinhein cost dekhne ki ijazat ho.' : 'Cost ke column aap ki files me nahi aate — ye ijazat malik deta hai.',
            'Files me customers ke phone aur udhaar hota hai — sirf bharose wale ko bhejein.',
          ]}
          shortcuts={[['/', 'dhoondein'], ['1-2', 'tabs'], ['G', 'guide']]} />
      )}

      <PageHero
        title="Exports"
        chip={<><CalendarRange />{label}</>}
        meta={`${tenantName ?? ''} · upar chuni hui branch ki files`}
        busy={history.isFetching && !history.isLoading}
        actions={<>
          {canBackup && <Link to="/backup" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold text-white ring-1 ring-white/25 hover:bg-white/25"><Database className="h-4 w-4" /> Poora backup</Link>}
          <button type="button" onClick={guide.open} aria-label="Guide" title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Files tayyar', value: String(files.length) },
          { label: 'Is mahine downloads', value: String(thisMonth) },
          { label: 'Aakhri file', value: log[0] ? when(log[0].createdAt) : '—', hint: log[0]?.user?.fullName },
        ]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={FileSpreadsheet} color="#16a34a" label="Muddat wali files" value={String(files.filter((f) => f.dated).length)} hint={label} />
        <KpiCard icon={Package} color="#2563eb" label="Poori list wali" value={String(files.filter((f) => !f.dated).length)} hint="Maal, customers, suppliers" />
        <KpiCard icon={History} color="#7c3aed" label="Aap ki downloads" value={String(mine)} hint="History · dabayein" onClick={() => setTab('history')} active={tab === 'history'} />
        <KpiCard icon={ShieldCheck} color="#0891b2" label="Cost columns" value={canCost ? 'Shaamil' : 'Chhupe'} hint={canCost ? 'Aap cost dekh sakte hain' : 'Ijazat nahi'} />
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="File dhoondein: bikri, khata, stock…" label="File dhoondein" />}
        chips={q ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined}
        onClear={() => setSearch('')}>
        <DateRangeMenu value={period} onChange={setPeriod} startHour={startHour} defaultPreset="thisMonth" />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd> / <Kbd>2</Kbd> se badlein</>}
        tabs={[{ id: 'files', label: 'Files', icon: Download, count: files.length }, { id: 'history', label: 'History', icon: History, count: log.length || null }]} />

      {tab === 'files' && (files.length === 0 ? (
        <div className="rounded-3xl bg-white ring-1 ring-slate-200/80">
          <EmptyState icon={<Download className="h-6 w-6" />} title={q ? 'Aisi koi file nahi' : 'Koi file aap ke liye nahi'} description={q ? 'Doosra lafz likhein' : 'Records dekhne ki ijazat malik se lein'}
            action={q ? <Button variant="secondary" onClick={() => setSearch('')}>Search hatayein</Button> : undefined} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {files.map((f) => (
            <section key={f.kind} className="flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${f.color}17`, color: f.color }}><f.icon className="h-5 w-5" /></span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600">{f.dated ? label : 'Poori list'}</span>
              </div>
              <h3 className="mt-3 text-[0.9375rem] font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-0.5 flex-1 text-[0.8125rem] text-slate-500">{f.text}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1" loading={busy(f.kind, 'excel')} disabled={download.isPending && !busy(f.kind, 'excel')}
                  onClick={() => download.mutate({ kind: f.kind, format: 'excel', title: f.title, dated: f.dated })}>
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </Button>
                {f.pdf && (
                  <Button size="sm" variant="secondary" className="flex-1" loading={busy(f.kind, 'pdf')} disabled={download.isPending && !busy(f.kind, 'pdf')}
                    onClick={() => download.mutate({ kind: f.kind, format: 'pdf', title: f.title, dated: f.dated })}>
                    <FileText className="h-4 w-4" /> PDF
                  </Button>
                )}
              </div>
            </section>
          ))}
        </div>
      ))}

      {tab === 'history' && (history.isLoading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : log.length === 0 ? (
        <div className="rounded-3xl bg-white ring-1 ring-slate-200/80"><EmptyState icon={<History className="h-6 w-6" />} title="Abhi koi file nahi nikaali" description="Files tab se pehli file download karein" /></div>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <ul className="divide-y divide-slate-100">
            {log.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{h.metadata?.format === 'pdf' ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.875rem] font-semibold text-slate-900">{h.description}</p>
                  <p className="text-[0.75rem] text-slate-500">{when(h.createdAt)} · {h.user?.fullName ?? '—'}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PageShell>
  );
}

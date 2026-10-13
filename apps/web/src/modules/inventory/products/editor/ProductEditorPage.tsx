/**
 * Shared product create/edit page. Steps come from the industry config; the
 * page gives them a stepper, a live summary, a sticky action bar, a saved
 * draft for new products, and a success screen.
 *
 * Keys: Ctrl/Cmd+S save · Alt+→ next step · Alt+← previous step.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, History, List, Loader2, Plus, Save } from 'lucide-react';
import { Button, Kbd, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import { openingStock } from './save';
import { useProductEditor } from './useProductEditor';
import type { EditorConfig } from './types';

const fmt = (n: number) => String(Number(Number(n).toFixed(3)));

export function ProductEditorPage<X>({ config }: { config: EditorConfig<X> }) {
  const e = useProductEditor(config);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const c = e.draft.core;

  const doSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await e.save();
      if (e.isEdit) { toast.success('Save ho gaya'); navigate(config.paths.detail(id)); }
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (err as Error).message || 'Save nahi hua');
    } finally { setBusy(false); }
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); void doSave(); }
      else if (ev.altKey && ev.key === 'ArrowRight') { ev.preventDefault(); e.next(); }
      else if (ev.altKey && ev.key === 'ArrowLeft') { ev.preventDefault(); e.back(); }
    };
    const onLeave = (ev: BeforeUnloadEvent) => { if (e.dirty && !e.savedId) { ev.preventDefault(); ev.returnValue = ''; } };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onLeave); };
  });

  if (e.isEdit && e.loadError) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center ring-1 ring-slate-200">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <p className="mt-3 font-semibold text-slate-900">Product nahi khul saka</p>
        <p className="mt-1 text-[0.875rem] text-slate-500">{e.loadError.message}</p>
        <Button className="mt-4" onClick={() => navigate(config.paths.list)}>Maal ki list</Button>
      </div>
    );
  }
  if (!e.ready) {
    return <div className="mx-auto max-w-6xl space-y-4"><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-[28rem] rounded-2xl" /></div>;
  }

  if (e.savedId && !e.isEdit) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-600"><CheckCircle2 className="h-9 w-9" /></span>
        <h2 className="mt-4 text-xl font-bold text-slate-900">"{c.name}" ban gayi</h2>
        <p className="mt-1 text-[0.875rem] text-slate-500">Ab POS par bik sakti hai.</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[['Rate', formatPKR(c.price)], ['Stock', `${fmt(openingStock(c))} ${c.unit}`], ['Variants', String(c.variants.length)]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 p-3"><p className="text-[0.6875rem] text-slate-500">{l}</p><p className="truncate font-bold tabular-nums text-slate-900">{v}</p></div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={e.reset}>Aur banayein</Button>
          <Button variant="secondary" leftIcon={<Eye className="h-4 w-4" />} onClick={() => navigate(config.paths.detail(e.savedId!))}>Dekhein</Button>
          <Button variant="ghost" leftIcon={<List className="h-4 w-4" />} onClick={() => navigate(config.paths.list)}>Maal ki list</Button>
        </div>
      </div>
    );
  }

  const stepErrorsCount = (i: number) => Object.keys(e.stepErrors[i] ?? {}).length;
  const isLast = e.stepIndex === e.steps.length - 1;
  const margin = c.price > 0 && c.costPrice > 0 ? ((c.price - c.costPrice) / c.price) * 100 : null;
  const checklist = [
    { ok: !!c.name.trim(), label: 'Naam' },
    { ok: c.price > 0, label: 'Bechne ki qeemat' },
    { ok: c.costPrice > 0, label: 'Cost (profit ke liye)' },
    { ok: !!c.categoryId, label: 'Category' },
    { ok: !!(c.barcode || c.sku), label: 'Barcode ya SKU' },
    { ok: c.images.length > 0, label: 'Tasveer' },
  ];

  return (
    <div className="mx-auto w-full max-w-[90rem] pb-28">
      {e.saving && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-2xl"><Loader2 className="h-5 w-5 animate-spin text-brand-600" /><span className="font-medium text-slate-800">{e.saving}…</span></div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to={e.isEdit && e.id ? config.paths.detail(e.id) : config.paths.list} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />{e.isEdit ? 'Wapas product par' : 'Maal ki list'}
          </Link>
          <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-[1.375rem]">
            {e.isEdit ? `Badlein: ${c.name || '…'}` : `Naya maal · ${config.label}`}
          </h1>
        </div>
        <div className="hidden items-center gap-2 text-[0.75rem] text-slate-500 md:flex">
          <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save · <Kbd>Alt</Kbd>+<Kbd>→</Kbd> agla
        </div>
      </div>

      {e.stored && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-200">
          <History className="h-5 w-5 text-sky-600" />
          <p className="flex-1 text-[0.875rem] text-sky-900">Pichli dafa <strong>"{e.stored.core.name}"</strong> adhoori reh gayi thi.</p>
          <Button size="sm" onClick={e.restore}>Wahin se shuru</Button>
          <Button size="sm" variant="ghost" onClick={e.discardStored}>Naye sire se</Button>
        </div>
      )}

      {/* Mobile stepper */}
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 lg:hidden [scrollbar-width:none]">
        {e.steps.map((s, i) => (
          <button key={s.id} type="button" onClick={() => e.goTo(i)}
            className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold',
              i === e.stepIndex ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}>
            <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[0.6875rem]', i === e.stepIndex ? 'bg-white/20' : 'bg-slate-100')}>{i + 1}</span>{s.title}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_19rem]">
        {/* Desktop stepper */}
        <nav className="hidden lg:block" aria-label="Steps">
          <ol className="sticky top-24 space-y-1">
            {e.steps.map((s, i) => {
              const on = i === e.stepIndex;
              const done = i < e.stepIndex && stepErrorsCount(i) === 0;
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => e.goTo(i)}
                    className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition', on ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/70')}>
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', on ? 'bg-brand-600 text-white' : done ? 'bg-success-50 text-success-600' : 'bg-slate-100 text-slate-500')}>
                      {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className={cn('block text-[0.875rem] font-semibold', on ? 'text-slate-900' : 'text-slate-700')}>{s.title}</span>
                      <span className="block truncate text-[0.6875rem] text-slate-500">{s.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <main className="min-w-0">
          {e.step.render({ draft: e.draft, isEdit: e.isEdit, productId: e.id, setCore: e.setCore, setExtra: e.setExtra, errors: e.errors, touch: e.touch })}
        </main>

        {/* Live summary */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-3">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <div className="aspect-[4/3] bg-slate-100"><ProductThumb name={c.name || 'Naya'} url={c.images[0]?.url} size="full" /></div>
              <div className="p-4">
                <p className="line-clamp-2 font-semibold text-slate-900">{c.name || 'Naam likhein…'}</p>
                <p className="mt-1 text-[1.25rem] font-bold tabular-nums text-slate-900">{formatPKR(c.price)}<span className="text-[0.75rem] font-medium text-slate-500"> /{c.unit}</span></p>
                <dl className="mt-3 space-y-1.5 text-[0.8125rem]">
                  <div className="flex justify-between"><dt className="text-slate-500">Cost</dt><dd className="tabular-nums">{c.costPrice ? formatPKR(c.costPrice) : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Profit</dt><dd className={cn('font-semibold tabular-nums', margin === null ? 'text-slate-400' : margin < 0 ? 'text-rose-600' : 'text-success-700')}>{margin === null ? '—' : `${formatPKR(c.price - c.costPrice)} · ${margin.toFixed(0)}%`}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Stock</dt><dd className="tabular-nums">{fmt(e.isEdit ? c.stock : openingStock(c))} {c.unit}</dd></div>
                  {c.variants.length > 0 && <div className="flex justify-between"><dt className="text-slate-500">Variants</dt><dd>{c.variants.length}</dd></div>}
                  {c.units.length > 0 && <div className="flex justify-between"><dt className="text-slate-500">Packing</dt><dd>{c.units.length}</dd></div>}
                  {c.batches.length > 0 && <div className="flex justify-between"><dt className="text-slate-500">Batches</dt><dd>{c.batches.length}</dd></div>}
                </dl>
                {config.summary?.(e.draft)}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
              <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Mukammal</p>
              <ul className="space-y-1.5 text-[0.8125rem]">
                {checklist.map((x) => (
                  <li key={x.label} className={cn('flex items-center gap-2', x.ok ? 'text-slate-700' : 'text-slate-400')}>
                    <span className={cn('flex h-4 w-4 items-center justify-center rounded-full', x.ok ? 'bg-success-500 text-white' : 'border border-slate-300')}>{x.ok && <Check className="h-3 w-3" strokeWidth={3} />}</span>{x.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[90rem] items-center gap-2">
          <Button variant="secondary" onClick={e.back} disabled={e.stepIndex === 0} leftIcon={<ArrowLeft className="h-4 w-4" />}>Peeche</Button>
          <p className="hidden flex-1 text-center text-[0.8125rem] text-slate-500 sm:block">
            Step {e.stepIndex + 1} / {e.steps.length} · {e.step.title}
            {!e.valid && <span className="ml-2 font-medium text-rose-600">· kuch khane baqi</span>}
          </p>
          <span className="flex-1 sm:hidden" />
          {!isLast && <Button variant={e.isEdit ? 'secondary' : 'primary'} onClick={() => e.next()} rightIcon={<ArrowRight className="h-4 w-4" />}>Aage</Button>}
          {(e.isEdit || isLast) && <Button onClick={() => void doSave()} loading={busy} leftIcon={<Save className="h-4 w-4" />}>{e.isEdit ? 'Save karein' : 'Bana dein'}</Button>}
        </div>
      </div>
    </div>
  );
}

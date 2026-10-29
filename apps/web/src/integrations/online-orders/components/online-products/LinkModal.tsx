/**
 * Link a channel's products to Nafaa. The channel list comes in with
 * suggestions: "Pakka match" (same SKU or barcode) can be linked all at once,
 * "Shayad" (same or similar name, with a score) one by one, and items Nafaa
 * does not have can be created in Nafaa. A product with sizes always links
 * per size. Opened from a grid cell, it lists channel items for that one
 * Nafaa product or size.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Check, CloudDownload, Link2, Package, RefreshCw, Sparkles, X } from 'lucide-react';
import { Button, EmptyState, Modal, SearchField, Segmented, Skeleton, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, type LinkInput } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type OnlineChannel, type RemoteView, type SuggestionRow, type UnmatchedGroup } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { ProductPicker } from '../products/ProductPicker';
import { ChannelMark, channelName, refreshOnlineProducts, rs } from './meta';

type Tab = 'sure' | 'maybe' | 'missing';
export interface LinkFocus { productId: string; variantId: string | null; title: string }

const PAGE = 60;

const toLink = (r: RemoteView, productId: string, variantId: string | null): LinkInput => ({
  externalProductId: r.externalProductId,
  externalVariantId: r.externalVariantId,
  productId,
  variantId,
  externalTitle: r.hasVariants && r.variantTitle ? `${r.title} — ${r.variantTitle}` : r.title,
  externalImage: r.image,
  externalSku: r.sku,
});

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9؀-ۿ]+/).filter((w) => w.length > 1);
function closeness(a: string, b: string) {
  const A = new Set(words(a));
  const B = words(b);
  if (!A.size || !B.length) return 0;
  return B.filter((w) => A.has(w)).length / Math.max(A.size, B.length);
}

export function LinkModal({ channel, focus, canManage, onClose }: { channel: OnlineChannel; focus?: LinkFocus; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const key = [ONLINE_PRODUCTS_KEY, 'suggestions', channel.id];
  const q = useQuery({ queryKey: key, queryFn: () => onlineProductsApi.suggestions(channel.id), staleTime: 120_000 });
  const [tab, setTab] = useState<Tab>('sure');
  const [search, setSearch] = useState('');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(PAGE);
  const name = channelName(channel);

  const refresh = useMutation({
    mutationFn: () => onlineProductsApi.suggestions(channel.id, true),
    onSuccess: (d) => { qc.setQueryData(key, d); toast.success(`${name} se taaza list aa gayi`); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const after = (msg: string, errors?: string[]) => {
    refreshOnlineProducts(qc);
    if (errors?.[0]) toast.error(errors[0]);
    toast.success(msg);
  };
  const link = useMutation({
    mutationFn: (links: LinkInput[]) => onlineProductsApi.link(channel.id, links),
    onSuccess: (r) => { after(r.saved === 1 ? 'Jor diya' : `${r.saved} jor diye`, r.errors); if (focus && r.saved) onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const create = useMutation({
    mutationFn: (ids: string[]) => onlineProductsApi.importItems(channel.id, ids),
    onSuccess: (r) => { setPicked(new Set()); after(`${r.created} naye products Nafaa me bane${r.linkedExisting ? `, ${r.linkedExisting} pehle walon se jure` : ''}`, r.errors); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const d = q.data;
  const rowKey = (r: RemoteView) => `${r.externalProductId}:${r.externalVariantId ?? '-'}`;
  const term = search.trim().toLowerCase();
  const hit = (...xs: Array<string | null | undefined>) => !term || xs.some((x) => x?.toLowerCase().includes(term));

  const sure = useMemo(() => (d?.sure ?? []).filter((r) => !hidden.has(rowKey(r)) && hit(r.title, r.variantTitle, r.sku, r.match.name, r.match.sku)), [d, hidden, term]); // eslint-disable-line react-hooks/exhaustive-deps
  const maybe = useMemo(() => (d?.maybe ?? []).filter((r) => !hidden.has(rowKey(r)) && hit(r.title, r.variantTitle, r.sku, r.match.name)), [d, hidden, term]); // eslint-disable-line react-hooks/exhaustive-deps
  const missing = useMemo(() => (d?.unmatched ?? []).filter((g) => hit(g.title, ...g.variants.map((v) => v.sku))), [d, term]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus mode: every open channel item, closest to the Nafaa name first.
  const focusList = useMemo(() => {
    if (!focus || !d) return [];
    const all: Array<{ r: RemoteView; mine: boolean }> = [
      ...d.sure.map((r) => ({ r: r as RemoteView, mine: r.match.productId === focus.productId && r.match.variantId === focus.variantId })),
      ...d.maybe.map((r) => ({ r: r as RemoteView, mine: r.match.productId === focus.productId && r.match.variantId === focus.variantId })),
      ...d.unmatched.flatMap((g) => g.variants.map((r) => ({ r, mine: false }))),
    ];
    return all
      .filter(({ r }) => hit(r.title, r.variantTitle, r.sku))
      .map((x) => ({ ...x, score: x.mine ? 2 : closeness(focus.title, `${x.r.title} ${x.r.variantTitle ?? ''}`) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, PAGE);
  }, [focus, d, term]); // eslint-disable-line react-hooks/exhaustive-deps

  const importable = missing.filter((g) => g.canImport);
  const list = tab === 'sure' ? sure : maybe;

  return (
    <Modal open onClose={onClose} size="xl"
      title={<span className="flex items-center gap-2"><ChannelMark channel={channel} size="sm" />{focus ? `${focus.title} — ${name} par jorein` : `${name} — products jorein`}</span>}
      description={d?.fetchedAt && d.stats.variants ? `${d.stats.products} products · ${d.stats.linked} / ${d.stats.variants} jure · list ${timeAgo(d.fetchedAt)} ki` : d ? name : `${name} ki list aa rahi hai…`}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[12rem] flex-1">
            <SearchField value={search} onChange={(v) => { setSearch(v); setShown(PAGE); }} placeholder="Naam ya SKU…" label="Channel products search" />
          </div>
          <Button size="sm" variant="secondary" loading={refresh.isPending || (q.isFetching && !q.isLoading)} onClick={() => refresh.mutate()} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Taaza list
          </Button>
        </div>

        {q.isLoading ? (
          <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : q.isError || !d ? (
          <EmptyState icon={<Package className="h-5 w-5" />} title="List nahi aayi" description={apiErrorMessage(q.error)} action={<Button size="sm" onClick={() => q.refetch()}>Dobara</Button>} />
        ) : !d.canFetch || (d.remoteError && !d.stats.variants) ? (
          <EmptyState icon={<Package className="h-5 w-5" />} title={`${name} ki list nahi aayi`} description={d.remoteError ?? 'Channel jura nahi'} action={<Button size="sm" onClick={() => refresh.mutate()}>Dobara</Button>} />
        ) : focus ? (
          focusList.length === 0 ? (
            <EmptyState icon={<Check className="h-5 w-5" />} title="Koi khula product nahi mila" description={`${name} ka har product pehle se jura hai, ya search badal kar dekhein.`} />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200/80">
              {focusList.map(({ r, mine }) => (
                <li key={rowKey(r)} className="flex flex-wrap items-center gap-3 bg-white px-3 py-2.5">
                  <Remote r={r} className="min-w-[12rem] flex-1" />
                  {mine && <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-success-700"><Sparkles className="h-3 w-3" /> Salah</span>}
                  {canManage && (
                    <Button size="sm" variant={mine ? 'primary' : 'secondary'} loading={link.isPending && link.variables?.[0]?.externalVariantId === r.externalVariantId && link.variables?.[0]?.externalProductId === r.externalProductId}
                      onClick={() => link.mutate([toLink(r, focus.productId, focus.variantId)])} leftIcon={<Link2 className="h-4 w-4" />}>Is se jorein</Button>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Segmented<Tab> label="Kaunse dikhayein" value={tab} onChange={(t) => { setTab(t); setShown(PAGE); }} className="max-w-full overflow-x-auto"
                items={[
                  { value: 'sure', label: 'Pakka match', count: sure.length },
                  { value: 'maybe', label: 'Shayad', count: maybe.length },
                  { value: 'missing', label: 'Nafaa me nahi', count: missing.reduce((n, g) => n + g.variants.length, 0) },
                ]} />
              {canManage && tab === 'sure' && sure.length > 0 && (
                <Button size="sm" loading={link.isPending} leftIcon={<Sparkles className="h-4 w-4" />}
                  onClick={() => link.mutate(sure.map((r) => toLink(r, r.match.productId, r.match.variantId)))}>
                  Sab pakke jod dein ({sure.length})
                </Button>
              )}
              {canManage && tab === 'missing' && importable.length > 0 && (
                <Button size="sm" variant="success" loading={create.isPending} leftIcon={<CloudDownload className="h-4 w-4" />} disabled={!picked.size}
                  onClick={async () => {
                    if (await confirmDialog({ title: `${picked.size} products Nafaa me banayein?`, text: 'Naam, Price, tasveer aur sizes aa jayenge. Channel par minus Stock ho to Nafaa me 0 se shuru hoga. Jo naam Nafaa me pehle se hai wo nahi banega — usi se jur jayega.' })) create.mutate([...picked]);
                  }}>
                  {picked.size ? `Chune hue ${picked.size} Nafaa me banayein` : 'Chun kar Nafaa me banayein'}
                </Button>
              )}
            </div>

            {d.remoteError && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.78125rem] text-amber-900 ring-1 ring-amber-200">{d.remoteError}</p>}

            {tab !== 'missing' ? (
              list.length === 0 ? (
                <EmptyState icon={<Check className="h-5 w-5" />}
                  title={tab === 'sure' ? 'Koi pakka match baqi nahi' : 'Koi shayad wala match nahi'}
                  description={tab === 'sure' ? 'Same SKU ya barcode wale sab jure hue hain. "Shayad" aur "Nafaa me nahi" dekhein.' : 'Naam se milte products yahan aate hain.'} />
              ) : (
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200/80">
                  {list.slice(0, shown).map((r) => (
                    <SuggestionItem key={rowKey(r)} r={r} sure={tab === 'sure'} canManage={canManage}
                      busy={link.isPending && link.variables?.length === 1 && rowKey(link.variables[0] as any) === rowKey(r)}
                      onLink={(productId, variantId) => link.mutate([toLink(r, productId, variantId)])}
                      onHide={() => setHidden((s) => new Set(s).add(rowKey(r)))} />
                  ))}
                </ul>
              )
            ) : missing.length === 0 ? (
              <EmptyState icon={<Check className="h-5 w-5" />} title="Sab products ka jora mil gaya" description={`${name} ka har product Nafaa me hai.`} />
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200/80">
                {missing.slice(0, shown).map((g) => (
                  <MissingItem key={g.externalProductId} g={g} canManage={canManage} picked={picked.has(g.externalProductId)}
                    onPick={() => setPicked((s) => { const n = new Set(s); n.has(g.externalProductId) ? n.delete(g.externalProductId) : n.add(g.externalProductId); return n; })}
                    creating={create.isPending && create.variables?.length === 1 && create.variables[0] === g.externalProductId}
                    onCreate={() => create.mutate([g.externalProductId])}
                    onLink={(r, productId, variantId) => link.mutate([toLink(r, productId, variantId)])} />
                ))}
              </ul>
            )}
            {(tab === 'missing' ? missing.length : list.length) > shown && (
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="w-full rounded-2xl bg-white py-2.5 text-[0.8125rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50">
                Aur dikhayein
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function SizeChip({ children }: { children: ReactNode }) {
  return <span className="max-w-[9rem] shrink-0 truncate rounded-md bg-slate-100 px-1.5 py-px text-[0.71875rem] font-semibold text-slate-800 ring-1 ring-slate-200/80">{children}</span>;
}

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/80">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Package className="h-4 w-4 text-slate-400" />}
    </span>
  );
}

function Remote({ r, className }: { r: RemoteView; className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Thumb src={r.image} />
      <div className="min-w-0">
        <p className="truncate text-[0.84375rem] font-semibold text-slate-900" title={r.title}>{r.title}</p>
        <p className="flex min-w-0 items-center gap-1.5 text-[0.75rem] text-slate-500">
          {r.variantTitle && <SizeChip>{r.variantTitle}</SizeChip>}
          <span className="truncate">{r.sku ? <span className="font-mono">{r.sku}</span> : 'SKU nahi'} · {rs(r.price)}{r.stock !== null ? ` · Stock ${r.stock}` : ''}</span>
        </p>
      </div>
    </div>
  );
}

function SuggestionItem({ r, sure, canManage, busy, onLink, onHide }: {
  r: SuggestionRow; sure: boolean; canManage: boolean; busy: boolean; onLink: (productId: string, variantId: string | null) => void; onHide: () => void;
}) {
  const m = r.match;
  const why = m.kind === 'sku' ? 'SKU mila' : m.kind === 'name' ? 'Naam mila' : `${Math.round(m.score * 100)}% milta`;
  return (
    <li className="grid gap-2 bg-white px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)_auto] md:items-center md:gap-3">
      <Remote r={r} />
      <ArrowRight className="hidden h-4 w-4 text-slate-300 md:block" />
      <div className="min-w-0 pl-[3.125rem] md:pl-0">
        <p className="truncate text-[0.84375rem] font-medium text-slate-900" title={m.name}>{m.name}</p>
        <p className="flex min-w-0 items-center gap-1.5 text-[0.75rem] text-slate-500">
          {m.variantName && <SizeChip>{m.variantName}</SizeChip>}
          <span className={cn('shrink-0 rounded-full px-1.5 py-px text-[0.6875rem] font-semibold', sure ? 'bg-success-50 text-success-700' : m.score >= 0.85 ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-800')}>{why}</span>
          <span className="truncate">Nafaa {rs(m.price)}{m.sku ? <span className="font-mono"> · {m.sku}</span> : null}</span>
        </p>
      </div>
      {canManage && (
        <div className="flex items-center gap-1.5 pl-[3.125rem] md:pl-0">
          <Button size="xs" variant={sure ? 'secondary' : 'primary'} loading={busy} onClick={() => onLink(m.productId, m.variantId)} leftIcon={<Link2 className="h-3.5 w-3.5" />}>
            {sure ? 'Jorein' : 'Haan, jorein'}
          </Button>
          <span className="min-w-0 flex-1 md:w-36 md:flex-none"><ProductPicker compact initialSearch={r.title.split(/\s+/).slice(0, 2).join(' ')} placeholder="Doosra" onPick={(p) => onLink(p.productId, p.variantId)} /></span>
          {!sure && (
            <button type="button" onClick={onHide} aria-label="Ye match ghalat hai" title="Ghalat match — chhupayein"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
          )}
        </div>
      )}
    </li>
  );
}

function MissingItem({ g, canManage, picked, onPick, creating, onCreate, onLink }: {
  g: UnmatchedGroup; canManage: boolean; picked: boolean; onPick: () => void; creating: boolean; onCreate: () => void;
  onLink: (r: RemoteView, productId: string, variantId: string | null) => void;
}) {
  return (
    <li className="bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        {canManage && g.canImport && (
          <input type="checkbox" checked={picked} onChange={onPick} aria-label={`${g.title} chunein`} className="h-4 w-4 rounded border-slate-300" />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Thumb src={g.image} />
          <div className="min-w-0">
            <p className="truncate text-[0.84375rem] font-semibold text-slate-900">{g.title}</p>
            <p className="text-[0.75rem] text-slate-500">{g.hasVariants ? (g.variants.length === 1 ? '1 size jorna baqi' : `${g.variants.length} sizes jorne baqi`) : `${g.variants[0]?.sku ? `SKU ${g.variants[0].sku} · ` : ''}${rs(g.variants[0]?.price ?? 0)}`}</p>
          </div>
        </div>
        {canManage && g.canImport && (
          <Button size="xs" variant="success" loading={creating} onClick={onCreate} leftIcon={<CloudDownload className="h-3.5 w-3.5" />}>Nafaa me banayein</Button>
        )}
        {canManage && !g.hasVariants && (
          <span className="w-48"><ProductPicker compact initialSearch={g.title.split(/\s+/).slice(0, 2).join(' ')} placeholder="Nafaa product chunein" onPick={(p) => onLink(g.variants[0], p.productId, p.variantId)} /></span>
        )}
      </div>
      {g.hasVariants && (
        <ul className="mt-2 space-y-1.5 pl-0 sm:pl-[3.25rem]">
          {g.variants.map((v) => (
            <li key={v.externalVariantId ?? v.title} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100">
              <SizeChip>{v.variantTitle ?? 'Default'}</SizeChip>
              <span className="min-w-0 flex-1 truncate text-[0.75rem] text-slate-500">{v.sku ? <span className="font-mono">{v.sku}</span> : 'SKU nahi'} · {rs(v.price)}{v.stock !== null ? ` · Stock ${v.stock}` : ''}</span>
              {canManage && <span className="w-44"><ProductPicker compact initialSearch={g.title.split(/\s+/).slice(0, 2).join(' ')} placeholder="Nafaa size chunein" onPick={(p) => onLink(v, p.productId, p.variantId)} /></span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

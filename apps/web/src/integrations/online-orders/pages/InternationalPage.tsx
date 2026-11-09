/**
 * International selling for the custom storefront (order form / Buy button):
 * manual exchange rates, the countries the shop ships to, a country price
 * list and which products ship abroad. Customers see prices in their
 * currency; the shop's books stay in PKR.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Globe, Plane, Plus, Save, Trash2, GraduationCap } from 'lucide-react';
import { heroIconButton } from '@/design-system/components';
import {
  Button, Card, EmptyState, Input, KpiCard, KpiRow, PageHero, PageShell, Select, Skeleton, Switch, Table, TBody, Td, Th, THead, Tr,
} from '@/design-system/components';
import { t } from '@core/i18n';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { radarApi, type IntlCountry, type IntlCurrency, type IntlSettings } from '../api/radar.api';

const PRESETS: Array<{ code: string; name: string; currency: string }> = [
  { code: 'US', name: 'USA', currency: 'USD' }, { code: 'GB', name: 'UK', currency: 'GBP' }, { code: 'AE', name: 'UAE', currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' }, { code: 'CA', name: 'Canada', currency: 'CAD' }, { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'DE', name: 'Germany', currency: 'EUR' }, { code: 'QA', name: 'Qatar', currency: 'QAR' }, { code: 'OM', name: 'Oman', currency: 'OMR' },
];

export default function InternationalPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const channels = useQuery({ queryKey: ['sales-channels'], queryFn: () => onlineOrdersApi.channels() });
  const custom = useMemo(() => (channels.data ?? []).filter((c) => c.platform === 'custom'), [channels.data]);
  const [channelId, setChannelId] = useState('');
  useEffect(() => { if (!channelId && custom[0]) setChannelId(custom[0].id); }, [custom, channelId]);

  const q = useQuery({ queryKey: ['intl', channelId], queryFn: () => radarApi.intl(channelId), enabled: !!channelId });
  const [draft, setDraft] = useState<IntlSettings | null>(null);
  useEffect(() => { if (q.data) setDraft(q.data); }, [q.data]);
  const dirty = !!draft && !!q.data && JSON.stringify([draft.enabled, draft.currencies, draft.countries, draft.defaultCountry]) !== JSON.stringify([q.data.enabled, q.data.currencies, q.data.countries, q.data.defaultCountry]);

  const save = useMutation({
    mutationFn: () => radarApi.saveIntl(channelId, { enabled: draft!.enabled, currencies: draft!.currencies, countries: draft!.countries, defaultCountry: draft!.defaultCountry }),
    onSuccess: (r) => { qc.setQueryData(['intl', channelId], r); setDraft(r); toast.success(t('Save ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const setCur = (i: number, patch: Partial<IntlCurrency>) => setDraft((d) => d && ({ ...d, currencies: d.currencies.map((c, n) => (n === i ? { ...c, ...patch } : c)) }));
  const setCountry = (i: number, patch: Partial<IntlCountry>) => setDraft((d) => d && ({ ...d, countries: d.countries.map((c, n) => (n === i ? { ...c, ...patch } : c)) }));
  const addCountry = (code: string) => {
    const p = PRESETS.find((x) => x.code === code);
    if (!p || !draft) return;
    setDraft({
      ...draft,
      currencies: draft.currencies.some((c) => c.code === p.currency) ? draft.currencies : [...draft.currencies, { code: p.currency, rate: 0, decimals: 2 }],
      countries: [...draft.countries, { ...p, shippingFee: 0, freeAbove: null }],
    });
  };

  const [priceCountry, setPriceCountry] = useState('');
  const savedCountries = q.data?.countries ?? [];

  return (
    <PageShell>
      <PageHero
        back="/online-store" backLabel={t('Online store')}
        title={t('International')}
        chip={<><Globe />{t('Bahar ke customer')}</>}
        meta={t('Order form par doosre mulk ke customer ko un ki currency me price dikhayein. Hisaab hamesha PKR me rehta hai.')}
        loading={channels.isLoading || q.isLoading}
        actions={<>{dirty && <Button size="sm" onClick={() => save.mutate()} loading={save.isPending} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>}<button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button></>}
        stats={[
          { label: t('Mulk'), value: String(q.data?.countries.length ?? 0) },
          { label: t('Currency'), value: String(q.data?.currencies.length ?? 0) },
          { label: t('Bahar nahi jate'), value: String(q.data?.products.blocked ?? 0) },
        ]}
      />

      {channels.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : !custom.length ? (
        <Card><EmptyState icon={<Globe className="h-5 w-5" />} title={t('Pehle apni website jodein')} description={t('International selling Nafaa order form wali custom website par chalti hai.')} /></Card>
      ) : (
        <>
          {custom.length > 1 && (
            <Select label={t('Website')} value={channelId} onChange={(e) => { setChannelId(e.target.value); setPriceCountry(''); }} options={custom.map((c) => ({ value: c.id, label: c.displayName }))} wrapperClassName="max-w-xs" />
          )}
          {!draft ? <Skeleton className="h-64 rounded-2xl" /> : (
            <>
              <KpiRow cols={3}>
                <KpiCard icon={Plane} color="#2563eb" label={t('International selling')} value={draft.enabled ? t('Chalu') : t('Band')} hint={t('Order form par mulk chunne ka option')} />
                <KpiCard icon={Globe} color="#16a34a" label={t('Mulk')} value={String(draft.countries.length)} hint={t('Jahan delivery hoti hai')} />
                <KpiCard icon={Globe} color="#7c3aed" label={t('Apni price list')} value={String(Object.keys(q.data?.priceCounts ?? {}).length)} hint={t('Mulk jin ki apni qeemat hai')} />
              </KpiRow>

              <Card title={t('Chalu karein')}>
                <Switch checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                  label={t('Order form par bahar ke mulk ka option dikhayein')}
                  description={t('Customer mulk chune to price us ki currency me dikhegi. Order PKR me hi bante hain aur payment ka tareeqa aap customer se tay karte hain.')} />
              </Card>

              <Card flush title={t('Exchange rate')} description={t('Aap khud rate likhte hain. 1 unit currency = kitne PKR.')}
                actions={<Button variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...draft, currencies: [...draft.currencies, { code: '', rate: 0, decimals: 2 }] })}>{t('Currency')}</Button>}>
                {!draft.currencies.length ? <p className="px-5 pb-5 pt-3 text-[0.8125rem] text-slate-500">{t('Mulk jodein to uski currency khud aa jayegi.')}</p> : (
                  <div className="mt-3 overflow-x-auto"><Table>
                    <THead><Tr><Th>{t('Currency')}</Th><Th>{t('1 unit = PKR')}</Th><Th /></Tr></THead>
                    <TBody>
                      {draft.currencies.map((c, i) => (
                        <Tr key={i}>
                          <Td><Input size="sm" value={c.code} maxLength={3} placeholder="USD" className="w-24 uppercase" onChange={(e) => setCur(i, { code: e.target.value.toUpperCase() })} aria-label={t('Currency')} /></Td>
                          <Td><Input size="sm" type="number" min={0} step="0.01" value={c.rate || ''} className="w-32" onChange={(e) => setCur(i, { rate: Number(e.target.value) })} aria-label={t('Rate')} /></Td>
                          <Td className="text-end"><Button variant="ghost" size="sm" aria-label={t('Hata dein')} disabled={draft.countries.some((x) => x.currency === c.code)} title={draft.countries.some((x) => x.currency === c.code) ? t('Is currency ka mulk maujood hai') : undefined}
                            onClick={() => setDraft({ ...draft, currencies: draft.currencies.filter((_, n) => n !== i) })}><Trash2 className="h-4 w-4" /></Button></Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table></div>
                )}
              </Card>

              <Card flush title={t('Mulk aur delivery charges')} description={t('Delivery charges PKR me likhein; customer ko us ki currency me dikhenge.')}
                actions={<Select size="sm" value="" onChange={(e) => e.target.value && addCountry(e.target.value)} placeholder={t('Mulk jodein')}
                  options={PRESETS.filter((p) => !draft.countries.some((c) => c.code === p.code)).map((p) => ({ value: p.code, label: `${p.name} (${p.currency})` }))} />}>
                {!draft.countries.length ? <EmptyState icon={<Globe className="h-5 w-5" />} title={t('Koi mulk nahi')} description={t('Upar se mulk chunein.')} /> : (
                  <div className="mt-3 overflow-x-auto"><Table>
                    <THead><Tr><Th>{t('Mulk')}</Th><Th>{t('Currency')}</Th><Th>{t('Delivery (PKR)')}</Th><Th>{t('Free (PKR se upar)')}</Th><Th>{t('Pehle se chuna')}</Th><Th /></Tr></THead>
                    <TBody>
                      {draft.countries.map((c, i) => (
                        <Tr key={c.code}>
                          <Td className="font-medium text-slate-900">{c.name} <span className="text-slate-400">{c.code}</span></Td>
                          <Td>{c.currency}</Td>
                          <Td><Input size="sm" type="number" min={0} className="w-28" value={c.shippingFee || ''} onChange={(e) => setCountry(i, { shippingFee: Number(e.target.value) })} aria-label={t('Delivery')} /></Td>
                          <Td><Input size="sm" type="number" min={0} className="w-28" value={c.freeAbove ?? ''} placeholder={t('Kabhi nahi')} onChange={(e) => setCountry(i, { freeAbove: e.target.value ? Number(e.target.value) : null })} aria-label={t('Free')} /></Td>
                          <Td><input type="radio" name="defaultCountry" checked={draft.defaultCountry === c.code} onChange={() => setDraft({ ...draft, defaultCountry: c.code })} aria-label={t('Pehle se chuna')} /></Td>
                          <Td className="text-end"><Button variant="ghost" size="sm" aria-label={t('Hata dein')} onClick={() => setDraft({ ...draft, countries: draft.countries.filter((_, n) => n !== i), defaultCountry: draft.defaultCountry === c.code ? null : draft.defaultCountry })}><Trash2 className="h-4 w-4" /></Button></Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table></div>
                )}
              </Card>

              {dirty && <p className="text-[0.8125rem] font-medium text-amber-700">{t('Pehle Save karein, phir price list kholein.')}</p>}
              {!!savedCountries.length && !dirty && (
                <PriceList channelId={channelId} countries={savedCountries} country={priceCountry || savedCountries[0].code} onCountry={setPriceCountry}
                  counts={q.data?.priceCounts ?? {}} onChanged={() => qc.invalidateQueries({ queryKey: ['intl', channelId] })} />
              )}
              {dirty && <div className="flex justify-end"><Button onClick={() => save.mutate()} loading={save.isPending} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button></div>}
            </>
          )}
        </>
      )}
      {guide.isOpen && (
        <PageGuide title={t('International — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Currency aur rate'), icon: Globe, color: '#0284c7' },
            { label: t('Mulk aur delivery'), icon: Plane, color: '#7c3aed' },
            { label: t('Customer apni currency me dekhe'), icon: Globe, color: '#16a34a' },
            { label: t('Hisaab PKR me'), icon: Save, color: '#0d9488' },
          ]}
          steps={[
            { icon: Globe, color: '#0284c7', title: t('Rate khud likhein'), text: t('Har currency ka rate aap likhte hain — 1 dollar kitne rupay. Rate badle to yahan badal dein.') },
            { icon: Plane, color: '#7c3aed', title: t('Mulk aur delivery'), text: t('Har mulk ki delivery fees aur kitne se upar free, alag rakh sakte hain.') },
            { icon: Save, color: '#0d9488', title: t('Hisaab hamesha PKR'), text: t('Order Nafaa me PKR me hi banta hai; customer ne jo currency dekhi woh note me likhi jati hai.') },
          ]} />
      )}
    </PageShell>
  );
}

function PriceList({ channelId, countries, country, onCountry, counts, onChanged }: {
  channelId: string; countries: IntlCountry[]; country: string; onCountry: (c: string) => void; counts: Record<string, number>; onChanged: () => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState<Record<string, string>>({});
  useEffect(() => { setEdits({}); setPage(1); }, [country, search]);
  const q = useQuery({ queryKey: ['intl-prices', channelId, country, search, page], queryFn: () => radarApi.intlPrices(channelId, { country, search: search || undefined, page }), placeholderData: (p) => p });
  const key = (pid: string, vid: string | null) => `${pid}|${vid ?? ''}`;
  const save = useMutation({
    mutationFn: () => {
      const rows = Object.entries(edits).map(([k, v]) => { const [productId, variantId] = k.split('|'); return { productId, variantId: variantId || null, price: Number(v) || 0 }; });
      return radarApi.saveIntlPrices(channelId, country, rows);
    },
    onSuccess: (r) => { toast.success(t('{{count}} price save hui', { count: r.saved })); setEdits({}); q.refetch(); onChanged(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const abroad = useMutation({
    mutationFn: (v: { id: string; value: boolean }) => radarApi.shipsAbroad([v.id], v.value),
    onSuccess: () => { q.refetch(); onChanged(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const cur = q.data?.currency;
  return (
    <Card flush title={t('Price list')} description={t('Khali chorein to PKR price rate se badal kar dikhegi. Apni price likhein to wahi dikhegi aur wahi order me jayegi.')}
      actions={<div className="flex flex-wrap items-center gap-2">
        <Select size="sm" value={country} onChange={(e) => onCountry(e.target.value)} options={countries.map((c) => ({ value: c.code, label: `${c.name} (${c.currency})${counts[c.code] ? ` · ${counts[c.code]}` : ''}` }))} />
        <Input size="sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search…')} aria-label={t('Search')} className="w-40" />
        <Button size="sm" disabled={!Object.keys(edits).length} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>
      </div>}>
      {!q.data ? <div className="p-4"><Skeleton className="h-40 rounded-xl" /></div> : !q.data.products.length ? <EmptyState title={t('Koi product nahi mila')} /> : (
        <div className="mt-3 overflow-x-auto"><Table>
          <THead><Tr><Th>{t('Product')}</Th><Th className="text-end">PKR</Th><Th className="text-end">{t('Rate se')} ({cur?.code})</Th><Th>{t('Apni price')} ({cur?.code})</Th><Th>{t('Bahar bhejein')}</Th></Tr></THead>
          <TBody>
            {q.data.products.flatMap((p) => p.lines.map((l, i) => (
              <Tr key={key(p.id, l.variantId)}>
                <Td className="font-medium text-slate-900">{p.name}{l.name ? <span className="text-slate-500"> · {l.name}</span> : null}</Td>
                <Td className="text-end tabular-nums">{Math.round(l.pricePkr).toLocaleString('en-PK')}</Td>
                <Td className="text-end tabular-nums text-slate-500">{(l.pricePkr / (cur?.rate || 1)).toFixed(cur?.decimals ?? 2)}</Td>
                <Td><Input size="sm" type="number" min={0} className="w-28" value={edits[key(p.id, l.variantId)] ?? (l.listPrice ?? '')}
                  onChange={(e) => setEdits({ ...edits, [key(p.id, l.variantId)]: e.target.value })} aria-label={t('Apni price')} /></Td>
                <Td>{i === 0 && <Switch size="sm" checked={p.shipsAbroad} onChange={(e) => abroad.mutate({ id: p.id, value: e.target.checked })} aria-label={t('Bahar bhejein')} />}</Td>
              </Tr>
            )))}
          </TBody>
        </Table></div>
      )}
      {q.data && q.data.pages > 1 && (
        <div className="flex items-center justify-end gap-2 px-5 py-3 text-[0.8125rem]">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('Pehle')}</Button>
          <span className="tabular-nums text-slate-500">{page} / {q.data.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= q.data.pages} onClick={() => setPage(page + 1)}>{t('Agla')}</Button>
        </div>
      )}
    </Card>
  );
}

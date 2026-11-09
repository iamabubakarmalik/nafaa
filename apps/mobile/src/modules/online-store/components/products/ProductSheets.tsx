/**
 * Online products sheets: one linked cell (price, stock sent, last sync,
 * send now, relink, unlink), the channel price rule and stock buffer, the
 * link screen (sure matches, maybe matches, channel items Nafaa does not
 * have), the "Masle" issues list and the channel card.
 */

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle2, Clock, CloudDownload, Link2, Link2Off, PlugZap, RefreshCw, Ruler, Settings2, Sparkles, TriangleAlert, type LucideIcon,
} from 'lucide-react-native';
import {
  applyRule, type GridFilter, type Issue, type LinkInput, type LinkedCell, type OnlineChannel, type PriceRounding, type PriceRule, type PriceRuleMode,
  type RemoteView,
} from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import {
  Badge, Button, Card, Checkbox, EmptyState, Input, MoneyInput, PressableScale, SearchBar, Segmented, Sheet, SkeletonRows, Switch, Tabs, Text,
  confirm, toast, useDebouncedValue, useTheme,
} from '@/design';
import { apiErrorMessage, productsApi, type LinkPatch } from '../../api/online';
import { KEYS } from '../../lib/online';
import { openOnWeb } from '../../lib/device';
import { BrandLogo, brandForChannel } from '../BrandLogo';
import { ProductPicker } from '../ProductPicker';

export const channelBrand = (c: Pick<OnlineChannel, 'type' | 'mode' | 'platform'>) => brandForChannel(c.type, { indolj: c.mode === 'indolj', platform: c.platform });
export const ChannelMark = ({ channel, size = 28 }: { channel: Pick<OnlineChannel, 'type' | 'mode' | 'platform'>; size?: number }) => <BrandLogo name={channelBrand(channel)} size={size} />;
export const refreshProducts = (qc: ReturnType<typeof useQueryClient>) => { qc.invalidateQueries({ queryKey: KEYS.products }); };

export function ruleText(rule: PriceRule): string {
  const parts: string[] = [];
  if (rule.mode === 'NONE' || !rule.value) parts.push(t('Nafaa price'));
  else if (rule.mode === 'PERCENT') parts.push(t('Nafaa price {{value}} {{value2}}%', { value: rule.value > 0 ? '+' : '−', value2: Math.abs(rule.value) }));
  else parts.push(t('Nafaa price {{value}} {{rs}}', { value: rule.value > 0 ? '+' : '−', rs: formatMoney(Math.abs(rule.value)) }));
  if (rule.rounding === 'NEAREST_10') parts.push(t('10 ke qareeb'));
  if (rule.rounding === 'END_9') parts.push(t('9 par khatam'));
  return parts.join(' · ');
}
export function priceText(c: OnlineChannel): string {
  if (c.mode === 'indolj') return t('Price Indolj panel se badlein');
  if (c.mode === 'website') return t('Nafaa price — website khud leti hai');
  return c.pushPrice ? ruleText(c.priceRule) : t('Channel par haath se badlein');
}
export function stockText(c: OnlineChannel): string {
  if (c.mode === 'indolj') return t('Stock Indolj par track nahi');
  const kept = c.stockBuffer ? t(', {{stockBuffer}} rakh kar', { stockBuffer: c.stockBuffer }) : '';
  if (c.mode === 'website') return t('Website Nafaa se leti hai{{kept}}', { kept });
  if (c.canPush && !c.pushStock) return t('Bhejna band hai — channel par haath se');
  return c.stockBuffer ? t('Nafaa se{{kept}}', { kept }) : t('Nafaa se, poora');
}

/** A channel with its link counts, price and stock rule, and its actions. */
export function ChannelCard({ c, sellable, canManage, syncing, onLink, onSettings, onSync }: {
  c: OnlineChannel; sellable: number; canManage: boolean; syncing: boolean; onLink: () => void; onSettings: () => void; onSync: () => void;
}) {
  const th = useTheme();
  const linked = c.linked ?? 0;
  return (
    <Card style={{ width: 290 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2.5) }}>
        <ChannelMark channel={c} size={36} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" weight="bold" numberOfLines={1}>{c.name}</Text>
          <Text size="2xs" tone="muted" numberOfLines={1}>{c.shopName ? t('Stock {{shop}} se', { shop: c.shopName }) : c.siteUrl ?? ''}</Text>
        </View>
        {c.paused ? <Badge tone="warning">{t('Ruka')}</Badge> : !c.live ? <Badge tone="danger">{t('Jura nahi')}</Badge> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: th.space(2), marginTop: th.space(3) }}>
        <View style={{ flex: 1 }}><Text size="lg" weight="bold" ltr>{linked}<Text size="xs" tone="muted">/{sellable}</Text></Text><Text size="2xs" tone="muted">{t('Jure hue')}</Text></View>
        <View style={{ flex: 1 }}><Text size="lg" weight="bold" tone={(c.failed ?? 0) > 0 ? 'danger' : 'default'} ltr>{c.failed ?? 0}</Text><Text size="2xs" tone="muted">{t('Masle')}</Text></View>
      </View>
      <View style={{ gap: 2, marginTop: th.space(2) }}>
        <Text size="xs" tone="secondary" numberOfLines={1}>{t('Price')}: {priceText(c)}</Text>
        <Text size="xs" tone="secondary" numberOfLines={1}>{t('Stock')}: {stockText(c)}</Text>
        {c.lastSyncAt && <Text size="2xs" tone="muted">{t('Aakhri dafa {{lastSyncedAt}}', { lastSyncedAt: formatRelative(c.lastSyncAt) })}</Text>}
      </View>
      {canManage && (
        <View style={{ flexDirection: 'row', gap: th.space(2), marginTop: th.space(3) }}>
          {c.canFetch && <Button size="sm" variant="secondary" icon={Link2} style={{ flex: 1 }} onPress={onLink}>{t('Jorein')}</Button>}
          <Button size="sm" variant="secondary" icon={Settings2} onPress={onSettings} accessibilityLabel={t('Settings')} />
          {c.canPush && <Button size="sm" variant="secondary" icon={RefreshCw} loading={syncing} onPress={onSync} accessibilityLabel={t('Abhi bhejein')} />}
        </View>
      )}
    </Card>
  );
}

const ISSUE_ICON: Record<Issue['kind'], LucideIcon> = { reconnect: PlugZap, 'fix-size-less': Ruler, errors: TriangleAlert, 'link-sure': Sparkles, link: Link2 };

function issueText(i: Issue, c: OnlineChannel | undefined): string {
  if (!c) return i.text;
  const name = c.name;
  const count = i.count ?? 0;
  switch (i.kind) {
    case 'reconnect': return t('{{name}} jura nahi — dobara jorein', { name });
    case 'fix-size-less': return t('{{name}}: {{count}} size wale products bina size jure — theek karein', { name, count });
    case 'errors': return t('{{name}}: {{count}} products ka Stock/Price nahi ja raha', { name, count });
    case 'link-sure': return t('{{name}}: {{count}} products jorna baqi — sab pakke jod dein', { name, count });
    case 'link': return t('{{name}}: {{count}} naye products Nafaa se jure nahi', { name, count });
    default: return i.text;
  }
}

/** "Masle": what needs attention across channels, each with a one-tap fix. */
export function IssuesPanel({ channels, canManage, onLink, onFilter }: {
  channels: OnlineChannel[]; canManage: boolean; onLink: (c: OnlineChannel) => void; onFilter: (c: OnlineChannel, f: GridFilter) => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [...KEYS.products, 'issues'], queryFn: productsApi.issues, staleTime: 60_000 });
  const linkSure = useMutation({
    mutationFn: (id: string) => productsApi.linkSure(id),
    onSuccess: (r) => { refreshProducts(qc); toast.success(r.saved ? t('{{saved}} pakke match jor diye', { saved: r.saved }) : t('Koi pakka match baqi nahi')); if (r.errors[0]) toast.error(r.errors[0]); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const fixSize = useMutation({
    mutationFn: (id: string) => productsApi.fixSizeLess(id),
    onSuccess: (r) => { refreshProducts(qc); toast.success(t('{{removed}} bina size wale link hata diye — ab har size jorein', { removed: r.removed })); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const issues = q.data?.issues ?? [];
  if (!issues.length) return null;
  const byId = new Map(channels.map((c) => [c.id, c]));
  return (
    <Card title={t('Masle')} action={<Badge tone="warning">{issues.length}</Badge>}>
      <View style={{ gap: th.space(3) }}>
        {issues.slice(0, 8).map((i) => {
          const c = byId.get(i.channelId);
          const tone = i.tone === 'danger' ? th.colors.danger : i.tone === 'warning' ? th.colors.warning : th.colors.brand;
          const Icon = ISSUE_ICON[i.kind];
          return (
            <View key={i.id} style={{ gap: th.space(2) }}>
              <View style={{ flexDirection: 'row', gap: th.space(2.5), alignItems: 'flex-start' }}>
                <View style={{ width: 32, height: 32, borderRadius: th.radius('md'), backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={tone.text} /></View>
                <View style={{ flex: 1 }}>
                  <Text size="sm" weight="medium">{issueText(i, c)}</Text>
                  {i.detail ? <Text size="xs" tone="muted" numberOfLines={2}>{i.detail}</Text> : null}
                </View>
              </View>
              {c && (
                <View style={{ flexDirection: 'row', gap: th.space(2), paddingStart: 40 }}>
                  {i.kind === 'reconnect' && <Button size="sm" variant="danger" onPress={() => openOnWeb(`/online-store/channels/${c.id}`)}>{t('Web par dobara jorein')}</Button>}
                  {i.kind === 'fix-size-less' && canManage && <Button size="sm" variant="critical" loading={fixSize.isPending && fixSize.variables === c.id}
                    onPress={async () => { if (await confirm({ title: t('Bina size wale link hatayein?'), message: t('In products ke sizes hain magar channel par poora product ek saath jura hai — is se bill par "Available: 0" aata hai. Link hat jayenge; phir har size alag jorein.'), tone: 'danger', confirmLabel: t('Theek karein') })) fixSize.mutate(c.id); }}>{t('Theek karein')}</Button>}
                  {i.kind === 'errors' && <Button size="sm" variant="secondary" onPress={() => onFilter(c, 'errors')}>{t('Dekhein')}</Button>}
                  {i.kind === 'link-sure' && canManage && <Button size="sm" icon={Sparkles} loading={linkSure.isPending && linkSure.variables === c.id} onPress={() => linkSure.mutate(c.id)}>{t('Sab pakke jod dein')}</Button>}
                  {i.kind === 'link' && canManage && <Button size="sm" variant="secondary" onPress={() => onLink(c)}>{t('Jorein')}</Button>}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/** One product (or size) on one channel. */
export function CellSheet({ open, channel, cell, title, productId, canManage, onRelink, onClose }: {
  open: boolean; channel: OnlineChannel | null; cell: LinkedCell | null; title: string; productId: string; canManage: boolean; onRelink: () => void; onClose: () => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const [own, setOwn] = useState<number | null>(null);
  const [alloc, setAlloc] = useState<string>('');
  useEffect(() => { if (open) { setOwn(cell?.override ?? null); setAlloc(cell?.allocQty == null ? '' : String(cell.allocQty)); } }, [open, cell?.mappingId]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = (m: string) => { refreshProducts(qc); toast.success(m); };
  const price = useMutation({
    mutationFn: (v: number | null) => productsApi.setPrice(cell!.mappingId, v),
    onSuccess: (_r, v) => { done(v === null ? t('Ab rule wali Price lagegi') : t('Apni Price save ho gayi')); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const patch = useMutation({
    mutationFn: (body: LinkPatch) => productsApi.updateLink(cell!.mappingId, body),
    onSuccess: (_r, body) => done(body.listed === false ? t('Channel par chhupa diya (draft)') : body.listed ? t('Channel par dikh raha hai') : t('Stock hissa save ho gaya')),
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const sync = useMutation({
    mutationFn: () => productsApi.syncProduct(productId),
    onSuccess: (r) => { const bad = r.results.find((x) => !x.ok); if (bad) toast.error(`${bad.name}: ${bad.error}`); else done(t('Stock aur Price bhej diye')); refreshProducts(qc); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const unlink = useMutation({
    mutationFn: () => productsApi.unlink(cell!.mappingId),
    onSuccess: () => { done(t('Link hata diya')); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  if (!channel || !cell) return <Sheet open={false} onClose={onClose}><View /></Sheet>;
  const failed = cell.status === 'FAILED';
  const push = channel.canPush;
  const tone = failed ? th.colors.danger : cell.status === 'SUCCESS' ? th.colors.success : th.colors.neutral;
  return (
    <Sheet open={open} onClose={onClose} title={title} description={[channel.name, cell.externalTitle, cell.externalSku ? `SKU ${cell.externalSku}` : null].filter(Boolean).join(' · ')}>
      <View style={{ gap: th.space(3) }}>
        {push ? (
          <View style={{ flexDirection: 'row', gap: th.space(2), backgroundColor: tone.soft, borderRadius: th.radius('lg'), padding: th.space(3) }}>
            {failed ? <AlertTriangle size={16} color={tone.text} /> : cell.status === 'SUCCESS' ? <CheckCircle2 size={16} color={tone.text} /> : <Clock size={16} color={tone.text} />}
            <View style={{ flex: 1 }}>
              <Text size="sm" weight="semibold" color={tone.text}>{failed ? t('Pichli dafa nahi gaya') : cell.status === 'SUCCESS' ? t('Channel par barabar') : t('Abhi nahi bheja')}</Text>
              {failed && cell.error ? <Text size="xs" color={tone.text}>{cell.error}</Text> : null}
              {cell.lastSyncedAt ? <Text size="xs" color={tone.text}>{t('Aakhri dafa {{lastSyncedAt}}', { lastSyncedAt: formatRelative(cell.lastSyncedAt) })}</Text> : null}
            </View>
          </View>
        ) : (
          <Text size="sm" tone="secondary">{channel.mode === 'indolj' ? t('Indolj ka har order is product se bill banata hai. Price Indolj panel se badlein; Stock Indolj par track nahi hota.') : t('Website Stock aur Price khud Nafaa se leti hai — yahan se bhejna nahi padta.')}</Text>
        )}
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          <Card style={{ flex: 1 }}>
            <Text size="2xs" tone="muted">{channel.mode === 'website' ? t('Stock jo website ko dikhta hai') : t('Stock jo channel ko jata hai')}</Text>
            <Text size="lg" weight="bold" ltr>{channel.tracksStock ? cell.stock ?? '—' : t('Track nahi')}</Text>
            <Text size="2xs" tone="muted">{t('Nafaa me {{nafaaStock}}{{value}}', { nafaaStock: cell.nafaaStock, value: channel.tracksStock && channel.stockBuffer ? t(' · {{stockBuffer}} rakh kar', { stockBuffer: channel.stockBuffer }) : '' })}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text size="2xs" tone="muted">{push ? t('Channel ki Price') : t('Nafaa price')}</Text>
            <Text size="lg" weight="bold" ltr>{formatMoney(cell.price)}</Text>
            <Text size="2xs" tone={cell.priceDiffers ? 'warning' : 'muted'}>
              {channel.mode === 'website' ? t('Website ko yahi jati hai') : cell.channelPrice === null ? t('Channel par abhi nahi dekhi') : cell.priceDiffers ? t('Channel par abhi {{channelPrice}}', { channelPrice: formatMoney(cell.channelPrice) }) : t('Channel par bhi yahi')}
            </Text>
          </Card>
        </View>
        {push && (
          <Switch value={cell.listed !== false} disabled={!canManage || patch.isPending} onChange={(v) => patch.mutate({ listed: v })}
            label={t('Channel par dikhayein')} description={cell.listed === false ? t('Abhi draft / chhupa hai — customer nahi khareed sakta') : t('Band karein to channel par chhup jayega (draft)')} />
        )}
        {push && channel.tracksStock && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" weight="semibold">{t('Is channel ka apna Stock hissa')}</Text>
            <Text size="xs" tone="muted">{t('Khali chhorein to channel ka rule lagega. Likhein to sirf itne units is channel par jayenge.')}</Text>
            <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
              <Input containerStyle={{ flex: 1 }} value={alloc} onChangeText={setAlloc} keyboardType="number-pad" placeholder={t('Rule wala')} disabled={!canManage} />
              {canManage && <Button variant="secondary" loading={patch.isPending} onPress={() => patch.mutate({ allocQty: alloc.trim() === '' ? null : Math.max(0, Math.floor(Number(alloc) || 0)) })}>{t('Save')}</Button>}
            </View>
          </View>
        )}
        {push && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" weight="semibold">{t('Is channel par apni Price')}</Text>
            <Text size="xs" tone="muted">{t('Khali chhorein to rule lagega: {{priceRule}}.', { priceRule: ruleText(channel.priceRule) })}</Text>
            <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
              <MoneyInput containerStyle={{ flex: 1 }} value={own} onChangeValue={setOwn} placeholder={t('Rule wali')} disabled={!canManage} />
              {canManage && <Button variant="secondary" loading={price.isPending} onPress={() => price.mutate(own)}>{t('Save')}</Button>}
            </View>
            {!channel.pushPrice && <Text size="xs" weight="medium" tone="warning">{t('Price is channel par haath se badlein — Price bhejna band hai.')}</Text>}
          </View>
        )}
        {canManage && (
          <View style={{ gap: th.space(2) }}>
            {push && <Button icon={RefreshCw} loading={sync.isPending} onPress={() => sync.mutate()}>{t('Abhi bhejein')}</Button>}
            {channel.canFetch && <Button variant="secondary" icon={Link2} onPress={onRelink}>{t('Doosre se jorein')}</Button>}
            <Button variant="ghost" icon={Link2Off} loading={unlink.isPending}
              onPress={async () => { if (await confirm({ title: t('Link hatayein?'), message: push ? t('Is product ka Stock aur Price is channel par jana band ho jayega. Channel par product waise hi rahega.') : t('Is channel ke orders me ye product khud nahi milega — agle order par dobara jorna hoga.'), tone: 'danger', confirmLabel: t('Link hatayein') })) unlink.mutate(); }}>
              {t('Link hatayein')}
            </Button>
          </View>
        )}
      </View>
    </Sheet>
  );
}

/** Price rule, stock buffer, sending switches and auto-link for one channel. */
export function ChannelSettingsSheet({ open, channel: c, onClose }: { open: boolean; channel: OnlineChannel | null; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [pushPrice, setPushPrice] = useState(true);
  const [mode, setMode] = useState<PriceRuleMode>('NONE');
  const [dir, setDir] = useState<'up' | 'down'>('up');
  const [amount, setAmount] = useState('');
  const [rounding, setRounding] = useState<PriceRounding>('NONE');
  const [buffer, setBuffer] = useState('');
  const [pushStock, setPushStock] = useState(true);
  const [autoLink, setAutoLink] = useState(true);
  useEffect(() => {
    if (!open || !c) return;
    setPushPrice(c.pushPrice); setMode(c.priceRule.mode); setDir(c.priceRule.value < 0 ? 'down' : 'up'); setAmount(c.priceRule.value ? String(Math.abs(c.priceRule.value)) : '');
    setRounding(c.priceRule.rounding); setBuffer(c.stockBuffer ? String(c.stockBuffer) : ''); setPushStock(c.pushStock); setAutoLink(c.autoLink);
  }, [open, c?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = mode === 'NONE' ? 0 : (Number(amount) || 0) * (dir === 'down' ? -1 : 1);
  const rule = { mode, value, rounding };
  const tooLow = mode === 'PERCENT' && dir === 'down' && (Number(amount) || 0) >= 90;
  const save = useMutation({
    mutationFn: () => productsApi.settings(c!.id, { ...(c!.canPush ? { pushPrice, priceRule: rule, pushStock, autoLink } : {}), stockBuffer: Math.max(0, Math.floor(Number(buffer) || 0)) }),
    onSuccess: () => { refreshProducts(qc); toast.success(c!.canPush && pushPrice ? t('Save ho gaya — nayi Price aur Stock channel par ja rahe hain') : t('Save ho gaya')); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  if (!c) return <Sheet open={false} onClose={onClose}><View /></Sheet>;
  return (
    <Sheet open={open} onClose={onClose} title={`${c.name} — ${c.canPush ? t('Price aur Stock') : t('Stock buffer')}`}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={tooLow} onPress={() => save.mutate()}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(4) }}>
        {c.canPush && (
          <View style={{ gap: th.space(3) }}>
            <Switch value={pushStock} onChange={setPushStock} label={t('Stock Nafaa se channel par bhejein')}
              description={pushStock ? t('Har sale, return, purchase aur stock badalne par channel ka Stock khud barabar hota hai.') : t('Band hai — channel par Stock bilkul nahi jayega. Wahan haath se rakhein.')} />
            <Switch value={autoLink} onChange={setAutoLink} label={t('Pakke match khud jorein')} />
            <Switch value={pushPrice} onChange={setPushPrice} label={t('Price bhi Nafaa se bhejein')} />
          </View>
        )}
        {c.canPush && pushPrice && (
          <View style={{ gap: th.space(2) }}>
            <Segmented value={mode} onChange={setMode} options={[{ value: 'NONE', label: t('Nafaa price') }, { value: 'PERCENT', label: '%' }, { value: 'FIXED', label: 'Rs' }]} />
            {mode !== 'NONE' && (
              <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
                <Segmented value={dir} onChange={setDir} options={[{ value: 'up', label: t('Zyada') }, { value: 'down', label: t('Kam') }]} style={{ flex: 1 }} />
                <Input containerStyle={{ width: 110 }} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" ltr placeholder={mode === 'PERCENT' ? '10' : '50'} />
              </View>
            )}
            <Segmented value={rounding} onChange={setRounding} options={[{ value: 'NONE', label: t('Jaisa') }, { value: 'NEAREST_10', label: t('10 ke qareeb') }, { value: 'END_9', label: t('9 par khatam') }]} />
            {tooLow && <Text size="xs" tone="danger">{t('90% ya zyada kam nahi ho sakta')}</Text>}
            <View style={{ backgroundColor: th.colors.surfaceMuted, borderRadius: th.radius('md'), padding: th.space(3), gap: 4 }}>
              <Text size="xs" weight="semibold" tone="secondary">{t('Misaal')}</Text>
              {[500, 1250, 3999].map((x) => <Text key={x} size="sm" ltr>{formatMoney(x)} → <Text size="sm" weight="bold">{formatMoney(applyRule(x, rule))}</Text></Text>)}
            </View>
          </View>
        )}
        {c.tracksStock && (
          <Input label={t('Stock buffer')} hint={t('Itne pieces channel ko kam dikhayen — oversell se bachne ke liye.')} value={buffer} onChangeText={setBuffer} keyboardType="number-pad" ltr placeholder="0" />
        )}
      </View>
    </Sheet>
  );
}

export interface LinkFocus { productId: string; variantId: string | null; title: string }
const rowKey = (r: RemoteView) => `${r.externalProductId}:${r.externalVariantId ?? '-'}`;
const toLink = (r: RemoteView, productId: string, variantId: string | null): LinkInput => ({
  externalProductId: r.externalProductId, externalVariantId: r.externalVariantId, productId, variantId,
  externalTitle: r.hasVariants && r.variantTitle ? `${r.title} — ${r.variantTitle}` : r.title, externalImage: r.image, externalSku: r.sku,
});

/** Link a channel's products to Nafaa: sure matches at once, maybe ones one by one, missing ones created in Nafaa. */
export function LinkSheet({ open, channel, focus, canManage, onClose }: { open: boolean; channel: OnlineChannel | null; focus?: LinkFocus; canManage: boolean; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const key = [...KEYS.products, 'suggestions', channel?.id];
  const q = useQuery({ queryKey: key, queryFn: () => productsApi.suggestions(channel!.id), staleTime: 120_000, enabled: open && !!channel });
  const [tab, setTab] = useState<'sure' | 'maybe' | 'missing'>('sure');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim().toLowerCase(), 150);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pickFor, setPickFor] = useState<RemoteView | null>(null);
  useEffect(() => { if (open) { setHidden(new Set()); setPicked(new Set()); setSearch(''); setPickFor(null); setTab('sure'); } }, [open]);
  const after = (msg: string, errors?: string[]) => { refreshProducts(qc); if (errors?.[0]) toast.error(errors[0]); toast.success(msg); };
  const refresh = useMutation({
    mutationFn: () => productsApi.suggestions(channel!.id, true),
    onSuccess: (d) => { qc.setQueryData(key, d); toast.success(t('{{name}} se taaza list aa gayi', { name: channel!.name })); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const link = useMutation({
    mutationFn: (links: LinkInput[]) => productsApi.link(channel!.id, links),
    onSuccess: (r, links) => {
      haptic('success');
      setHidden((h) => { const n = new Set(h); links.forEach((l) => n.add(`${l.externalProductId}:${l.externalVariantId ?? '-'}`)); return n; });
      after(r.saved === 1 ? t('Jor diya') : t('{{saved}} jor diye', { saved: r.saved }), r.errors);
      if (focus && r.saved) onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const create = useMutation({
    mutationFn: (ids: string[]) => productsApi.importItems(channel!.id, ids),
    onSuccess: (r) => { setPicked(new Set()); after(t('{{created}} naye products Nafaa me bane{{value}}', { created: r.created, value: r.linkedExisting ? t(', {{linkedExisting}} pehle walon se jure', { linkedExisting: r.linkedExisting }) : '' }), r.errors); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const d = q.data;
  const hit = (...xs: Array<string | null | undefined>) => !term || xs.some((x) => x?.toLowerCase().includes(term));
  const sure = useMemo(() => (d?.sure ?? []).filter((r) => !hidden.has(rowKey(r)) && hit(r.title, r.variantTitle, r.sku, r.match.name, r.match.sku)), [d, hidden, term]); // eslint-disable-line react-hooks/exhaustive-deps
  const maybe = useMemo(() => (d?.maybe ?? []).filter((r) => !hidden.has(rowKey(r)) && hit(r.title, r.variantTitle, r.sku, r.match.name)), [d, hidden, term]); // eslint-disable-line react-hooks/exhaustive-deps
  const missing = useMemo(() => (d?.unmatched ?? []).filter((g) => hit(g.title, ...g.variants.map((v) => v.sku))), [d, term]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!channel) return <Sheet open={false} onClose={onClose}><View /></Sheet>;

  const remoteRow = (r: RemoteView, right: React.ReactNode, sub?: string) => (
    <View key={rowKey(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" weight="semibold" numberOfLines={2}>{r.title}{r.variantTitle ? <Text size="sm" tone="muted"> · {r.variantTitle}</Text> : null}</Text>
        <Text size="2xs" tone="muted" ltr numberOfLines={1}>{[r.sku ? `SKU ${r.sku}` : null, formatMoney(r.price), r.stock != null ? t('Stock {{stock}}', { stock: r.stock }) : null].filter(Boolean).join(' · ')}</Text>
        {sub ? <Text size="2xs" tone="success" numberOfLines={1}>→ {sub}</Text> : null}
      </View>
      {right}
    </View>
  );

  return (
    <Sheet open={open} onClose={onClose} height={0.92} title={focus ? t('{{title}} ko {{name}} se jorein', { title: focus.title, name: channel.name }) : t('{{name}} ke products jorein', { name: channel.name })}
      description={d?.fetchedAt ? t('List {{when}} ki', { when: formatRelative(d.fetchedAt) }) : undefined}>
      {pickFor ? (
        <View style={{ gap: th.space(3) }}>
          <Text size="sm" weight="semibold">{pickFor.title}{pickFor.variantTitle ? ` · ${pickFor.variantTitle}` : ''}</Text>
          <ProductPicker initial={pickFor.title} onPick={(p) => { link.mutate([toLink(pickFor, p.productId, p.variantId)]); setPickFor(null); }} />
          <Button variant="ghost" onPress={() => setPickFor(null)}>{t('Wapas')}</Button>
        </View>
      ) : q.isLoading ? <SkeletonRows count={6} /> : q.error ? <EmptyState icon={AlertTriangle} title={apiErrorMessage(q.error, t('List nahi khuli'))} /> : !d?.canFetch ? (
        <EmptyState icon={Link2} title={t('Ye website apne products khud bhejti hai — order aane par ya CSV se jurte hain')} />
      ) : (
        <View style={{ gap: th.space(3) }}>
          {d.remoteError && <Text size="xs" tone="danger">{d.remoteError}</Text>}
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            <View style={{ flex: 1 }}><SearchBar value={search} onChangeText={setSearch} placeholder={t('Naam ya SKU…')} /></View>
            <Button variant="secondary" icon={RefreshCw} loading={refresh.isPending} onPress={() => refresh.mutate()} accessibilityLabel={t('Taaza list')} />
          </View>
          {focus ? (
            <View>
              <Text size="xs" tone="muted">{t('{{title}} ke liye channel ki koi cheez chunein', { title: focus.title })}</Text>
              {[...(d.sure ?? []), ...(d.maybe ?? []), ...(d.unmatched ?? []).flatMap((g) => g.variants)].filter((r) => hit(r.title, r.variantTitle, r.sku)).slice(0, 60).map((r) =>
                remoteRow(r, canManage ? <Button size="sm" variant="secondary" icon={Link2} loading={link.isPending} onPress={() => link.mutate([toLink(r, focus.productId, focus.variantId)])}>{t('Jorein')}</Button> : null))}
            </View>
          ) : (
            <>
              <Tabs value={tab} onChange={setTab} tabs={[
                { value: 'sure', label: t('Pakka match'), count: sure.length },
                { value: 'maybe', label: t('Shayad'), count: maybe.length },
                { value: 'missing', label: t('Nafaa me nahi'), count: missing.length },
              ]} />
              {tab === 'sure' && (
                <View>
                  <Text size="xs" tone="muted">{t('Same SKU ya barcode — sab ek saath jor sakte hain.')}</Text>
                  {canManage && sure.length > 0 && <Button icon={Sparkles} loading={link.isPending} style={{ marginVertical: th.space(2) }} onPress={() => link.mutate(sure.map((r) => toLink(r, r.match.productId, r.match.variantId)))}>{t('Sab {{count}} jod dein', { count: sure.length })}</Button>}
                  {sure.slice(0, 80).map((r) => remoteRow(r, canManage ? <Button size="sm" variant="secondary" onPress={() => link.mutate([toLink(r, r.match.productId, r.match.variantId)])}>{t('Jorein')}</Button> : null, `${r.match.name}${r.match.variantName ? ` (${r.match.variantName})` : ''}`))}
                  {!sure.length && <EmptyState compact icon={CheckCircle2} title={t('Koi pakka match baqi nahi')} />}
                </View>
              )}
              {tab === 'maybe' && (
                <View>
                  <Text size="xs" tone="muted">{t('Naam milta julta hai — dekh kar jorein.')}</Text>
                  {maybe.slice(0, 80).map((r) => remoteRow(r, canManage ? (
                    <View style={{ gap: 4 }}>
                      <Button size="sm" variant="secondary" onPress={() => link.mutate([toLink(r, r.match.productId, r.match.variantId)])}>{t('Jorein')}</Button>
                      <Button size="sm" variant="ghost" onPress={() => setPickFor(r)}>{t('Doosra')}</Button>
                    </View>
                  ) : null, `${r.match.name}${r.match.variantName ? ` (${r.match.variantName})` : ''} · ${Math.round(r.match.score * 100)}%`))}
                  {!maybe.length && <EmptyState compact icon={CheckCircle2} title={t('Kuch baqi nahi')} />}
                </View>
              )}
              {tab === 'missing' && (
                <View>
                  <Text size="xs" tone="muted">{t('Channel par hain, Nafaa me nahi — chun kar Nafaa me bana dein ya kisi product se jorein.')}</Text>
                  {canManage && picked.size > 0 && <Button icon={CloudDownload} loading={create.isPending} style={{ marginVertical: th.space(2) }} onPress={() => create.mutate([...picked])}>{t('{{count}} Nafaa me banayein', { count: picked.size })}</Button>}
                  {missing.slice(0, 80).map((g) => (
                    <View key={g.externalProductId} style={{ borderTopWidth: 1, borderTopColor: th.colors.divider, paddingVertical: th.space(2.5), gap: th.space(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                        {canManage && g.canImport && <Checkbox value={picked.has(g.externalProductId)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(g.externalProductId)) n.delete(g.externalProductId); else n.add(g.externalProductId); return n; })} />}
                        <Text size="sm" weight="semibold" numberOfLines={2} style={{ flex: 1 }}>{g.title}</Text>
                        {g.hasVariants && <Badge>{t('{{count}} size', { count: g.variants.length })}</Badge>}
                      </View>
                      {canManage && g.variants.slice(0, 6).map((v) => (
                        <PressableScale key={rowKey(v)} onPress={() => setPickFor(v)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingStart: th.space(8) }}>
                          <Text size="xs" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>{v.variantTitle ?? v.title}{v.sku ? ` · ${v.sku}` : ''}</Text>
                          <Text size="xs" weight="semibold" tone="brand">{t('Product se jorein')}</Text>
                        </PressableScale>
                      ))}
                    </View>
                  ))}
                  {!missing.length && <EmptyState compact icon={CheckCircle2} title={t('Sab Nafaa me hain')} />}
                </View>
              )}
            </>
          )}
          {link.isPending && <ActivityIndicator />}
        </View>
      )}
    </Sheet>
  );
}

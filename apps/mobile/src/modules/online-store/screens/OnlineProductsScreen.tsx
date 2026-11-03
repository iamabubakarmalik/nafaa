/**
 * Online products: every Nafaa product and size against every connected
 * channel (Daraz, each WooCommerce site, Shopify, website). Each cell shows
 * whether it is linked, the price Nafaa sets there, the stock sent and the
 * last sync. Linking, channel price rules, per-product price, stock buffer,
 * "send now" and putting Nafaa products on a channel all start here.
 * Mirrors the web OnlineProductsPage.
 */

import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, View } from 'react-native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, BadgeDollarSign, CheckCircle2, Clock, CloudUpload, Link2, Link2Off, Package, PackageCheck, RefreshCw,
} from 'lucide-react-native';
import type { GridCell, GridFilter, GridItem, GridRow, LinkedCell, OnlineChannel } from '@nafaa/core/online-store';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import {
  Badge, Button, ChipGroup, EmptyState, Icon, IconButton, ListTemplate, PressableScale, Sheet, ListGroup, ListRow, Text, toast, useDebouncedValue, useTheme,
} from '@/design';
import { apiErrorMessage, ordersApi, productsApi } from '../api/online';
import { ConnectOnWebCard, SavedDataNote } from '../components/bits';
import { OnlineMenuButton } from '../components/OnlineMenu';
import {
  CellSheet, ChannelCard, ChannelMark, ChannelSettingsSheet, IssuesPanel, LinkSheet, refreshProducts, type LinkFocus,
} from '../components/products/ProductSheets';
import { KEYS, useOnlineGuard } from '../lib/online';

const LIMIT = 25;
const TABS: Array<{ id: GridFilter; label: string }> = [
  { id: 'all', label: msg('Sab') }, { id: 'unlinked', label: msg('Jorna baqi') }, { id: 'errors', label: msg('Masle') },
  { id: 'price', label: msg('Price farq') }, { id: 'out', label: msg('Stock khatam') }, { id: 'linked', label: msg('Jure hue') },
];

type Open =
  | { kind: 'link'; channel: OnlineChannel; focus?: LinkFocus }
  | { kind: 'settings'; channel: OnlineChannel }
  | { kind: 'cell'; channel: OnlineChannel; cell: LinkedCell; title: string; productId: string; focus: LinkFocus }
  | { kind: 'item'; item: GridItem };

export function OnlineProductsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(PERMISSIONS.ONLINE_PRODUCTS_MANAGE);
  const { guard } = useOnlineGuard('integrations');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 300);
  const [filter, setFilter] = useState<GridFilter>('all');
  const [channelId, setChannelId] = useState('');
  const [open, setOpen] = useState<Open | null>(null);
  const close = () => setOpen(null);
  const swap = (next: Open) => { setOpen(null); setTimeout(() => setOpen(next), 280); };

  const channelsQ = useQuery({ queryKey: [...KEYS.products, 'channels'], queryFn: productsApi.channels, staleTime: 30_000 });
  const gridQ = useInfiniteQuery({
    queryKey: [...KEYS.products, 'grid', { query, filter, channelId }],
    queryFn: ({ pageParam }) => productsApi.grid({ page: pageParam, limit: LIMIT, search: query || undefined, filter, channelId: channelId || undefined }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const summaryQ = useQuery({ queryKey: [...KEYS.products, 'summary', channelId], queryFn: () => productsApi.summary(channelId || undefined), staleTime: 30_000 });
  const channels = channelsQ.data?.channels ?? [];
  const sellable = channelsQ.data?.sellable ?? 0;
  const items = useMemo(() => gridQ.data?.pages.flatMap((p) => p.items) ?? [], [gridQ.data]);
  const cols = gridQ.data?.pages[0]?.channels ?? channels;
  const s = summaryQ.data;

  const syncChannel = useMutation({
    mutationFn: (c: OnlineChannel) => productsApi.syncChannel(c.id),
    onSuccess: (r, c) => { refreshProducts(qc); if (r.error) toast.error(`${c.name}: ${r.error}`); else toast.success(t('{{channelName}} par Stock{{value}} bhej diye', { channelName: c.name, value: r.prices ? t(' aur {{prices}} Price', { prices: r.prices }) : '' })); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const syncProduct = useMutation({
    mutationFn: (productId: string) => productsApi.syncProduct(productId),
    onSuccess: (r) => {
      refreshProducts(qc);
      const bad = r.results.filter((x) => !x.ok);
      if (!r.results.length) toast.info(t('Ye product kisi channel se jura nahi'));
      else if (bad.length) toast.error(`${bad[0].name}: ${bad[0].error}`);
      else toast.success(t('{{value}} par bhej diya', { value: r.results.map((x) => x.name).join(', ') }));
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const publish = useMutation({
    mutationFn: ({ channel, productId }: { channel: OnlineChannel; productId: string }) => ordersApi.exportSelected(channel.id, [productId]),
    onSuccess: (r, { channel }) => { refreshProducts(qc); if (r.errors[0]) toast.error(r.errors[0]); else toast.success(t('{{name}} par daal diya ({{created}} naye, {{updated}} update)', { name: channel.name, created: r.created, updated: r.updated })); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });

  const openCell = (c: OnlineChannel, cell: GridCell, item: GridItem, row: GridRow) => {
    const title = row.label ? `${item.name} — ${row.label}` : item.name;
    const focus: LinkFocus = { productId: item.productId, variantId: row.variantId, title };
    if (cell.linked) swap({ kind: 'cell', channel: c, cell, title, productId: item.productId, focus });
    else if (canManage && c.canFetch) swap({ kind: 'link', channel: c, focus });
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <SavedDataNote query={channelsQ} />
      {!channelsQ.isLoading && channels.length === 0 ? (
        <>
          <EmptyState icon={PackageCheck} title={t('Abhi koi online channel nahi jura')} message={t('Daraz, WooCommerce ya Shopify jorein — phir yahan products jorein, har channel ki Price rakhein aur Stock khud barabar rahega.')} />
          <ConnectOnWebCard />
        </>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -th.space(4) }} contentContainerStyle={{ paddingHorizontal: th.space(4), gap: th.space(2) }}>
            {channels.map((c) => (
              <ChannelCard key={c.id} c={c} sellable={sellable} canManage={canManage} syncing={syncChannel.isPending && syncChannel.variables?.id === c.id}
                onLink={() => setOpen({ kind: 'link', channel: c })} onSettings={() => setOpen({ kind: 'settings', channel: c })} onSync={guard(() => syncChannel.mutate(c))} />
            ))}
          </ScrollView>
          <IssuesPanel channels={channels} canManage={canManage} onLink={(c) => setOpen({ kind: 'link', channel: c })} onFilter={(c, f) => { setChannelId(c.id); setFilter(f); }} />
          {channels.length > 1 && (
            <ChipGroup value={channelId} onChange={setChannelId} style={{ marginHorizontal: -th.space(4) }}
              options={[{ value: '', label: t('Sab channels') }, ...channels.map((c) => ({ value: c.id, label: c.name }))]} />
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ListTemplate
        title={t('Online products')}
        actions={<>
          <IconButton icon={RefreshCw} label={t('Taaza karein')} onPress={() => refreshProducts(qc)} />
          <OnlineMenuButton current="/online/products" />
        </>}
        search={channels.length ? { value: search, onChange: setSearch, placeholder: t('Naam, SKU ya barcode…') } : undefined}
        filters={channels.length ? { value: filter, onChange: (v) => setFilter(v as GridFilter), options: TABS.map((x) => ({ value: x.id, label: t(x.label), count: s?.[x.id] })) } : undefined}
        summary={summary}
        data={channels.length ? items : []}
        loading={gridQ.isLoading || channelsQ.isLoading}
        error={gridQ.isError && !items.length ? gridQ.error : undefined}
        onRetry={gridQ.refetch}
        refreshing={gridQ.isRefetching && !gridQ.isFetchingNextPage}
        onRefresh={() => refreshProducts(qc)}
        onEndReached={() => { if (gridQ.hasNextPage && !gridQ.isFetchingNextPage) void gridQ.fetchNextPage(); }}
        footer={gridQ.isFetchingNextPage ? <ActivityIndicator style={{ margin: th.space(4) }} /> : undefined}
        keyExtractor={(i) => i.productId}
        renderItem={({ item }) => <ProductRow item={item} cols={cols} onCell={openCell} onMore={() => setOpen({ kind: 'item', item })} />}
        empty={channels.length ? <EmptyState icon={Package} title={query ? t('"{{query}}" se koi product nahi mila', { query }) : t('Is filter me koi product nahi')} /> : <View />}
      />
      <LinkSheet open={open?.kind === 'link'} channel={open?.kind === 'link' ? open.channel : null} focus={open?.kind === 'link' ? open.focus : undefined} canManage={canManage} onClose={close} />
      <ChannelSettingsSheet open={open?.kind === 'settings'} channel={open?.kind === 'settings' ? open.channel : null} onClose={close} />
      <CellSheet open={open?.kind === 'cell'} channel={open?.kind === 'cell' ? open.channel : null} cell={open?.kind === 'cell' ? open.cell : null}
        title={open?.kind === 'cell' ? open.title : ''} productId={open?.kind === 'cell' ? open.productId : ''} canManage={canManage}
        onRelink={() => open?.kind === 'cell' && swap({ kind: 'link', channel: open.channel, focus: open.focus })} onClose={close} />
      <Sheet open={open?.kind === 'item'} onClose={close} title={open?.kind === 'item' ? open.item.name : undefined}>
        {open?.kind === 'item' && canManage && (
          <ListGroup>
            <ListRow icon={RefreshCw} iconTone="brand" title={t('Sab channels par abhi bhejein')} onPress={guard(() => { syncProduct.mutate(open.item.productId); close(); })} />
            {cols.filter((c) => c.canPush && !open.item.rows.some((r) => r.cells[c.id]?.linked)).map((c) => (
              <ListRow key={c.id} icon={CloudUpload} iconTone="info" title={t('{{name}} par daalein', { name: c.name })} subtitle={t('Naya product channel par banega aur jur jayega')}
                onPress={guard(() => { publish.mutate({ channel: c, productId: (open as { item: GridItem }).item.productId }); close(); })} />
            ))}
            {cols.filter((c) => c.canFetch).map((c) => (
              <ListRow key={`l-${c.id}`} icon={Link2} title={t('{{name}} se jorein', { name: c.name })}
                onPress={() => swap({ kind: 'link', channel: c, focus: { productId: (open as { item: GridItem }).item.productId, variantId: null, title: (open as { item: GridItem }).item.name } })} />
            ))}
          </ListGroup>
        )}
      </Sheet>
    </View>
  );
}

const cellTone = (cell: GridCell): { icon: typeof CheckCircle2; tone: 'success' | 'danger' | 'warning' | 'neutral' } => {
  if (!cell.linked) return { icon: Link2Off, tone: 'neutral' };
  if (cell.status === 'FAILED') return { icon: AlertTriangle, tone: 'danger' };
  if (cell.priceDiffers) return { icon: BadgeDollarSign, tone: 'warning' };
  if (cell.status === 'PENDING' || cell.status === 'SYNCING') return { icon: Clock, tone: 'neutral' };
  return { icon: CheckCircle2, tone: 'success' };
};

function ProductRow({ item, cols, onCell, onMore }: { item: GridItem; cols: OnlineChannel[]; onCell: (c: OnlineChannel, cell: GridCell, item: GridItem, row: GridRow) => void; onMore: () => void }) {
  const th = useTheme();
  const rows = item.rows.slice(0, 12);
  return (
    <View style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(3), gap: th.space(2) }}>
      <PressableScale onPress={onMore} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <View style={{ width: 40, height: 40, borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {item.image ? <Image source={{ uri: item.image }} style={{ width: 40, height: 40 }} /> : <Icon icon={Package} size={18} tone="subtle" />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" weight="bold" numberOfLines={1}>{item.name}</Text>
          <Text size="xs" tone="muted" ltr numberOfLines={1}>{[item.sku, formatMoney(item.price), item.hasVariants ? t('{{count}} size', { count: item.rows.length }) : null].filter(Boolean).join(' · ')}</Text>
        </View>
        {Object.keys(item.sizeLess).length > 0 && <Badge tone="danger">{t('Bina size')}</Badge>}
      </PressableScale>
      {rows.map((row) => (
        <View key={row.variantId ?? 'base'} style={{ gap: th.space(1) }}>
          {item.hasVariants && <Text size="2xs" weight="semibold" tone="secondary">{row.label ?? '—'} · {formatMoney(row.price)}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>
            {cols.map((c) => {
              const cell = row.cells[c.id];
              if (!cell) return null;
              const st = cellTone(cell);
              const col = th.colors[st.tone];
              return (
                <PressableScale key={c.id} onPress={() => onCell(c, cell, item, row)} accessibilityLabel={c.name}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingStart: 4, paddingEnd: th.space(2), paddingVertical: 4, borderRadius: th.radius('md'), backgroundColor: col.soft, borderWidth: 1, borderColor: col.border }}>
                  <ChannelMark channel={c} size={20} />
                  <Icon icon={st.icon} size={12} color={col.text} />
                  <Text size="2xs" weight="semibold" color={col.text} ltr>
                    {cell.linked ? `${formatMoney(cell.price)}${c.tracksStock && cell.stock != null ? ` · ${cell.stock}` : ''}` : t('Jorna baqi')}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}
      {item.rows.length > rows.length && <Text size="2xs" tone="muted">+{item.rows.length - rows.length}</Text>}
    </View>
  );
}


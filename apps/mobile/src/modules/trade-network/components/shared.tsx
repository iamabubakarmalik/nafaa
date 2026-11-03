/** Building blocks shared by the network screens. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Phone, Search } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { useCachedNotice } from '@/core/offline';
import { Avatar, Button, Input, Row, Segmented, Sheet, StatusPill, Text, TextArea, toast, useTheme } from '@/design';
import { TONE, type Tone } from '@/modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, tradeError, type BusinessCard, type FoundSeller } from '../api/trade.api';
import { LINK_STATUS } from '../lib/meta';

export function BizAvatar({ card, size = 40 }: { card: Pick<BusinessCard, 'name' | 'logoUrl'> | null | undefined; size?: number }) {
  return <Avatar name={card?.name} url={card?.logoUrl} size={size} />;
}

export const whereText = (card: Pick<BusinessCard, 'city' | 'area'> | null | undefined) => [card?.area, card?.city].filter(Boolean).join(', ');

/** Status pill from a web-style tone. */
export function Pill({ tone, children, dot }: { tone: Tone; children: string; dot?: boolean }) {
  return <StatusPill tone={TONE[tone]} dot={dot}>{children}</StatusPill>;
}

/** Network counts, shared by the supplier and customer screens. */
export function useOverview() {
  return useQuery({ queryKey: [TRADE_KEY, 'overview'], queryFn: tradeApi.overview, staleTime: 30_000 });
}

/** "Last updated" line shown while the screen runs from saved data. */
export function CachedLine({ query }: { query: { dataUpdatedAt: number; isFetching?: boolean; fetchStatus?: string } }) {
  const th = useTheme();
  const c = useCachedNotice(query);
  if (!c.fromCache || !c.updatedAt) return null;
  return <Text size="xs" tone="muted" style={{ marginBottom: th.space(2) }}>{t('Last updated {{time}}', { time: formatRelative(c.updatedAt) })}</Text>;
}

export const rsInt = (n: number) => Math.round(n).toLocaleString('en-PK');

/** Ask a supplier to link: by invite code or phone. */
export function ConnectSheet({ open, onClose, initialCode }: { open: boolean; onClose: () => void; initialCode?: string }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'code' | 'phone'>('code');
  const [code, setCode] = useState(initialCode ?? '');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [found, setFound] = useState<FoundSeller[] | null>(null);

  const close = () => { setFound(null); setNote(''); onClose(); };
  const find = useMutation({
    mutationFn: () => tradeApi.find(mode === 'code' ? { code } : { phone }),
    onSuccess: setFound,
    onError: (e) => { setFound(null); toast.error(tradeError(e)); },
  });
  const send = useMutation({
    mutationFn: () => tradeApi.request({ ...(mode === 'code' ? { code } : { phone }), note: note.trim() || undefined }),
    onSuccess: () => { toast.success(t('Request bhej di — supplier approve karega')); void qc.invalidateQueries({ queryKey: [TRADE_KEY] }); close(); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const hit = found?.[0];
  const already = !!hit?.link && ['PENDING', 'ACTIVE', 'PAUSED'].includes(hit.link.status);
  const canFind = mode === 'code' ? code.trim().length >= 6 : phone.replace(/\D/g, '').length >= 10;

  return (
    <Sheet open={open} onClose={close} title={t('Add supplier')} description={t('Apne distributor ka invite code ya phone number likhein. Woh approve karega, phir aap seedha Order bhej sakenge.')}
      footer={hit && !already
        ? <Button fullWidth size="lg" loading={send.isPending} onPress={() => send.mutate()}>{t('Send request')}</Button>
        : <Button fullWidth size="lg" icon={Search} loading={find.isPending} disabled={!canFind} onPress={() => find.mutate()}>{t('Find')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Segmented value={mode} onChange={(v) => { setMode(v); setFound(null); }} options={[{ value: 'code', label: t('Invite code') }, { value: 'phone', label: t('Phone') }]} />
        {mode === 'code'
          ? <Input label={t('Invite code')} placeholder="NF-7K2P9Q" icon={Hash} ltr autoCapitalize="characters" autoCorrect={false} value={code} onChangeText={(v) => { setCode(v.toUpperCase()); setFound(null); }} />
          : <Input label={t('Distributor ka phone')} placeholder="0300 1234567" icon={Phone} keyboardType="phone-pad" value={phone} onChangeText={(v) => { setPhone(v); setFound(null); }} />}
        {hit?.seller && (
          <Row gap={3} style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
            <BizAvatar card={hit.seller} />
            <View style={{ flex: 1 }}>
              <Text weight="semibold" numberOfLines={1}>{hit.seller.name}</Text>
              <Text size="xs" tone="muted" numberOfLines={1}>{whereText(hit.seller)}</Text>
            </View>
            {hit.link && <Pill tone={LINK_STATUS[hit.link.status].tone}>{LINK_STATUS[hit.link.status].label}</Pill>}
          </Row>
        )}
        {hit && !already && <TextArea label={t('Note (marzi)')} numberOfLines={2} placeholder={t('Misal: Madina Kiryana, Main Bazar — har hafte order')} value={note} onChangeText={setNote} />}
        {already && <Text size="sm" tone="muted">{t('Is supplier se aap ka link pehle se hai.')}</Text>}
      </View>
    </Sheet>
  );
}

/**
 * Before accepting: link website items to Nafaa products (once; the server
 * remembers), and move a new order to the right branch.
 */

import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Link2, Store } from 'lucide-react-native';
import type { OnlineOrderDetail, OrderLine } from '@nafaa/core/online-store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useApiQuery } from '@/core/offline';
import { Badge, Button, Card, Checkbox, PressableScale, Select, Sheet, Text, toast, useTheme } from '@/design';
import { apiErrorMessage, ordersApi } from '../../api/online';
import { ProductPicker, type PickedProduct } from '../ProductPicker';

export type Matches = Record<string, { productId: string; variantId?: string | null; label: string }>;

export function MatchSheet({ open, lines, loading, onClose, onConfirm }: {
  open: boolean; lines: OrderLine[]; loading?: boolean; onClose: () => void; onConfirm: (m: Matches) => void;
}) {
  const th = useTheme();
  const pending = useMemo(() => lines.filter((l) => !l.match), [lines]);
  const [matches, setMatches] = useState<Matches>({});
  const [active, setActive] = useState<number | null>(null);
  // Reset only when it opens, so a background refresh never clears picks.
  useEffect(() => { if (open) { setMatches({}); setActive(pending[0]?.index ?? null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = pending.length > 0 && pending.every((l) => matches[String(l.index)]);

  const pick = (line: OrderLine) => (p: PickedProduct) => {
    setMatches((prev) => ({ ...prev, [String(line.index)]: { productId: p.productId, variantId: p.variantId, label: p.label } }));
    const next = pending.find((l) => l.index !== line.index && !matches[String(l.index)]);
    setActive(next?.index ?? null);
  };

  return (
    <Sheet open={open} onClose={onClose} height={0.92} title={t('Items ko apne products se jodein')}
      description={t('Website ke ye items Nafaa me khud nahi mile. Ek dafa jod dein — agli dafa khud mil jayenge.')}
      footer={<Button fullWidth size="lg" variant="success" icon={CheckCircle2} disabled={!done} loading={loading} onPress={() => onConfirm(matches)}>
        {t('Jod kar Accept karein')} · {Object.keys(matches).length}/{pending.length}
      </Button>}>
      <View style={{ gap: th.space(2) }}>
        {pending.map((line) => {
          const m = matches[String(line.index)];
          const isActive = active === line.index;
          return (
            <View key={line.index} style={{ borderWidth: 2, borderRadius: th.radius('lg'), padding: th.space(3), gap: th.space(2),
              borderColor: m ? th.colors.success.border : isActive ? th.colors.brand.solid : th.colors.border, backgroundColor: m ? th.colors.success.soft : th.colors.surface }}>
              <PressableScale onPress={() => setActive(isActive ? null : line.index)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                <View style={{ flex: 1 }}>
                  <Text size="sm" weight="bold" numberOfLines={2}>{line.name}{line.variant ? ` (${line.variant})` : ''}</Text>
                  <Text size="xs" tone="muted" ltr>{line.quantity} × {formatMoney(line.price)}{line.sku ? ` · SKU ${line.sku}` : ''}</Text>
                </View>
                {m ? <Badge tone="success" icon={Link2}>{m.label}</Badge> : <Badge tone="warning">{t('Jodna hai')}</Badge>}
              </PressableScale>
              {isActive && <ProductPicker initial={line.name} onPick={pick(line)} />}
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Multi-branch: a new order in the wrong branch moves before accept (optionally for the future too). */
export function BranchPicker({ order: o, canManage, onChanged }: { order: OnlineOrderDetail; canManage: boolean; onChanged: () => void }) {
  const th = useTheme();
  const shops = useApiQuery<Array<{ id: string; name: string; isActive?: boolean }>>('/shops');
  const active = (Array.isArray(shops.data) ? shops.data : []).filter((s) => s.isActive !== false);
  const route = o.metadata?.route;
  const [remember, setRemember] = useState(!!route);
  const move = useMutation({
    mutationFn: (shopId: string) => ordersApi.moveBranch(o.id, { shopId, remember: remember && !!route }),
    onSuccess: (r) => { toast.success(t('Order {{shopName}} me chala gaya', { shopName: r.shopName }), { message: r.remembered ? t('Aage se isi tarah ke orders seedha isi branch me aayenge') : undefined }); onChanged(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  if (!canManage || active.length <= 1 || o.orderStatus !== 'PENDING' || o.nafaaSaleId) return null;
  const current = o.shopId ?? o.fulfilShopId ?? '';
  return (
    <Card title={t('Branch')} action={<Store size={16} color={th.colors.textMuted} />}>
      <Select value={current} onChange={(v) => { if (v && v !== current && !move.isPending) move.mutate(v); }} disabled={move.isPending}
        title={t('Branch')} placeholder={t('— chunein —')} options={active.map((s) => ({ value: s.id, label: s.name }))} />
      {route && (
        <View style={{ marginTop: th.space(2) }}>
          <Checkbox value={remember} onChange={setRemember} label={t('Aage se is website branch ke orders bhi seedha isi branch me')} />
        </View>
      )}
    </Card>
  );
}

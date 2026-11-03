/**
 * Landed cost (import cost): freight, customs/duty, clearing agent, local
 * transport and others, in Rs or a foreign currency with its rate, spread
 * over the lines by value, quantity or weight. The editor is used on the
 * purchase editor; the panel on a saved purchase adds more (also after the
 * goods arrived) and offers the sold share as an expense, like the web.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Ship, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import {
  allocateLanded, LANDED_CURRENCIES, landedPayload, landedRs, landedTotal, newLandedDraft, type LandedDraft, type LandedLine, type LandedMethod,
} from '@nafaa/core/inventory';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, ChipGroup, IconButton, Input, Row, Segmented, Select, Sheet, Text, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { PUR, useOnline } from '@/modules/inventory/lib/shared';
import { expenseApi, purchasesApi, type LandedCostResult, type Purchase } from '../api/purchases';
import { kindLabel, LANDED_KINDS, LANDED_METHODS } from '../lib/meta';

export interface LandedEditorLine extends LandedLine { name: string; unit: string }

export function LandedCostEditor({ costs, onCosts, method, onMethod, lines, onWeight }: {
  costs: LandedDraft[]; onCosts: (c: LandedDraft[]) => void; method: LandedMethod; onMethod: (m: LandedMethod) => void;
  lines: LandedEditorLine[]; onWeight: (lineId: string, kg: number | null) => void;
}) {
  const th = useTheme();
  const total = landedTotal(costs);
  const shares = allocateLanded(lines, total, method);
  const patch = (key: string, p: Partial<LandedDraft>) => onCosts(costs.map((c) => (c.key === key ? { ...c, ...p } : c)));
  const noWeight = method === 'WEIGHT' && lines.some((l) => !(Number(l.weightKg) > 0));
  return (
    <View style={{ gap: th.space(3) }}>
      {costs.map((c) => (
        <Card key={c.key} tone="muted">
          <View style={{ gap: th.space(2) }}>
            <Row gap={2} align="end">
              <View style={{ flex: 1 }}>
                <Select label={t('Cost ki type')} value={c.kind} onChange={(kind) => patch(c.key, { kind })} options={LANDED_KINDS.map((k) => ({ value: k.value, label: t(k.label) }))} />
              </View>
              <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => onCosts(costs.filter((x) => x.key !== c.key))} />
            </Row>
            <ChipGroup wrap value={c.currency} onChange={(currency) => patch(c.key, { currency })} options={LANDED_CURRENCIES.map((x) => ({ value: x, label: x === 'PKR' ? 'Rs' : x }))} />
            <NumberInput label={t('Amount')} value={c.amount || null} onChangeValue={(v) => patch(c.key, { amount: v ?? 0 })} />
            {c.currency !== 'PKR' && (
              <Row gap={2} align="end">
                <NumberInput containerStyle={{ flex: 1 }} label={t('{{currency}} ka rate', { currency: c.currency })} value={c.rate || null} onChangeValue={(v) => patch(c.key, { rate: v ?? 0 })}
                  hint={`1 ${c.currency} = ? Rs`} />
                <Text weight="semibold" ltr style={{ paddingBottom: 12 }}>{c.rate > 0 ? formatPKR(landedRs(c)) : t('Rate likhein')}</Text>
              </Row>
            )}
            <Input value={c.label} onChangeText={(label) => patch(c.key, { label })} maxLength={80} placeholder={t('Note (agar ho) — maslan GD number, agent ka naam')} />
          </View>
        </Card>
      ))}
      <Button variant="ghost" icon={Plus} onPress={() => onCosts([...costs, newLandedDraft()])}>{t('Aur cost jorein')}</Button>
      {total > 0 && lines.length > 0 && (
        <Card title={t('{{total}} kaise baantein', { total: formatPKR(total) })}>
          <View style={{ gap: th.space(2) }}>
            <Segmented value={method} onChange={onMethod} options={LANDED_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
            {lines.map((l) => {
              const share = shares.get(l.id) ?? 0;
              return (
                <View key={l.id} style={{ gap: 4 }}>
                  <Text size="sm" weight="medium" numberOfLines={1}>{l.name}</Text>
                  <Row gap={2} justify="between">
                    {method === 'WEIGHT'
                      ? <NumberInput containerStyle={{ width: 110 }} size="sm" value={l.weightKg} onChangeValue={(kg) => onWeight(l.id, kg)} placeholder="kg" trailing={<Text size="xs" tone="muted">{t('kg')}</Text>} />
                      : <View />}
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text size="sm" tone="muted" ltr>{formatPKR(share)}</Text>
                      <Text size="xs" weight="semibold" tone="brand" ltr>{l.qty > 0 ? `+${formatPKR(share / l.qty)} / ${l.unit}` : '—'}</Text>
                    </View>
                  </Row>
                </View>
              );
            })}
            {noWeight && <Text size="xs" tone="warning">{t('Jin lines ka wazan nahi, un par is tareeqe se kuch nahi lagega.')}</Text>}
          </View>
        </Card>
      )}
      <Text size="xs" tone="muted">{t('Ye costs supplier ke bill ya khate me nahi jati, aur Expenses me bhi nahi. Ye maal ki Cost me jur jati hain, is liye bikne par Profit me khud aa jati hain.')}</Text>
    </View>
  );
}

const nameOf = (i: Purchase['items'][number]) => i.itemName || i.product?.name || i.ingredient?.name || t('Cheez');
const unitOf = (i: Purchase['items'][number]) => i.product?.unit ?? i.ingredient?.unit ?? 'pcs';

export function LandedCostPanel({ p }: { p: Purchase }) {
  const th = useTheme();
  const can = usePermission();
  const canEdit = can(P.PURCHASES_CREATE);
  const online = useOnline();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const costs = p.landedCosts ?? [];
  const nothingIn = p.items.every((i) => !(i.receivedQty ?? 0));
  const sold = costs.reduce((s, c) => s + (c.soldShare || 0), 0);
  const remove = useMutation({
    mutationFn: (costId: string) => purchasesApi.removeLandedCost(p.id, costId),
    onSuccess: () => { toast.success(t('Cost hat gayi')); void qc.invalidateQueries({ queryKey: [PUR] }); },
  });
  if (!costs.length && (!canEdit || p.status === 'CANCELLED')) return null;
  return (
    <Card title={t('Landed cost')} action={(p.landedCost ?? 0) > 0 ? <Text weight="bold" ltr>{formatPKR(p.landedCost)}</Text> : undefined}>
      <View style={{ gap: th.space(2) }}>
        {costs.length === 0
          ? <Text size="xs" tone="muted">{t('Freight, customs, clearing agent — jo dusron ko diya, maal ki Cost me jor dein.')}</Text>
          : costs.map((c) => (
            <Row key={c.id} gap={2} align="start">
              <View style={{ flex: 1 }}>
                <Text size="sm">{kindLabel(c.kind)}</Text>
                <Text size="xs" tone="muted">{[c.currency ? `${c.currency} ${c.foreignAmount} × ${c.exchangeRate}` : null, c.label, t(LANDED_METHODS.find((m) => m.value === c.method)?.label ?? ''), c.afterReceipt ? t('maal aane ke baad') : null].filter(Boolean).join(' · ')}</Text>
              </View>
              <Text size="sm" ltr>{formatPKR(c.amount)}</Text>
              {canEdit && nothingIn && online && (
                <IconButton icon={Trash2} size="sm" label={t('Cost hatayein')}
                  onPress={async () => { if (await confirm({ title: t('{{kind}} ({{amount}}) hatayein?', { kind: kindLabel(c.kind), amount: formatPKR(c.amount) }), tone: 'danger', confirmLabel: t('Hatayein') })) remove.mutate(c.id); }} />
              )}
            </Row>
          ))}
        {sold > 0 && <Text size="xs" tone="warning">{t('{{sold}} us maal ka hissa tha jo cost jurne se pehle bik chuka tha.', { sold: formatPKR(sold) })}</Text>}
        {canEdit && p.status !== 'CANCELLED' && (
          <Button size="sm" variant="secondary" icon={Ship} disabled={!online} onPress={() => setAdding(true)}>{t('Landed cost jorein')}</Button>
        )}
      </View>
      {adding && <AddLandedSheet p={p} onClose={() => setAdding(false)} />}
    </Card>
  );
}

function AddLandedSheet({ p, onClose }: { p: Purchase; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const [costs, setCosts] = useState<LandedDraft[]>([newLandedDraft()]);
  const [method, setMethod] = useState<LandedMethod>(p.landedCostMethod ?? 'VALUE');
  const [weights, setWeights] = useState<Record<string, number | null>>(Object.fromEntries(p.items.map((i) => [i.id, i.weightKg ?? null])));
  const [result, setResult] = useState<LandedCostResult | null>(null);
  const received = p.items.some((i) => (i.receivedQty ?? 0) > 0);
  const total = landedTotal(costs);
  const bad = costs.some((c) => c.currency !== 'PKR' && c.amount > 0 && !(c.rate > 0));

  const save = useMutation({
    mutationFn: () => purchasesApi.addLandedCosts(p.id, {
      costs: landedPayload(costs), method,
      weights: method === 'WEIGHT' ? Object.entries(weights).filter(([, v]) => v != null).map(([itemId, weightKg]) => ({ itemId, weightKg: weightKg! })) : undefined,
    }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: [PUR] });
      if (r.soldShare > 0) setResult(r);
      else { toast.success(t('{{total}} landed cost jur gayi{{value}}', { total: formatPKR(r.total), value: r.afterReceipt ? t(' — bache hue maal ki Cost barh gayi') : '' })); onClose(); }
    },
  });
  const post = useMutation({
    mutationFn: () => expenseApi.create({
      title: t('Landed cost (bika hua maal) · {{purchaseNumber}}', { purchaseNumber: p.purchaseNumber }),
      description: t('{{purchaseNumber}} ki landed cost ka hissa jo cost jurne se pehle bik chuke maal par tha', { purchaseNumber: p.purchaseNumber }),
      amount: result!.soldShare, paymentMethod: 'BANK_TRANSFER', ...(p.shop?.id ? { shopId: p.shop.id } : {}),
    }),
    onSuccess: () => { toast.success(t('Expenses me likh diya')); onClose(); },
  });

  if (result) {
    return (
      <Sheet open onClose={onClose} title={t('Landed cost jur gayi')}
        footer={<Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
          {can(P.EXPENSES_CREATE) && <Button style={{ flex: 1 }} loading={post.isPending} onPress={() => post.mutate()}>{t('{{soldShare}} Expenses me likhein', { soldShare: formatPKR(result.soldShare) })}</Button>}
        </Row>}>
        <View style={{ gap: th.space(3) }}>
          <Text size="sm">{t('{{total}} me se {{kept}} bache hue maal ki Cost me jur gaye.', { total: formatPKR(result.total), kept: formatPKR(result.total - result.soldShare) })}</Text>
          <Card tone="warning"><Text size="sm">{t('{{soldShare}} us maal ka hissa hai jo pehle hi bik chuka (ya wapas gaya). Purani sales ki Cost nahi badalti, is liye ye kisi Cost me nahi gaya. Profit sahi rakhne ke liye ise Expenses me likh dein.', { soldShare: formatPKR(result.soldShare) })}</Text></Card>
          {result.lines.filter((l) => l.share > 0).map((l) => (
            <Row key={l.itemId} justify="between" gap={2}>
              <Text size="sm" style={{ flex: 1 }}>{l.itemName}</Text>
              <Text size="xs" tone="muted">{t('{{value}}bika hissa {{soldShare}}', { value: l.newCost != null ? t('nayi Cost {{newCost}} · ', { newCost: formatPKR(l.newCost) }) : '', soldShare: formatPKR(l.soldShare) })}</Text>
            </Row>
          ))}
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} title={t('Landed cost jorein · {{purchaseNumber}}', { purchaseNumber: p.purchaseNumber })}
      description={t('Freight, customs/duty, clearing agent, local transport — Rs me ya dollar/yuan me rate ke saath')}
      footer={<Button fullWidth loading={save.isPending} disabled={!(total > 0) || bad} onPress={() => save.mutate()}>{total > 0 ? t('{{total}} jorein', { total: formatPKR(total) }) : t('Jorein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {received && <Card tone="info"><Text size="sm">{t('Maal aa chuka hai: ye cost sirf abhi stock me bache maal ki Cost barhayegi. Jo maal pehle bik chuka, us ki purani sale ki Cost nahi badlegi — us ka hissa alag bataya jayega.')}</Text></Card>}
        <LandedCostEditor costs={costs} onCosts={setCosts} method={method} onMethod={setMethod}
          lines={p.items.map((i) => ({ id: i.id, name: nameOf(i), value: i.total, qty: i.baseQuantity ?? i.quantity, unit: unitOf(i), weightKg: weights[i.id] ?? null }))}
          onWeight={(id, kg) => setWeights((w) => ({ ...w, [id]: kg }))} />
        {bad && <Text size="xs" tone="danger">{t('Currency ka rate (Rs me) likhein')}</Text>}
      </View>
    </Sheet>
  );
}

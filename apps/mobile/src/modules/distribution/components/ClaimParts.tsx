/** Claim line lists and the sheets used on the claims screens. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, HandCoins, Tags, XCircle, FileText } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Chip, DatePicker, Input, ListRow, Row, SearchBar, Select, Sheet, SkeletonRows, StatTile, Text, toast, useTheme } from '@/design';
import { DIST_KEY } from '../api/distribution.api';
import { phase2Api, type ClaimLine, type ReceiveClaim } from '../api/phase2.api';
import { lookups } from '../api/setup-lookups';
import { dayKeyLabel, dayYearLabel, rs, trim } from '../lib/meta';
import { digits, fromYmd, todayKey, ymd } from '../lib/setup';

export const CLAIMS_KEY = [DIST_KEY, 'claims'] as const;

export const RECEIVED_VIA: Record<string, string> = { SUPPLIER_KHATA: 'Supplier khate me adjust', CASH_DRAWER: 'Cash (galla)', ACCOUNT: 'Bank / account' };

export function ClaimLines({ lines }: { lines: ClaimLine[] }) {
  const th = useTheme();
  const schemes = lines.filter((l) => l.kind === 'SCHEME');
  const returns = lines.filter((l) => l.kind === 'RETURN');
  return (
    <View style={{ gap: th.space(4) }}>
      {schemes.length > 0 && (
        <View style={{ gap: th.space(1) }}>
          <Text size="sm" weight="semibold" tone="muted">{t('Scheme Discount aur free maal ({{count}})', { count: schemes.length })}</Text>
          {schemes.map((l) => (
            <ListRow
              key={l.refId} dense title={`${l.productName ?? ''} · ${l.customerName ?? ''}`}
              subtitle={`${l.invoiceNumber ?? l.docNumber} · ${dayYearLabel(l.date)} · ${l.schemeName ?? ''}${l.freeQty ? ` · ${t('{{freeQty}} pcs', { freeQty: trim(l.freeQty) })} free` : ''}`}
              trailing={<Text size="sm" weight="bold" tabular ltr>{rs(l.total)}</Text>}
            />
          ))}
        </View>
      )}
      {returns.length > 0 && (
        <View style={{ gap: th.space(1) }}>
          <Text size="sm" weight="semibold" tone="muted">{t('Market return — kharab / expiry ({{count}})', { count: returns.length })}</Text>
          {returns.map((l) => (
            <ListRow
              key={l.refId} dense title={`${l.productName ?? ''} · ${l.customerName ?? ''}`}
              subtitle={`${l.docNumber} · ${dayYearLabel(l.date)} · ${l.condition === 'EXPIRED' ? t('Expiry') : t('Kharab')} · ${trim(l.qty)}`}
              trailing={<Text size="sm" weight="bold" tabular ltr>{rs(l.returnValue)}</Text>}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function MakeClaimSheet({ supplierId, name, from, to, onClose, onMade }: {
  supplierId: string; name: string | null; from: string; to: string; onClose: () => void; onMade: (id: string) => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const q = useQuery({ queryKey: [...CLAIMS_KEY, 'preview', supplierId, from, to], queryFn: () => phase2Api.claimPreview({ supplierId, from, to }) });
  const make = useMutation({
    mutationFn: () => phase2Api.createClaim({ supplierId, from, to, ...(note.trim() && { note: note.trim() }) }),
    onSuccess: (s) => { void qc.invalidateQueries({ queryKey: CLAIMS_KEY }); toast.success(t('Claim {{number}} ban gaya', { number: s.claim.number })); onMade(s.claim.id); },
  });
  return (
    <Sheet open onClose={onClose} height={0.94} scrollable title={t('Claim — {{value}}', { value: name ?? 'Company' })}
      description={t('{{from}} se {{dayKeyLabel}} tak', { from: dayKeyLabel(from), dayKeyLabel: dayKeyLabel(to) })}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Cancel')}</Button>
        <Button style={{ flex: 1.4 }} loading={make.isPending} disabled={!q.data?.lines.length} onPress={() => make.mutate()}>{t('Claim banayein{{value}}', { value: q.data ? ` · ${rs(q.data.total)}` : '' })}</Button>
      </Row>}>
      {!q.data ? <SkeletonRows count={4} /> : !q.data.lines.length ? <Text size="sm" tone="muted">{t('Kuch claim karne ko nahi.')}</Text> : (
        <View style={{ gap: th.space(4) }}>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={HandCoins} label={t('Scheme Discount')} value={rs(q.data.schemeDiscount)} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" icon={Tags} label={t('Free maal (cost)')} value={rs(q.data.freeGoodsValue)} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" icon={XCircle} label={t('Kharab / expiry')} value={rs(q.data.returnsValue)} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="accent" icon={FileText} label={t('Total')} value={rs(q.data.total)} />
          </Row>
          <Input label={t('Note (marzi se)')} value={note} onChangeText={setNote} maxLength={300} />
          <Text size="xs" tone="muted">{t('Claim banne ke baad ye lines kisi aur claim me nahi aayengi. Cancel karne par wapas aa jati hain.')}</Text>
          <ClaimLines lines={q.data.lines} />
        </View>
      )}
    </Sheet>
  );
}

export function SubmitClaimSheet({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [reference, setReference] = useState('');
  const m = useMutation({ mutationFn: () => phase2Api.submitClaim(id, { ...(reference.trim() && { reference: reference.trim() }) }), onSuccess: onDone });
  return (
    <Sheet open onClose={onClose} title={t('Company ko diya')}
      footer={<Button fullWidth loading={m.isPending} onPress={() => m.mutate()}>{t('Save')}</Button>}>
      <Input label={t('Company ka claim number (marzi se)')} value={reference} onChangeText={setReference} maxLength={60} autoFocus />
    </Sheet>
  );
}

export function ReceiveClaimSheet({ id, balance, onClose, onDone }: { id: string; balance: number; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [form, setForm] = useState<ReceiveClaim>({ amount: Math.max(0, Math.round(balance)), receivedVia: 'SUPPLIER_KHATA' });
  const [amount, setAmount] = useState(String(Math.max(0, Math.round(balance))));
  const [date, setDate] = useState(todayKey());
  const accountsQ = useQuery({ queryKey: ['money-accounts', 'picker'], queryFn: lookups.moneyAccounts, staleTime: 5 * 60_000, retry: false });
  const accounts = accountsQ.data ?? [];
  const n = Number(amount) || 0;
  const m = useMutation({
    mutationFn: () => phase2Api.receiveClaim(id, { ...form, amount: n, date, ...(form.receivedVia !== 'ACCOUNT' && { moneyAccountId: undefined }) }),
    onSuccess: onDone,
  });
  const vias = [
    { value: 'SUPPLIER_KHATA', label: t('Supplier khate me adjust (hum ne kam dena)') },
    { value: 'CASH_DRAWER', label: t('Cash mila (galla)') },
    ...(accounts.length ? [{ value: 'ACCOUNT', label: t('Bank / account me aaya') }] : []),
  ];
  return (
    <Sheet open onClose={onClose} height={0.8} title={t('Company se paisa mila')} description={t('Doosri aamdani (Scheme claim) me likha jayega')}
      footer={<Button fullWidth loading={m.isPending} disabled={!(n > 0) || (form.receivedVia === 'ACCOUNT' && !form.moneyAccountId)} onPress={() => m.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(4) }}>
        <Input ltr label={t('Amount (Rs)')} value={amount} onChangeText={(v) => setAmount(digits(v))} keyboardType="decimal-pad" prefix="Rs"
          hint={t('Baqi: Rs {{balance}}', { balance: Math.round(balance).toLocaleString('en-PK') })} />
        <Select label={t('Kaise mila')} value={form.receivedVia} onChange={(v) => setForm((f) => ({ ...f, receivedVia: v as ReceiveClaim['receivedVia'] }))} options={vias} />
        {form.receivedVia === 'ACCOUNT' && (
          <Select label={t('Account')} value={form.moneyAccountId ?? ''} onChange={(v) => setForm((f) => ({ ...f, moneyAccountId: v || undefined }))}
            options={accounts.map((a) => ({ value: a.id, label: a.bankName ? `${a.name} (${a.bankName})` : a.name }))} placeholder={t('Chunein')} />
        )}
        <DatePicker label={t('Date')} value={fromYmd(date)} onChange={(d) => setDate(ymd(d))} />
        <Input label={t('Note')} value={form.note ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, note: v }))} maxLength={300} />
      </View>
    </Sheet>
  );
}

export function BrandsSheet({ supplier, brands, suppliers, onClose }: {
  supplier: { id: string; name: string; brandIds: string[] }; brands: Array<{ id: string; name: string; supplierId: string | null }>;
  suppliers: Array<{ id: string; name: string }>; onClose: () => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const [picked, setPicked] = useState<string[]>(supplier.brandIds);
  const [search, setSearch] = useState('');
  const owner = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const list = brands.filter((b) => !search.trim() || b.name.toLowerCase().includes(search.trim().toLowerCase()));
  const save = useMutation({
    mutationFn: () => phase2Api.setPrincipalBrands(supplier.id, picked),
    onSuccess: (r) => { qc.setQueryData([DIST_KEY, 'principals'], r); toast.success(t('Brands save ho gaye')); onClose(); },
  });
  return (
    <Sheet open onClose={onClose} height={0.88} title={t('{{name}} ke brands', { name: supplier.name })} description={t('Jo brand kisi aur company par hai, chunne se yahan aa jayega')}
      footer={<Button fullWidth loading={save.isPending} onPress={() => save.mutate()}>{t('Save karein ({{count}})', { count: picked.length })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Brand dhoondein')} />
        {!brands.length ? <Text size="sm" tone="muted">{t('Koi brand nahi bana — pehle Products me brands banayein.')}</Text> : (
          <Row gap={2} wrap>
            {list.map((b) => {
              const on = picked.includes(b.id);
              const other = b.supplierId && b.supplierId !== supplier.id ? owner.get(b.supplierId) : null;
              return <Chip key={b.id} icon={on ? Check : undefined} label={other && !on ? `${b.name} · ${other}` : b.name} selected={on} onPress={() => setPicked((x) => (on ? x.filter((i) => i !== b.id) : [...x, b.id]))} />;
            })}
          </Row>
        )}
      </View>
    </Sheet>
  );
}


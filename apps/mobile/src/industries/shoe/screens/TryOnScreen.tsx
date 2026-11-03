/**
 * Size requests (web ShoeTryOnPage): customers waiting for a size or colour
 * the shop does not have. Write the number down, see when the stock arrives,
 * tell them on WhatsApp, and close as bought or not. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { BellRing, CheckCircle2, HandMetal, Hourglass, MessageCircle, ShoppingBag, XCircle } from 'lucide-react-native';
import { SIZE_SYSTEMS } from '@nafaa/core/industries/shoe';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, Input, ListRow, Row, Sheet, StatTile, StatusPill, SwipeRow, Text, TextArea, toast, useTheme, type StatusTone, type SwipeAction } from '@/design';
import { SHOE_COLORS } from '@nafaa/core/industries/shoe';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { ProductPicker, type PickedProduct } from '@/modules/inventory/components/ProductPicker';
import { useDeskOnline } from '../../_shared/deskKit';
import { JobList } from '../../garments/components/JobList';
import { shoeTryOnApi, type RequestView, type SizeRequest } from '../api';
import { GENDERS, REQUEST_KEY, SYSTEM_LABEL, opt, refreshShoe } from '../meta';

const VIEWS: Array<{ value: RequestView; label: string }> = [
  { value: 'open', label: msg('Khuli') }, { value: 'waiting', label: msg('Maal ka intezar') }, { value: 'told', label: msg('Bata diya') },
  { value: 'bought', label: msg('Khareed liya') }, { value: 'closed', label: msg('Nahi liya / cancel') }, { value: 'all', label: msg('Sab') },
];
const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: msg('Intezar'), tone: 'warning' }, SCHEDULED: { label: msg('Bata diya'), tone: 'info' }, COMPLETED: { label: msg('Band'), tone: 'neutral' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};
const avail = (r: SizeRequest) => r.available.map((a) => [a.size, a.color].filter(Boolean).join(' ') || t('Stock')).join(', ');

function NewRequestSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [picked, setPicked] = useState<PickedProduct | null>(null);
  const [picking, setPicking] = useState(false);
  const [f, setF] = useState({ customerName: '', customerPhone: '', productName: '', colorPreference: '', gender: '', notes: '', other: '' });
  const [sizes, setSizes] = useState<string[]>([]);
  const [system, setSystem] = useState('UK');
  const set = SIZE_SYSTEMS.find((s) => s.value === system) ?? SIZE_SYSTEMS[0];
  const lab = (s: string) => (system === 'UK' ? s : `${system} ${s}`);
  const reset = () => { setPicked(null); setF({ customerName: '', customerPhone: '', productName: '', colorPreference: '', gender: '', notes: '', other: '' }); setSizes([]); };
  const bad = f.customerName.trim().length < 2 || !/^[0-9+\-\s]{7,16}$/.test(f.customerPhone.trim()) || (!picked && f.productName.trim().length < 2);
  const save = useMutation({
    mutationFn: () => shoeTryOnApi.create({
      customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), productId: picked?.product.id, productName: picked ? picked.product.name : f.productName.trim(),
      requestedSizes: [...sizes, ...f.other.split(',').map((s) => s.trim()).filter(Boolean)], colorPreference: opt(f.colorPreference), gender: f.gender || undefined, notes: opt(f.notes),
    }),
    onSuccess: (r) => { toast.success(t('Farmaish {{requestNumber}} likh li', { requestNumber: r.requestNumber })); refreshShoe([REQUEST_KEY]); reset(); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  return (
    <>
      <Sheet open={open && !picking} onClose={onClose} title={t('Nayi farmaish')} description={t('Jo size ya rang abhi nahi — maal aane par customer ko batayein')} height={0.92}
        footer={<Button fullWidth size="lg" loading={save.isPending} disabled={bad} onPress={() => save.mutate()}>{t('Farmaish likhein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Input label={t('Customer')} value={f.customerName} onChangeText={(v) => setF({ ...f, customerName: v })} placeholder={t('Sana')} />
          <Input label={t('Phone')} value={f.customerPhone} onChangeText={(v) => setF({ ...f, customerPhone: v })} keyboardType="phone-pad" placeholder="03001234567" ltr />
          <ListRow dense title={picked ? picked.product.name : t('Joota (catalog se)')} subtitle={picked ? undefined : t('Chunein to stock aate hi yahan dikhega — warna neeche naam likhein')} chevron onPress={() => setPicking(true)} />
          {!picked && <Input label={t('Ya article / naam')} value={f.productName} onChangeText={(v) => setF({ ...f, productName: v })} placeholder={t('Bata loafer brown 8231')} />}
          <Text size="sm" weight="semibold" tone="secondary">{t('Size')}</Text>
          <ChipGroup value={system} onChange={setSystem} options={SIZE_SYSTEMS.map((s) => ({ value: s.value, label: t(SYSTEM_LABEL[s.value]) }))} />
          <ChipGroup multiple wrap value={sizes} onChange={setSizes} options={[...new Set([...set.sizes.map(lab), ...sizes])].map((s) => ({ value: s, label: s }))} />
          <Input label={t('Doosra size')} value={f.other} onChangeText={(v) => setF({ ...f, other: v })} placeholder="6.5, 44" />
          <Text size="sm" weight="semibold" tone="secondary">{t('Rang')}</Text>
          <ChipGroup wrap value={f.colorPreference} onChange={(v) => setF({ ...f, colorPreference: f.colorPreference === v ? '' : v })} options={SHOE_COLORS.map(([c]) => ({ value: c, label: c }))} />
          <ChipGroup wrap value={f.gender} onChange={(v) => setF({ ...f, gender: f.gender === v ? '' : v })} options={GENDERS.map((g) => ({ value: g.value, label: t(g.label) }))} />
          <TextArea label={t('Note')} value={f.notes} onChangeText={(v) => setF({ ...f, notes: v })} placeholder={t('Eid se pehle chahiye')} />
        </View>
      </Sheet>
      <ProductPicker open={open && picking} onClose={() => setPicking(false)} title={t('Joota (catalog se)')} includeRaw={false} variants={false} onPick={(p) => { setPicked(p); setPicking(false); }} />
    </>
  );
}

export function TryOnScreen() {
  const can = usePermission();
  const manage = can(P.POS_USE);
  const { guard } = useDeskOnline('shoeDesk');
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState<SizeRequest | null>(null);
  const [size, setSize] = useState('');
  const sum = useQuery({ queryKey: [REQUEST_KEY, 'counts'], queryFn: () => shoeTryOnApi.page({ view: 'open', limit: 1 }), refetchInterval: 120_000 });
  const c = sum.data?.counts;
  const done = (text: string) => { toast.success(text); setClosing(null); refreshShoe([REQUEST_KEY]); };
  const fail = (e: unknown) => toast.error(apiErrorMessage(e, t('Nahi hua')));
  const told = (r: SizeRequest) => guard(() => void shoeTryOnApi.notified(r.id).then(() => done(t('Bata diya — customer ka intezar'))).catch(fail));
  const cancel = (r: SizeRequest) => guard(() => void shoeTryOnApi.cancel(r.id).then(() => done(t('Farmaish cancel'))).catch(fail));
  const finish = (purchased: boolean) => guard(() => { if (closing) void shoeTryOnApi.complete(closing.id, { purchased, purchasedSize: purchased ? opt(size) : undefined }).then(() => done(purchased ? t('Band — customer le gaya') : t('Band — customer ne nahi liya'))).catch(fail); });
  const tell = (r: SizeRequest) => openWhatsApp(r.customerPhone, `Assalam o alaikum ${r.customerName}, aap ne ${r.productName}${r.requestedSizes.length ? ` size ${r.requestedSizes.join(', ')}` : ''} ka poocha tha — ab dukaan par aa gaya hai. Aa kar le jayein.`);
  return (
    <>
      <JobList<SizeRequest, RequestView, Awaited<ReturnType<typeof shoeTryOnApi.page>>>
        title={t('Size requests')} queryKey={REQUEST_KEY} views={VIEWS.map((v) => ({ ...v, label: t(v.label) }))} defaultView="open" feature="shoeDesk"
        fetch={({ view, search, page }) => shoeTryOnApi.page({ view, search, page, limit: 30 })}
        searchPlaceholder={t('Number, customer, phone ya joota…')} emptyIcon={HandMetal} emptyTitle={t('Koi khuli farmaish nahi')}
        onNew={manage ? () => guard(() => setAdding(true)) : undefined} newLabel={t('New')}
        tiles={(setView) => (
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} icon={Hourglass} tone="warning" label={t('Maal ka intezar')} loading={!c} value={String(c?.waiting ?? 0)} onPress={() => setView('waiting')} />
            <StatTile style={{ flex: 1 }} icon={BellRing} tone="info" label={t('Bata diya')} loading={!c} value={String(c?.told ?? 0)} onPress={() => setView('told')} />
            <StatTile style={{ flex: 1 }} icon={ShoppingBag} tone="success" label={t('Khareed liya')} loading={!c} value={String(c?.bought ?? 0)} onPress={() => setView('bought')} />
          </Row>
        )}
        renderRow={(r) => {
          const st = STATUS[r.status] ?? STATUS.PENDING;
          const live = r.status === 'PENDING' || r.status === 'SCHEDULED';
          const end: SwipeAction[] = manage && live ? [
            { icon: MessageCircle, label: t('WhatsApp'), tone: 'success', onPress: () => tell(r) },
            ...(r.status === 'PENDING' ? [{ icon: BellRing, label: t('Bata diya'), tone: 'brand' as const, onPress: () => told(r) }] : []),
            { icon: CheckCircle2, label: t('Band'), tone: 'brand', onPress: () => { setSize(''); setClosing(r); } },
            { icon: XCircle, label: t('Cancel'), tone: 'danger', onPress: () => cancel(r) },
          ] : [];
          return (
            <SwipeRow end={end}>
              <ListRow divider icon={HandMetal} iconTone={r.available.length && live ? 'success' : st.tone} title={r.customerName} overline={`${r.requestNumber} · ${formatDate(r.createdAt)}`}
                subtitle={`${r.productName}${r.requestedSizes.length ? ` · ${r.requestedSizes.join(', ')}` : ''}${r.colorPreference ? ` · ${r.colorPreference}` : ''}`}
                trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><StatusPill tone={st.tone}>{t(st.label)}</StatusPill>{live && r.available.length > 0 ? <Badge tone="success">{t('Stock aa gaya')}: {avail(r)}</Badge> : null}</View>} />
            </SwipeRow>
          );
        }}
      />
      <NewRequestSheet open={adding} onClose={() => setAdding(false)} />
      <Sheet open={!!closing} onClose={() => setClosing(null)} title={closing ? `${closing.customerName} · ${closing.requestNumber}` : ''}
        footer={<Row gap={2}><Button style={{ flex: 1 }} variant="secondary" onPress={() => finish(false)}>{t('Nahi liya')}</Button><Button style={{ flex: 1 }} variant="success" onPress={() => finish(true)}>{t('Le gaya')}</Button></Row>}>
        <View style={{ gap: 12 }}>
          <Text size="sm" tone="muted">{t('Bill counter (POS) par hi banta hai.')}</Text>
          <Input label={t('Kaun sa size liya')} value={size} onChangeText={setSize} placeholder="8" />
        </View>
      </Sheet>
    </>
  );
}

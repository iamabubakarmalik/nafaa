/** The team order sheet (web TeamOrderModal): kit lines, printing list, money and the next step. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowRight, Ban, BookUser, MessageCircle, PackageCheck, Pencil, Printer, Receipt, RotateCcw, Share2, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { TEAM_NEXT, TEAM_OPEN, heldAdvance, type TeamStatus } from '@nafaa/core/industries/sports';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { withManagerPin } from '@/core/security/ManagerPin';
import { Amount, Button, Card, DetailRow, ListRow, Row, Sheet, SkeletonRows, StatusPill, Text, confirm, toast, useTheme } from '@/design';
import { PaySheet, errorText } from '@/industries/_shared/deskKit';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { teamOrdersApi, type TeamOrderDetail } from '../api';
import { TEAM_KEY, TEAM_STATUS, dayFull, refreshSports } from '../meta';
import { sendSlip, teamSlip } from '../slip';

export function TeamOrderSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? '';
  const q = useQuery({ queryKey: [TEAM_KEY, 'one', id], queryFn: () => teamOrdersApi.getOne(id!), enabled: !!id });
  const o = q.data as TeamOrderDetail | undefined;
  const [taking, setTaking] = useState<'pay' | 'deliver' | null>(null);
  const done = (msg: string) => { toast.success(msg); setTaking(null); refreshSports([TEAM_KEY], true); };
  const fail = (e: unknown) => toast.error(errorText(e, t('Kuch ghalat ho gaya')));
  const step = useMutation({ mutationFn: (s: TeamStatus) => teamOrdersApi.updateStatus(id!, { status: s }), onSuccess: (r) => done(`${r.orderNumber}: ${t(TEAM_STATUS[r.status].label)}`), onError: fail });
  const cancel = useMutation({ mutationFn: () => teamOrdersApi.cancel(id!), onSuccess: () => done(t('Order cancel')), onError: fail });
  const refund = useMutation({ mutationFn: () => withManagerPin(t('Advance wapsi'), (pin) => teamOrdersApi.refund(id!, pin), 'refund'), onSuccess: () => done(t('Advance cash me wapas')), onError: fail });

  const open = !!o && TEAM_OPEN.includes(o.status);
  const next = o ? TEAM_NEXT[o.status] : undefined;
  const held = o ? heldAdvance(o.advancePaid, o.refunded) : 0;
  const roster = o?.playerNames ?? [];
  const askCancel = async () => {
    if (!o) return;
    const ok = await confirm({
      title: t('{{no}} cancel karein?', { no: o.orderNumber }),
      message: o.advancePaid > 0 ? t('{{advance}} advance team ke khate me rahega — chahein to baad me cash wapas karein.', { advance: formatMoney(o.advancePaid) }) : t('Order band ho jayega. Kuch delete nahi hota.'),
      confirmLabel: t('Order cancel karein'), tone: 'danger',
    });
    if (ok) cancel.mutate();
  };
  const slip = (share: boolean) => { if (o) void sendSlip(teamSlip(o, lang), shop, lang, share).catch((e) => fail(e)); };
  const wa = () => o && openWhatsApp(o.contactPhone, t('{{team}} ka order {{no}} {{status}}. Kul {{total}}, advance {{advance}}, baqi {{due}}.', {
    team: o.teamName, no: o.orderNumber, status: o.status === 'READY' ? t('tayyar hai') : t(TEAM_STATUS[o.status].label), total: formatMoney(o.totalAmount), advance: formatMoney(o.advancePaid), due: formatMoney(o.balanceAmount),
  }));

  return (
    <>
      <Sheet open={!!id} onClose={onClose} title={o ? `${o.orderNumber} · ${o.teamName}` : t('Team order')} description={o ? `${o.contactPerson} · ${o.contactPhone}${o.organization ? ` · ${o.organization}` : ''}` : undefined} height={0.92}
        footer={o && open ? (
          <View style={{ gap: th.space(2) }}>
            <Row gap={2}>
              {o.balanceAmount > 0 && <Button style={{ flex: 1 }} variant="secondary" icon={Wallet} onPress={() => setTaking('pay')}>{t('Payment lein')}</Button>}
              {!!next && <Button style={{ flex: 1 }} variant="secondary" iconEnd={ArrowRight} loading={step.isPending} onPress={() => step.mutate(next)}>{t(TEAM_STATUS[next].label)}</Button>}
            </Row>
            <Button fullWidth size="lg" icon={PackageCheck} onPress={() => setTaking('deliver')}>{t('Deliver + bill')}</Button>
          </View>
        ) : undefined}>
        {!o ? <SkeletonRows count={4} /> : (
          <View style={{ gap: th.space(3) }}>
            <Row gap={2}>
              <StatusPill tone={TEAM_STATUS[o.status].tone}>{t(TEAM_STATUS[o.status].label)}</StatusPill>
              <Text size="xs" tone="muted">{t('Order {{date}}', { date: dayFull(o.createdAt) })} · {t('Delivery {{value}}', { value: o.expectedDeliveryDate ? dayFull(o.expectedDeliveryDate) : t('tay nahi') })}</Text>
            </Row>
            <Card flush title={t('Maal ({{n}} piece)', { n: o.totalQuantity })}>
              {o.items.map((i, n) => (
                <ListRow key={n} dense divider={n < o.items.length - 1} title={i.productName}
                  subtitle={[[i.size, i.color].filter(Boolean).join(' · '), `${i.quantity} × ${formatMoney(i.unitPrice + (i.printingPrice ?? 0))}`, (i.printingPrice ?? 0) > 0 ? t('Printing {{p}} / piece', { p: formatMoney(i.printingPrice!) }) : ''].filter(Boolean).join(' · ')}
                  trailing={<Amount value={i.total} weight="bold" />} />
              ))}
            </Card>
            {roster.length > 0 && (
              <Card flush title={t('Printing list · {{count}} players', { count: roster.length })}>
                {roster.map((p, n) => <ListRow key={n} dense divider={n < roster.length - 1} title={p.name || '—'} leading={<Text weight="bold" ltr style={{ width: 34, textAlign: 'center' }}>{p.number || '–'}</Text>} trailing={p.size ? <Text tone="muted">{p.size}</Text> : undefined} />)}
              </Card>
            )}
            {!!o.customizationDetails && <Card tone="info" title={t('Printing / design')}><Text size="sm">{o.customizationDetails}</Text></Card>}
            {!!(o.notes || o.internalNotes) && <Text size="sm" tone="secondary">{[o.notes, o.internalNotes].filter(Boolean).join('\n')}</Text>}
            <Card flush>
              <DetailRow label={t('Maal')} value={<Amount value={o.subtotal} />} />
              {o.discountAmount > 0 && <DetailRow label={t('Discount {{pct}}%', { pct: o.discountPct })} value={<Amount value={-o.discountAmount} />} />}
              {o.shippingCharge > 0 && <DetailRow label={t('Delivery')} value={<Amount value={o.shippingCharge} />} />}
              <DetailRow label={t('Kul')} value={<Amount value={o.totalAmount} weight="bold" />} />
              <DetailRow label={t('Advance / payment')} value={<Amount value={o.advancePaid} tone="success" />} />
              {o.refunded > 0 && <DetailRow label={t('Advance wapas diya')} value={<Amount value={o.refunded} tone="danger" />} />}
              <DetailRow label={t('Baqi')} value={<Amount value={o.balanceAmount} weight="bold" tone={o.balanceAmount > 0 ? 'warning' : undefined} />} last />
            </Card>
            <Text size="xs" tone="muted">{t('Advance team ke khate me jama rehta hai aur deliver ke bill me lag jata hai.')}</Text>
            <View>
              <ListRow icon={Printer} title={t('Slip print')} onPress={() => slip(false)} />
              <ListRow icon={Share2} title={t('Slip share karein')} onPress={() => slip(true)} />
              <ListRow icon={MessageCircle} title={t('WhatsApp')} onPress={wa} />
              {o.customerId && can(P.CUSTOMERS_VIEW) && <ListRow icon={BookUser} title={t('Team ka khata')} chevron onPress={() => { onClose(); router.push(`/customers/${o.customerId}` as never); }} />}
              {o.sale && <ListRow icon={Receipt} title={t('Bill {{no}}', { no: o.sale.saleNumber })} chevron onPress={() => { onClose(); router.push(`/pos/receipt/${o.sale!.id}` as never); }} />}
              {open && <ListRow icon={Pencil} title={t('Badlein')} chevron onPress={() => { onClose(); router.push(`/sports/team-orders/${o.id}` as never); }} />}
              {open && <ListRow icon={Ban} destructive title={t('Cancel')} onPress={() => void askCancel()} />}
              {o.status === 'CANCELLED' && held > 0 && can(P.RETURNS_CREATE) && <ListRow icon={RotateCcw} destructive title={t('Advance wapas ({{held}})', { held: formatMoney(held) })} onPress={() => refund.mutate()} />}
            </View>
          </View>
        )}
      </Sheet>
      <PaySheet open={taking === 'pay'} title={t('Advance / payment')} name={o?.teamName ?? ''} due={o?.balanceAmount ?? 0} cta={t('Payment jama karein')}
        onClose={() => setTaking(null)} onConfirm={async (p) => { await teamOrdersApi.recordPayment(id!, { amount: p.paidAmount, paymentMethod: p.paymentMethod }); done(t('Payment team ke khate me jama')); }} />
      <PaySheet open={taking === 'deliver'} title={t('Deliver aur bill')} name={o?.teamName ?? ''} due={o?.balanceAmount ?? 0} cta={t('Deliver karein')}
        onClose={() => setTaking(null)} onConfirm={async (p) => { await teamOrdersApi.updateStatus(id!, { status: 'DELIVERED', paidNow: p.paidAmount, paymentMethod: p.paymentMethod }); done(t('Order deliver — bill ban gaya')); }} />
    </>
  );
}

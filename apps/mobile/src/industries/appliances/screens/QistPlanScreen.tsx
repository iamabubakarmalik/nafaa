/** Qist plan of an appliance bill (web QistPlanPage): the instalments and the guarantor (zamin): view, change, share the agreement text. */

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { FileSignature, Pencil, Printer } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { guarantorErrors } from '@nafaa/core/industries/appliances';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, Input, ListRow, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { Fact, callPhone, errText, opt, useDeskOnline } from '../../_shared/trade/desk';
import { qistApi, type QistPlan } from '../api';
import { qistAgreementDoc } from '../slips';
import { sendSlip } from '../../_shared/trade/slip';
import { useBillLanguage } from '@/core/receipt';
import { KEYS, dayOnly, refreshAppliances } from '../meta';

export function QistPlanScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const manage = usePermission()(P.KHATA_MANAGE);
  const shop = useAuthStore((s) => s.tenant?.name) ?? '';
  const lang = useBillLanguage();
  const q = useQuery({ queryKey: [KEYS.qist, id], queryFn: () => qistApi.getPlan(id!), enabled: !!id });
  const [editing, setEditing] = useState(false);
  const p = q.data;
  const canEdit = manage && !!p && p.status !== 'CANCELLED';

  const share = () => {
    if (!p) return;
    const text = [
      t('{{shop}} — Qist iqrarnama', { shop }), `${p.planNumber}`,
      t('Customer: {{name}}', { name: p.customerName ?? p.customer?.name ?? '' }),
      t('Kul raqam: {{amount}}', { amount: formatMoney(p.totalAmount ?? 0) }),
      t('{{n}} qist, pehli qist {{date}}', { n: p.installmentCount ?? p.installments?.length ?? 0, date: p.startDate ? dayOnly(p.startDate) : '' }),
      p.guarantorName ? t('Zamin: {{name}} (CNIC {{cnic}})', { name: p.guarantorName, cnic: p.guarantorCnic ?? '' }) : '',
    ].filter(Boolean).join('\n');
    void Share.share({ message: text });
  };

  return (
    <DetailTemplate title={p?.planNumber ?? t('Qist plan')} subtitle={p?.customerName ?? p?.customer?.name}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      bottomActions={p ? (
        <>
          <Button variant="secondary" icon={FileSignature} style={{ flex: 1 }} onPress={share}>{t('Iqrarnama share')}</Button>
          <Button variant="secondary" icon={Printer} style={{ flex: 1 }} onPress={() => void sendSlip(qistAgreementDoc(p, lang), shop, lang).catch(() => toast.error(t('Could not print. Check the printer and try again.')))}>{t('Print agreement')}</Button>
          {canEdit && <Button icon={Pencil} style={{ flex: 1 }} onPress={() => setEditing(true)}>{p.guarantorName ? t('Badlein') : t('Zamin likhein')}</Button>}
        </>
      ) : undefined}>
      {p && (
        <View style={{ gap: th.space(3) }}>
          <Badge tone={p.status === 'ACTIVE' ? 'success' : 'neutral'}>{p.status}</Badge>
          <DetailSection title={t('Raqam')}>
            <DetailRow label={t('Kul')} value={<Amount value={p.totalAmount ?? 0} />} />
            <DetailRow label={t('Advance')} value={<Amount value={p.downPayment ?? 0} />} />
            <DetailRow label={t('Mila')} value={<Amount value={p.paidAmount ?? 0} />} />
            <DetailRow label={t('Baqi')} value={<Amount value={p.remainingAmount ?? 0} weight="bold" />} last />
          </DetailSection>
          {p.installments && p.installments.length > 0 && (
            <DetailSection title={t('Qistein')}>
              {p.installments.map((x, i) => <ListRow key={x.id} dense divider={i < p.installments!.length - 1} title={t('Qist {{n}}', { n: x.installmentNumber })} subtitle={dayOnly(x.dueDate)} trailing={<Text size="sm" weight="semibold" ltr>{formatMoney(x.amount)}</Text>} />)}
            </DetailSection>
          )}
          <DetailSection title={t('Zamin (guarantor)')}>
            {p.guarantorName ? (
              <Card>
                <View style={{ gap: th.space(2) }}>
                  <Fact k={t('Naam')} v={p.guarantorName} />
                  <Fact k={t('Phone')} v={p.guarantorPhone} />
                  <Fact k={t('CNIC')} v={p.guarantorCnic} />
                  <Fact k={t('Pata')} v={p.guarantorAddress} />
                  {p.guarantorPhone ? <Button size="sm" variant="ghost" onPress={() => callPhone(p.guarantorPhone)}>{t('Call')}</Button> : null}
                </View>
              </Card>
            ) : (
              <Card tone="warning"><Text size="sm">{t('Is plan par abhi koi zamin nahi. Qist par saman dene se pehle zamin ka naam aur CNIC zaroor likhein.')}</Text></Card>
            )}
          </DetailSection>
        </View>
      )}
      {p && <GuarantorSheet plan={p} open={editing} onClose={() => setEditing(false)} onSaved={() => void q.refetch()} />}
    </DetailTemplate>
  );
}

function GuarantorSheet({ plan, open, onClose, onSaved }: { plan: QistPlan; open: boolean; onClose: () => void; onSaved: () => void }) {
  const th = useTheme();
  const { guard } = useDeskOnline('appliancesDesk');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(plan.guarantorName ?? ''); setPhone(plan.guarantorPhone ?? ''); setCnic(plan.guarantorCnic ?? ''); setAddress(plan.guarantorAddress ?? ''); setTried(false); } }, [open, plan]);
  const g = guarantorErrors({ name, phone, cnic }, plan.customerPhone ?? plan.customer?.phone ?? '');
  const msgs = { name: t('Zamin ka naam likhein'), phone: t('Phone 03XX-XXXXXXX likhein'), self: t('Zamin customer khud nahi ho sakta'), cnic: t('CNIC 13 hindse (35202-1234567-1)') };
  const bad = !!(g.name || g.phone || g.cnic);
  const run = () => guard(async () => {
    setTried(true);
    if (bad) return;
    setBusy(true);
    try {
      await qistApi.setGuarantor(plan.id, { guarantorName: name.trim(), guarantorPhone: phone.replace(/[\s-]/g, '') || undefined, guarantorCnic: cnic.trim(), guarantorAddress: opt(address) });
      refreshAppliances([KEYS.qist]);
      toast.success(t('Zamin save ho gaya'));
      onSaved();
      onClose();
    } catch (e) { toast.error(errText(e, t('Zamin save nahi hua'))); } finally { setBusy(false); }
  });
  return (
    <Sheet open={open} onClose={onClose} title={t('Zamin (guarantor)')} description={t('Qist na milne par zimmedar')} footer={<Button fullWidth size="lg" loading={busy} onPress={run}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={name} onChangeText={setName} error={tried && g.name ? msgs.name : undefined} />
        <Input label={t('Phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr placeholder="0300-1234567" error={tried && g.phone ? msgs[g.phone] : undefined} />
        <Input label={t('CNIC')} value={cnic} onChangeText={setCnic} placeholder="35202-1234567-1" ltr error={tried && g.cnic ? msgs.cnic : undefined} />
        <TextArea label={t('Pata')} value={address} onChangeText={setAddress} placeholder={t('Ghar ya dukaan ka pata')} hint={t('Iqrarnama par chhapta hai')} />
      </View>
    </Sheet>
  );
}

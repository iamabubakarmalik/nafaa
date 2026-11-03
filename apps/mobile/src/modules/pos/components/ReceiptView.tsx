/**
 * On-screen bill in the receipt engine's layout (paper look): shop header,
 * bill details, lines, totals, khata and the Nafaa line. The printed and
 * shared copy comes from the same ReceiptDoc through core/receipt.
 */

import { View } from 'react-native';
import { formatDateTime, formatPKR } from '@/core/format';
import { NAFAA, rw, type ReceiptDoc, type ReceiptLang, type ReceiptSetup } from '@/core/receipt';
import { Text, useTheme } from '@/design';

function Line({ label, value, bold, big }: { label: string; value: string; bold?: boolean; big?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginVertical: 1 }}>
      <Text size={big ? 'lg' : 'sm'} weight={bold ? 'bold' : 'regular'} style={{ flexShrink: 1 }}>{label}</Text>
      <Text size={big ? 'lg' : 'sm'} weight={bold ? 'bold' : 'semibold'} ltr tabular>{value}</Text>
    </View>
  );
}

export function ReceiptView({ doc, setup, lang }: { doc: ReceiptDoc; setup: ReceiptSetup; lang: ReceiptLang }) {
  const th = useTheme();
  const d = setup.design;
  const due = Math.max(doc.total - doc.paid, 0);
  const rule = <View style={{ borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: th.colors.borderStrong, marginVertical: th.space(2) }} />;
  return (
    <View style={{ backgroundColor: th.colors.surface, borderRadius: th.radius('lg'), padding: th.space(4), borderWidth: 1, borderColor: th.colors.border, maxWidth: 420, alignSelf: 'center', width: '100%', direction: lang === 'ur' ? 'rtl' : 'ltr' }}>
      {!!doc.stamp && (
        <View style={{ position: 'absolute', top: 90, alignSelf: 'center', borderWidth: 3, borderColor: th.colors.danger.border, borderRadius: 8, paddingHorizontal: 14, transform: [{ rotate: '-14deg' }], opacity: 0.6, zIndex: 2 }}>
          <Text size="2xl" weight="heavy" color={th.colors.danger.text}>{doc.stamp}</Text>
        </View>
      )}
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text size="xl" weight="heavy" align="center">{setup.shop.name}</Text>
        {!!d.tagline && <Text size="xs" tone="muted" italic>{d.tagline}</Text>}
        {d.showAddress && !!(doc.branchAddress || setup.shop.address) && <Text size="xs" tone="muted" align="center">{doc.branchAddress || setup.shop.address}</Text>}
        {d.showPhone && !!(doc.branchPhone || setup.shop.phone) && <Text size="xs" tone="muted" ltr>{doc.branchPhone || setup.shop.phone}</Text>}
      </View>
      {rule}
      <Line label={rw(lang, 'bill')} value={doc.saleNumber} bold />
      <Line label={rw(lang, 'date')} value={formatDateTime(doc.date)} />
      {d.showCustomer && !!doc.customerName && <Line label={rw(lang, 'customer')} value={doc.customerPhone ? `${doc.customerName} (${doc.customerPhone})` : doc.customerName} />}
      {d.showCashier && !!doc.cashierName && <Line label={rw(lang, 'cashier')} value={doc.cashierName} />}
      {doc.infoRows?.map((r) => <Line key={`${r.label}-${r.value}`} label={r.label} value={r.value} bold={r.bold} />)}
      {rule}
      {doc.lines.map((l, i) => (
        <View key={i} style={{ marginVertical: 3 }}>
          <Text size="sm" weight="bold">{d.showItemNumbers ? `${i + 1}. ` : ''}{l.name}</Text>
          <Line label={`${l.qty} ${l.unit} × ${formatPKR(l.price)}`} value={formatPKR(l.total)} />
          {!!l.discount && <Line label={rw(lang, 'discount')} value={`−${formatPKR(l.discount)}`} />}
          {!!l.note && <Text size="xs" tone="muted">↳ {l.note}</Text>}
          {l.details?.map((x) => <Text key={x} size="xs" tone="muted">{x}</Text>)}
        </View>
      ))}
      {rule}
      <Line label={`${rw(lang, 'items')} ${doc.lines.length}`} value={formatPKR(doc.subtotal)} />
      {doc.discount > 0 && <Line label={rw(lang, 'discount')} value={`−${formatPKR(doc.discount)}`} />}
      {(doc.deliveryCharge ?? 0) > 0 && <Line label={rw(lang, 'delivery')} value={`+${formatPKR(doc.deliveryCharge!)}`} />}
      {doc.extraRows?.map((r) => <Line key={r.label} label={r.label} value={r.value} bold={r.bold} />)}
      <View style={{ borderTopWidth: 2, borderBottomWidth: 2, borderColor: th.colors.text, paddingVertical: 4, marginVertical: 6 }}>
        <Line label={rw(lang, 'total')} value={formatPKR(doc.total)} bold big />
      </View>
      {(doc.payments?.length ? doc.payments.map((p) => ({ label: p.label, amount: p.amount })) : [{ label: doc.paymentLabel, amount: doc.paid }]).map((p) => (
        <Line key={p.label} label={p.label} value={formatPKR(p.amount)} />
      ))}
      {doc.paid > doc.total && <Line label={rw(lang, 'change')} value={formatPKR(doc.paid - doc.total)} bold />}
      {due > 0 && <Line label={rw(lang, 'due')} value={formatPKR(due)} bold />}
      {d.showKhata && (doc.previousDue ?? 0) > 0 && (
        <View style={{ borderWidth: 1.5, borderColor: th.colors.text, padding: th.space(2), marginTop: th.space(2), borderRadius: 4 }}>
          <Text size="xs" weight="bold">{`${rw(lang, 'khata')} — ${doc.customerName ?? ''}`}</Text>
          <Line label={rw(lang, 'previousDue')} value={formatPKR(doc.previousDue!)} />
          {due > 0 && <Line label={rw(lang, 'thisBill')} value={`+${formatPKR(due)}`} />}
          <Line label={rw(lang, 'totalDue')} value={formatPKR((doc.previousDue ?? 0) + due)} bold />
        </View>
      )}
      {doc.boxes?.map((b) => (
        <View key={b.title} style={{ borderWidth: 1.5, borderColor: th.colors.text, padding: th.space(2), marginTop: th.space(2), borderRadius: 4 }}>
          <Text size="xs" weight="bold">{b.title}</Text>
          {b.lines.map((x, i) => <Text key={i} size="xs" tone="muted">{x}</Text>)}
        </View>
      ))}
      {!!doc.receivedByName && <Line label={rw(lang, 'receiver')} value={doc.receivedByName} />}
      {d.showSavings && doc.discount > 0 && <Text size="sm" weight="bold" align="center" style={{ marginTop: 6 }}>{rw(lang, 'saved', { amount: formatPKR(doc.discount) })}</Text>}
      {!!doc.footerNote && <Text size="sm" align="center" style={{ marginTop: 8 }}>{doc.footerNote}</Text>}
      {!!d.footer && <Text size="sm" weight="semibold" align="center" style={{ marginTop: 8 }}>{d.footer}</Text>}
      {!!d.thanks && <Text size="sm" weight="bold" align="center" style={{ marginTop: 4 }}>{d.thanks}</Text>}
      {rule}
      <View style={{ alignItems: 'center', gap: 2 }}>
        <View style={{ backgroundColor: th.colors.text, paddingHorizontal: 8, borderRadius: 3 }}><Text size="xs" weight="heavy" color={th.colors.surface}>{NAFAA.name}</Text></View>
        <Text size="2xs" tone="muted" align="center">{`${rw(lang, 'pitch')} · ${NAFAA.phone} · ${NAFAA.web}`}</Text>
      </View>
    </View>
  );
}

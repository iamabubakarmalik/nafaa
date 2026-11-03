/**
 * Quick-add sheets used while entering a purchase: a new supplier (with an
 * optional opening balance) or a new product, without leaving the bill.
 * Only what the bill needs is asked; the full forms fill in the rest later.
 * A new supplier needs internet; a new product is saved on the phone and
 * can go on the bill at once (offline too).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Wand2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { autoSku, priceForMarkup } from '@nafaa/core/inventory';
import { formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { enqueueProductCreate, offline, type ProductRow } from '@/core/offline';
import { useAuthStore } from '@/core/auth/store';
import { Button, Card, Chip, IconButton, Input, MoneyInput, Row, Select, Sheet, Text, toast, useTheme } from '@/design';
import { CategorySelect } from '@/modules/inventory/components/Pickers';
import { NumberInput } from '@/modules/inventory/components/fields';
import { PUR, useOnline } from '@/modules/inventory/lib/shared';
import { supplierLedgerApi, suppliersApi } from '../api/suppliers';

export function QuickSupplierSheet({ open, initialName, onClose, onCreated }: {
  open: boolean;
  initialName?: string;
  onClose: () => void;
  onCreated: (s: { id: string; name: string; outstandingDue: number }) => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useOnline();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [city, setCity] = useState('');
  const [opening, setOpening] = useState<number | null>(null);
  useEffect(() => { if (open) { setName(initialName ?? ''); setPhone(''); setContactPerson(''); setCity(''); setOpening(null); } }, [open, initialName]);

  const mut = useMutation({
    mutationFn: async () => {
      const s = await suppliersApi.create({
        name: name.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(contactPerson.trim() ? { contactPerson: contactPerson.trim() } : {}), ...(city.trim() ? { city: city.trim() } : {}),
      });
      if ((opening ?? 0) > 0) await supplierLedgerApi.setOpeningBalance(s.id, { amount: opening!, note: msg('Purana hisab — purchase ke waqt darj kiya') });
      return { ...s, outstandingDue: opening ?? 0 };
    },
    onSuccess: (s) => {
      toast.success(t('"{{name}}" ban gaya ✓', { name: s.name }));
      void qc.invalidateQueries({ queryKey: [PUR] });
      onCreated(s);
    },
  });

  return (
    <Sheet open={open} onClose={onClose} title={t('Naya Supplier')} description={t('Sirf naam zaroori hai — baqi details baad me')}
      footer={<Button fullWidth icon={CheckCircle2} disabled={!name.trim() || !online} loading={mut.isPending} onPress={() => mut.mutate()}>{t('Banao aur chunein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {!online && <Card tone="info"><Text size="sm">{t('Naya supplier banane ke liye internet chahiye.')}</Text></Card>}
        <Input label={t('Supplier ka naam')} value={name} onChangeText={setName} placeholder={t('Akbari Mandi Wholesale')} size="lg" autoFocus maxLength={120} />
        <Input label={t('Phone')} hint={t('WhatsApp ke liye')} value={phone} onChangeText={setPhone} placeholder="0300-1234567" keyboardType="phone-pad" ltr />
        <Input label={t('Banda (optional)')} value={contactPerson} onChangeText={setContactPerson} placeholder={t('Asif sb')} />
        <Input label={t('Sheher (optional)')} value={city} onChangeText={setCity} placeholder={t('Lahore')} />
        <MoneyInput label={t('Purana hisab — pehle se kitna dena tha')} value={opening} onChangeValue={setOpening}
          hint={(opening ?? 0) > 0 ? t('Khata {{formatPKR}} se shuru hoga', { formatPKR: formatPKR(opening) }) : t('Is supplier ka purana baqi hai to abhi daal dein — baad me yaad nahi rehta.')} />
      </View>
    </Sheet>
  );
}

const UNITS = ['pcs', 'kg', 'gram', 'litre', 'ml', 'meter', 'foot', 'box', 'pack', 'dozen', 'set', 'unit'];

/** New product with the basics; stock starts at 0 and the bill adds to it. */
export function QuickProductSheet({ open, initialName, initialBarcode, onClose, onCreated }: {
  open: boolean;
  initialName?: string;
  initialBarcode?: string;
  onClose: () => void;
  onCreated: (p: ProductRow) => void;
}) {
  const th = useTheme();
  const shopId = useAuthStore((s) => s.currentShopId);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [cost, setCost] = useState<number | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [alert, setAlert] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName(initialName ?? ''); setBarcode(initialBarcode ?? ''); setSku(''); setUnit('pcs'); setCost(null); setPrice(null); setCategoryId(null); setAlert(null);
  }, [open, initialName, initialBarcode]);

  const c = cost ?? 0;
  const sale = price ?? 0;
  const loss = c > 0 && sale > 0 && sale < c;
  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const { productId } = await enqueueProductCreate({
        name: name.trim(), unit, costPrice: c, price: sale || c, stock: 0, shopId: shopId ?? undefined,
        ...(sku.trim() ? { sku: sku.trim() } : {}), ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
        ...(categoryId ? { categoryId } : {}), ...(alert ? { lowStockAlert: alert } : {}),
      });
      const row = await offline.products.get(productId, shopId);
      toast.success(t('"{{name}}" ban gaya ✓ — ab bill me daal dein', { name: name.trim() }));
      if (row) onCreated(row);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Product nahi bana'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('Naya Product')} description={t('Bunyadi details — baqi baad me poori wizard se')}
      footer={<Button fullWidth icon={CheckCircle2} disabled={!name.trim()} loading={busy} onPress={() => void save()}>{t('Banao aur bill me daalo')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Product ka naam')} value={name} onChangeText={setName} placeholder={t('Dalda Cooking Oil 5L')} size="lg" autoFocus maxLength={160} />
        <Row gap={2} align="end">
          <Input containerStyle={{ flex: 1 }} label={t('SKU (optional)')} value={sku} onChangeText={setSku} placeholder={t('DAL-1234')} ltr autoCapitalize="characters" />
          <IconButton icon={Wand2} label={t('Khud bana dein')} variant="soft" size="lg" onPress={() => setSku(autoSku(name, 'PROD'))} />
        </Row>
        <Input label={t('Barcode')} hint={t('Dabbay par jo likha hai')} value={barcode} onChangeText={setBarcode} placeholder="8964000..." keyboardType="number-pad" ltr />
        <Select label={t('Unit')} value={unit} onChange={setUnit} options={UNITS.map((u) => ({ value: u, label: u }))} />
        <CategorySelect value={categoryId} onChange={setCategoryId} />
        <Row gap={2}>
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Cost')} hint={t('Supplier se kitne ka')} value={cost} onChangeValue={setCost} />
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Bechne ka rate')} hint={loss ? undefined : t('Khali = cost ke barabar')} error={loss ? t('Cost se kam hai') : undefined}
            value={price} onChangeValue={setPrice} />
        </Row>
        {c > 0 && (
          <Row gap={1.5} wrap>
            {[10, 15, 20, 25, 30].map((p) => <Chip key={p} label={`+${p}%`} onPress={() => setPrice(priceForMarkup(c, p))} />)}
          </Row>
        )}
        {sale > 0 && c > 0 && (
          <Card tone={loss ? 'danger' : 'success'}>
            <Row justify="between">
              <Text size="sm" weight="semibold">{loss ? t('Nuqsan par bech rahe hain') : t('Har unit par profit')}</Text>
              <Text size="sm" weight="semibold" ltr>{`${formatPKR(sale - c)} · ${(((sale - c) / sale) * 100).toFixed(0)}%`}</Text>
            </Row>
          </Card>
        )}
        <NumberInput label={t('Alert level')} hint={t('Stock is se neeche jaye to alert')} value={alert} onChangeValue={setAlert} />
        <Text size="xs" tone="muted">{t('Stock 0 se shuru hoga — is bill se khud barh jayega.')}</Text>
      </View>
    </Sheet>
  );
}

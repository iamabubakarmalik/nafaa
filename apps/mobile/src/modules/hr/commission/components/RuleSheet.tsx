/** Commission rule editor: what it is based on, how much, for whom, scope (category, brand, principal), minimum sale and target bonus. */

import { Trash2 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Chip, ChipGroup, IconButton, Input, MoneyInput, Segmented, Select, Sheet, Switch, Text, useTheme, confirm } from '@/design';
import { commissionApi, type CommissionBasis, type CommissionPerson, type CommissionRule, type CommissionValueType, type RulePayload } from '../api/commission';
import { BASIS, COMMISSION_KEY } from '../lib/meta';

export function RuleSheet({ open, rule, people, saving, onClose, onSave, onDelete }: {
  open: boolean; rule?: CommissionRule; people: CommissionPerson[]; saving: boolean; onClose: () => void; onSave: (d: RulePayload) => void; onDelete?: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} height={0.94} title={rule ? t('Rule badlein') : t('Naya commission rule')} description={t('Kis par, kitna, aur kis ke liye — baqi sab hisab khud banta hai')}>
      {open && <Body key={rule?.id ?? 'new'} rule={rule} people={people} saving={saving} onSave={onSave} onDelete={onDelete} />}
    </Sheet>
  );
}

function Body({ rule, people, saving, onSave, onDelete }: { rule?: CommissionRule; people: CommissionPerson[]; saving: boolean; onSave: (d: RulePayload) => void; onDelete?: () => void }) {
  const th = useTheme();
  const [name, setName] = useState(rule?.name ?? '');
  const [basis, setBasis] = useState<CommissionBasis>(rule?.basis ?? 'SALE');
  const [valueType, setValueType] = useState<CommissionValueType>(rule?.valueType ?? 'PERCENT');
  const [value, setValue] = useState<number | null>(rule?.value ?? null);
  const [userId, setUserId] = useState(rule?.userId ?? '');
  const [cats, setCats] = useState<string[]>(rule?.categoryIds ?? []);
  const [brandIds, setBrandIds] = useState<string[]>(rule?.brandIds ?? []);
  const [supplierIds, setSupplierIds] = useState<string[]>(rule?.supplierIds ?? []);
  const [minSale, setMinSale] = useState<number | null>(rule?.minMonthlySale || null);
  const [target, setTarget] = useState<number | null>(rule?.targetAmount || null);
  const [bonus, setBonus] = useState<number | null>(rule?.targetBonus || null);
  const [active, setActive] = useState(rule?.isActive ?? true);
  const [note, setNote] = useState(rule?.note ?? '');
  const [tried, setTried] = useState(false);

  const catsQ = useQuery({ queryKey: [COMMISSION_KEY, 'categories'], queryFn: commissionApi.categories, staleTime: 5 * 60_000 });
  const brandsQ = useQuery({ queryKey: [COMMISSION_KEY, 'brands'], queryFn: commissionApi.brands, staleTime: 5 * 60_000, retry: false });
  const principalsQ = useQuery({ queryKey: [COMMISSION_KEY, 'principals'], queryFn: commissionApi.principals, staleTime: 5 * 60_000, retry: false });
  const categories = catsQ.data ?? [];
  const brands = brandsQ.data ?? [];
  const principals = (principalsQ.data?.suppliers ?? []).filter((s) => s.isPrincipal || supplierIds.includes(s.id));

  const perBill = basis === 'PER_BILL';
  const type: CommissionValueType = perBill ? 'FIXED' : valueType;
  const n = value ?? 0;
  const errors = {
    value: !(n > 0) ? t('Amount likhein') : type === 'PERCENT' && n > 100 ? t('Percent 100 se zyada nahi') : '',
    bonus: target && !(bonus && bonus > 0) ? t('Target ke saath bonus bhi likhein') : '',
    target: bonus && !(target && target > 0) ? t('Bonus ke liye target likhein') : '',
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = () => {
    setTried(true);
    if (invalid) return;
    onSave({
      name: name.trim() || null, userId: userId || null, basis, valueType: type, value: n,
      categoryIds: perBill ? [] : cats, brandIds: perBill ? [] : brandIds, supplierIds: perBill ? [] : supplierIds,
      minMonthlySale: minSale && minSale > 0 ? minSale : null, targetAmount: target && target > 0 ? target : null,
      targetBonus: target && target > 0 && bonus && bonus > 0 ? bonus : null, isActive: active, note: note.trim() || null,
    });
  };

  const example = (() => {
    if (!(n > 0)) return undefined;
    if (perBill) return t('Mahine me 300 bill = {{formatPKR}}', { formatPKR: formatPKR(n * 300) });
    if (type === 'FIXED') return t('Mahine me 200 cheezein bikin = {{formatPKR}}', { formatPKR: formatPKR(n * 200) });
    const p = { base: formatPKR(200_000), result: formatPKR((200_000 * n) / 100) };
    return basis === 'PROFIT' ? t('{{base}} ki profit par = {{result}}', p) : t('{{base}} ki sale par = {{result}}', p);
  })();
  const sellers = people.filter((p) => p.userId);
  const person = sellers.find((p) => p.userId === userId);
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const chips = (list: Array<{ id: string; name: string }>, sel: string[], set: (v: string[]) => void) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
      {list.map((c) => <Chip key={c.id} label={c.name} selected={sel.includes(c.id)} onPress={() => toggle(sel, set, c.id)} />)}
    </View>
  );

  return (
    <View style={{ gap: 18, paddingBottom: 8 }}>
      <View style={{ gap: 8 }}>
        <Text size="sm" weight="medium">{t('Commission kis par')}</Text>
        <ChipGroup wrap value={basis} onChange={(v) => setBasis(v as CommissionBasis)} options={(Object.keys(BASIS) as CommissionBasis[]).map((b) => ({ value: b, label: t(BASIS[b].label) }))} />
        <Text size="xs" tone="muted">{t(BASIS[basis].hint)}</Text>
        {basis === 'PROFIT' && <Text size="xs" tone="muted">{t('Jis cheez ki cost bill par nahi likhi, us ki aaj ki cost lagti hai.')}</Text>}
      </View>
      {!perBill && (
        <View style={{ gap: 8 }}>
          <Text size="sm" weight="medium">{t('Kitna')}</Text>
          <Segmented value={valueType} onChange={(v) => setValueType(v as CommissionValueType)} options={[{ value: 'PERCENT', label: t('Percent (%)') }, { value: 'FIXED', label: t('Har cheez par Rs') }]} />
          <Text size="xs" tone="muted">{valueType === 'PERCENT' ? t('Sale ya profit ka hissa') : t('Har biki hui cheez (unit) par fixed amount')}</Text>
        </View>
      )}
      <MoneyInput label={type === 'PERCENT' ? t('Percent') : perBill ? t('Har bill par (Rs)') : t('Har cheez par (Rs)')} value={value} onChangeValue={setValue}
        error={tried ? errors.value : undefined} hint={example ?? (type === 'PERCENT' ? t('Maslan 2.5') : t('Maslan 20'))} />
      <Select label={t('Kis ke liye')} value={userId} onChange={setUserId} options={[{ value: '', label: t('Sab chaalu bande') }, ...sellers.map((p) => ({ value: p.userId!, label: p.name }))]}
        hint={userId ? t('{{value}} par sirf is ke apne rules chalenge, "sab" wale nahi', { value: person?.name ?? t('Is bande') }) : t('Jis bande ka apna rule na ho, us par ye chalta hai')} />
      <Input label={t('Naam (marzi se)')} value={name} onChangeText={setName} maxLength={80} placeholder={t(BASIS[basis].label)} hint={t('Yaad rakhne ke liye, maslan "Cake par 5%"')} />

      {!perBill && (
        <View style={{ gap: 8 }}>
          <Text size="sm" weight="medium">{t('Sirf in categories par')}</Text>
          {categories.length === 0 ? <Text size="xs" tone="muted">{t('Koi category nahi bani — rule har cheez par chalega.')}</Text> : chips(categories, cats, setCats)}
          <Text size="xs" tone="muted">{cats.length ? t('{{count}} category chuni — baqi maal par ye rule nahi lagega', { count: cats.length }) : t('Kuch na chunein to har cheez par lagega')}</Text>
        </View>
      )}
      {!perBill && brands.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text size="sm" weight="medium">{t('Sirf in brands par')}</Text>
          {chips(brands, brandIds, setBrandIds)}
          <Text size="xs" tone="muted">{brandIds.length ? t('{{count}} brand chune', { count: brandIds.length }) : t('Kuch na chunein to har brand par')}</Text>
        </View>
      )}
      {!perBill && principals.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text size="sm" weight="medium">{t('Sirf in principals (company) ke maal par')}</Text>
          {chips(principals, supplierIds, setSupplierIds)}
          <Text size="xs" tone="muted">{t('Category, brand aur principal sab chune hon to sab ka milna zaroori.')}</Text>
        </View>
      )}

      <MoneyInput label={t('Kam se kam sale (mahina)')} value={minSale} onChangeValue={setMinSale} hint={t('Is se kam sale par ye rule nahi chalta; poori ho jaye to mahine ki poori sale par lagta hai. Do rules = slab.')} />
      <MoneyInput label={t('Target (mahina)')} value={target} onChangeValue={setTarget} error={tried ? errors.target : undefined} hint={t('Mahine ki sale itni ho jaye to upar se bonus')} />
      <MoneyInput label={t('Target bonus (Rs)')} value={bonus} onChangeValue={setBonus} error={tried ? errors.bonus : undefined} hint={t('Target poora hone par ek dafa')} />
      <Input label={t('Note')} value={note} onChangeText={setNote} maxLength={300} hint={t('Sirf aap ke liye — bande ko nahi dikhta')} />
      <Switch value={active} onChange={setActive} label={t('Rule chaalu hai')} description={t('Band rule hisab me nahi lagta, magar mitta nahi')} />

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {onDelete && (
          <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="lg" disabled={saving}
            onPress={async () => { if (await confirm({ title: t('Ye rule hamesha ke liye hatayein?'), message: t('Jo mahine abhi ada nahi hue un ka hisab is ke baghair banega. Behtar hai rule band kar dein.'), tone: 'danger', confirmLabel: t('Hatayein') })) onDelete(); }} />
        )}
        <Button style={{ flex: 1 }} size="lg" loading={saving} onPress={submit}>{rule ? t('Save') : t('Rule banayein')}</Button>
      </View>
    </View>
  );
}

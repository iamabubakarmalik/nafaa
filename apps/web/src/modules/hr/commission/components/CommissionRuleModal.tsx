/**
 * Create or change a commission rule. Two separate choices: what it is paid
 * on (sale, profit or each bill) and how much (a percent or a fixed amount),
 * then who it is for, which categories (and brands or principals), a minimum
 * sale before it starts and a target bonus. A worked example under the amount shows what the numbers
 * mean.
 */

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { phase2Api } from '@modules/distribution/api/phase2.api';
import { Info, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Segmented, Select, Switch, Textarea, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { CommissionBasis, CommissionPerson, CommissionRule, CommissionValueType, RulePayload } from '../api/commission.api';
import { BASIS } from './meta';

export function CommissionRuleModal({ rule, people, categories, saving, onClose, onSave, onDelete }: {
  rule?: CommissionRule | null;
  people: CommissionPerson[];
  categories: Array<{ id: string; name: string }>;
  saving: boolean;
  onClose: () => void;
  onSave: (data: RulePayload) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(rule?.name ?? '');
  const [basis, setBasis] = useState<CommissionBasis>(rule?.basis ?? 'SALE');
  const [valueType, setValueType] = useState<CommissionValueType>(rule?.valueType ?? 'PERCENT');
  const [value, setValue] = useState(rule?.value != null ? String(rule.value) : '');
  const [userId, setUserId] = useState(rule?.userId ?? '');
  const [cats, setCats] = useState<string[]>(rule?.categoryIds ?? []);
  const [brandIds, setBrandIds] = useState<string[]>(rule?.brandIds ?? []);
  const [supplierIds, setSupplierIds] = useState<string[]>(rule?.supplierIds ?? []);
  const brandsQ = useQuery({ queryKey: ['brands', 'commission-picker'], queryFn: () => brandsApi.list(), staleTime: 5 * 60_000, retry: false });
  // Principals exist only with distribution on; the picker hides when the call is refused.
  const principalsQ = useQuery({ queryKey: ['distribution', 'principals'], queryFn: phase2Api.principals, staleTime: 5 * 60_000, retry: false });
  const principals = (principalsQ.data?.suppliers ?? []).filter((s) => s.isPrincipal || supplierIds.includes(s.id));
  const [minSale, setMinSale] = useState(rule?.minMonthlySale ? String(rule.minMonthlySale) : '');
  const [target, setTarget] = useState(rule?.targetAmount ? String(rule.targetAmount) : '');
  const [bonus, setBonus] = useState(rule?.targetBonus ? String(rule.targetBonus) : '');
  const [active, setActive] = useState(rule?.isActive ?? true);
  const [note, setNote] = useState(rule?.note ?? '');
  const [tried, setTried] = useState(false);

  const perBill = basis === 'PER_BILL';
  const type: CommissionValueType = perBill ? 'FIXED' : valueType;
  const n = Number(value || 0);

  const errors = {
    value: !(n > 0) ? 'Amount likhein' : type === 'PERCENT' && n > 100 ? 'Percent 100 se zyada nahi' : '',
    bonus: target && !(Number(bonus) > 0) ? 'Target ke saath bonus bhi likhein' : '',
    target: bonus && !(Number(target) > 0) ? 'Bonus ke liye target likhein' : '',
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = () => {
    setTried(true);
    if (invalid) return;
    onSave({
      name: name.trim() || null,
      userId: userId || null,
      basis,
      valueType: type,
      value: n,
      categoryIds: perBill ? [] : cats,
      brandIds: perBill ? [] : brandIds,
      supplierIds: perBill ? [] : supplierIds,
      minMonthlySale: Number(minSale) > 0 ? Number(minSale) : null,
      targetAmount: Number(target) > 0 ? Number(target) : null,
      targetBonus: Number(target) > 0 && Number(bonus) > 0 ? Number(bonus) : null,
      isActive: active,
      note: note.trim() || null,
    });
  };

  const example = (() => {
    if (!(n > 0)) return null;
    if (perBill) return `Mahine me 300 bill = ${formatPKR(n * 300)}`;
    if (type === 'FIXED') return `Mahine me 200 cheezein bikin = ${formatPKR(n * 200)}`;
    return `${formatPKR(200_000)} ki ${basis === 'PROFIT' ? 'profit' : 'sale'} par = ${formatPKR((200_000 * n) / 100)}`;
  })();

  const sellers = people.filter((p) => p.userId);
  const person = sellers.find((p) => p.userId === userId);

  return (
    <Modal open onClose={onClose} size="lg" title={rule ? 'Rule badlein' : 'Naya commission rule'}
      description="Kis par, kitna, aur kis ke liye — baqi sab hisab khud banta hai"
      footer={<>
        {onDelete && (
          <Button variant="ghost" className="mr-auto text-rose-700" leftIcon={<Trash2 className="h-4 w-4" />} disabled={saving}
            onClick={async () => { if ((await confirmDialog({ title: 'Ye rule hamesha ke liye hatayein?', text: 'Jo mahine abhi ada nahi hue un ka hisab is ke baghair banega. Behtar hai rule band kar dein.', danger: true }))) onDelete(); }}>
            Hatayein
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} loading={saving}>{rule ? 'Save karein' : 'Rule banayein'}</Button>
      </>}>
      <div className="space-y-5">
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Commission kis par</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(BASIS) as CommissionBasis[]).map((b) => (
              <button key={b} type="button" onClick={() => setBasis(b)} aria-pressed={basis === b}
                className={cn('rounded-xl px-3 py-2.5 text-left ring-1 transition', basis === b ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-200 hover:bg-slate-50')}>
                <span className="block text-sm font-semibold text-slate-900">{BASIS[b].label}</span>
                <span className="mt-0.5 block text-[0.6875rem] leading-snug text-slate-500">{BASIS[b].hint}</span>
              </button>
            ))}
          </div>
          {basis === 'PROFIT' && <p className="mt-1.5 text-xs text-slate-500">Jis cheez ki cost bill par nahi likhi, us ki aaj ki cost lagti hai.</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {!perBill && (
            <div>
              <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Kitna</p>
              <Segmented label="Kitna" value={valueType} onChange={(v) => setValueType(v as CommissionValueType)}
                items={[{ value: 'PERCENT', label: 'Percent (%)' }, { value: 'FIXED', label: 'Har cheez par Rs' }]} />
              <p className="mt-1.5 text-xs text-slate-500">{valueType === 'PERCENT' ? 'Sale ya profit ka hissa' : 'Har biki hui cheez (unit) par fixed amount'}</p>
            </div>
          )}
          <Input label={type === 'PERCENT' ? 'Percent' : perBill ? 'Har bill par (Rs)' : 'Har cheez par (Rs)'} type="number" inputMode="decimal" min={0} step="0.01"
            value={value} onChange={(e) => setValue(e.target.value)} required autoFocus
            error={tried ? errors.value : undefined} hint={example ?? (type === 'PERCENT' ? 'Maslan 2.5' : 'Maslan 20')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Kis ke liye" value={userId} onChange={(e) => setUserId(e.target.value)}
            options={[{ value: '', label: 'Sab chaalu bande' }, ...sellers.map((p) => ({ value: p.userId!, label: p.name }))]}
            hint={userId ? `${person?.name ?? 'Is bande'} par sirf is ke apne rules chalenge, "sab" wale nahi` : 'Jis bande ka apna rule na ho, us par ye chalta hai'} />
          <Input label="Naam (marzi se)" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
            placeholder={BASIS[basis].label} hint='Yaad rakhne ke liye, maslan "Cake par 5%"' />
        </div>

        {!perBill && (
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Sirf in categories par</p>
            {categories.length === 0 ? (
              <p className="text-xs text-slate-500">Koi category nahi bani — rule har cheez par chalega.</p>
            ) : (
              <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                {categories.map((c) => {
                  const on = cats.includes(c.id);
                  return (
                    <button key={c.id} type="button" aria-pressed={on} onClick={() => setCats((x) => (on ? x.filter((i) => i !== c.id) : [...x, c.id]))}
                      className={cn('rounded-full px-2.5 py-1 text-[0.75rem] ring-1 transition', on ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-1.5 text-xs text-slate-500">{cats.length ? `${cats.length} category chuni — baqi maal par ye rule nahi lagega` : 'Kuch na chunein to har cheez par lagega'}</p>
          </div>
        )}

        {!perBill && (brandsQ.data?.length ?? 0) > 0 && (
          <ChipPicker label="Sirf in brands par" items={(brandsQ.data ?? []).map((b) => ({ id: b.id, name: b.name }))} value={brandIds} onChange={setBrandIds}
            hint={brandIds.length ? `${brandIds.length} brand chune` : 'Kuch na chunein to har brand par'} />
        )}
        {!perBill && principals.length > 0 && (
          <ChipPicker label="Sirf in principals (company) ke maal par" items={principals.map((s) => ({ id: s.id, name: s.name }))} value={supplierIds} onChange={setSupplierIds}
            hint="Principal brand se tay hota hai (Distribution → Claims → Principals). Category, brand aur principal sab chune hon to sab ka milna zaroori." />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Kam se kam sale (mahina)" type="number" inputMode="decimal" min={0} value={minSale} onChange={(e) => setMinSale(e.target.value)}
            hint="Is se kam sale par ye rule nahi chalta; poori ho jaye to mahine ki poori sale par lagta hai. Do rules = slab." />
          <Input label="Target (mahina)" type="number" inputMode="decimal" min={0} value={target} onChange={(e) => setTarget(e.target.value)}
            error={tried ? errors.target : undefined} hint="Mahine ki sale itni ho jaye to upar se bonus" />
          <Input label="Target bonus (Rs)" type="number" inputMode="decimal" min={0} value={bonus} onChange={(e) => setBonus(e.target.value)}
            error={tried ? errors.bonus : undefined} hint="Target poora hone par ek dafa" />
        </div>

        <Textarea label="Note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} hint="Sirf aap ke liye — bande ko nahi dikhta" />
        <Switch label="Rule chaalu hai" description="Band rule hisab me nahi lagta, magar mitta nahi" checked={active} onChange={(e) => setActive(e.target.checked)} />

        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Hisab har dafa asli sale se banta hai. Rule badalne se wo mahine bhi badal jate hain jo abhi ada nahi hue. Jo payment likhi ja chuki hai woh nahi badalti.
        </p>
      </div>
    </Modal>
  );
}

/** Toggle chips for a short list (brands, principals). */
function ChipPicker({ label, items, value, onChange, hint }: {
  label: string; items: Array<{ id: string; name: string }>; value: string[]; onChange: (v: string[]) => void; hint?: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{label}</p>
      <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
        {items.map((c) => {
          const on = value.includes(c.id);
          return (
            <button key={c.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((i) => i !== c.id) : [...value, c.id])}
              className={cn('rounded-full px-2.5 py-1 text-[0.75rem] ring-1 transition', on ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-700 ring-slate-200 hover:bg-slate-50')}>
              {c.name}
            </button>
          );
        })}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

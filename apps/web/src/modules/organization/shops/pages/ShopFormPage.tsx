/**
 * New branch or edit a branch: type, name, phone, address, main flag and
 * on/off. A new branch can get its manager's login in the same step; the
 * login slip is shown once afterwards.
 *
 * Routes: /shops/new and /shops/:id/edit. Keys: Ctrl+Enter save · Esc back.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Building2, Eye, EyeOff, KeyRound, MapPin, Phone, RefreshCw, Star, UserPlus } from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Skeleton, Switch } from '@/design-system/components';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { pakistanPhoneError } from '@core/lib/phone';
import { cn } from '@core/lib/cn';
import { LoginSlipModal } from '@modules/hr/staff/components/LoginSlipModal';
import type { LoginSlip } from '@modules/hr/staff/components/print';
import { shopsApi, type CreateShopPayload, type ShopType } from '../api/shops.api';
import { SHOP_KEYS, SHOP_TYPES, apiError } from '../components/meta';

interface Form {
  type: ShopType;
  name: string;
  phone: string;
  address: string;
  isMain: boolean;
  isActive: boolean;
}

interface Manager { on: boolean; name: string; email: string; phone: string; password: string }

const EMPTY: Form = { type: 'SHOP', name: '', phone: '', address: '', isMain: false, isActive: true };
const NO_MANAGER: Manager = { on: false, name: '', email: '', phone: '', password: '' };

/** 10 characters without look-alike letters, easy to read out on the phone. */
function makePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export default function ShopFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.SHOPS_MANAGE);
  const canTeam = usePermission(PERMISSIONS.TEAM_MANAGE);

  const shopQ = useQuery({ queryKey: ['shops', id], queryFn: () => shopsApi.get(id!), enabled: editing });
  const listQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, enabled: !editing });
  const [f, setF] = useState<Form>(EMPTY);
  const [m, setM] = useState<Manager>(NO_MANAGER);
  const [showPass, setShowPass] = useState(false);
  const [slip, setSlip] = useState<{ slip: LoginSlip; phone: string | null } | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const shop = shopQ.data;
  useEffect(() => {
    if (shop) setF({ type: shop.type, name: shop.name, phone: shop.phone ?? '', address: shop.address ?? '', isMain: shop.isMain, isActive: shop.isActive });
  }, [shop]);
  // The first branch of an account is the main one.
  useEffect(() => { if (!editing && listQ.data?.length === 0) set('isMain', true); }, [editing, listQ.data]);

  const mPhoneErr = m.on && m.phone.trim() ? pakistanPhoneError(m.phone.trim()) : null;
  const problems = [
    !f.name.trim() && 'Branch ka naam likhein',
    m.on && !m.name.trim() && 'Manager ka naam likhein',
    m.on && !/^\S+@\S+\.\S+$/.test(m.email.trim()) && 'Manager ka sahi email likhein',
    m.on && m.password.length < 8 && 'Password kam se kam 8 harf ka ho',
  ].filter(Boolean) as string[];
  const switchingOffMain = editing && shop?.isMain && !f.isActive;

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return shopsApi.update(id!, {
          name: f.name.trim(), phone: f.phone.trim(), address: f.address.trim(), type: f.type,
          ...(f.isMain !== shop?.isMain && { isMain: f.isMain }),
          ...(f.isActive !== shop?.isActive && { isActive: f.isActive }),
        });
      }
      const body: CreateShopPayload = {
        name: f.name.trim(), type: f.type, isMain: f.isMain,
        ...(f.phone.trim() && { phone: f.phone.trim() }),
        ...(f.address.trim() && { address: f.address.trim() }),
        ...(m.on && { managerName: m.name.trim(), managerEmail: m.email.trim().toLowerCase(), managerPassword: m.password, ...(m.phone.trim() && { managerPhone: m.phone.trim() }) }),
      };
      return shopsApi.create(body);
    },
    onSuccess: (res) => {
      SHOP_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ['team'] });
      qc.invalidateQueries({ queryKey: ['staff-people'] });
      toast.success(editing ? 'Branch save ho gayi' : `${res.name} ban gayi`);
      if (!editing && m.on) {
        setSlip({ slip: { name: m.name.trim(), email: m.email.trim().toLowerCase(), password: m.password, role: 'Manager', branch: res.name }, phone: m.phone.trim() || null });
        return;
      }
      navigate('/shops');
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });

  const submit = () => {
    if (problems.length) return toast.error(problems[0]);
    if (mPhoneErr) return toast.error(mPhoneErr);
    save.mutate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !slip && !(document.activeElement instanceof HTMLInputElement)) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!canManage) {
    return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Branch banane ya badalne ke liye "Branches sambhalna" ki permission chahiye</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/shops')}>Branches par wapas</Button></div></PageShell>;
  }
  if (editing && shopQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div></PageShell>;
  if (editing && !shop) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Yeh branch nahi mili</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/shops')}>Branches par wapas</Button></div></PageShell>;

  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${shop?.name} — badlein` : 'Nayi branch'}</h1>
          <p className="text-[0.8125rem] text-white/75">{editing ? 'Jo badalna hai badlein — stock aur hisaab waise hi rahega' : 'Dukaan, warehouse ya godown. Manager ka login bhi yahin de sakte hain.'}</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Building2}>Branch ki qisam</T>} description="Qisam se tay hota hai ke is branch me kya chalega">
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Branch ki qisam">
              {(Object.entries(SHOP_TYPES) as Array<[ShopType, (typeof SHOP_TYPES)[ShopType]]>).map(([key, t]) => (
                <button key={key} type="button" role="radio" aria-checked={f.type === key} onClick={() => set('type', key)}
                  className={cn('flex items-start gap-3 rounded-2xl p-3 text-left ring-1 transition', f.type === key ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${t.color}17`, color: t.color }}><t.icon className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block text-[0.875rem] font-semibold text-slate-900">{t.label}</span><span className="block text-[0.75rem] text-slate-500">{t.hint}</span></span>
                </button>
              ))}
            </div>
            {editing && shop && shop.type !== f.type && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Qisam badalne se purani sale aur stock nahi badlenge. Store me POS aur drawer nahi chalte.</p>
            )}
          </Card>

          <Card className="rounded-2xl" title={<T icon={MapPin}>Details</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Branch ka naam" required value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={100} autoFocus={!editing}
                placeholder={f.type === 'SHOP' ? 'Ali Store — Saddar' : 'Bara godown'} wrapperClassName="sm:col-span-2"
                hint="Bill, report aur branch chunne ki list me yahi naam aata hai. Do branches ka ek naam nahi ho sakta." />
              <Input label="Phone" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} maxLength={20} placeholder="03001234567"
                leftIcon={<Phone className="h-4 w-4" />} hint="Marzi hai — bill par chhapta hai. Mobile number ho to card se WhatsApp bhi khulta hai." />
              <Input label="Pata" value={f.address} onChange={(e) => set('address', e.target.value)} maxLength={255} placeholder="Shop 12, Main Bazar, Lahore"
                hint="Marzi hai — bill aur parchi par chhapta hai" />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Star}>Main aur chalu</T>}>
            <div className="space-y-4">
              <Switch checked={f.isMain} disabled={editing && shop?.isMain} onChange={(e) => set('isMain', e.target.checked)} label="Main branch"
                description={editing && shop?.isMain ? 'Yeh main branch hai. Main badalne ke liye doosri branch me yeh on karein.' : 'Naye staff aur "Sab branches" wale kaam pehle yahan jaate hain. Ek waqt me ek hi main hoti hai.'} />
              {editing && (
                <Switch checked={f.isActive} disabled={shop?.isMain} onChange={(e) => set('isActive', e.target.checked)} label="Branch chalu hai"
                  description={shop?.isMain ? 'Main branch band nahi hoti.' : 'Band branch me bikri nahi hoti; purana hisaab waise hi rehta hai.'} />
              )}
              {switchingOffMain && <p className="text-[0.75rem] text-rose-600">Main branch band nahi ho sakti.</p>}
            </div>
          </Card>

          {!editing && (
            <Card className="rounded-2xl" title={<T icon={UserPlus}>Manager ka login</T>}>
              {!canTeam ? (
                <p className="text-sm text-slate-500">Login dene ke liye "Team sambhalna" ki permission chahiye. Branch ban jaye to Staff ke page se login dein.</p>
              ) : (
                <div className="space-y-4">
                  <Switch checked={m.on} onChange={(e) => setM((x) => ({ ...x, on: e.target.checked, password: x.password || makePassword() }))} label="Is branch ka manager banayein"
                    description="Manager sirf isi branch ka data dekhega: sale, maal, expenses aur reports. Permissions baad me Staff → profile se badal sakte hain." />
                  {m.on && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label="Naam" required value={m.name} onChange={(e) => setM((x) => ({ ...x, name: e.target.value }))} maxLength={100} placeholder="Bilal Ahmad" wrapperClassName="sm:col-span-2" hint="Bill aur report par yahi naam aata hai" />
                      <Input label="Login email" required type="email" value={m.email} onChange={(e) => setM((x) => ({ ...x, email: e.target.value }))} placeholder="bilal@gmail.com" hint="Isi se login karega. Har login ka alag email." />
                      <Input label="Phone" inputMode="tel" value={m.phone} onChange={(e) => setM((x) => ({ ...x, phone: e.target.value }))} maxLength={20} placeholder="03001234567" error={mPhoneErr ?? undefined} hint="Marzi hai — login parchi WhatsApp par bhejne ke liye" />
                      <Input label="Password" required type={showPass ? 'text' : 'password'} value={m.password} onChange={(e) => setM((x) => ({ ...x, password: e.target.value }))} maxLength={64}
                        leftIcon={<KeyRound className="h-4 w-4" />} wrapperClassName="sm:col-span-2" className="pr-16 font-mono"
                        rightIcon={<span className="flex gap-1">
                          <button type="button" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? 'Chhupayein' : 'Dikhayein'} className="text-slate-400 hover:text-slate-700">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                          <button type="button" onClick={() => { setM((x) => ({ ...x, password: makePassword() })); setShowPass(true); }} aria-label="Naya password" title="Naya password" className="text-slate-400 hover:text-slate-700"><RefreshCw className="h-4 w-4" /></button>
                        </span>}
                        hint="Kam se kam 8 harf. Save ke baad ek dafa parchi par dikhega — manager pehli dafa login karke badal le." />
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {editing && (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">
              Is branch ka staff aur logins <Link to="/staff" className="font-semibold text-brand-700 hover:underline">Staff</Link> ke page se badlein. Maal bhejne ke liye <Link to="/transfers" className="font-semibold text-brand-700 hover:underline">Transfers</Link>.
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (f.name || editing)
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{editing ? 'Save karein' : m.on ? 'Branch aur manager ka login dono banenge' : `Nayi ${SHOP_TYPES[f.type].label.toLowerCase()} khali stock ke saath banegi`}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending} disabled={!!switchingOffMain}>{editing ? 'Save karein' : m.on ? 'Branch aur login banayein' : 'Branch banayein'}</Button>
      </div>

      {slip && <LoginSlipModal slip={slip.slip} phone={slip.phone} title="Manager ka login ban gaya" onClose={() => navigate('/shops')} />}
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof Building2; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;

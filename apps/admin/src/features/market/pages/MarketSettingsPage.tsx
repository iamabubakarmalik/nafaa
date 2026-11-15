/**
 * Nafaa Market platform settings (SystemSetting market:config): section
 * order, visibility and names in three languages, launch cities, Nafaa
 * commission, payment methods, wallet and points spending, and shop
 * approval. Customer apps pick up a save within about 30 seconds.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, BadgeCheck, CreditCard, Eye, EyeOff, LayoutGrid, MapPin, Percent, Plus, Save, Wallet, X } from 'lucide-react';
import { Alert, Button, Card, IconButton, Input, PageHero, PageShell, Skeleton, Switch, confirmDialog, heroPrimaryButton } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi, type MarketGate, type MarketPlatformConfig } from '@/api/admin-market.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { Empty } from '@/features/shared/kit';
import { GATE_COLOR, GuideButton, MarketGuide, SettingRow } from '../components/MarketUi';

const PAYMENTS: Array<{ key: keyof MarketPlatformConfig['payments']; label: string; hint: string; gateway?: boolean }> = [
  { key: 'cod', label: 'Cash on delivery', hint: 'Customer pays the rider or at pickup' },
  { key: 'bankTransfer', label: 'Bank transfer', hint: "To the shop's own account, shown at checkout" },
  { key: 'jazzcash', label: 'JazzCash', hint: 'Available after company registration', gateway: true },
  { key: 'easypaisa', label: 'Easypaisa', hint: 'Available after company registration', gateway: true },
  { key: 'card', label: 'Card', hint: 'Available after company registration', gateway: true },
];
const LANGS = [['en', 'English'], ['roman', 'Roman Urdu'], ['ur', 'Urdu']] as const;

export default function MarketSettingsPage() {
  const guide = usePageGuide();
  const can = useCan();
  const qc = useQueryClient();
  const { data, error } = useQuery({ queryKey: ['admin-market-settings'], queryFn: adminMarketApi.settings });
  const [f, setF] = useState<MarketPlatformConfig | null>(null);
  const [city, setCity] = useState('');
  useEffect(() => { if (data) setF(structuredClone(data.config)); }, [data]);
  const dirty = useMemo(() => !!f && !!data && JSON.stringify(f) !== JSON.stringify(data.config), [f, data]);
  const canManage = can('marketplace.manage');

  const save = useMutation({
    mutationFn: (body: MarketPlatformConfig) => adminMarketApi.saveSettings(body),
    onSuccess: (d) => {
      qc.setQueryData(['admin-market-settings'], d);
      void qc.invalidateQueries({ queryKey: ['admin-market-overview'] });
      toast.success(d.approvedExisting ? `Saved. ${d.approvedExisting} live shops were approved as they are.` : 'Settings saved');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!data || !f) {
    return (
      <PageShell>
        <PageHero title="Market settings" loading />
        {error ? <Card><Empty>Could not load settings. Try again in a moment.</Empty></Card> : <Skeleton className="h-96 rounded-3xl" />}
      </PageShell>
    );
  }

  const patch = (p: Partial<MarketPlatformConfig>) => setF({ ...f, ...p });
  const gateInfo = (id: MarketGate) => data.gates.find((g) => g.id === id)!;
  // Visible gates first in their saved order, then the hidden ones.
  const ordered: MarketGate[] = [...f.gates, ...data.gates.map((g) => g.id).filter((g) => !f.gates.includes(g))];
  const move = (g: MarketGate, dir: -1 | 1) => {
    const list = [...f.gates];
    const i = list.indexOf(g);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    patch({ gates: list });
  };
  const toggleGate = (g: MarketGate) => {
    if (f.gates.includes(g)) {
      if (f.gates.length === 1) { toast.error('Keep at least one section visible.'); return; }
      patch({ gates: f.gates.filter((x) => x !== g) });
    } else patch({ gates: [...f.gates, g] });
  };
  const setLabel = (g: MarketGate, lang: 'en' | 'roman' | 'ur', v: string) => {
    const cur = { ...(f.labels[g] ?? {}) };
    if (v.trim()) cur[lang] = v; else delete cur[lang];
    const labels = { ...f.labels, [g]: cur };
    if (!Object.keys(cur).length) delete labels[g];
    patch({ labels });
  };
  const addCity = (c: string) => {
    const v = c.trim();
    if (!v || f.launchCities.some((x) => x.toLowerCase() === v.toLowerCase())) { setCity(''); return; }
    patch({ launchCities: [...f.launchCities, v] });
    setCity('');
  };
  const paymentsOn = PAYMENTS.filter((p) => f.payments[p.key]).length;

  const onSave = async () => {
    if (!paymentsOn) { toast.error('Keep at least one payment method on.'); return; }
    const was = data.config;
    if (f.requireApproval && !was.requireApproval && !(await confirmDialog({
      title: 'Require approval for new shops?', text: 'Shops already live are approved as they are, so nothing disappears. Shops that publish from now on stay hidden until approved on the Approvals page.', yes: 'Turn on',
    }))) return;
    if ((f.walletSpend && !was.walletSpend) || (f.loyaltySpend && !was.loyaltySpend)) {
      if (!(await confirmDialog({
        title: 'Let customers spend wallet money or points?', text: 'The shop collects less from the customer; Nafaa must pay that part to the shop. Check the Settlements page every week before turning this on.', yes: 'Turn on', danger: true,
      }))) return;
    }
    if (f.commissionPercent !== was.commissionPercent && !(await confirmDialog({
      title: `Change commission to ${f.commissionPercent}%?`, text: 'Applies to delivered orders in the Settlements report from now on. Tell shops before you change it.', yes: 'Change',
    }))) return;
    save.mutate(f);
  };

  return (
    <PageShell>
      <PageHero
        title="Market settings"
        chip={dirty ? 'Unsaved changes' : undefined}
        busy={save.isPending}
        actions={
          <>
            {canManage && <button type="button" className={heroPrimaryButton} onClick={onSave} disabled={!dirty || save.isPending}><Save className="h-4 w-4" /> Save changes</button>}
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={[
          { label: 'Sections shown', value: `${f.gates.length} of ${data.gates.length}` },
          { label: 'Launch cities', value: f.launchCities.length ? String(f.launchCities.length) : 'All' },
          { label: 'Commission', value: `${f.commissionPercent}%` },
          { label: 'Payment methods', value: `${paymentsOn} on` },
        ]}
      />

      {!canManage && <Alert tone="info">Your role can view these settings but not change them.</Alert>}

      <fieldset disabled={!canManage || save.isPending} className="space-y-4">
        <Card title="Sections" description="Order, show or hide the Market sections and rename them. Empty names use the default.">
          <ul className="divide-y divide-slate-100">
            {ordered.map((g) => {
              const info = gateInfo(g);
              const shown = f.gates.includes(g);
              const i = f.gates.indexOf(g);
              return (
                <li key={g} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: GATE_COLOR[g] }} aria-hidden />
                    <span className={`font-medium ${shown ? 'text-slate-900' : 'text-slate-400'}`}>{f.labels[g]?.en || info.label.en}</span>
                    <span className="text-[0.75rem] text-slate-500">{info.tagline.en}{info.businessOnly ? ' · businesses only' : ''}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <IconButton label="Move up" size="sm" onClick={() => move(g, -1)} disabled={!shown || i <= 0}><ArrowUp className="h-4 w-4" /></IconButton>
                      <IconButton label="Move down" size="sm" onClick={() => move(g, 1)} disabled={!shown || i === f.gates.length - 1}><ArrowDown className="h-4 w-4" /></IconButton>
                      <Button size="sm" variant="secondary" onClick={() => toggleGate(g)}>{shown ? <><EyeOff className="h-4 w-4" /> Hide</> : <><Eye className="h-4 w-4" /> Show</>}</Button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {LANGS.map(([lang, name]) => (
                      <Input key={lang} size="sm" aria-label={`${info.label.en} name in ${name}`} placeholder={`${name}: ${info.label[lang]}`} maxLength={40}
                        dir={lang === 'ur' ? 'rtl' : undefined} value={f.labels[g]?.[lang] ?? ''} onChange={(e) => setLabel(g, lang, e.target.value)} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Launch cities" description="Where customers can use the Market. No cities means everywhere.">
            <div className="flex flex-wrap gap-1.5">
              {f.launchCities.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-[0.8125rem] text-brand-800">
                  {c}
                  <button type="button" className="rounded-full p-0.5 hover:bg-brand-100" aria-label={`Remove ${c}`} onClick={() => patch({ launchCities: f.launchCities.filter((x) => x !== c) })}><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
              {!f.launchCities.length && <span className="text-[0.8125rem] text-slate-500">Open in every city.</span>}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addCity(city); }}>
              <Input size="sm" wrapperClassName="flex-1" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Add a city, e.g. Lahore" maxLength={60} aria-label="City name" />
              <Button size="sm" type="submit" variant="secondary" disabled={!city.trim()}><Plus className="h-4 w-4" /> Add</Button>
            </form>
            {!!data.shopCities.length && (
              <div className="mt-3">
                <div className="mb-1.5 text-[0.75rem] text-slate-500">Cities with published shops</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.shopCities.filter((c) => !f.launchCities.some((x) => x.toLowerCase() === c.city.toLowerCase())).map((c) => (
                    <button key={c.city} type="button" onClick={() => addCity(c.city)} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[0.75rem] text-slate-600 hover:border-brand-300 hover:text-brand-700">
                      + {c.city} ({c.shops})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Commission and approval">
            <Input label="Nafaa commission (%)" type="number" min={0} max={50} step={0.5} value={String(f.commissionPercent)}
              onChange={(e) => patch({ commissionPercent: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })}
              hint="Percent of the item value of delivered orders, 0 to 50. 0% at launch." leftIcon={<Percent className="h-4 w-4" />} />
            <div className="mt-4 border-t border-slate-100 pt-4">
              <SettingRow title="New shops need approval" hint="Shops that publish stay hidden until approved on the Approvals page.">
                <Switch checked={f.requireApproval} onChange={(e) => patch({ requireApproval: e.target.checked })} aria-label="New shops need approval" />
              </SettingRow>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Payment methods" description="What customers can choose at checkout. Shops can switch off any method for themselves.">
            <div className="divide-y divide-slate-100">
              {PAYMENTS.map((p) => (
                <SettingRow key={p.key} title={p.label} hint={p.gateway ? <span className="text-amber-700">After company registration. Keep off until the gateway account is ready.</span> : p.hint}>
                  <Switch checked={f.payments[p.key]} onChange={(e) => patch({ payments: { ...f.payments, [p.key]: e.target.checked } })} aria-label={p.label} />
                </SettingRow>
              ))}
            </div>
          </Card>

          <Card title="Wallet and points" description="Customers always earn points. These switches let them spend at checkout.">
            <Alert tone="warning" title="Nafaa must settle with shops">When a customer pays with wallet money or points, the shop collects less. Nafaa pays that part to the shop; see Settlements.</Alert>
            <div className="mt-3 divide-y divide-slate-100">
              <SettingRow title="Spend wallet money" hint="Refunds and referral money in the customer's Market wallet">
                <Switch checked={f.walletSpend} onChange={(e) => patch({ walletSpend: e.target.checked })} aria-label="Spend wallet money" />
              </SettingRow>
              <SettingRow title="Spend loyalty points" hint="Points earned on delivered orders">
                <Switch checked={f.loyaltySpend} onChange={(e) => patch({ loyaltySpend: e.target.checked })} aria-label="Spend loyalty points" />
              </SettingRow>
            </div>
          </Card>
        </div>
      </fieldset>

      {guide.isOpen && (
        <MarketGuide
          search={false}
          title="Market settings"
          description="Platform rules for every shop and customer on the Market."
          flowTitle="What changes where"
          flow={[
            { label: 'Sections', hint: 'Home tiles', icon: LayoutGrid, color: '#4f46e5' },
            { label: 'Cities', hint: 'Where it is open', icon: MapPin, color: '#0284c7' },
            { label: 'Payments', hint: 'Checkout', icon: CreditCard, color: '#16a34a' },
            { label: 'Approval', hint: 'New shops', icon: BadgeCheck, color: '#7c3aed' },
          ]}
          steps={[
            { icon: LayoutGrid, color: '#4f46e5', title: 'Arrange sections', text: 'Move sections up or down, hide ones not ready, and rename them in three languages.' },
            { icon: Wallet, color: '#d97706', title: 'Money switches', text: 'Commission, payment methods and wallet or points spending. Each change asks first.' },
            { icon: Save, color: '#16a34a', title: 'Save', text: 'Customer apps pick up the change within about 30 seconds.' },
          ]}
          tips={['Turning approval on approves shops that are already live, so nothing disappears.', 'Online payment gateways need the company registration first.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

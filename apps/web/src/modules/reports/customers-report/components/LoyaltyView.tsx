/**
 * Loyalty tab: points given and used in the period, their rupee value, the
 * points still unused (what the shop owes in discounts) and the biggest
 * holders, with a WhatsApp list to remind them.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Coins, Gift, Hourglass, MessageCircle, Percent, Settings2, Star, TrendingUp, Users } from 'lucide-react';
import { Button, KpiCard, KpiRow } from '@/design-system/components';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { Loyalty } from '../api';
import { CustomerCell, DataTable, Delta, Panel, keyLabel, type Formatter } from './parts';
import { WhatsAppList } from './WhatsAppList';

const REMIND = 'Assalam-o-Alaikum {name}! {shop} me aap ke loyalty points jama hain — agli khareedari par in se chhoot le sakte hain. Zaroor tashreef layein. 🎁';

export function LoyaltyView({ data: d, f, compare }: { data: Loyalty; f: Formatter; compare: boolean }) {
  const theme = useChartTheme();
  const [wa, setWa] = useState(false);
  const t = d.totals;
  const prev = compare ? d.previous : null;
  const s = d.settings;
  const perPoint = s.pointsPerRupee > 0 ? Math.round(1 / s.pointsPerRupee) : null;
  const trend = d.trend.map((x) => ({ ...x, label: keyLabel(x.key) }));

  return (
    <div className="space-y-4">
      {!d.enabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-100">
          <span>Loyalty points band hain — naye points nahi ban rahe. Purana hisaab neeche hai.</span>
          <Link to="/settings/credit-loyalty" className="inline-flex items-center gap-1 font-semibold hover:underline"><Settings2 className="h-4 w-4" />Chalu karein</Link>
        </div>
      )}

      <KpiRow>
        <KpiCard icon={Gift} color="#16a34a" label="Points diye" value={f.count(t.issued)}
          hint={prev ? <Delta now={t.issued} before={prev.issued} /> : `${t.earners} customers ko · ${f.money(t.issuedValue)} ki qeemat`} />
        <KpiCard icon={Coins} color="#d97706" label="Points istemal hue" value={f.count(t.redeemed)} hint={`${f.money(t.redeemedValue)} discount · ${t.redeemBills} bill`} />
        <KpiCard icon={Percent} color="#2563eb" label="Istemal ki sharah" value={f.pct(t.redeemRate)}
          hint={prev && t.redeemRate != null ? <Delta now={t.redeemRate} before={prev.redeemRate} points /> : 'diye gaye points me se kitne kharch hue'} />
        <KpiCard icon={Star} color="#7c3aed" label="Baqi points" value={f.count(d.outstanding.points)} hint={`${d.outstanding.holders} customers ke paas`} />
        <KpiCard icon={Hourglass} color="#e11d48" label="Dukaan par qarz" value={f.money(d.outstanding.value)} hint="agar sab points aaj istemal hon" />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={TrendingUp} className="lg:col-span-2" title="Points diye vs istemal"
          hint={`${d.grouping === 'month' ? 'Har mahine' : 'Har din'} — is branch ki sale se`}>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={44} allowDecimals={false} />
                <Tooltip {...theme.tooltip} formatter={(v, n) => [`${f.count(Number(v))} points`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="issued" name="Diye" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="redeemed" name="Istemal" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel icon={Settings2} title="Usool" hint="Settings → Udhaar aur loyalty se badal sakte hain">
          <dl className="space-y-2 text-[0.8125rem]">
            <Row label="Kamai" value={perPoint ? `Har Rs ${perPoint} par 1 point` : '—'} />
            <Row label="1 point ki qeemat" value={f.money(s.redemptionRate)} />
            <Row label="Kam se kam istemal" value={s.minRedeem ? `${s.minRedeem} points` : 'Koi had nahi'} />
            <Row label="Points khatam" value={s.expiryDays ? `${s.expiryDays} din baad` : 'Kabhi nahi'} />
            <Row label="Khatam hue (is period)" value={f.count(t.expired)} />
            {t.adjusted !== 0 && <Row label="Haath se badle" value={f.count(t.adjusted)} />}
            <Row label="Points walon ki sale" value={f.pct(t.memberShare)} />
          </dl>
          <p className="mt-3 border-t border-slate-100 pt-2 text-[0.6875rem] leading-relaxed text-slate-500">Baqi points aur list sab branches ki hai — points customer ke saath chalte hain, branch ke saath nahi.</p>
        </Panel>
      </div>

      <Panel icon={Users} flush title="Sab se zyada points" hint="Inhein yaad dilayein — points istemal karne aayenge to khareedari bhi karenge"
        actions={<Button size="sm" onClick={() => setWa(true)} disabled={!d.top.length}><MessageCircle className="h-4 w-4" />WhatsApp</Button>}>
        <div className="px-4 pb-3 sm:px-5">
          <DataTable rows={d.top} rowKey={(r) => r.id} empty="Kisi ke paas points nahi"
            columns={[
              { label: '#', render: (_, i) => <span className="text-slate-400">{i + 1}</span> },
              { label: 'Customer', render: (r) => <CustomerCell id={r.id} name={r.name} phone={r.phone} isVip={r.isVip} sub={r.city} /> },
              { label: 'Points', align: 'right', render: (r) => <span className="font-semibold text-slate-900">{f.count(r.points)}</span> },
              { label: 'Qeemat', align: 'right', render: (r) => f.money(r.value) },
              { label: 'Kul kharch', align: 'right', render: (r) => f.money(r.spent) },
            ]} />
        </div>
      </Panel>

      {wa && <WhatsAppList kind="segment" title="Points ki yaad dihani" message={REMIND} onClose={() => setWa(false)} people={d.top} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium tabular-nums text-slate-900">{value}</dd></div>;
}

/** Toy-store-only dashboard widgets. */

import { Baby, Battery, Cake, Gift, PartyPopper, ShieldAlert } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { EmptyHint, IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useToystoreOps } from './useToystoreOps';

/** Toy store headline numbers, offered next to the common ones. */
export const toystoreKpis: KpiDef[] = [
  {
    id: 'toystore-birthdays', label: 'Is hafte salgirah', icon: Cake, tone: 'brand',
    useValue: () => {
      const { birthdays, loading } = useToystoreOps();
      return { loading, to: '/toystore/birthdays', value: birthdays.week, hint: `${birthdays.month} is mahine` };
    },
  },
  {
    id: 'toystore-safety', label: 'Safety check', icon: ShieldAlert, tone: 'danger',
    useValue: () => {
      const { safetyIssues, totalProducts, loading } = useToystoreOps();
      return { loading, to: '/toystore/safety-review', value: safetyIssues, alert: safetyIssues > 0, hint: safetyIssues ? 'khilone check karein' : `${totalProducts} khilone theek` };
    },
  },
  {
    id: 'toystore-gift-packs', label: 'Gift packs', icon: Gift, tone: 'info',
    useValue: () => {
      const { giftPacks, loading } = useToystoreOps();
      return { loading, to: '/toystore/gift-packs', value: giftPacks.active, hint: `${giftPacks.sold} bik chuke` };
    },
  },
];

export function useToystoreAttention(): AttentionItem[] {
  const { birthdays, safetyIssues, batteryUpsell } = useToystoreOps();
  const items: AttentionItem[] = [];
  if (safetyIssues) items.push({ icon: ShieldAlert, level: 'warning', text: `${safetyIssues} khilonon me safety ki kami — certificate ya choking warning check karein`, to: '/toystore/safety-review', cta: 'Safety dekhein' });
  if (birthdays.soon) items.push({ icon: Cake, level: 'warning', text: `${birthdays.soon} bachon ki salgirah 3 din me hai — parents ko gift idea bhej dein`, to: '/toystore/birthdays', cta: 'Salgirah dekhein' });
  else if (birthdays.week) items.push({ icon: Cake, level: 'info', text: `Is hafte ${birthdays.week} bachon ki salgirah hai`, to: '/toystore/birthdays', cta: 'Salgirah dekhein' });
  if (batteryUpsell) items.push({ icon: Battery, level: 'neutral', text: `${batteryUpsell} khilone bina battery ke bikte hain — counter par battery saath bechein`, to: '/toy-products?filter=battery', cta: 'Dekhein' });
  return items;
}

export function ToystoreBirthdays() {
  const { birthdays } = useToystoreOps();
  return (
    <WidgetCard title="Aane wali salgirah" icon={Cake} description={`${birthdays.month} agle 30 din me · ${birthdays.registered} bachay darj`} to="/toystore/birthdays" flush>
      <RowList empty="Agle 30 din koi salgirah nahi" emptyIcon={Cake}>
        {birthdays.list.slice(0, 6).map((b) => {
          const tone = b.daysUntil <= 3 ? 'danger' : b.daysUntil <= 7 ? 'warning' : 'neutral';
          const when = b.daysUntil === 0 ? 'Aaj' : b.daysUntil === 1 ? 'Kal' : `${b.daysUntil} din`;
          return (
            <ListRow
              key={b.id}
              to={`/toystore/birthdays/${b.id}`}
              leading={<IconBubble icon={b.daysUntil === 0 ? PartyPopper : Cake} tone={tone === 'neutral' ? 'brand' : tone} />}
              title={<span>{b.childName} <span className="font-normal text-slate-500">· {b.turningAge} saal</span></span>}
              meta={[b.customerName, b.customerPhone, b.budgetRange ? `Budget ${b.budgetRange}` : null].filter(Boolean).join(' · ')}
              value={<Badge variant={tone === 'neutral' ? 'default' : tone} size="xs">{when}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function ToystoreAgeGroups() {
  const { ages, educational, totalProducts } = useToystoreOps();
  const { sales } = useMasked();
  const top = ages.filter((g) => g.count > 0).slice(0, 8);
  return (
    <WidgetCard title="Umar ke hisaab se" icon={Baby} description={`${totalProducts} khilone · ${educational} educational`} to="/toy-products">
      {top.length === 0 ? (
        <EmptyHint icon={Baby} text="Khilonon par umar (age group) likhein — yahan pata chalega kis umar ka maal zyada bikta hai" />
      ) : (
        <ul className="space-y-2.5">
          {top.map((g) => (
            <li key={g.ageGroup} className="text-[0.8125rem]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-slate-700">{g.label} <span className="text-slate-400">· {g.count} items</span></span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-900">{sales(g.revenue)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(g.share, 2)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function ToystoreGiftPacks() {
  const { giftPacks } = useToystoreOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title="Top gift packs" icon={Gift} description={`${giftPacks.active} chaalu · ${giftPacks.sold} bik chuke`} to="/toystore/gift-packs" flush>
      <RowList empty="Abhi koi gift pack nahi — bana kar salgirah par bechein" emptyIcon={Gift}>
        {giftPacks.top.slice(0, 5).map((g) => (
          <ListRow
            key={g.id}
            to={`/toystore/gift-packs/${g.id}/edit`}
            icon={Gift}
            title={g.name}
            meta={`${g.itemCount ?? 0} cheezein · ${g.totalSold ?? 0} bike${Number(g.savingsPct) > 0 ? ` · ${Number(g.savingsPct).toFixed(0)}% bachat` : ''}`}
            value={sales(g.giftPackPrice)}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

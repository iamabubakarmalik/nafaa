/** Toy-store-only dashboard widgets. */

import { Baby, Battery, Cake, Gift, PartyPopper, ShieldAlert } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { EmptyHint, IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useToystoreOps } from './useToystoreOps';
import { t } from '@core/i18n';

/** Toy store headline numbers, offered next to the common ones. */
export const toystoreKpis: KpiDef[] = [
  {
    id: 'toystore-birthdays', label: t('Is hafte saalgirah'), icon: Cake, tone: 'brand',
    useValue: () => {
      const { birthdays, loading } = useToystoreOps();
      return { loading, to: '/toystore/birthdays', value: birthdays.week, hint: t('{{month}} is mahine', { month: birthdays.month }) };
    },
  },
  {
    id: 'toystore-safety', label: t('Safety check'), icon: ShieldAlert, tone: 'danger',
    useValue: () => {
      const { safetyIssues, totalProducts, loading } = useToystoreOps();
      return { loading, to: '/toystore/safety-review', value: safetyIssues, alert: safetyIssues > 0, hint: safetyIssues ? t('khilone check karein') : t('{{totalProducts}} khilone theek', { totalProducts }) };
    },
  },
  {
    id: 'toystore-gift-packs', label: t('Gift packs'), icon: Gift, tone: 'info',
    useValue: () => {
      const { giftPacks, loading } = useToystoreOps();
      return { loading, to: '/toystore/gift-packs', value: giftPacks.active, hint: t('{{sold}} bik chuke', { sold: giftPacks.sold }) };
    },
  },
];

export function useToystoreAttention(): AttentionItem[] {
  const { birthdays, safetyIssues, batteryUpsell } = useToystoreOps();
  const items: AttentionItem[] = [];
  if (safetyIssues) items.push({ icon: ShieldAlert, level: 'warning', text: t('{{safetyIssues}} khilonon me safety ki kami — certificate ya choking warning check karein', { safetyIssues }), to: '/toystore/safety-review', cta: t('Safety dekhein') });
  if (birthdays.soon) items.push({ icon: Cake, level: 'warning', text: t('{{soon}} bachon ki saalgirah 3 din me hai — parents ko gift idea bhej dein', { soon: birthdays.soon }), to: '/toystore/birthdays', cta: t('Saalgirah dekhein') });
  else if (birthdays.week) items.push({ icon: Cake, level: 'info', text: t('Is hafte {{week}} bachon ki saalgirah hai', { week: birthdays.week }), to: '/toystore/birthdays', cta: t('Saalgirah dekhein') });
  if (batteryUpsell) items.push({ icon: Battery, level: 'neutral', text: t('{{batteryUpsell}} khilone bina battery ke bikte hain — counter par battery saath bechein', { batteryUpsell }), to: '/products', cta: t('Dekhein') });
  return items;
}

export function ToystoreBirthdays() {
  const { birthdays } = useToystoreOps();
  return (
    <WidgetCard title={t('Aane wali saalgirah')} icon={Cake} description={t('{{month}} agle 30 din me · {{registered}} bachay darj', { month: birthdays.month, registered: birthdays.registered })} to="/toystore/birthdays" flush>
      <RowList empty={t('Agle 30 din koi saalgirah nahi')} emptyIcon={Cake}>
        {birthdays.list.slice(0, 6).map((b) => {
          const tone = b.daysUntil <= 3 ? 'danger' : b.daysUntil <= 7 ? 'warning' : 'neutral';
          const when = b.daysUntil === 0 ? t('Aaj') : b.daysUntil === 1 ? t('Kal') : t('{{daysUntil}} din', { daysUntil: b.daysUntil });
          return (
            <ListRow
              key={b.id}
              to={`/toystore/birthdays/${b.id}`}
              leading={<IconBubble icon={b.daysUntil === 0 ? PartyPopper : Cake} tone={tone === 'neutral' ? 'brand' : tone} />}
              title={<span>{b.childName} <span className="font-normal text-slate-500">{t('· {{turningAge}} saal', { turningAge: b.turningAge })}</span></span>}
              meta={[b.customerName, b.customerPhone, b.budgetRange ? t('Budget {{budgetRange}}', { budgetRange: b.budgetRange }) : null].filter(Boolean).join(' · ')}
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
    <WidgetCard title={t('Umar ke hisaab se')} icon={Baby} description={t('{{totalProducts}} khilone · {{educational}} educational', { totalProducts, educational })} to="/products">
      {top.length === 0 ? (
        <EmptyHint icon={Baby} text={t('Khilonon par umar (age group) likhein — yahan pata chalega kis umar ka maal zyada bikta hai')} />
      ) : (
        <ul className="space-y-2.5">
          {top.map((g) => (
            <li key={g.ageGroup} className="text-[0.8125rem]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-slate-700">{g.label} <span className="text-slate-400">{t('· {{count}} items', { count: g.count })}</span></span>
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
    <WidgetCard title={t('Top gift packs')} icon={Gift} description={t('{{active}} chaalu · {{sold}} bik chuke', { active: giftPacks.active, sold: giftPacks.sold })} to="/toystore/gift-packs" flush>
      <RowList empty={t('Abhi koi gift pack nahi — bana kar saalgirah par bechein')} emptyIcon={Gift}>
        {giftPacks.top.slice(0, 5).map((g) => (
          <ListRow
            key={g.id}
            to={`/toystore/gift-packs/${g.id}/edit`}
            icon={Gift}
            title={g.name}
            meta={t('{{value}} cheezein · {{value2}} bike{{value3}}', { value: g.itemCount ?? 0, value2: g.totalSold ?? 0, value3: Number(g.savingsPct) > 0 ? t(' · {{value}}% bachat', { value: Number(g.savingsPct).toFixed(0) }) : '' })}
            value={sales(g.giftPackPrice)}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

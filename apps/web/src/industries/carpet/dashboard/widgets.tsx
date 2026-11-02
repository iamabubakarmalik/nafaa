/** Carpet-only dashboard widgets: roll stock, short rolls, new rolls and cut pieces. */

import { AlertTriangle, Layers, Ruler, Scissors, Sparkles } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, ProgressRing, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { useCarpetOps } from './useCarpetOps';
import { t } from '@core/i18n';

const ft = (n: number) => Math.round(n).toLocaleString('en-PK');

export const carpetKpis: KpiDef[] = [
  {
    id: 'carpet-rolls', label: t('Chaalu rolls'), icon: Layers, tone: 'brand',
    useValue: () => {
      const c = useCarpetOps();
      return { loading: c.loading, to: '/carpet-rolls', value: c.rolls, hint: t('{{lengthFt}} ft lambai', { lengthFt: ft(c.lengthFt) }) };
    },
  },
  {
    id: 'carpet-sqft', label: t('Bikne wala sqft'), icon: Ruler, tone: 'info',
    useValue: () => {
      const c = useCarpetOps();
      return { loading: c.loading, to: '/carpet-rolls', value: ft(c.sqft), hint: t('rolls me baqi') };
    },
  },
  {
    id: 'carpet-pieces', label: t('Cut pieces'), icon: Scissors, tone: 'neutral',
    useValue: () => {
      const c = useCarpetOps();
      return { loading: c.loading, to: '/carpet-cut-pieces', value: c.pieces, hint: t('{{piecesSqft}} sqft', { piecesSqft: ft(c.piecesSqft) }) };
    },
  },
  {
    id: 'carpet-short-rolls', label: t('Chhote rolls'), icon: AlertTriangle, tone: 'warning',
    useValue: () => {
      const c = useCarpetOps();
      return {
        loading: c.loading, to: '/carpet-rolls?filter=low', value: c.shortRolls.length,
        hint: c.rolls ? t('{{health}}% rolls theek', { health: c.health }) : t('koi roll nahi'), alert: c.shortRolls.length > 0,
      };
    },
  },
];

export function useCarpetAttention(): AttentionItem[] {
  const c = useCarpetOps();
  const items: AttentionItem[] = [];
  if (c.shortRolls.length) items.push({ icon: AlertTriangle, level: 'warning', text: t('{{count}} roll 10 ft se kam reh gaye — naya roll mangwayein ya baqi tukda cut piece bana dein', { count: c.shortRolls.length }), to: '/carpet-rolls?filter=low', cta: t('Rolls dekhein') });
  if (c.pieces >= 10) items.push({ icon: Scissors, level: 'info', text: t('{{pieces}} cut pieces pare hain ({{piecesSqft}} sqft) — chhote order par pehle ye dikhayein', { pieces: c.pieces, piecesSqft: ft(c.piecesSqft) }), to: '/carpet-cut-pieces', cta: t('Pieces dekhein') });
  if (c.enabled && c.rolls === 0) items.push({ icon: Layers, level: 'neutral', text: t('Abhi koi roll darj nahi — roll daalein to lambai aur sqft ka hisaab khud chalega'), to: '/carpet-rolls', cta: t('Roll daalein') });
  return items;
}

/** Roll stock at a glance: health ring plus length, sqft and cut pieces. */
export function CarpetStock() {
  const c = useCarpetOps();
  const { cost } = useMasked();
  const tone = c.health > 70 ? 'text-success-600' : c.health > 40 ? 'text-amber-500' : 'text-rose-500';
  return (
    <WidgetCard title={t('Rolls ka stock')} icon={Layers} description={t('{{rolls}} rolls · {{sqft}} sqft baqi', { rolls: c.rolls, sqft: ft(c.sqft) })} to="/carpet-rolls">
      <div className="flex flex-wrap items-center gap-5">
        <ProgressRing value={c.health / 100} size={112} className={c.rolls ? tone : 'text-slate-300'}>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums text-slate-900">{c.rolls ? `${c.health}%` : '—'}</div>
            <div className="text-[0.75rem] text-slate-500">{t('rolls theek')}</div>
          </div>
        </ProgressRing>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <MetricTile icon={Layers} tone="brand" label={t('Chaalu rolls')} value={c.rolls} hint={t('{{lengthFt}} ft', { lengthFt: ft(c.lengthFt) })} />
          <MetricTile icon={Ruler} tone="info" label={t('Bikne wala')} value={`${ft(c.sqft)} sqft`} />
          <MetricTile icon={Scissors} tone="neutral" label={t('Cut pieces')} value={c.pieces} hint={t('{{piecesSqft}} sqft', { piecesSqft: ft(c.piecesSqft) })} to="/carpet-cut-pieces" />
          <MetricTile icon={AlertTriangle} tone="warning" label={t('Chhote rolls')} value={c.shortRolls.length} hint={t('Pieces ki qeemat {{piecesValue}}', { piecesValue: cost(c.piecesValue) })} alert={c.shortRolls.length > 0} />
        </div>
      </div>
    </WidgetCard>
  );
}

export function CarpetShortRolls() {
  const c = useCarpetOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title={t('Chhote rolls')} icon={AlertTriangle} description={t('10 ft se kam lambai baqi')} to="/carpet-rolls?filter=low" flush>
      <RowList empty={t('Sab rolls me kaafi lambai hai')} emptyIcon={Layers}>
        {c.shortRolls.slice(0, 6).map((r) => {
          const out = r.remainingLengthFt <= 2;
          return (
            <ListRow
              key={r.id}
              to={`/carpet-rolls/${r.id}`}
              leading={<IconBubble icon={Layers} tone={out ? 'danger' : 'warning'} />}
              title={<span className="font-mono">{r.rollNumber}</span>}
              meta={t('{{value}} · {{remainingSqft}} sqft · {{salePricePerSqft}}/sqft', { value: r.productName ?? 'Roll', remainingSqft: ft(r.remainingSqft), salePricePerSqft: sales(r.salePricePerSqft) })}
              value={<Badge variant={out ? 'danger' : 'warning'} size="xs">{t('{{value}} ft', { value: r.remainingLengthFt.toFixed(1) })}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function CarpetRecentRolls() {
  const c = useCarpetOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title={t('Naye rolls')} icon={Sparkles} description={t('Haal hi me aaye rolls')} to="/carpet-rolls" flush>
      <RowList empty={t('Abhi koi roll nahi aaya')} emptyIcon={Sparkles}>
        {c.recentRolls.slice(0, 6).map((r) => (
          <ListRow
            key={r.id}
            to={`/carpet-rolls/${r.id}`}
            leading={(
              <span className="relative">
                <IconBubble icon={Layers} tone="brand" />
                {r.variantColorHex && (
                  <span
                    className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: r.variantColorHex }}
                  />
                )}
              </span>
            )}
            title={r.productName ?? r.rollNumber}
            meta={<span className="font-mono">{r.rollNumber}{r.variantName ? ` · ${r.variantName}` : ''}</span>}
            value={`${ft(r.remainingSqft)} sqft`}
            valueHint={<span className="text-slate-500">{sales(r.salePricePerSqft)}/sqft</span>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Cut-piece value (at listed price) as an extra money-map tile. */
export function useCarpetMoneyTiles(): MoneyTileProps[] {
  const c = useCarpetOps();
  if (!c.enabled) return [];
  return [{
    key: 'carpet-pieces', icon: Scissors, tone: 'warning', to: '/carpet-cut-pieces', label: t('Cut pieces'),
    value: formatPKR(c.piecesValue), hint: t('{{pieces}} pieces · {{piecesSqft}} sqft', { pieces: c.pieces, piecesSqft: ft(c.piecesSqft) }),
  }];
}

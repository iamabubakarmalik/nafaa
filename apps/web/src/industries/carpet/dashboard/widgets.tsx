/** Carpet-only dashboard widgets: roll stock, short rolls, new rolls and cut pieces. */

import { AlertTriangle, Layers, Ruler, Scissors, Sparkles } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, ProgressRing, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { useCarpetOps } from './useCarpetOps';

const ft = (n: number) => Math.round(n).toLocaleString('en-PK');

export const carpetKpis: KpiDef[] = [
  {
    id: 'carpet-rolls', label: 'Chaalu rolls', icon: Layers, tone: 'brand',
    useValue: () => {
      const c = useCarpetOps();
      return { loading: c.loading, to: '/carpet-rolls', value: c.rolls, hint: `${ft(c.lengthFt)} ft lambai` };
    },
  },
  {
    id: 'carpet-sqft', label: 'Bikne wala sqft', icon: Ruler, tone: 'info',
    useValue: () => {
      const c = useCarpetOps();
      return { loading: c.loading, to: '/carpet-rolls', value: ft(c.sqft), hint: 'rolls me baqi' };
    },
  },
  {
    id: 'carpet-pieces', label: 'Cut pieces', icon: Scissors, tone: 'neutral',
    useValue: () => {
      const c = useCarpetOps();
      return { loading: c.loading, to: '/carpet-cut-pieces', value: c.pieces, hint: `${ft(c.piecesSqft)} sqft` };
    },
  },
  {
    id: 'carpet-short-rolls', label: 'Chhote rolls', icon: AlertTriangle, tone: 'warning',
    useValue: () => {
      const c = useCarpetOps();
      return {
        loading: c.loading, to: '/carpet-rolls?filter=low', value: c.shortRolls.length,
        hint: c.rolls ? `${c.health}% rolls theek` : 'koi roll nahi', alert: c.shortRolls.length > 0,
      };
    },
  },
];

export function useCarpetAttention(): AttentionItem[] {
  const c = useCarpetOps();
  const items: AttentionItem[] = [];
  if (c.shortRolls.length) items.push({ icon: AlertTriangle, level: 'warning', text: `${c.shortRolls.length} roll 10 ft se kam reh gaye — naya roll mangwayein ya baqi tukda cut piece bana dein`, to: '/carpet-rolls?filter=low', cta: 'Rolls dekhein' });
  if (c.pieces >= 10) items.push({ icon: Scissors, level: 'info', text: `${c.pieces} cut pieces pare hain (${ft(c.piecesSqft)} sqft) — chhote order par pehle ye dikhayein`, to: '/carpet-cut-pieces', cta: 'Pieces dekhein' });
  if (c.enabled && c.rolls === 0) items.push({ icon: Layers, level: 'neutral', text: 'Abhi koi roll darj nahi — roll daalein to lambai aur sqft ka hisaab khud chalega', to: '/carpet-rolls', cta: 'Roll daalein' });
  return items;
}

/** Roll stock at a glance: health ring plus length, sqft and cut pieces. */
export function CarpetStock() {
  const c = useCarpetOps();
  const { cost } = useMasked();
  const tone = c.health > 70 ? 'text-success-600' : c.health > 40 ? 'text-amber-500' : 'text-rose-500';
  return (
    <WidgetCard title="Rolls ka stock" icon={Layers} description={`${c.rolls} rolls · ${ft(c.sqft)} sqft baqi`} to="/carpet-rolls">
      <div className="flex flex-wrap items-center gap-5">
        <ProgressRing value={c.health / 100} size={112} className={c.rolls ? tone : 'text-slate-300'}>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums text-slate-900">{c.rolls ? `${c.health}%` : '—'}</div>
            <div className="text-[0.75rem] text-slate-500">rolls theek</div>
          </div>
        </ProgressRing>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <MetricTile icon={Layers} tone="brand" label="Chaalu rolls" value={c.rolls} hint={`${ft(c.lengthFt)} ft`} />
          <MetricTile icon={Ruler} tone="info" label="Bikne wala" value={`${ft(c.sqft)} sqft`} />
          <MetricTile icon={Scissors} tone="neutral" label="Cut pieces" value={c.pieces} hint={`${ft(c.piecesSqft)} sqft`} to="/carpet-cut-pieces" />
          <MetricTile icon={AlertTriangle} tone="warning" label="Chhote rolls" value={c.shortRolls.length} hint={`Pieces ki qeemat ${cost(c.piecesValue)}`} alert={c.shortRolls.length > 0} />
        </div>
      </div>
    </WidgetCard>
  );
}

export function CarpetShortRolls() {
  const c = useCarpetOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title="Chhote rolls" icon={AlertTriangle} description="10 ft se kam lambai baqi" to="/carpet-rolls?filter=low" flush>
      <RowList empty="Sab rolls me kaafi lambai hai" emptyIcon={Layers}>
        {c.shortRolls.slice(0, 6).map((r) => {
          const out = r.remainingLengthFt <= 2;
          return (
            <ListRow
              key={r.id}
              to={`/carpet-rolls/${r.id}`}
              leading={<IconBubble icon={Layers} tone={out ? 'danger' : 'warning'} />}
              title={<span className="font-mono">{r.rollNumber}</span>}
              meta={`${r.productName ?? 'Roll'} · ${ft(r.remainingSqft)} sqft · ${sales(r.salePricePerSqft)}/sqft`}
              value={<Badge variant={out ? 'danger' : 'warning'} size="xs">{r.remainingLengthFt.toFixed(1)} ft</Badge>}
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
    <WidgetCard title="Naye rolls" icon={Sparkles} description="Haal hi me aaye rolls" to="/carpet-rolls" flush>
      <RowList empty="Abhi koi roll nahi aaya" emptyIcon={Sparkles}>
        {c.recentRolls.slice(0, 6).map((r) => (
          <ListRow
            key={r.id}
            to={`/carpet-rolls/${r.id}`}
            leading={(
              <span className="relative">
                <IconBubble icon={Layers} tone="brand" />
                {r.variantColorHex && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
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
    key: 'carpet-pieces', icon: Scissors, tone: 'warning', to: '/carpet-cut-pieces', label: 'Cut pieces',
    value: formatPKR(c.piecesValue), hint: `${c.pieces} pieces · ${ft(c.piecesSqft)} sqft`,
  }];
}

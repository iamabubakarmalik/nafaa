/**
 * Pakistan as plain SVG: the country outline, city bubbles sized by parcel
 * count and coloured by their main state, the shop's own city, and (for one
 * order) the line from city to city. Positions come from the server's city
 * table; nothing here moves on its own, because couriers send city names,
 * not a rider's live position.
 */

import { useId, useMemo } from 'react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import type { MapCity, Place } from '../../api/insights.api';
import { STATE_LABEL, STATE_STYLE } from '../../lib/tracking';
import { PK_PATH, PK_VIEWBOX, project } from './pakistan-outline';

const PAD = 14;
/** Label halo, bubble ring and light dot: the map's own surface colour in each theme. */
const HALO = 'stroke-ink-50 dark:stroke-ink-800';
const RING = 'stroke-ink-50 dark:stroke-ink-900';
const SURFACE = 'fill-ink-50 dark:fill-ink-800';
const VB = `${-PAD} ${-PAD} ${PK_VIEWBOX.width + PAD * 2} ${PK_VIEWBOX.height + PAD * 2}`;

export function PakistanMap({ cities, origin, route, selected, onSelect, className, labels = 8 }: {
  cities?: MapCity[];
  origin?: Place | null;
  /** One parcel's journey: cities passed, the destination and where it was last seen. */
  route?: { path: Place[]; destination: Place | null; here: Place | null; done?: boolean };
  selected?: string | null;
  onSelect?: (key: string | null) => void;
  className?: string;
  /** How many of the biggest bubbles get a name label. */
  labels?: number;
}) {
  const clip = useId().replace(/:/g, '');
  const max = Math.max(1, ...(cities ?? []).map((c) => c.total));
  const bubbles = useMemo(
    () => [...(cities ?? [])].sort((a, b) => b.total - a.total).map((c, i) => ({ ...c, ...project(c.lat, c.lng), r: 5 + 21 * Math.sqrt(c.total / max), label: i < labels })),
    [cities, max, labels],
  );
  const line = route ? [...route.path, ...(route.destination && route.path[route.path.length - 1]?.name !== route.destination.name ? [route.destination] : [])] : [];
  const pts = line.map((p) => project(p.lat, p.lng));
  const walked = route ? route.path.map((p) => project(p.lat, p.lng)) : [];
  const o = origin ? project(origin.lat, origin.lng) : null;

  return (
    <svg viewBox={VB} role="img" aria-label={t('Pakistan ka naqsha')} className={cn('h-auto w-full select-none', className)}
      onClick={(e) => { if (e.target === e.currentTarget) onSelect?.(null); }}>
      <defs>
        <clipPath id={`pk-${clip}`}><path d={PK_PATH} /></clipPath>
        <pattern id={`grid-${clip}`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" className="fill-none stroke-ink-200 dark:stroke-ink-700" strokeWidth="0.6" />
        </pattern>
      </defs>
      <path d={PK_PATH} className="fill-ink-50 stroke-ink-300 dark:fill-ink-800 dark:stroke-ink-600" strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="0" y="0" width={PK_VIEWBOX.width} height={PK_VIEWBOX.height} fill={`url(#grid-${clip})`} clipPath={`url(#pk-${clip})`} opacity="0.7" pointerEvents="none" />

      {pts.length > 1 && (
        <>
          <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} className="fill-none stroke-brand-400" strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />
          {walked.length > 1 && <polyline points={walked.map((p) => `${p.x},${p.y}`).join(' ')} className="fill-none stroke-brand-600" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
        </>
      )}
      {route && line.map((p, i) => {
        const q = project(p.lat, p.lng);
        const end = i === line.length - 1 && route.destination?.name === p.name;
        return (
          <g key={`${p.name}-${i}`}>
            <circle cx={q.x} cy={q.y} r={end ? 7 : 5} className={end ? cn(SURFACE, 'stroke-brand-600') : cn('fill-brand-600', RING)} strokeWidth="2.5" />
            <text x={q.x} y={q.y - 11} textAnchor="middle" className={cn("fill-slate-700 text-[13px] font-semibold", HALO)} paintOrder="stroke" strokeWidth="3" strokeOpacity="0.8">{p.name}</text>
          </g>
        );
      })}
      {route?.here && (() => {
        const h = project(route.here.lat, route.here.lng);
        return (
          <g pointerEvents="none">
            {!route.done && <circle cx={h.x} cy={h.y} r="9" className="fill-brand-500 motion-safe:animate-ping" opacity="0.35" style={{ transformOrigin: `${h.x}px ${h.y}px` }} />}
            <circle cx={h.x} cy={h.y} r="6" className={cn("fill-brand-600", RING)} strokeWidth="2.5" />
          </g>
        );
      })()}

      {bubbles.map((b) => {
        const active = selected === b.key;
        return (
          <g key={b.key} role="button" tabIndex={0} aria-label={`${b.name}: ${b.total} · ${STATE_LABEL[b.top]}`} className="cursor-pointer outline-none"
            onClick={() => onSelect?.(active ? null : b.key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(active ? null : b.key); } }}>
            <title>{`${b.name} · ${b.total}`}</title>
            <circle cx={b.x} cy={b.y} r={b.r + (active ? 4 : 0)} className={cn(STATE_STYLE[b.top].fill, 'transition-all')} fillOpacity={active ? 0.95 : 0.78} />
            <circle cx={b.x} cy={b.y} r={b.r + (active ? 4 : 0)} className={cn('fill-none', active ? 'stroke-slate-900' : RING)} strokeWidth={active ? 2.5 : 1.5} />
            {b.r >= 11 && <text x={b.x} y={b.y + 4} textAnchor="middle" className="pointer-events-none fill-white text-[12px] font-bold tabular-nums">{b.total}</text>}
            {(b.label || active) && (
              <text x={b.x} y={b.y - b.r - 5} textAnchor="middle" className={cn("pointer-events-none fill-slate-700 text-[12px] font-semibold", HALO)} paintOrder="stroke" strokeWidth="3" strokeOpacity="0.8">{b.name}</text>
            )}
          </g>
        );
      })}

      {o && (
        <g pointerEvents="none">
          <rect x={o.x - 6} y={o.y - 6} width="12" height="12" rx="3" className={cn("fill-slate-900", RING)} strokeWidth="2" transform={`rotate(45 ${o.x} ${o.y})`} />
          <text x={o.x + 11} y={o.y + 4} className={cn("fill-slate-700 text-[11px] font-semibold", HALO)} paintOrder="stroke" strokeWidth="3" strokeOpacity="0.8">{t('Aap ki dukaan')}</text>
        </g>
      )}
    </svg>
  );
}

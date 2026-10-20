/**
 * Decorative wireframe globe for the worldwide services band (aria-hidden).
 * Orthographic projection centred near Pakistan; meridians turn with CSS
 * (scaleX on ellipses), parallels stay put, and arcs leave from Lahore.
 * The arcs show "we work across borders", not customers: no place is named.
 */
import { cx } from '@/components/ui/cx';
import fx from './fx.module.css';

const R = 200;
const C = 240;
const LON0 = 55;
const LAT0 = 22;

const rad = (d: number) => (d * Math.PI) / 180;

/** Orthographic projection; null when the point is on the far side. */
function project(lon: number, lat: number): [number, number] | null {
  const l = rad(lon - LON0);
  const p = rad(lat);
  const p0 = rad(LAT0);
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  if (cosc < 0) return null;
  const x = R * Math.cos(p) * Math.sin(l);
  const y = R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l));
  return [C + x, C - y];
}

const HOME: [number, number] = [74.3, 31.5];
const TARGETS: [number, number][] = [
  [55.3, 25.2],
  [-0.1, 51.5],
  [46.7, 24.7],
  [103.8, 1.3],
  [151.2, -33.9],
  [-79.4, 43.7],
  [13.4, 52.5],
];

function arcPath(from: [number, number], to: [number, number]): string | null {
  const a = project(...from);
  const b = project(...to);
  if (!a || !b) return null;
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  // Lift the control point away from the centre so arcs bow outward.
  const ox = mx - C;
  const oy = my - C;
  const olen = Math.hypot(ox, oy) || 1;
  const lift = Math.min(90, len * 0.45);
  const cx = mx + (ox / olen) * lift;
  const cy = my + (oy / olen) * lift - lift * 0.3;
  return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
}

/** Land-ish dots: a fixed lat/lon lattice, kept where it lands on the near side. */
const DOTS: [number, number][] = [];
for (let lat = -50; lat <= 70; lat += 8) {
  for (let lon = -120; lon <= 180; lon += 8) {
    const n = Math.sin(lat * 0.21 + lon * 0.13) + Math.cos(lon * 0.07 - lat * 0.11);
    if (n > 0.35) {
      const p = project(lon, lat);
      if (p) DOTS.push(p);
    }
  }
}

/** Parallels every 20 degrees, sampled and split where they pass behind the globe. */
const PARALLELS: string[] = [-40, -20, 0, 20, 40, 60].map((lat) => {
  let d = '';
  let pen = false;
  for (let lon = -180; lon <= 180; lon += 4) {
    const p = project(lon, lat);
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    pen = true;
  }
  return d;
});

export function Globe() {
  const home = project(...HOME);
  const arcs = TARGETS.map((t) => arcPath(HOME, t)).filter(Boolean) as string[];
  return (
    <div className={fx.globeWrap} data-animate="once">
      <svg viewBox="0 0 480 480" className="h-auto w-full" fill="none">
        <defs>
          <radialGradient id="globe-fill" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="rgb(34 197 94 / 0.16)" />
            <stop offset="70%" stopColor="rgb(15 23 42 / 0.2)" />
            <stop offset="100%" stopColor="rgb(2 6 23 / 0)" />
          </radialGradient>
          <linearGradient id="globe-arc" x1="0" x2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <circle cx={C} cy={C} r={R + 30} className={fx.globeHalo} />
        <circle cx={C} cy={C} r={R} fill="url(#globe-fill)" stroke="rgb(148 163 184 / 0.25)" />
        <g stroke="rgb(148 163 184 / 0.16)">
          {PARALLELS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g stroke="rgb(148 163 184 / 0.16)">
          {Array.from({ length: 6 }, (_, i) => (
            <ellipse key={i} cx={C} cy={C} rx={R} ry={R} className={fx.meridian} style={{ '--delay': `${(-i * 16) / 6}s` }} />
          ))}
        </g>
        <g fill="rgb(148 163 184 / 0.45)">
          {DOTS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.6" />
          ))}
        </g>
        {arcs.map((d, i) => (
          <g key={i}>
            <path d={d} stroke="url(#globe-arc)" strokeWidth="1.5" strokeLinecap="round" pathLength={1} className={cx(fx.arc)} style={{ '--delay': `${i * 0.7}s` }} />
          </g>
        ))}
        {TARGETS.map((t, i) => {
          const p = project(...t);
          return p ? <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#4ade80" className={fx.blip} style={{ '--delay': `${i * 0.7 + 1}s` }} /> : null;
        })}
        {home ? (
          <g>
            <circle cx={home[0]} cy={home[1]} r="14" fill="rgb(34 197 94 / 0.18)" className={fx.homePulse} />
            <circle cx={home[0]} cy={home[1]} r="5.5" fill="#22c55e" stroke="#bbf7d0" strokeWidth="2" />
          </g>
        ) : null}
      </svg>
    </div>
  );
}

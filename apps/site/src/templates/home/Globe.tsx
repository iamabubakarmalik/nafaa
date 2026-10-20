'use client';

/**
 * Interactive globe for the worldwide services band (decorative, aria-hidden).
 *
 * A 2D canvas draws an orthographic globe: land as depth-shaded dots, a faint
 * graticule, glowing points and arcs that leave from Lahore. The points say
 * "we work across borders"; no place is named and no customer is implied.
 *
 * - Drag with a mouse or a finger to turn it (touch keeps vertical page
 *   scroll: `touch-action: pan-y`). A release keeps a little spin.
 * - Idle, it turns slowly on its own.
 * - It draws only while on screen and while the tab is visible.
 * - With reduced motion it does not turn or animate by itself; a drag still
 *   turns it, because the visitor asked for that movement.
 * - "You are here": the visitor's rough location comes from /api/geo (the
 *   hosting edge's IP headers, read on the server) or, when that is empty,
 *   from the browser time zone. The browser location prompt is never used.
 *   An arc joins the visitor to Nafaa in Lahore.
 *
 * No library: about 200 lines of math and canvas calls.
 */
import { useEffect, useRef } from 'react';
import fx from './fx.module.css';

type LonLat = [number, number];

/** Rough continent outlines (lon, lat), enough for a dotted globe at this size. */
const LAND: LonLat[][] = [
  // North America
  [[-168, 66], [-162, 70], [-140, 70], [-125, 72], [-95, 73], [-80, 73], [-62, 66], [-55, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 25], [-83, 29], [-90, 30], [-97, 27], [-97, 22], [-92, 18], [-87, 21], [-88, 15], [-83, 9], [-79, 8], [-85, 11], [-92, 14], [-105, 20], [-110, 23], [-115, 30], [-118, 34], [-124, 40], [-124, 48], [-130, 55], [-140, 60], [-152, 58], [-160, 56], [-165, 60]],
  // Greenland
  [[-50, 60], [-42, 60], [-20, 70], [-18, 78], [-30, 83], [-60, 82], [-72, 78], [-55, 70]],
  // South America
  [[-80, 9], [-72, 12], [-62, 10], [-52, 5], [-35, -5], [-38, -13], [-48, -25], [-58, -35], [-65, -42], [-68, -52], [-72, -54], [-75, -48], [-73, -38], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0]],
  // Eurasia
  [[-10, 36], [-9, 43], [-1, 46], [-4, 48], [2, 51], [8, 54], [8, 57], [5, 61], [12, 66], [20, 70], [30, 71], [45, 68], [60, 69], [70, 73], [80, 73], [100, 77], [115, 74], [130, 72], [140, 72], [160, 70], [170, 69], [180, 66], [178, 62], [163, 60], [158, 52], [143, 59], [137, 54], [140, 48], [132, 43], [128, 38], [126, 35], [122, 40], [118, 38], [121, 31], [119, 25], [110, 21], [108, 16], [109, 11], [105, 9], [103, 1], [101, 3], [98, 8], [98, 15], [94, 17], [92, 22], [87, 22], [80, 15], [77, 8], [73, 16], [72, 21], [67, 24], [62, 25], [57, 26], [52, 28], [48, 30], [50, 26], [56, 24], [59, 22], [55, 17], [44, 12], [43, 16], [39, 22], [34, 28], [32, 31], [35, 36], [28, 37], [26, 40], [23, 36], [20, 40], [16, 38], [12, 44], [8, 44], [3, 43], [-1, 37], [-6, 36]],
  // Great Britain, Iceland, Japan
  [[-5, 50], [1, 51], [2, 53], [-1, 55], [-2, 58], [-5, 58], [-6, 55], [-3, 54], [-5, 52]],
  [[-24, 64], [-14, 64], [-15, 66], [-22, 66]],
  [[130, 31], [135, 34], [141, 36], [142, 40], [141, 45], [140, 42], [136, 36], [131, 34]],
  // Africa, Madagascar
  [[-17, 15], [-17, 21], [-13, 28], [-9, 32], [-6, 36], [10, 37], [11, 33], [20, 31], [25, 32], [32, 31], [35, 28], [39, 20], [43, 12], [51, 12], [48, 5], [40, -3], [40, -11], [35, -20], [32, -28], [27, -34], [19, -35], [17, -29], [12, -17], [13, -6], [9, -1], [9, 4], [4, 6], [-4, 5], [-8, 4], [-13, 8], [-17, 13]],
  [[44, -17], [49, -13], [50, -16], [47, -25], [44, -23]],
  // Australia, New Zealand, Borneo, Sumatra, New Guinea
  [[114, -22], [122, -18], [129, -15], [136, -12], [142, -11], [145, -15], [153, -25], [151, -34], [146, -39], [140, -38], [135, -35], [131, -31], [124, -34], [115, -34], [113, -26]],
  [[172, -34], [178, -38], [174, -42], [167, -46], [172, -41]],
  [[109, 2], [117, 7], [119, 1], [116, -4], [110, -3]],
  [[95, 5], [106, -6], [103, -5], [98, 0]],
  [[131, -1], [141, -3], [150, -10], [141, -9], [133, -4]],
];

const HOME: LonLat = [74.3, 31.5];
const POINTS: LonLat[] = [
  [55.3, 25.2],
  [46.7, 24.7],
  [29, 41],
  [-0.1, 51.5],
  [13.4, 52.5],
  [103.8, 1.3],
  [151.2, -33.9],
  [-79.4, 43.7],
  [-74, 40.7],
  [36.8, -1.3],
];

type Vec = [number, number, number];

/** Rough centres for common time zones, the fallback when no edge location is available. */
const TZ: Record<string, LonLat> = {
  'Asia/Karachi': [67, 24.9],
  'Asia/Dubai': [55.3, 25.2],
  'Asia/Riyadh': [46.7, 24.7],
  'Asia/Qatar': [51.5, 25.3],
  'Asia/Kuwait': [48, 29.4],
  'Asia/Bahrain': [50.6, 26.2],
  'Asia/Muscat': [58.4, 23.6],
  'Asia/Kolkata': [77.2, 28.6],
  'Asia/Calcutta': [77.2, 28.6],
  'Asia/Dhaka': [90.4, 23.8],
  'Asia/Kabul': [69.2, 34.5],
  'Asia/Tehran': [51.4, 35.7],
  'Asia/Singapore': [103.8, 1.3],
  'Asia/Kuala_Lumpur': [101.7, 3.1],
  'Asia/Shanghai': [121.5, 31.2],
  'Asia/Hong_Kong': [114.2, 22.3],
  'Asia/Tokyo': [139.7, 35.7],
  'Asia/Istanbul': [29, 41],
  'Europe/Istanbul': [29, 41],
  'Europe/London': [-0.1, 51.5],
  'Europe/Dublin': [-6.3, 53.3],
  'Europe/Paris': [2.35, 48.86],
  'Europe/Berlin': [13.4, 52.5],
  'Europe/Amsterdam': [4.9, 52.4],
  'Europe/Madrid': [-3.7, 40.4],
  'Europe/Rome': [12.5, 41.9],
  'Europe/Stockholm': [18.1, 59.3],
  'Europe/Oslo': [10.7, 59.9],
  'Europe/Moscow': [37.6, 55.8],
  'America/New_York': [-74, 40.7],
  'America/Toronto': [-79.4, 43.7],
  'America/Chicago': [-87.6, 41.9],
  'America/Denver': [-105, 39.7],
  'America/Los_Angeles': [-118.2, 34],
  'America/Vancouver': [-123.1, 49.3],
  'America/Sao_Paulo': [-46.6, -23.5],
  'America/Mexico_City': [-99.1, 19.4],
  'Africa/Cairo': [31.2, 30],
  'Africa/Nairobi': [36.8, -1.3],
  'Africa/Lagos': [3.4, 6.5],
  'Africa/Johannesburg': [28, -26.2],
  'Australia/Sydney': [151.2, -33.9],
  'Australia/Melbourne': [145, -37.8],
  'Pacific/Auckland': [174.8, -36.8],
};

/** Continent centres when the exact zone is not in the table. */
const REGION: Record<string, LonLat> = {
  Europe: [10, 50],
  America: [-90, 38],
  Asia: [90, 30],
  Africa: [20, 5],
  Australia: [135, -27],
  Pacific: [170, -20],
  Atlantic: [-25, 35],
  Indian: [75, -10],
};

/** The visitor's rough location from the time zone name, or null. */
function fromTimeZone(): LonLat | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    return TZ[zone] ?? REGION[zone.split('/')[0] ?? ''] ?? null;
  } catch {
    return null;
  }
}
const RAD = Math.PI / 180;

function toVec([lon, lat]: LonLat): Vec {
  const l = lon * RAD;
  const p = lat * RAD;
  return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
}

function inside([x, y]: LonLat, poly: LonLat[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i] as LonLat;
    const [xj, yj] = poly[j] as LonLat;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Land dots on an even grid (longitude step widens towards the poles). */
function landDots(): Vec[] {
  const out: Vec[] = [];
  const step = 1.75;
  for (let lat = -58; lat <= 82; lat += step) {
    const lonStep = step / Math.max(0.2, Math.cos(lat * RAD));
    for (let lon = -180; lon < 180; lon += lonStep) {
      if (LAND.some((poly) => inside([lon, lat], poly))) out.push(toVec([lon, lat]));
    }
  }
  return out;
}

/** Great-circle arc from a to b, lifted off the surface in the middle. */
function arc(a: Vec, b: Vec, n = 48): Vec[] {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const w = Math.acos(dot);
  const s = Math.sin(w) || 1;
  const lift = 0.04 + w * 0.075;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const k1 = Math.sin((1 - t) * w) / s;
    const k2 = Math.sin(t * w) / s;
    const r = 1 + Math.sin(Math.PI * t) * lift;
    return [(a[0] * k1 + b[0] * k2) * r, (a[1] * k1 + b[1] * k2) * r, (a[2] * k1 + b[2] * k2) * r];
  });
}

interface Palette {
  ink: boolean;
}

export function Globe() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = wrap.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !box || !ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dots = landDots();
    const home = toVec(HOME);
    const points = POINTS.map(toVec);
    const arcs = points.map((p) => arc(home, p));
    const graticule: Vec[][] = [];
    for (let lon = -180; lon < 180; lon += 30) graticule.push(Array.from({ length: 61 }, (_, i) => toVec([lon, -90 + i * 3])));
    for (let lat = -60; lat <= 60; lat += 30) graticule.push(Array.from({ length: 121 }, (_, i) => toVec([-180 + i * 3, lat])));

    let size = 0;
    let dpr = 1;
    let rot = -50 * RAD; // start between Europe and Pakistan, so most arcs face the viewer
    let tilt = 0.32;
    let vel = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastMove = 0;
    let idleSince = performance.now();
    let visible = false;
    let raf = 0;
    let prev = performance.now();
    let touched = false;
    let visitor: { v: Vec; lonlat: LonLat; label: string; arc: Vec[] | null } | null = null;
    let target: number | null = null;
    let asked = false;

    const placeVisitor = (lonlat: LonLat, city?: string) => {
      const v = toVec(lonlat);
      const far = Math.hypot(lonlat[0] - HOME[0], lonlat[1] - HOME[1]) > 2.5;
      visitor = { v, lonlat, label: city ? `You are here · ${city}` : 'You are here', arc: far ? arc(v, home, 56) : null };
      // Turn so the visitor and Pakistan both face the viewer (unless the visitor already turned it).
      if (!touched) {
        let mid = (lonlat[0] + HOME[0]) / 2;
        if (Math.abs(lonlat[0] - HOME[0]) > 180) mid += 180;
        target = -mid * RAD;
        if (reduce) {
          rot = target;
          target = null;
        }
      }
      draw(performance.now());
      start();
    };

    const locate = () => {
      if (asked) return;
      asked = true;
      fetch('/api/geo', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : {}))
        .then((g: { lat?: number; lon?: number; city?: string }) => {
          if (typeof g.lat === 'number' && typeof g.lon === 'number') placeVisitor([g.lon, g.lat], g.city);
          else {
            const tz = fromTimeZone();
            if (tz) placeVisitor(tz);
          }
        })
        .catch(() => {
          const tz = fromTimeZone();
          if (tz) placeVisitor(tz);
        });
    };
    const palette: Palette = { ink: document.documentElement.classList.contains('theme-ink') };

    const resize = () => {
      const w = box.clientWidth;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      size = w;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(w * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${w}px`;
      draw(performance.now());
    };

    const project = (v: Vec): [number, number, number] => {
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      const x1 = v[0] * cr + v[2] * sr;
      const z1 = -v[0] * sr + v[2] * cr;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const y2 = v[1] * ct - z1 * st;
      const z2 = v[1] * st + z1 * ct;
      return [x1, y2, z2];
    };

    /** Screen rectangles already used by markers and labels this frame. */
    type Rect = { x: number; y: number; w: number; h: number };
    const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

    function drawLabel(text: string, px: number, py: number, taken: Rect[], tone: 'brand' | 'sky', alpha: number): void {
      if (!ctx) return;
      const ink = palette.ink;
      const fs = Math.max(11, Math.round(size / 44));
      ctx.font = `600 ${fs}px Inter, ui-sans-serif, system-ui, sans-serif`;
      const w = ctx.measureText(text).width + fs * 1.7;
      const h = fs * 2.05;
      const gap = 14;
      const spots: [number, number][] = [
        [px - w / 2, py - h - gap],
        [px - w / 2, py + gap],
        [px + gap, py - h / 2],
        [px - w - gap, py - h / 2],
        [px + gap, py - h - gap / 2],
        [px - w - gap, py + gap / 2],
      ];
      let pick: Rect | null = null;
      for (const [x, y] of spots) {
        const r = { x: Math.min(size - w - 4, Math.max(4, x)), y: Math.min(size - h - 4, Math.max(4, y)), w, h };
        if (!taken.some((t) => hit(t, r))) {
          pick = r;
          break;
        }
      }
      if (!pick) return;
      taken.push(pick);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ink ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.97)';
      ctx.strokeStyle = tone === 'sky' ? (ink ? 'rgba(125,211,252,0.4)' : 'rgba(2,132,199,0.32)') : ink ? 'rgba(110,231,183,0.4)' : 'rgba(5,150,105,0.32)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(15,23,42,0.18)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(pick.x, pick.y, pick.w, pick.h, pick.h / 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      // Small dot at the start of the pill in the marker colour.
      ctx.fillStyle = tone === 'sky' ? '#0ea5e9' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(pick.x + fs * 0.75, pick.y + h / 2, fs * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink ? '#f1f5f9' : '#0f172a';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, pick.x + fs * 1.2, pick.y + h / 2 + 0.5);
      ctx.globalAlpha = 1;
    }

    function draw(now: number) {
      if (!ctx || !size) return;
      const ink = palette.ink;
      const R = size * 0.4;
      const c = size / 2;
      const t = reduce ? 0.62 : now / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // Atmosphere: a soft green halo just outside the rim.
      const atm = ctx.createRadialGradient(c, c, R * 0.96, c, c, R * 1.24);
      atm.addColorStop(0, ink ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.16)');
      atm.addColorStop(1, 'rgba(16,185,129,0)');
      ctx.fillStyle = atm;
      ctx.beginPath();
      ctx.arc(c, c, R * 1.24, 0, Math.PI * 2);
      ctx.fill();

      // Sphere: clean white (or deep slate), lit from the top left.
      const sphere = ctx.createRadialGradient(c - R * 0.4, c - R * 0.45, R * 0.05, c, c, R);
      if (ink) {
        sphere.addColorStop(0, '#16263a');
        sphere.addColorStop(0.65, '#0c1626');
        sphere.addColorStop(1, '#070d18');
      } else {
        sphere.addColorStop(0, '#ffffff');
        sphere.addColorStop(0.7, '#f7faf9');
        sphere.addColorStop(1, '#e6efec');
      }
      ctx.fillStyle = sphere;
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = ink ? 'rgba(52,211,153,0.28)' : 'rgba(5,150,105,0.18)';
      ctx.stroke();

      // Graticule, very faint, near side only.
      ctx.strokeStyle = ink ? 'rgba(148,163,184,0.1)' : 'rgba(15,23,42,0.05)';
      ctx.beginPath();
      for (const line of graticule) {
        let pen = false;
        for (const v of line) {
          const [x, y, z] = project(v);
          if (z < 0) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(c + x * R, c - y * R);
          else ctx.moveTo(c + x * R, c - y * R);
          pen = true;
        }
      }
      ctx.stroke();

      // Land: round brand dots in four depth bands (one fill per band).
      const r0 = Math.max(0.9, size / 520);
      const bands: Path2D[] = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      for (const v of dots) {
        const [x, y, z] = project(v);
        if (z <= 0.04) continue;
        const b = z > 0.75 ? 3 : z > 0.5 ? 2 : z > 0.25 ? 1 : 0;
        const px = c + x * R;
        const py = c - y * R;
        const rr = r0 * (0.75 + z * 0.4);
        bands[b]!.moveTo(px + rr, py);
        bands[b]!.arc(px, py, rr, 0, Math.PI * 2);
      }
      const alphas = ink ? [0.28, 0.5, 0.72, 0.95] : [0.22, 0.42, 0.62, 0.85];
      ctx.fillStyle = ink ? '#34d399' : '#059669';
      bands.forEach((path, i) => {
        ctx.globalAlpha = alphas[i]!;
        ctx.fill(path);
      });
      ctx.globalAlpha = 1;

      // One arc: each short segment fades with depth, so arcs melt into the limb instead of flying off it.
      function strokeArc(pts: Vec[], from: number, to: number, color: string, width: number, glow = false) {
        if (!ctx) return;
        const n = pts.length - 1;
        const a = Math.max(0, Math.floor(from * n));
        const b = Math.min(n, Math.ceil(to * n));
        ctx.lineCap = 'round';
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        if (glow) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
        }
        let prevPt: [number, number, number] | null = null;
        for (let k = a; k <= b; k++) {
          const cur = project(pts[k] as Vec);
          if (prevPt) {
            const z = Math.min(prevPt[2], cur[2]);
            // Fade near the rim as well, so a lifted arc never leaves the disc.
            const r = Math.max(Math.hypot(prevPt[0], prevPt[1]), Math.hypot(cur[0], cur[1]));
            const rim = Math.max(0, Math.min(1, (1 - r) / 0.12));
            if (z > 0 && rim > 0) {
              ctx.globalAlpha = Math.min(1, z * 4) * rim;
              ctx.beginPath();
              ctx.moveTo(c + prevPt[0] * R, c - prevPt[1] * R);
              ctx.lineTo(c + cur[0] * R, c - cur[1] * R);
              ctx.stroke();
            }
          }
          prevPt = cur;
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      const base = ink ? 'rgba(52,211,153,0.35)' : 'rgba(5,150,105,0.3)';
      const pulse = ink ? 'rgba(167,243,208,1)' : 'rgba(16,185,129,1)';
      arcs.forEach((pts, i) => {
        strokeArc(pts, 0, 1, base, 1.2);
        if (reduce) return;
        for (const offset of [0, 0.5]) {
          const head = (((t / 3.6 + i * 0.137 + offset) % 1) + 1) % 1;
          strokeArc(pts, Math.max(0, head - 0.16), head, pulse, 2.2, true);
        }
      });

      // Visitor arc to Nafaa (sky blue, dashed under a travelling pulse).
      if (visitor?.arc) {
        ctx.setLineDash([3, 5]);
        strokeArc(visitor.arc, 0, 1, ink ? 'rgba(125,211,252,0.5)' : 'rgba(2,132,199,0.45)', 1.6);
        ctx.setLineDash([]);
        if (!reduce) {
          const p = (t % 2.8) / 2.8;
          strokeArc(visitor.arc, Math.max(0, p - 0.2), p, ink ? 'rgba(186,230,253,1)' : 'rgba(14,165,233,1)', 2.6, true);
        }
      }

      const taken: Rect[] = [];

      // Client points: glow, pulse ring and a bright core.
      points.forEach((pt, i) => {
        const [x, y, z] = project(pt);
        if (z < 0.08) return;
        const px = c + x * R;
        const py = c - y * R;
        const ring = reduce ? 0.5 : (t * 0.55 + i * 0.37) % 1;
        ctx.globalAlpha = Math.min(1, z * 2.2);
        const g = ctx.createRadialGradient(px, py, 0, px, py, 11);
        g.addColorStop(0, 'rgba(16,185,129,0.45)');
        g.addColorStop(1, 'rgba(16,185,129,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(16,185,129,${0.55 * (1 - ring)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(px, py, 3 + ring * 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Nafaa in Lahore: the amber Noon diamond.
      const [hx, hy, hz] = project(home);
      const homeAt = hz > 0 ? ([c + hx * R, c - hy * R] as const) : null;
      if (homeAt) {
        const [px, py] = homeAt;
        const ring = reduce ? 0.4 : (t * 0.5) % 1;
        ctx.strokeStyle = `rgba(245,158,11,${0.7 * (1 - ring)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 6 + ring * 15, 0, Math.PI * 2);
        ctx.stroke();
        const sd = 7;
        ctx.shadowColor = 'rgba(245,158,11,0.8)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(px, py - sd);
        ctx.lineTo(px + sd, py);
        ctx.lineTo(px, py + sd);
        ctx.lineTo(px - sd, py);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = ink ? '#0c1626' : '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        taken.push({ x: px - 10, y: py - 10, w: 20, h: 20 });
      }

      // The visitor: a sky-blue point.
      let visitorAt: readonly [number, number, number] | null = null;
      if (visitor) {
        const [vx, vy, vz] = project(visitor.v);
        if (vz > 0.03) {
          const px = c + vx * R;
          const py = c - vy * R;
          visitorAt = [px, py, vz];
          const ring = reduce ? 0.5 : (t * 0.7) % 1;
          ctx.strokeStyle = `rgba(14,165,233,${0.7 * (1 - ring)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, 5 + ring * 13, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py, 5.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0ea5e9';
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fill();
          taken.push({ x: px - 8, y: py - 8, w: 16, h: 16 });
        }
      }

      // Labels last, placed so they never cover a marker or each other.
      if (homeAt) drawLabel('Nafaa · Pakistan', homeAt[0], homeAt[1], taken, 'brand', Math.min(1, hz * 3));
      if (visitorAt && visitor) drawLabel(visitor.label, visitorAt[0], visitorAt[1], taken, 'sky', Math.min(1, visitorAt[2] * 3));
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      if (!dragging && target !== null) {
        const d = target - rot;
        rot += d * Math.min(1, dt * 2.5);
        if (Math.abs(d) < 0.002) target = null;
        idleSince = now;
      } else if (!dragging) {
        if (Math.abs(vel) > 0.0005) {
          rot += vel;
          vel *= 0.94;
          idleSince = now;
        } else if (!reduce && now - idleSince > 1200) {
          rot += dt * 0.12;
        }
      }
      draw(now);
      raf = visible && !document.hidden && (!reduce || dragging || target !== null || Math.abs(vel) > 0.0005) ? requestAnimationFrame(tick) : 0;
    };

    const start = () => {
      if (!raf && visible && !document.hidden) {
        prev = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      touched = true;
      target = null;
      vel = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      lastMove = performance.now();
      canvas.setPointerCapture(e.pointerId);
      canvas.dataset.dragging = '';
      start();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const k = Math.PI / Math.max(200, size);
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      rot += dx * k;
      if (e.pointerType === 'mouse') tilt = Math.max(-0.1, Math.min(0.75, tilt + dy * k));
      const now = performance.now();
      vel = (dx * k) / Math.max(1, (now - lastMove) / 16);
      lastMove = now;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      idleSince = performance.now();
      if (performance.now() - lastMove > 80) vel = 0;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      delete canvas.dataset.dragging;
      start();
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const ro = new ResizeObserver(resize);
    ro.observe(box);
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible) {
        locate();
        start();
      }
    });
    io.observe(box);
    const onVisibility = () => start();
    document.addEventListener('visibilitychange', onVisibility);
    const mo = new MutationObserver(() => {
      palette.ink = document.documentElement.classList.contains('theme-ink');
      draw(performance.now());
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    resize();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return (
    <div ref={wrap} className={fx.globeWrap} aria-hidden>
      <canvas ref={canvasRef} className={fx.globeCanvas} />
      <span className={fx.globeHint}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
        Drag to turn
      </span>
    </div>
  );
}

/**
 * Picks a brand colour from the shop's logo for the setup wizard: the most
 * common strong colour, ignoring white, black and greys. Returns null when
 * the image cannot be read (for example a server without cross-origin
 * headers); the theme's own colours are kept then.
 */

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;

export function logoColors(url: string): Promise<{ primary: string; accent: string } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const size = 48;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const g = c.getContext('2d');
        if (!g) { resolve(null); return; }
        g.drawImage(img, 0, 0, size, size);
        const data = g.getImageData(0, 0, size, size).data;
        const buckets = new Map<string, { n: number; r: number; g: number; b: number; sat: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const [r, gg, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (a < 128) continue;
          const max = Math.max(r, gg, b), min = Math.min(r, gg, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          if (sat < 0.25 || max < 40 || min > 225) continue;
          const key = `${r >> 4}-${gg >> 4}-${b >> 4}`;
          const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, sat };
          e.n += 1; e.r += r; e.g += gg; e.b += b;
          buckets.set(key, e);
        }
        const top = [...buckets.values()].sort((a, b) => b.n * (0.5 + b.sat) - a.n * (0.5 + a.sat));
        if (!top.length) { resolve(null); return; }
        const avg = (e: typeof top[number]) => hex(Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n));
        resolve({ primary: avg(top[0]), accent: avg(top[1] ?? top[0]) });
      } catch {
        resolve(null);
      }
    };
    img.src = url;
  });
}

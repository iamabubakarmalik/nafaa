/**
 * Creative maker: branded post images drawn in the browser on a canvas.
 * Sizes 1:1 (feed), 4:5 (portrait feed) and 9:16 (story, reel, status).
 * Templates: price tag, sale %, new arrival, COD available, delivery all
 * Pakistan. Uses the product photo (or an uploaded one), the shop logo and
 * the brand colours. Export downloads a PNG; "Post me lagayein" uploads it
 * and hands the URL back so it becomes a post's media.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, ImagePlus, Palette, Save, Upload } from 'lucide-react';
import { Button, Input, Segmented, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { socialApi, type Brand, type SocialProduct } from './social.api';
import { ProductPicker, rs } from './ProductPicker';

type SizeKey = '1:1' | '4:5' | '9:16';
type Template = 'price' | 'sale' | 'new' | 'cod' | 'delivery';

const SIZES: Record<SizeKey, { w: number; h: number; label: string }> = {
  '1:1': { w: 1080, h: 1080, label: t('1:1 Feed') },
  '4:5': { w: 1080, h: 1350, label: t('4:5 Portrait') },
  '9:16': { w: 1080, h: 1920, label: t('9:16 Story / Reel') },
};

const TEMPLATES: Array<{ key: Template; label: string; badge: string }> = [
  { key: 'price', label: t('Price tag'), badge: '' },
  { key: 'sale', label: t('Sale %'), badge: 'SALE' },
  { key: 'new', label: t('New arrival'), badge: 'NEW ARRIVAL' },
  { key: 'cod', label: t('COD available'), badge: 'Cash on Delivery' },
  { key: 'delivery', label: t('Delivery all Pakistan'), badge: 'Delivery all over Pakistan' },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('blob:') && !src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Wraps text into at most `maxLines` lines that fit `width`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > width && line) { lines.push(line); line = w; } else line = next;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

interface Design {
  size: SizeKey;
  template: Template;
  photo: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  headline: string;
  sub: string;
  price: number | null;
  oldPrice: number | null;
  badge: string;
  showLogo: boolean;
  footer: string;
  colors: Brand['colors'];
}

function draw(canvas: HTMLCanvasElement, d: Design) {
  const { w, h } = SIZES[d.size];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const font = (px: number, weight = 800) => `${weight} ${px}px Inter, "Segoe UI", Arial, sans-serif`;

  ctx.fillStyle = d.colors.primary;
  ctx.fillRect(0, 0, w, h);

  // Photo: cover the canvas above the footer band.
  const band = Math.round(h * 0.2);
  if (d.photo) {
    const ah = h - band;
    const s = Math.max(w / d.photo.width, ah / d.photo.height);
    const pw = d.photo.width * s, ph = d.photo.height * s;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w, ah); ctx.clip();
    ctx.drawImage(d.photo, (w - pw) / 2, (ah - ph) / 2, pw, ph);
    const g = ctx.createLinearGradient(0, ah * 0.55, 0, ah);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, ah);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = font(48, 600);
    ctx.textAlign = 'center';
    ctx.fillText('Product photo', w / 2, (h - band) / 2);
  }

  const pad = 64;
  // Headline over the bottom of the photo.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = font(d.size === '9:16' ? 84 : 72);
  const lines = wrap(ctx, d.headline || ' ', w - pad * 2, 2);
  let y = h - band - pad - (d.sub ? 56 : 0) - (lines.length - 1) * 84;
  for (const l of lines) { ctx.fillText(l, pad, y); y += 84; }
  if (d.sub) { ctx.font = font(44, 600); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(d.sub, pad, y - 20); }

  // Footer band: price on the left, shop on the right.
  ctx.fillStyle = d.colors.primary;
  ctx.fillRect(0, h - band, w, band);
  const mid = h - band / 2;
  ctx.fillStyle = d.colors.text;
  ctx.textBaseline = 'middle';
  if (d.price) {
    ctx.font = font(band > 300 ? 120 : 92, 900);
    ctx.fillText(rs(d.price), pad, mid - (d.oldPrice ? 30 : 12));
    if (d.oldPrice && d.oldPrice > d.price) {
      ctx.font = font(44, 600);
      ctx.globalAlpha = 0.8;
      const old = rs(d.oldPrice);
      const ow = ctx.measureText(old).width;
      ctx.fillText(old, pad, mid + 48);
      ctx.fillRect(pad, mid + 48, ow, 4);
      ctx.globalAlpha = 1;
    }
  }
  // Shop name and phone along the bottom edge, clear of the price.
  ctx.textAlign = 'right';
  ctx.font = font(34, 700);
  ctx.globalAlpha = 0.9;
  ctx.fillText(d.footer, w - pad, h - Math.min(44, band * 0.2));
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Template badge.
  const accent = d.colors.accent;
  if (d.template === 'price' && d.price) {
    const r = 150;
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(w - pad - r, pad + r, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.font = font(40, 700);
    ctx.fillText(d.badge || 'ONLY', w - pad - r, pad + r - 30);
    ctx.font = font(64, 900);
    ctx.fillText(rs(d.price).replace(/^Rs\.?\s*/, 'Rs '), w - pad - r, pad + r + 44);
    ctx.textAlign = 'left';
  } else if (d.template === 'sale') {
    const pct = d.price && d.oldPrice && d.oldPrice > d.price ? Math.round((1 - d.price / d.oldPrice) * 100) : null;
    const text = pct ? `${pct}% OFF` : (d.badge || 'SALE');
    ctx.font = font(110, 900);
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = accent;
    roundRect(ctx, pad, pad, tw + 80, 170, 28); ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.fillText(text, pad + 40, pad + 128);
  } else if (d.badge) {
    ctx.font = font(52, 800);
    const tw = ctx.measureText(d.badge).width;
    const bw = tw + 72, bh = 104;
    const x = d.template === 'new' ? pad : (w - bw) / 2;
    const by = d.template === 'new' ? pad : h - band - bh - 24 - (lines.length * 84 + (d.sub ? 56 : 0)) - pad;
    ctx.fillStyle = accent;
    roundRect(ctx, x, Math.max(pad, by), bw, bh, bh / 2); ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.fillText(d.badge, x + 36, Math.max(pad, by) + 70);
  }

  // Logo in a white circle.
  if (d.showLogo && d.logo) {
    const r = 70;
    const cx = d.template === 'new' || d.template === 'sale' ? w - pad - r : pad + r;
    const cy = pad + r;
    if (!(d.template === 'price' && cx > w / 2)) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, r - 8, 0, Math.PI * 2); ctx.clip();
      const s = Math.min(((r - 8) * 2) / d.logo.width, ((r - 8) * 2) / d.logo.height);
      ctx.drawImage(d.logo, cx - (d.logo.width * s) / 2, cy - (d.logo.height * s) / 2, d.logo.width * s, d.logo.height * s);
      ctx.restore();
    }
  }
}

export function CreativeMaker({ initialProduct, onUse, useLabel }: {
  initialProduct?: SocialProduct | null;
  /** Called with the uploaded image URL (and the product it shows). */
  onUse?: (url: string, product: SocialProduct | null) => void;
  useLabel?: string;
}) {
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brandQ = useQuery({ queryKey: ['social', 'brand'], queryFn: socialApi.brand, staleTime: 10 * 60_000 });
  const brand = brandQ.data;

  const [products, setProducts] = useState<SocialProduct[]>(initialProduct ? [initialProduct] : []);
  const product = products[0] ?? null;
  const [photoSrc, setPhotoSrc] = useState<string | null>(initialProduct?.images[0] ?? null);
  const [size, setSize] = useState<SizeKey>('1:1');
  const [template, setTemplate] = useState<Template>('price');
  const [headline, setHeadline] = useState(initialProduct?.name ?? '');
  const [sub, setSub] = useState('');
  const [price, setPrice] = useState(initialProduct?.price ? String(initialProduct.price) : '');
  const [oldPrice, setOldPrice] = useState(initialProduct?.comparePrice ? String(initialProduct.comparePrice) : '');
  const [badge, setBadge] = useState('');
  const [showLogo, setShowLogo] = useState(true);
  const [colors, setColors] = useState<Brand['colors'] | null>(null);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [tainted, setTainted] = useState(false);

  useEffect(() => { if (brand && !colors) setColors(brand.colors); }, [brand, colors]);
  useEffect(() => {
    if (!product) return;
    setPhotoSrc(product.images[0] ?? null);
    setHeadline(product.name);
    setPrice(product.price ? String(product.price) : '');
    setOldPrice(product.comparePrice ? String(product.comparePrice) : '');
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setBadge(TEMPLATES.find((x) => x.key === template)?.badge ?? ''); }, [template]);

  useEffect(() => {
    let alive = true;
    setTainted(false);
    if (!photoSrc) { setPhoto(null); return; }
    loadImage(photoSrc).then((img) => alive && setPhoto(img)).catch(() => {
      // The photo's server does not allow drawing it: show it but exporting needs an uploaded photo.
      if (alive) { setPhoto(null); setTainted(true); }
    });
    return () => { alive = false; };
  }, [photoSrc]);
  useEffect(() => {
    let alive = true;
    if (brand?.logoUrl) loadImage(brand.logoUrl).then((img) => alive && setLogo(img)).catch(() => alive && setLogo(null));
    return () => { alive = false; };
  }, [brand?.logoUrl]);

  const footer = useMemo(() => [brand?.handle ? `@${brand.handle.replace(/^@/, '')}` : brand?.name, brand?.phone].filter(Boolean).join('  ·  '), [brand]);

  useEffect(() => {
    if (!canvasRef.current || !colors) return;
    draw(canvasRef.current, {
      size, template, photo, logo, headline, sub, badge, showLogo, footer, colors,
      price: Number(price) > 0 ? Number(price) : null, oldPrice: Number(oldPrice) > 0 ? Number(oldPrice) : null,
    });
  }, [size, template, photo, logo, headline, sub, price, oldPrice, badge, showLogo, footer, colors]);

  const toBlob = () => new Promise<Blob>((resolve, reject) => {
    try { canvasRef.current!.toBlob((b) => (b ? resolve(b) : reject(new Error('empty'))), 'image/png'); } catch (e) { reject(e); }
  });
  const fileName = () => `${(headline || 'post').replace(/[^\w-]+/g, '-').slice(0, 40)}-${size.replace(':', 'x')}.png`;

  const exportPng = async () => {
    try {
      const blob = await toBlob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch {
      toast.error(t('Image save nahi hui — product ki photo yahan upload kar ke dobara koshish karein'));
    }
  };
  const use = useMutation({
    mutationFn: async () => socialApi.uploadImage(await toBlob(), fileName()),
    onSuccess: (url) => { toast.success(t('Image tayyar')); onUse?.(url, product); },
    onError: () => toast.error(t('Image save nahi hui — product ki photo yahan upload kar ke dobara koshish karein')),
  });
  const saveBrand = useMutation({
    mutationFn: () => socialApi.saveBrand({ colors: colors ?? undefined }),
    onSuccess: (b) => { qc.setQueryData(['social', 'brand'], b); toast.success(t('Brand ke rang save ho gaye')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const onFile = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error(t('Sirf photo chunein')); return; }
    setPhotoSrc(URL.createObjectURL(f));
  };

  const { w, h } = SIZES[size];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-slate-100 p-4 ring-1 ring-slate-200/80">
        <canvas ref={canvasRef} className="h-auto max-h-[70vh] w-auto max-w-full rounded-xl shadow-md" style={{ aspectRatio: `${w} / ${h}` }} aria-label={t('Post image preview')} />
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={exportPng} leftIcon={<Download className="h-4 w-4" />}>{t('PNG download')}</Button>
          {onUse && <Button onClick={() => use.mutate()} loading={use.isPending} leftIcon={<ImagePlus className="h-4 w-4" />}>{useLabel ?? t('Post me lagayein')}</Button>}
        </div>
        {tainted && <p className="max-w-md text-center text-[0.75rem] text-amber-800">{t('Is product ki photo yahan nahi khulti. Photo apne computer se upload karein.')}</p>}
      </div>

      <div className="space-y-4">
        <section className="space-y-2">
          <p className="text-[0.8125rem] font-semibold text-slate-900">{t('Product')}</p>
          <ProductPicker value={products} onChange={setProducts} max={1} />
          {product && product.images.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {product.images.map((src) => (
                <button key={src} type="button" onClick={() => setPhotoSrc(src)} className={cn('h-12 w-12 overflow-hidden rounded-lg ring-2', photoSrc === src ? 'ring-sky-500' : 'ring-transparent')}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-[0.8125rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            <Upload className="h-4 w-4" /> {t('Apni photo upload karein')}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </section>

        <section className="space-y-2">
          <p className="text-[0.8125rem] font-semibold text-slate-900">{t('Size')}</p>
          <Segmented value={size} onChange={setSize} items={(Object.keys(SIZES) as SizeKey[]).map((k) => ({ value: k, label: SIZES[k].label }))} label={t('Size')} />
        </section>

        <section className="space-y-2">
          <p className="text-[0.8125rem] font-semibold text-slate-900">{t('Template')}</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((x) => (
              <button key={x.key} type="button" onClick={() => setTemplate(x.key)}
                className={cn('rounded-full px-3 py-1.5 text-[0.75rem] font-semibold ring-1', template === x.key ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                {x.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <Input wrapperClassName="col-span-2" label={t('Bara text')} value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={60} />
          <Input wrapperClassName="col-span-2" label={t('Chhota text')} value={sub} onChange={(e) => setSub(e.target.value)} maxLength={60} placeholder={t('Misaal: Sirf 3 din')} />
          <Input label={t('Price')} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} />
          <Input label={t('Pehle ki price')} inputMode="numeric" value={oldPrice} onChange={(e) => setOldPrice(e.target.value.replace(/[^\d.]/g, ''))} />
          {template !== 'sale' && <Input wrapperClassName="col-span-2" label={t('Badge ka text')} value={badge} onChange={(e) => setBadge(e.target.value)} maxLength={32} />}
        </section>

        <section className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-slate-900"><Palette className="h-4 w-4" />{t('Brand')}</p>
          <Switch checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} label={brand?.logoUrl ? t('Logo lagayein') : t('Logo nahi — Settings me lagayein')} disabled={!brand?.logoUrl} size="sm" />
          {colors && (
            <div className="flex flex-wrap items-center gap-3">
              {(['primary', 'accent', 'text'] as const).map((k) => (
                <label key={k} className="flex items-center gap-1.5 text-[0.75rem] text-slate-600">
                  <input type="color" value={colors[k]} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-slate-200" />
                  {k === 'primary' ? t('Rang') : k === 'accent' ? t('Badge') : t('Text')}
                </label>
              ))}
              <Button size="xs" variant="ghost" loading={saveBrand.isPending} onClick={() => saveBrand.mutate()} leftIcon={<Save className="h-3.5 w-3.5" />}>{t('Save')}</Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

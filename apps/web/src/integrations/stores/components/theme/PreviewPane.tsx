/**
 * Live preview of the storefront inside the theme editor. Loads the store
 * with a preview token (draft theme), switches between computer and phone
 * width, and talks to the storefront's PreviewBridge
 * (apps/storefront/src/components/layout/PreviewBridge.tsx) over postMessage:
 *   editor → storefront  { type: 'nafaa:refresh' }            after each draft save
 *                        { type: 'nafaa:select', sectionId }  outline the open section
 *   storefront → editor  { type: 'nafaa:ready', path }        page loaded or navigated
 *                        { type: 'nafaa:clicked', sectionId } a section was clicked
 * Until the storefront has said "ready", a save reloads the frame instead.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ExternalLink, Laptop, Loader2, RefreshCw, Smartphone } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';

export interface PreviewHandle {
  /** Called after the draft is saved on the server. */
  saved: () => void;
  reload: () => void;
}

export const PreviewPane = forwardRef<PreviewHandle, {
  baseUrl: string | null;
  path: string;
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  error?: string | null;
}>(function PreviewPane({ baseUrl, path, selectedSectionId, onSelectSection, error }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [nonce, setNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const live = useRef(false);

  const src = (() => {
    if (!baseUrl) return null;
    try {
      const u = new URL(baseUrl);
      const [p, q] = path.split('?');
      u.pathname = p;
      if (q) new URLSearchParams(q).forEach((v, k) => u.searchParams.set(k, v));
      if (nonce) u.searchParams.set('_r', String(nonce));
      return u.toString();
    } catch { return null; }
  })();
  const origin = (() => { try { return baseUrl ? new URL(baseUrl).origin : '*'; } catch { return '*'; } })();

  useImperativeHandle(ref, () => ({
    saved: () => {
      if (live.current) frame.current?.contentWindow?.postMessage({ type: 'nafaa:refresh' }, origin);
      else setNonce((n) => n + 1);
    },
    reload: () => setNonce((n) => n + 1),
  }), [origin]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data as { type?: string; path?: string; sectionId?: string } | null;
      if (!d || typeof d.type !== 'string') return;
      if (d.type === 'nafaa:ready') { live.current = true; setLoading(false); }
      if (d.type === 'nafaa:clicked' && d.sectionId) onSelectSection(d.sectionId);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onSelectSection]);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'nafaa:select', sectionId: selectedSectionId }, origin);
  }, [selectedSectionId, origin]);

  useEffect(() => { setLoading(true); live.current = false; }, [src]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/80">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <Segmented value={device} onChange={setDevice} label={t('Screen')}
          items={[{ value: 'desktop', label: <span className="inline-flex items-center gap-1.5"><Laptop className="h-4 w-4" />{t('Computer')}</span> },
            { value: 'mobile', label: <span className="inline-flex items-center gap-1.5"><Smartphone className="h-4 w-4" />{t('Mobile')}</span> }]} />
        <code className="hidden min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-2.5 py-1 text-[0.75rem] text-slate-500 md:block dir-ltr">{path}</code>
        <span className="flex-1 md:hidden" />
        {loading && src && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        <button type="button" onClick={() => setNonce((n) => n + 1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title={t('Dobara load karein')} aria-label={t('Dobara load karein')}>
          <RefreshCw className="h-4 w-4" />
        </button>
        {src && (
          <a href={src} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title={t('Naye tab me kholein')} aria-label={t('Naye tab me kholein')}>
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto p-3">
        {error ? (
          <p className="self-center text-center text-[0.875rem] text-slate-500">{error}</p>
        ) : !src ? (
          <Loader2 className="h-6 w-6 self-center animate-spin text-slate-400" />
        ) : (
          <iframe ref={frame} key={src} src={src} title={t('Website ka preview')} onLoad={() => setLoading(false)}
            className={cn('h-full rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-[width]', device === 'mobile' ? 'w-[390px] max-w-full' : 'w-full')} />
        )}
      </div>
    </div>
  );
});

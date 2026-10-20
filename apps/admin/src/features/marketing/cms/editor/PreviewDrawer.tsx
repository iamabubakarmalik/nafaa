/**
 * Preview drawer: the site in draft mode inside an iframe (ARCH 7.6),
 * reloaded after each save, with a desktop/mobile switch and a shareable
 * signed link (valid 7 days by default; no admin login needed).
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, ExternalLink, Monitor, RefreshCw, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { apiErrorMessage, cmsApi } from '@/api/marketing/marketing-cms.api';
import { formatPkt } from './lib';
import { IconBtn } from '../fields/ui';

export function PreviewDrawer({ open, onClose, entryId, version, flush }: { open: boolean; onClose: () => void; entryId: string; version: number; flush: () => Promise<boolean> }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [reload, setReload] = useState(0);
  const link = useQuery({
    queryKey: ['cms', 'preview-link', entryId],
    queryFn: async () => {
      await flush();
      return cmsApi.previewLink(entryId);
    },
    enabled: open,
    staleTime: 6 * 3_600_000,
    retry: false,
  });

  // Reload the frame after every saved version while the drawer is open.
  useEffect(() => {
    if (open) setReload((n) => n + 1);
  }, [version, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const url = link.data?.url;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-900/30 backdrop-blur-[1px]" onMouseDown={onClose}>
      <div className="flex h-full w-full max-w-[min(1200px,92vw)] flex-col bg-neutral-100 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-2.5">
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">Preview · live nahi</span>
          <div className="ml-2 inline-flex rounded-lg bg-neutral-100 p-0.5">
            {(['desktop', 'mobile'] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium', device === d ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500')}>
                {d === 'desktop' ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                {d === 'desktop' ? 'Desktop' : 'Mobile'}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            {link.data && <span className="mr-2 hidden text-[11px] text-neutral-500 md:inline">Link {formatPkt(link.data.expiresAt)} tak chalega</span>}
            <IconBtn label="Dobara load" onClick={() => setReload((n) => n + 1)}>
              <RefreshCw className="h-4 w-4" />
            </IconBtn>
            <IconBtn
              label="Share link copy"
              disabled={!url}
              onClick={() => {
                if (!url) return;
                void navigator.clipboard.writeText(url).then(() => toast.success('Preview link copy ho gaya (bina login ke khulta hai)'));
              }}
            >
              <Copy className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Naye tab me" disabled={!url} onClick={() => url && window.open(url, '_blank', 'noopener')}>
              <ExternalLink className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Band karein" onClick={onClose}>
              <X className="h-4 w-4" />
            </IconBtn>
          </div>
        </div>
        <div className="flex flex-1 items-start justify-center overflow-auto p-4">
          {link.isLoading && <p className="mt-20 text-sm text-neutral-500">Preview link ban raha hai…</p>}
          {link.isError && <p className="mt-20 max-w-md text-center text-sm text-rose-600">{apiErrorMessage(link.error, 'Preview link nahi bana')}</p>}
          {url && (
            <iframe
              key={reload}
              src={url}
              title="Site preview"
              className={cn('h-full rounded-xl border border-neutral-200 bg-white shadow-sm transition-all', device === 'mobile' ? 'w-[390px]' : 'w-full')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Header badge for visits waiting to be sent. Tapping it opens the list,
 * where a refused visit can be sent again or removed.
 */

import { useState } from 'react';
import { AlertTriangle, CloudOff, CloudUpload, ImageOff, RefreshCw, Trash2 } from 'lucide-react';
import { Button, Modal, confirmDialog } from '@/design-system/components';
import { cn } from '@/lib/cn';
import { dayTime } from '@/lib/format';
import { useOutbox } from '@/offline/outbox';

export function SyncBadge() {
  const { items, syncing, online, sync, retry, remove, dropPhoto } = useOutbox();
  const [open, setOpen] = useState(false);
  if (!items.length && online) return null;
  const failed = items.filter((i) => i.error).length;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold ring-1 transition',
          failed ? 'bg-rose-50 text-rose-700 ring-rose-200' : items.length ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-slate-100 text-slate-600 ring-slate-200')}
        aria-label={items.length ? `${items.length} visit bheje nahi gaye` : 'Internet nahi hai'}>
        {!online ? <CloudOff className="h-4 w-4" /> : syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : failed ? <AlertTriangle className="h-4 w-4" /> : <CloudUpload className="h-4 w-4" />}
        {items.length > 0 ? <span className="tabular-nums">{items.length}</span> : <span>Offline</span>}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Bheje nahi gaye visits"
        description={online ? 'Internet aate hi ye khud chale jate hain.' : 'Abhi internet nahi hai. Internet aate hi ye khud chale jayenge.'}
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>Band karein</Button>
          <Button onClick={() => void sync()} loading={syncing} disabled={!online || !items.some((i) => !i.error)} leftIcon={<RefreshCw className="h-4 w-4" />}>Abhi bhejein</Button>
        </>}>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Sab visits bhej diye gaye hain.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((it) => (
              <li key={it.clientId} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{it.label}</p>
                    <p className="text-[0.8125rem] text-slate-500">{dayTime(it.createdAt)}{it.photo ? ' · photo ke saath' : ''}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold', it.error ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800')}>
                    {it.error ? 'Ruk gaya' : 'Intezar'}
                  </span>
                </div>
                {it.error && (
                  <>
                    <p className="mt-1.5 text-[0.8125rem] text-rose-700">{it.error}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => void retry(it.clientId)} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>Dobara bhejein</Button>
                      {it.photoFailed && <Button size="sm" variant="secondary" onClick={() => void dropPhoto(it.clientId)} leftIcon={<ImageOff className="h-3.5 w-3.5" />}>Photo ke baghair bhejein</Button>}
                      <Button size="sm" variant="critical" leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={async () => { if (await confirmDialog({ title: 'Ye visit hata dein?', text: 'Ye visit phone se mit jayega aur Nafaa ko nahi jayega.', yes: 'Hatayein', danger: true })) void remove(it.clientId); }}>
                        Hatayein
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}

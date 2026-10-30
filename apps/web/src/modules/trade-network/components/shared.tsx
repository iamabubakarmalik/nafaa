/** Building blocks shared by the network screens. */

import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Hash, Phone, Search, Store } from 'lucide-react';
import { Button, Input, Modal, Segmented, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { Pill } from '@modules/distribution/components/parts';
import { TRADE_KEY, tradeApi, tradeError, type BusinessCard, type FoundSeller } from '../api/trade.api';
import { LINK_STATUS, initials } from '../lib/meta';

export function BizAvatar({ card, size = 'md' }: { card: Pick<BusinessCard, 'name' | 'logoUrl'> | null | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-12 w-12 text-[0.9375rem]' : size === 'sm' ? 'h-8 w-8 text-[0.6875rem]' : 'h-10 w-10 text-[0.8125rem]';
  if (card?.logoUrl) return <img src={card.logoUrl} alt="" className={cn('shrink-0 rounded-2xl object-cover ring-1 ring-slate-200', box)} />;
  return <span className={cn('flex shrink-0 items-center justify-center rounded-2xl bg-teal-50 font-bold text-teal-700 ring-1 ring-teal-100', box)}>{initials(card?.name)}</span>;
}

export function Where({ card }: { card: Pick<BusinessCard, 'city' | 'area'> | null | undefined }) {
  const t = [card?.area, card?.city].filter(Boolean).join(', ');
  return t ? <span>{t}</span> : null;
}

/** Big number with a small label, for statement and account tiles. */
export function Tile({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: 'brand' | 'amber' | 'rose' | 'green' }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cn('mt-1 truncate text-[1.125rem] font-bold tabular-nums text-slate-900',
        tone === 'amber' && 'text-amber-700', tone === 'rose' && 'text-rose-700', tone === 'green' && 'text-success-700', tone === 'brand' && 'text-brand-700')}>{value}</div>
      {hint && <div className="mt-0.5 truncate text-[0.75rem] text-slate-500">{hint}</div>}
    </div>
  );
}

/** Ask a supplier to link: by invite code or phone. */
export function ConnectModal({ open, onClose, initialCode }: { open: boolean; onClose: () => void; initialCode?: string }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'code' | 'phone'>('code');
  const [code, setCode] = useState(initialCode ?? '');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [found, setFound] = useState<FoundSeller[] | null>(null);

  const find = useMutation({
    mutationFn: () => tradeApi.find(mode === 'code' ? { code } : { phone }),
    onSuccess: setFound,
    onError: (e) => { setFound(null); toast.error(tradeError(e)); },
  });
  const send = useMutation({
    mutationFn: () => tradeApi.request({ ...(mode === 'code' ? { code } : { phone }), note: note.trim() || undefined }),
    onSuccess: () => { toast.success('Request bhej di — supplier approve karega'); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); close(); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const close = () => { setFound(null); setNote(''); onClose(); };
  const hit = found?.[0];
  const already = hit?.link && ['PENDING', 'ACTIVE', 'PAUSED'].includes(hit.link.status);

  return (
    <Modal open={open} onClose={close} title="Add supplier" description="Apne distributor ka invite code ya phone number likhein. Woh approve karega, phir aap seedha Order bhej sakenge."
      footer={<>
        <Button variant="secondary" onClick={close}>Close</Button>
        {hit && !already
          ? <Button loading={send.isPending} onClick={() => send.mutate()}>Send request</Button>
          : <Button loading={find.isPending} leftIcon={<Search className="h-4 w-4" />} disabled={mode === 'code' ? code.trim().length < 6 : phone.replace(/\D/g, '').length < 10} onClick={() => find.mutate()}>Find</Button>}
      </>}>
      <div className="space-y-4">
        <Segmented value={mode} onChange={(v) => { setMode(v); setFound(null); }} items={[{ value: 'code', label: 'Invite code' }, { value: 'phone', label: 'Phone' }]} />
        {mode === 'code'
          ? <Input label="Invite code" placeholder="NF-7K2P9Q" leftIcon={<Hash className="h-4 w-4" />} value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setFound(null); }} />
          : <Input label="Distributor ka phone" placeholder="0300 1234567" inputMode="tel" leftIcon={<Phone className="h-4 w-4" />} value={phone} onChange={(e) => { setPhone(e.target.value); setFound(null); }} />}
        {hit?.seller && (
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
            <BizAvatar card={hit.seller} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-slate-900">{hit.seller.name}</div>
              <div className="truncate text-[0.75rem] text-slate-500"><Where card={hit.seller} /></div>
            </div>
            {hit.link && <Pill tone={LINK_STATUS[hit.link.status].tone}>{LINK_STATUS[hit.link.status].label}</Pill>}
          </div>
        )}
        {hit && !already && <Textarea label="Note (marzi)" rows={2} placeholder="Misal: Madina Kiryana, Main Bazar — har hafte order" value={note} onChange={(e) => setNote(e.target.value)} />}
        {already && <p className="text-[0.8125rem] text-slate-500">Is supplier se aap ka link pehle se hai.</p>}
      </div>
    </Modal>
  );
}

/** Network counts, shared by the sidebar badges and the network pages. */
export function useOverview() {
  return useQuery({ queryKey: [TRADE_KEY, 'overview'], queryFn: tradeApi.overview, staleTime: 30_000 });
}

export function SectionTitle({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">{icon}{children}</h2>
      {right}
    </div>
  );
}

export const StoreIcon = Store;

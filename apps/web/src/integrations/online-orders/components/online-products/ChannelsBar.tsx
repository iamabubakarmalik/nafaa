/**
 * One row of compact channel chips: logo, name, a small ring with the share
 * of Nafaa products linked, the problem count and the paused state. A click
 * focuses the grid on that channel (again for all); the ⋯ menu holds the
 * channel's work: bring in all, link sure matches, price and stock rules,
 * content settings, sync now, undo an import's stock damage, pause or resume,
 * and its own page.
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ExternalLink, FileText, History, Link2, MoreHorizontal, Pause, Play, RefreshCw, Settings2 } from 'lucide-react';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import type { OnlineChannel } from '../../api/online-products.api';
import { ChannelMark, channelName, kindOf, priceText, stockText, WEBSITE_LINKS_NOTE } from './meta';

export type ChannelAction = 'import' | 'link-all' | 'link' | 'rules' | 'content' | 'sync' | 'recover' | 'pause' | 'resume';

export function ChannelsBar({ channels, sellable, active, onFocus, canManage, busy, onAction }: {
  channels: OnlineChannel[];
  sellable: number;
  /** Focused channel id, '' for all. */
  active: string;
  onFocus: (id: string) => void;
  canManage: boolean;
  /** Channel id + action that is running. */
  busy: { id: string; action: ChannelAction } | null;
  onAction: (c: OnlineChannel, action: ChannelAction) => void;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]" role="toolbar" aria-label={t('Channels')}>
      <button type="button" onClick={() => onFocus('')} aria-pressed={!active}
        className={cn('inline-flex h-11 shrink-0 items-center rounded-2xl px-3.5 text-[0.8125rem] font-semibold ring-1 transition',
          !active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200/80 hover:bg-slate-50')}>
        {t('Sab channels')}
      </button>
      {channels.map((c) => (
        <Chip key={c.id} c={c} sellable={sellable} on={active === c.id} canManage={canManage}
          busy={busy?.id === c.id ? busy.action : null}
          onFocus={() => onFocus(active === c.id ? '' : c.id)} onAction={(a) => onAction(c, a)} />
      ))}
    </div>
  );
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 7;
  const len = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px] shrink-0 -rotate-90" aria-hidden>
      <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2.5" className="stroke-slate-200" />
      <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2.5" stroke={color} strokeLinecap="round" strokeDasharray={`${(pct / 100) * len} ${len}`} />
    </svg>
  );
}

function Chip({ c, sellable, on, canManage, busy, onFocus, onAction }: {
  c: OnlineChannel; sellable: number; on: boolean; canManage: boolean; busy: ChannelAction | null;
  onFocus: () => void; onAction: (a: ChannelAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const pct = sellable ? Math.min(100, Math.round(((c.linked ?? 0) / sellable) * 100)) : 0;
  const failed = c.failed ?? 0;
  const off = c.paused || !c.live;
  const pick = (a: ChannelAction) => () => { setOpen(false); onAction(a); };
  const state = c.paused ? t('Ruka hua') : !c.live ? t('Jura nahi') : null;
  return (
    <div className={cn('flex h-11 shrink-0 items-center rounded-2xl ring-1 transition',
      on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200/80 hover:ring-slate-300', off && !on && 'bg-slate-50')}>
      <button type="button" onClick={onFocus} aria-pressed={on}
        title={`${channelName(c)} · ${t('{{linked}} / {{sellable}} jure', { linked: (c.linked ?? 0).toLocaleString('en-PK'), sellable: sellable.toLocaleString('en-PK') })} · ${priceText(c)} · ${stockText(c)}`}
        className="flex h-full min-w-0 items-center gap-2 rounded-s-2xl ps-2 pe-1.5">
        <ChannelMark channel={c} size="sm" className={cn(off && 'opacity-50 grayscale')} />
        <span className={cn('max-w-[10rem] truncate text-[0.8125rem] font-semibold', off ? 'text-slate-500' : 'text-slate-800')}>{channelName(c)}</span>
        <Ring pct={pct} color={kindOf(c).color} />
        <span className="text-[0.75rem] tabular-nums text-slate-500">{pct}%</span>
        {failed > 0 && <span className="rounded-full bg-rose-600 px-1.5 text-[0.6875rem] font-bold tabular-nums text-white" title={t('{{failed}} masle', { failed })}>{failed}</span>}
        {state && <span className="rounded-full bg-slate-200/80 px-1.5 text-[0.6875rem] font-semibold text-slate-600">{state}</span>}
        {busy && <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-600" />}
      </button>
      <button ref={ref} type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={t('{{name}}: aur kaam', { name: channelName(c) })}
        className="me-1 flex h-8 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <Menu open={open} onClose={() => setOpen(false)} anchorRef={ref} width="w-72" label={channelName(c)}>
        <MenuLabel>{channelName(c)}</MenuLabel>
        {!c.canFetch && <p className="px-2.5 pb-1.5 text-[0.75rem] text-slate-500">{WEBSITE_LINKS_NOTE}</p>}
        {canManage && c.canFetch && <>
          <MenuItem icon={<Link2 />} onClick={pick('link')}>{t('Products jorein')}</MenuItem>
          <MenuItem icon={<Download />} disabled={!c.live && c.canPush} onClick={pick('import')}>{t('Sab le aayein')}</MenuItem>
          <MenuItem icon={<Link2 />} disabled={!c.live && c.canPush} onClick={pick('link-all')}>{t('Sab pakke match jorein')}</MenuItem>
        </>}
        {canManage && c.mode !== 'indolj' && <>
          <MenuSeparator />
          <MenuItem icon={<Settings2 />} onClick={pick('rules')}>{c.canPush ? t('Price aur Stock ke rule') : t('Stock buffer')}</MenuItem>
          {c.canPush && c.canContent && <MenuItem icon={<FileText />} onClick={pick('content')}>{t('Content bhejne ki settings')}</MenuItem>}
        </>}
        {canManage && c.canPush && (
          <MenuItem icon={<RefreshCw />} disabled={!c.live} onClick={pick('sync')}>{t('Abhi sync karein')}</MenuItem>
        )}
        {canManage && c.canPush && c.tracksStock && (
          <MenuItem icon={<History />} onClick={pick('recover')}>{t('Import theek karein')}</MenuItem>
        )}
        <MenuSeparator />
        {canManage && (c.paused
          ? <MenuItem icon={<Play />} onClick={pick('resume')}>{t('Dobara chalayein')}</MenuItem>
          : <MenuItem icon={<Pause />} onClick={pick('pause')}>{t('Rok dein (pause)')}</MenuItem>)}
        <MenuItem icon={<ExternalLink />} onClick={() => { setOpen(false); navigate(`/online-store/channels/${c.id}`); }}>{t('Channel ka safha')}</MenuItem>
      </Menu>
    </div>
  );
}

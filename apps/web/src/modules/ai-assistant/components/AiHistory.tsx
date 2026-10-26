/**
 * Saved chats: search, rename, pin and delete, grouped as Pinned, Aaj, Kal,
 * Is hafte and Purane. Users only ever see their own chats (the server
 * scopes the list).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Pin, PinOff, Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { aiApi, type AiConversationSummary } from '../api';
import { useAiStore } from '../store';

const DAY = 86_400_000;

function groupOf(c: AiConversationSummary, now: Date): string {
  if (c.pinned) return 'Pinned';
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(c.lastMessageAt).getTime();
  if (t >= start) return 'Aaj';
  if (t >= start - DAY) return 'Kal';
  if (t >= start - 6 * DAY) return 'Is hafte';
  return 'Purane';
}
const ORDER = ['Pinned', 'Aaj', 'Kal', 'Is hafte', 'Purane'];

const iconBtn = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function AiHistory({ onPicked, className }: { onPicked?: () => void; className?: string }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const version = useAiStore((s) => s.historyVersion);
  const activeId = useAiStore((s) => s.conversationId);
  const load = useAiStore((s) => s.load);
  const newChat = useAiStore((s) => s.newChat);
  const qc = useQueryClient();
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = window.setTimeout(() => setQuery(q.trim()), 250); return () => window.clearTimeout(t); }, [q]);
  useEffect(() => { if (renaming) renameRef.current?.select(); }, [renaming]);

  const list = useQuery({
    queryKey: ['ai', 'conversations', query, version],
    queryFn: () => aiApi.conversations(query),
    staleTime: 30_000,
    retry: false,
  });

  const groups = useMemo(() => {
    const now = new Date();
    const by = new Map<string, AiConversationSummary[]>();
    for (const c of list.data ?? []) {
      const g = groupOf(c, now);
      by.set(g, [...(by.get(g) ?? []), c]);
    }
    return ORDER.filter((g) => by.has(g)).map((g) => ({ label: g, items: by.get(g)! }));
  }, [list.data]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['ai', 'conversations'] });

  const open = async (id: string) => {
    try { await load(id); onPicked?.(); } catch { toast.error('Chat nahi khul saki'); }
  };
  const saveName = async (c: AiConversationSummary) => {
    const title = draft.trim();
    setRenaming(null);
    if (!title || title === c.title) return;
    try { await aiApi.update(c.id, { title }); refresh(); if (activeId === c.id) useAiStore.setState({ title }); } catch { toast.error('Naam save nahi hua'); }
  };
  const togglePin = async (c: AiConversationSummary) => {
    try { await aiApi.update(c.id, { pinned: !c.pinned }); refresh(); } catch { toast.error('Pin nahi hua'); }
  };
  const remove = async (c: AiConversationSummary) => {
    if (!(await confirmDialog({ title: `"${c.title}" chat mitayein?`, danger: true }))) return;
    try {
      await aiApi.remove(c.id);
      if (activeId === c.id) newChat();
      refresh();
    } catch { toast.error('Chat nahi miti'); }
  };

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="relative px-3 pb-2 pt-3">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-y-[2px] text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Purani chat dhoondein…"
          aria-label="Chat dhoondein"
          className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-[0.8125rem] text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {list.isLoading && <p className="px-2 py-3 text-[0.8125rem] text-slate-500">Load ho raha hai…</p>}
        {list.isError && <p className="px-2 py-3 text-[0.8125rem] text-slate-500">History abhi nahi khul saki.</p>}
        {!list.isLoading && !list.isError && groups.length === 0 && (
          <p className="px-2 py-3 text-[0.8125rem] text-slate-500">{query ? 'Is naam ki koi chat nahi.' : 'Abhi koi chat nahi — pehla sawal poochein.'}</p>
        )}
        {groups.map((g) => (
          <div key={g.label} className="mt-2 first:mt-0">
            <div className="px-2 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{g.label}</div>
            <ul>
              {g.items.map((c) => (
                <li key={c.id} className={cn('group flex items-center gap-1 rounded-lg pr-1', activeId === c.id ? 'bg-brand-50' : 'hover:bg-slate-100')}>
                  {renaming === c.id ? (
                    <input
                      ref={renameRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => saveName(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); void saveName(c); }
                        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setRenaming(null); }
                      }}
                      maxLength={80}
                      aria-label="Chat ka naya naam"
                      className="m-1 h-7 min-w-0 flex-1 rounded-md border border-brand-300 bg-white px-2 text-[0.8125rem] text-slate-900 outline-none"
                    />
                  ) : (
                    <button type="button" onClick={() => open(c.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[0.8125rem] text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      aria-current={activeId === c.id ? 'true' : undefined}>
                      {c.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-brand-600" /> : <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                      <span className="truncate">{c.title || 'Nayi chat'}</span>
                    </button>
                  )}
                  {renaming !== c.id && (
                    <div className="flex opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      <button type="button" className={iconBtn} onClick={() => { setDraft(c.title); setRenaming(c.id); }} aria-label={`${c.title} ka naam badlein`} title="Naam badlein"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" className={iconBtn} onClick={() => togglePin(c)} aria-label={c.pinned ? 'Unpin' : 'Pin'} title={c.pinned ? 'Unpin' : 'Pin'}>
                        {c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" className={cn(iconBtn, 'hover:text-rose-600')} onClick={() => remove(c)} aria-label={`${c.title} mitayein`} title="Mitayein"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

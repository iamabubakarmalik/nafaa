/**
 * One open conversation: header with status, assignment, priority, tags and
 * call buttons; the message thread with day separators, ticks and typing;
 * and the composer. Joins the conversation room on the socket so typing,
 * receipts and calls reach this screen.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Flag, Hash, PanelRight, Phone, RotateCcw, ScreenShare, UserRound, XCircle } from 'lucide-react';
import { Button, Input, Menu, MenuItem, MenuLabel, MenuSeparator, Modal, Skeleton, confirmDialog } from '@/design-system/components';
import { adminSupportApi } from '@/api/admin-support.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { useAuthStore } from '@/store/auth.store';
import { emitAck, supportSocket, useSupportEvent } from '../lib/socket';
import { useSupportLive } from '../lib/live';
import { screenShareSupported, startCall } from '../lib/call';
import {
  SUPPORT_EVENTS, SUPPORT_LIMITS, SUPPORT_PRIORITIES,
  type SupportAdminConversation, type SupportMessage, type SupportMessageEvent, type SupportReceiptEvent, type SupportStatus,
} from '../lib/support.types';
import { SUPPORT_KEYS } from './SupportLive';
import { MessageBubble } from './MessageBubble';
import { Composer } from './Composer';
import { STATUS_LABEL, STATUS_TONE } from './ConversationList';

const dayKey = (d: string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
const dayLabel = (d: string) => {
  const k = dayKey(d);
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  if (k === today) return 'Today';
  if (k === yesterday) return 'Yesterday';
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Karachi' });
};

function upsert(list: SupportMessage[], m: SupportMessage) {
  const i = list.findIndex((x) => x.id === m.id);
  if (i >= 0) { const next = [...list]; next[i] = m; return next; }
  return [...list, m].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function ChatPane({ id, onBack, showContext, onToggleContext }: { id: string; onBack: () => void; showContext: boolean; onToggleContext: () => void }) {
  const can = useCan();
  const me = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const canReply = can('support.reply');
  const canManage = can('support.manage');
  const isSuperAdmin = useAuthStore((s) => s.user?.role === 'SUPER_ADMIN' || !!s.user?.isSuperAdmin);
  const agents = useSupportLive((s) => s.agents);
  const typingName = useSupportLive((s) => s.typing[id]);
  const conv = useQuery({ queryKey: SUPPORT_KEYS.conversation(id), queryFn: () => adminSupportApi.get(id) });
  const c = conv.data;

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null);
  const [editing, setEditing] = useState<SupportMessage | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const markRead = useCallback(() => {
    if (document.visibilityState !== 'visible') return;
    void adminSupportApi.read(id).catch(() => undefined);
  }, [id]);

  // Load, join the room, mark read.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setMessages([]);
    setReplyTo(null);
    setEditing(null);
    stick.current = true;
    adminSupportApi.messages(id).then((p) => {
      if (!alive) return;
      setMessages(p.items);
      setOlderCursor(p.nextCursor);
      setLoading(false);
      markRead();
    }).catch((e) => { toast.error(apiError(e)); setLoading(false); });
    const join = () => void emitAck(SUPPORT_EVENTS.join, { conversationId: id });
    join();
    const s = supportSocket();
    s?.on('connect', join);
    useSupportLive.getState().set({ openConversationId: id });
    const onVisible = () => { if (document.visibilityState === 'visible') markRead(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      s?.off('connect', join);
      s?.emit(SUPPORT_EVENTS.leave, { conversationId: id });
      document.removeEventListener('visibilitychange', onVisible);
      if (useSupportLive.getState().openConversationId === id) useSupportLive.getState().set({ openConversationId: null });
    };
  }, [id, markRead]);

  useSupportEvent<SupportMessageEvent>(SUPPORT_EVENTS.message, (e) => {
    if (e.conversationId !== id) return;
    setMessages((l) => upsert(l, e.message));
    if (e.message.sender === 'MERCHANT') markRead();
  });
  useSupportEvent<SupportMessageEvent>(SUPPORT_EVENTS.messageUpdated, (e) => {
    if (e.conversationId === id) setMessages((l) => upsert(l, e.message));
  });
  const onReceipt = (field: 'readAt' | 'deliveredAt') => (e: SupportReceiptEvent) => {
    if (e.conversationId !== id || e.of !== 'ADMIN') return;
    setMessages((l) => l.map((m) => (m.sender === 'ADMIN' && !m.internal && !m[field] ? { ...m, [field]: e.at, ...(field === 'readAt' && !m.deliveredAt && { deliveredAt: e.at }) } : m)));
  };
  useSupportEvent<SupportReceiptEvent>(SUPPORT_EVENTS.readEvent, onReceipt('readAt'));
  useSupportEvent<SupportReceiptEvent>(SUPPORT_EVENTS.deliveredEvent, onReceipt('deliveredAt'));

  // Keep the view at the bottom when new messages arrive (unless reading older ones).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages, typingName]);

  const loadOlder = async () => {
    if (!olderCursor) return;
    const el = scroller.current;
    const before = el?.scrollHeight ?? 0;
    const p = await adminSupportApi.messages(id, olderCursor);
    setOlderCursor(p.nextCursor);
    setMessages((l) => [...p.items, ...l]);
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - before; });
  };

  const update = useMutation({
    mutationFn: (body: Parameters<typeof adminSupportApi.update>[1]) => adminSupportApi.update(id, body),
    onSuccess: (r) => { qc.setQueryData(SUPPORT_KEYS.conversation(id), r); qc.invalidateQueries({ queryKey: SUPPORT_KEYS.list }); qc.invalidateQueries({ queryKey: SUPPORT_KEYS.counts }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const grouped = useMemo(() => {
    const out: Array<{ day: string; label: string; items: SupportMessage[] }> = [];
    for (const m of messages) {
      const k = dayKey(m.createdAt);
      const g = out[out.length - 1];
      if (g && g.day === k) g.items.push(m); else out.push({ day: k, label: dayLabel(m.createdAt), items: [m] });
    }
    return out;
  }, [messages]);

  if (!c) return <div className="flex-1 space-y-3 p-4"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Header c={c} me={me} agents={agents} canReply={canReply} onBack={onBack} showContext={showContext} onToggleContext={onToggleContext}
        busy={update.isPending} onUpdate={(b) => update.mutate(b)} onTags={() => setTagsOpen(true)} />

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-3 sm:px-5"
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; if (el.scrollTop < 40 && olderCursor) void loadOlder(); }}
      >
        {loading && <Skeleton className="h-40 rounded-xl" />}
        {olderCursor && !loading && <div className="mb-2 text-center"><button type="button" onClick={() => void loadOlder()} className="text-[0.75rem] font-medium text-brand-700 hover:underline">Load earlier messages</button></div>}
        {grouped.map((g) => (
          <div key={g.day}>
            <div className="sticky top-0 z-[1] my-2 flex justify-center"><span className="rounded-full bg-white px-3 py-0.5 text-[0.6875rem] font-medium text-slate-500 shadow-sm">{g.label}</span></div>
            {g.items.map((m) => (
              <MessageBubble key={m.id} m={m}
                onReply={setReplyTo}
                onEdit={setEditing}
                onDelete={async (x) => {
                  if (await confirmDialog({ title: 'Delete this message?', text: 'The shop sees "This message was deleted". The team still sees the original here, marked deleted.', yes: 'Delete', danger: true })) {
                    adminSupportApi.deleteMessage(x.id).then((r) => setMessages((l) => upsert(l, r))).catch((e) => toast.error(apiError(e)));
                  }
                }}
                canPurge={isSuperAdmin}
                onPurge={async (x) => {
                  const what = x.kind === 'CALL_EVENT' ? 'the recordings of this call' : 'this message, its files and its earlier versions';
                  if (await confirmDialog({ title: 'Delete permanently?', text: `This removes ${what} for good. It cannot be undone. A record that something was removed stays, and the action is written to the audit log.`, yes: 'Delete permanently', danger: true })) {
                    adminSupportApi.purgeMessage(x.id).then((r) => { setMessages((l) => upsert(l, r)); toast.success('Removed for good'); }).catch((e) => toast.error(apiError(e)));
                  }
                }}
                canEdit={canReply && m.sender === 'ADMIN' && m.senderUserId === me && m.kind === 'TEXT' && Date.now() - new Date(m.createdAt).getTime() < SUPPORT_LIMITS.editWindowMinutes * 60_000}
                canDelete={canReply && ((m.sender === 'ADMIN' && m.senderUserId === me) || canManage)}
              />
            ))}
          </div>
        ))}
        {typingName !== undefined && <p className="mt-1 text-[0.75rem] italic text-emerald-600">{typingName ?? 'The shop'} is typing…</p>}
      </div>

      <Composer conversationId={id} canReply={canReply} replyTo={replyTo} onClearReply={() => setReplyTo(null)} editing={editing} onDoneEdit={() => setEditing(null)}
        onSent={(m) => { stick.current = true; setMessages((l) => upsert(l, m)); }} />

      <TagsModal open={tagsOpen} tags={c.tags} onClose={() => setTagsOpen(false)} onSave={(tags) => { update.mutate({ tags }); setTagsOpen(false); }} />
    </div>
  );
}

function Header({ c, me, agents, canReply, onBack, showContext, onToggleContext, busy, onUpdate, onTags }: {
  c: SupportAdminConversation;
  me: string | undefined;
  agents: Array<{ id: string; name: string; state: string }>;
  canReply: boolean;
  onBack: () => void;
  showContext: boolean;
  onToggleContext: () => void;
  busy: boolean;
  onUpdate: (b: { status?: SupportStatus; priority?: (typeof SUPPORT_PRIORITIES)[number]; assignedAdminId?: string | null }) => void;
  onTags: () => void;
}) {
  const [menu, setMenu] = useState<'assign' | 'priority' | null>(null);
  const assignRef = useRef<HTMLButtonElement>(null);
  const prioRef = useRef<HTMLButtonElement>(null);
  const done = c.status === 'RESOLVED' || c.status === 'CLOSED';
  const icon = 'inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50';
  const name = c.openedBy?.name ?? 'Shop';

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <button type="button" className={cn(icon, 'lg:hidden')} onClick={onBack} aria-label="Back to list"><ArrowLeft className="h-5 w-5" /></button>
      {/* Keeps the shop name readable: when the pane is narrow the actions wrap to a second row. */}
      <div className="min-w-[12rem] flex-1">
        <p className="truncate text-[0.9375rem] font-semibold text-slate-900">{c.tenant.name}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-slate-500">
          <span className={cn('rounded-full px-1.5 py-px font-semibold', STATUS_TONE[c.status])}>{STATUS_LABEL[c.status]}</span>
          <span>{name}</span>
          {c.merchantOnline ? <span className="text-emerald-600">· in the app</span> : null}
          {c.tags.map((t) => <span key={t} className="rounded bg-slate-100 px-1">#{t}</span>)}
          {c.rating && <span>· rated {c.rating === 'up' ? '👍' : '👎'}{c.ratingNote ? ` “${c.ratingNote}”` : ''}</span>}
        </p>
      </div>
      {canReply && (
        <>
          <button type="button" className={icon} onClick={() => void startCall(c.id, 'voice', name, c.tenant.name)} aria-label="Voice call" title="Voice call"><Phone className="h-5 w-5" /></button>
          {screenShareSupported() && <button type="button" className={icon} onClick={() => void startCall(c.id, 'screen', name, c.tenant.name)} aria-label="Call and share my screen" title="Call and share my screen"><ScreenShare className="h-5 w-5" /></button>}
          <button ref={assignRef} type="button" className={cn(icon, 'w-auto gap-1 px-2 text-[0.8125rem]')} onClick={() => setMenu('assign')} title="Assign">
            <UserRound className="h-4 w-4" /> <span className="hidden sm:inline">{c.assignedAdminId ? (c.assignedAdminId === me ? 'You' : c.assignedAgent?.name ?? 'Agent') : 'Unassigned'}</span>
          </button>
          <Menu open={menu === 'assign'} onClose={() => setMenu(null)} anchorRef={assignRef} align="end" width="w-60">
            <MenuLabel>Assign to</MenuLabel>
            {me && <MenuItem checked={c.assignedAdminId === me} onClick={() => { setMenu(null); onUpdate({ assignedAdminId: me }); }}>Me</MenuItem>}
            {agents.filter((a) => a.id !== me).map((a) => (
              <MenuItem key={a.id} checked={c.assignedAdminId === a.id} hint={a.state} onClick={() => { setMenu(null); onUpdate({ assignedAdminId: a.id }); }}>{a.name}</MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem onClick={() => { setMenu(null); onUpdate({ assignedAdminId: null }); }}>Unassign</MenuItem>
          </Menu>
          <button ref={prioRef} type="button" className={icon} onClick={() => setMenu('priority')} aria-label="Priority" title={`Priority: ${c.priority.toLowerCase()}`}>
            <Flag className={cn('h-5 w-5', c.priority === 'URGENT' ? 'text-rose-600' : c.priority === 'HIGH' ? 'text-amber-500' : '')} />
          </button>
          <Menu open={menu === 'priority'} onClose={() => setMenu(null)} anchorRef={prioRef} align="end" width="w-44">
            {SUPPORT_PRIORITIES.map((p) => <MenuItem key={p} checked={c.priority === p} onClick={() => { setMenu(null); onUpdate({ priority: p }); }}>{p.charAt(0) + p.slice(1).toLowerCase()}</MenuItem>)}
          </Menu>
          <button type="button" className={icon} onClick={onTags} aria-label="Tags" title="Tags"><Hash className="h-5 w-5" /></button>
          {done ? (
            <Button size="sm" variant="secondary" disabled={busy} leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => onUpdate({ status: 'OPEN' })}>Reopen</Button>
          ) : (
            <>
              <Button size="sm" variant="success" disabled={busy} leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => onUpdate({ status: 'RESOLVED' })}>Resolve</Button>
              <button type="button" className={icon} disabled={busy} aria-label="Close for good" title="Close for good" onClick={async () => {
                if (await confirmDialog({ title: 'Close this chat?', text: 'The shop’s next message will start a new chat.', yes: 'Close chat' })) onUpdate({ status: 'CLOSED' });
              }}><XCircle className="h-5 w-5" /></button>
            </>
          )}
        </>
      )}
      <button type="button" className={cn(icon, showContext && 'bg-slate-100')} onClick={onToggleContext} aria-label="Shop details" title="Shop details"><PanelRight className="h-5 w-5" /></button>
    </div>
  );
}

function TagsModal({ open, tags, onClose, onSave }: { open: boolean; tags: string[]; onClose: () => void; onSave: (t: string[]) => void }) {
  const [value, setValue] = useState(tags.join(', '));
  const all = useQuery({ queryKey: ['support', 'tags'], queryFn: adminSupportApi.tags, enabled: open, staleTime: 60_000 });
  useEffect(() => { if (open) setValue(tags.join(', ')); }, [open, tags]);
  const add = (t: string) => setValue((v) => (v.split(',').map((x) => x.trim()).includes(t) ? v : v ? `${v}, ${t}` : t));
  return (
    <Modal open={open} onClose={onClose} title="Tags" description="Comma-separated, e.g. billing, printer, bug"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(value.split(',').map((t) => t.trim()).filter(Boolean))}>Save</Button></>}>
      <Input value={value} onChange={(e) => setValue(e.target.value)} aria-label="Tags" />
      {!!all.data?.length && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {all.data.map((t) => <button key={t} type="button" onClick={() => add(t)} className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.75rem] text-slate-700 hover:bg-slate-200">#{t}</button>)}
        </div>
      )}
    </Modal>
  );
}

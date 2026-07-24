import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MessageCircle, Search, Send, User, Phone, CheckCheck,
  Sparkles, X, Filter, MoreVertical, Archive, Circle,
} from 'lucide-react';
import { messagesApi, type Conversation } from '../shared/marketplace.api';
import { relativeTime } from '../shared/status-utils';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';

export default function MarketplaceMessagesPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'CLOSED' | 'ALL'>('OPEN');

  const { data } = useQuery({
    queryKey: ['marketplace-messages', statusFilter],
    queryFn: () => messagesApi.list({ status: statusFilter === 'ALL' ? undefined : statusFilter }),
    refetchInterval: 10_000,
  });

  const conversations = data?.items.filter((c) => {
    if (!search) return true;
    return c.customer?.fullName.toLowerCase().includes(search.toLowerCase()) ||
           c.lastMessagePreview?.toLowerCase().includes(search.toLowerCase());
  }) || [];

  const counts = data?.counts || { open: 0, closed: 0, unread: 0 };

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <MessageCircle className="h-3.5 w-3.5" />
              Customer Messages
              {counts.unread > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] animate-pulse">
                  {counts.unread} UNREAD
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Messages</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              Customers se seedha chat karein — quickly respond karein
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3 mt-6">
          <KpiCard label="Open" value={counts.open} icon={Circle} />
          <KpiCard label="Unread" value={counts.unread} icon={MessageCircle} highlight />
          <KpiCard label="Closed" value={counts.closed} icon={Archive} />
        </div>
      </section>

      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid md:grid-cols-[320px_1fr] h-[600px]">
          {/* Conversation list */}
          <aside className="border-r-2 border-slate-100 flex flex-col">
            <div className="p-3 border-b-2 border-slate-100 space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full h-10 pl-10 pr-3 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-1">
                {(['OPEN', 'CLOSED', 'ALL'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex-1 h-8 rounded-lg text-[11px] font-black transition ${
                      statusFilter === s
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-500">No conversations</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <ConversationRow
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedId === conv.id}
                    onClick={() => setSelectedId(conv.id)}
                  />
                ))
              )}
            </div>
          </aside>

          {/* Message thread */}
          <main className="flex flex-col bg-slate-50">
            {selectedId ? (
              <MessageThread conversationId={selectedId} onClose={() => setSelectedId(null)} />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-black text-slate-600">Select a conversation</p>
                  <p className="text-xs text-slate-400 font-medium mt-1">Left se koi conversation choose karein</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur border p-3 ${
      highlight ? 'bg-amber-500/25 border-amber-300/50' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-black opacity-90">{label}</div>
      </div>
      <div className="text-xl font-black tabular-nums">{value}</div>
    </div>
  );
}

function ConversationRow({ conversation, isSelected, onClick }: any) {
  const isUnread = conversation.unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 border-b border-slate-100 hover:bg-slate-50 transition ${
        isSelected ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="relative shrink-0">
          <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden">
            {conversation.customer?.avatarUrl ? (
              <img src={conversation.customer.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <User className="h-5 w-5" />
              </div>
            )}
          </div>
          {isUnread && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
              {conversation.unreadCount}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm truncate ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
              {conversation.customer?.fullName || 'Customer'}
            </span>
            <span className="text-[10px] text-slate-500 font-bold shrink-0">
              {relativeTime(conversation.lastMessageAt)}
            </span>
          </div>
          {conversation.lastMessagePreview && (
            <p className={`text-xs truncate mt-0.5 ${isUnread ? 'text-slate-700 font-bold' : 'text-slate-500 font-medium'}`}>
              {conversation.lastMessagePreview}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function MessageThread({ conversationId, onClose }: any) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['marketplace-message', conversationId],
    queryFn: () => messagesApi.get(conversationId),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (data && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data]);

  useEffect(() => {
    if (data?.conversation.unreadCount) {
      messagesApi.markRead(conversationId).then(() => {
        qc.invalidateQueries({ queryKey: ['marketplace-messages'] });
      });
    }
  }, [conversationId, data?.conversation.unreadCount]);

  const sendMutation = useMutation({
    mutationFn: () => messagesApi.send(conversationId, reply),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['marketplace-message', conversationId] });
      qc.invalidateQueries({ queryKey: ['marketplace-messages'] });
    },
  });

  const conversation = data?.conversation;
  const messages = data?.messages || [];

  if (!conversation) {
    return <div className="flex-1 flex items-center justify-center"><Sparkles className="h-8 w-8 animate-pulse text-emerald-500" /></div>;
  }

  return (
    <>
      <div className="bg-white border-b-2 border-slate-100 p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden shrink-0">
          {conversation.customer?.avatarUrl ? (
            <img src={conversation.customer.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-slate-900 truncate">{conversation.customer?.fullName || 'Customer'}</div>
          <div className="text-xs text-slate-500 font-medium">{conversation.channel}</div>
        </div>
        {conversation.customer?.phone && (
          <a
            href={`tel:${conversation.customer.phone}`}
            className="h-9 w-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center"
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
        <button
          onClick={async () => {
            await messagesApi.close(conversationId);
            qc.invalidateQueries({ queryKey: ['marketplace-messages'] });
            toast.success('Conversation closed');
            onClose();
          }}
          className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
          title="Close conversation"
        >
          <Archive className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      <div className="bg-white border-t-2 border-slate-100 p-3 flex items-end gap-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (reply.trim()) sendMutation.mutate();
            }
          }}
          placeholder="Type a message..."
          rows={2}
          className="flex-1 px-3 py-2 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500 resize-none"
        />
        <button
          onClick={() => reply.trim() && sendMutation.mutate()}
          disabled={!reply.trim() || sendMutation.isPending}
          className="h-11 w-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow disabled:opacity-40 shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

function MessageBubble({ message }: any) {
  const isOutbound = message.direction === 'OUTBOUND';
  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${
        isOutbound
          ? 'bg-emerald-600 text-white'
          : 'bg-white border-2 border-slate-200 text-slate-900'
      }`}>
        <p className="text-sm font-medium whitespace-pre-wrap break-words">{message.body}</p>
        <div className={`text-[9px] font-bold mt-1 flex items-center gap-1 ${
          isOutbound ? 'text-emerald-100 justify-end' : 'text-slate-500'
        }`}>
          {relativeTime(message.createdAt)}
          {isOutbound && message.isRead && <CheckCheck className="h-3 w-3" />}
        </div>
      </div>
    </div>
  );
}

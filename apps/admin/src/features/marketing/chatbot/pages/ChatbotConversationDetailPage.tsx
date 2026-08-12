import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, UserCheck, CheckSquare, Lock } from 'lucide-react';
import { chatbotApi } from '../../../../api/marketing/marketing-chatbot.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { format } from 'date-fns';

export function ChatbotConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const [internal, setInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conv } = useQuery({
    queryKey: ['chatbot-detail', id],
    queryFn: () => chatbotApi.detail(id!),
    refetchInterval: 5_000,
    enabled: !!id,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conv?.messages?.length]);

  const takeoverMut = useMutation({
    mutationFn: () => chatbotApi.takeover(id!, 'Assalam-o-Alaikum! Main aap ki madad karta hun.'),
    onSuccess: () => { toast.success('Chat taken over'); qc.invalidateQueries({ queryKey: ['chatbot-detail', id] }); },
  });

  const sendMut = useMutation({
    mutationFn: () => chatbotApi.sendMessage(id!, msg, internal),
    onSuccess: () => { setMsg(''); qc.invalidateQueries({ queryKey: ['chatbot-detail', id] }); },
  });

  const resolveMut = useMutation({
    mutationFn: () => chatbotApi.resolve(id!, 'Resolved by admin'),
    onSuccess: () => { toast.success('Chat resolved'); qc.invalidateQueries({ queryKey: ['chatbot-detail', id] }); },
  });

  if (!conv) return <div className="h-40 animate-pulse rounded-2xl bg-white" />;

  return (
    <div className="space-y-4">
      <PageHeader
        title={conv.visitorName ?? 'Anonymous Visitor'}
        subtitle={conv.conversationNumber}
        backTo="/marketing/chatbot"
        actions={<StatusBadge status={conv.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div ref={scrollRef} className="max-h-[500px] overflow-y-auto p-5 space-y-3">
            {conv.messages?.map((m: any) => (
              <div key={m.id} className={`flex ${m.senderType === 'USER' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                  m.senderType === 'USER' ? 'bg-neutral-100 text-neutral-800' :
                  m.senderType === 'BOT' ? 'bg-blue-50 text-blue-900' :
                  m.senderType === 'SYSTEM' ? 'bg-amber-50 text-amber-900 italic text-xs' :
                  'bg-emerald-600 text-white'
                }`}>
                  {m.content}
                  <p className="mt-1 text-xs opacity-60">{format(new Date(m.createdAt), 'p')}</p>
                </div>
              </div>
            ))}
          </div>

          {conv.status !== 'RESOLVED' && conv.status !== 'ABANDONED' && (
            <div className="border-t border-neutral-200 p-4">
              {conv.status === 'BOT_HANDLING' || conv.status === 'WAITING_HUMAN' ? (
                <button
                  onClick={() => takeoverMut.mutate()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <UserCheck className="h-4 w-4" /> Take Over
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder="Jawab likhein…" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs text-neutral-600">
                      <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                      Internal note (visitor won't see)
                    </label>
                    <button
                      onClick={() => msg.trim() && sendMut.mutate()}
                      disabled={sendMut.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      <Send className="h-4 w-4" /> Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold">Visitor</h3>
            <p className="text-xs text-neutral-600">{conv.visitorEmail ?? 'No email'}</p>
            {conv.visitorPhone && <p className="text-xs text-neutral-600">{conv.visitorPhone}</p>}
            {conv.visitorCountry && <p className="text-xs text-neutral-600">{conv.visitorCity ?? ''} {conv.visitorCountry}</p>}
            <p className="mt-2 text-xs text-neutral-500">On: {conv.currentPage ?? '/'}</p>
          </div>

          {conv.status !== 'RESOLVED' && (
            <button
              onClick={() => resolveMut.mutate()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <CheckSquare className="h-4 w-4" /> Mark Resolved
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

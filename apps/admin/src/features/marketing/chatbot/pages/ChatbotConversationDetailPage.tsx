/**
 * One chatbot conversation: the message thread (refreshes every 5 seconds),
 * take over from the bot, reply or leave an internal note, and resolve.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bot, CheckSquare, Send, UserCheck } from 'lucide-react';
import { Button, Card, Checkbox, PageHero, PageShell, Skeleton, Textarea } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { chatbotApi } from '@/api/marketing/marketing-chatbot.api';
import { formatDate } from '@/lib/format';
import { DetailList, statusLabel } from '@/ui';
import { cn } from '@/lib/cn';
import { GuideButton } from '../../lib/kit';

const time = (d: string) => new Date(d).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });

export function ChatbotConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [msg, setMsg] = useState('');
  const [internal, setInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conv } = useQuery({ queryKey: ['mkt', 'chatbot-detail', id], queryFn: () => chatbotApi.detail(id!), refetchInterval: 5_000, enabled: !!id });
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [conv?.messages?.length]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ['mkt', 'chatbot-detail', id] }); qc.invalidateQueries({ queryKey: ['mkt', 'chatbot'] }); };
  const fail = (e: any) => toast.error(e.response?.data?.message ?? 'Something went wrong. Try again.');
  const takeoverMut = useMutation({ mutationFn: () => chatbotApi.takeover(id!, 'Assalam-o-Alaikum! Main aap ki madad karta hun.'), onSuccess: () => { toast.success('You took over this chat'); refresh(); }, onError: fail });
  const sendMut = useMutation({ mutationFn: () => chatbotApi.sendMessage(id!, msg, internal), onSuccess: () => { setMsg(''); refresh(); }, onError: fail });
  const resolveMut = useMutation({ mutationFn: () => chatbotApi.resolve(id!, 'Resolved by admin'), onSuccess: () => { toast.success('Chat resolved'); refresh(); }, onError: fail });

  if (!conv) return <PageShell><PageHero title="Conversation" back="/marketing/chatbot" loading /><Skeleton className="h-64 rounded-3xl" /></PageShell>;

  const open = conv.status !== 'RESOLVED' && conv.status !== 'ABANDONED';
  const bubble = (t: string) => t === 'USER' ? 'bg-slate-100 text-slate-800' : t === 'BOT' ? 'bg-sky-50 text-sky-900' : t === 'SYSTEM' ? 'bg-amber-50 text-xs italic text-amber-900' : 'bg-brand-600 text-brand-fg';

  return (
    <PageShell>
      <PageHero
        title={conv.visitorName ?? 'Anonymous visitor'}
        back="/marketing/chatbot"
        backLabel="Chatbot"
        chip={statusLabel(conv.status)}
        meta={conv.conversationNumber}
        actions={<GuideButton onClick={guide.open} />}
        stats={[
          { label: 'Messages', value: conv.messages?.length ?? 0 },
          { label: 'Status', value: statusLabel(conv.status) },
          { label: 'Page', value: conv.currentPage ?? '/' },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card flush className="xl:col-span-3" title="Conversation">
          <div ref={scrollRef} className="max-h-[32rem] space-y-3 overflow-y-auto p-4 sm:p-5">
            {conv.messages?.map((m: any) => (
              <div key={m.id} className={cn('flex', m.senderType === 'USER' ? 'justify-start' : 'justify-end')}>
                <div className={cn('max-w-[75%] rounded-2xl px-4 py-2 text-[0.875rem]', bubble(m.senderType))}>
                  {m.content}
                  <p className="mt-1 text-[0.6875rem] opacity-60">{time(m.createdAt)} · {formatDate(m.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          {open && (
            <div className="border-t border-slate-100 p-4">
              {conv.status === 'BOT_HANDLING' || conv.status === 'WAITING_HUMAN' ? (
                <Button fullWidth leftIcon={<UserCheck className="h-4 w-4" />} loading={takeoverMut.isPending} onClick={() => takeoverMut.mutate()}>Take over</Button>
              ) : (
                <div className="space-y-2">
                  <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder="Write a reply" aria-label="Reply" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Checkbox label="Internal note (the visitor will not see it)" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                    <Button leftIcon={<Send className="h-4 w-4" />} loading={sendMut.isPending} onClick={() => msg.trim() && sendMut.mutate()}>Send</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Visitor">
            <DetailList items={[
              { label: 'Email', value: conv.visitorEmail },
              { label: 'Phone', value: conv.visitorPhone },
              { label: 'Location', value: [conv.visitorCity, conv.visitorCountry].filter(Boolean).join(', ') || null },
              { label: 'On page', value: conv.currentPage ?? '/' },
            ]} />
          </Card>
          {conv.status !== 'RESOLVED' && (
            <Button variant="outline" fullWidth leftIcon={<CheckSquare className="h-4 w-4" />} loading={resolveMut.isPending} onClick={() => resolveMut.mutate()}>Mark resolved</Button>
          )}
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide
          title="Chatbot conversation"
          description="Read the chat, step in when the bot cannot help, and close it when done."
          flowTitle="Taking over a chat"
          flow={[
            { label: 'Read the thread', hint: 'Bot and visitor', icon: Bot, color: '#0284c7' },
            { label: 'Take over', hint: 'Greets the visitor', icon: UserCheck, color: '#4f46e5' },
            { label: 'Reply', hint: 'Or leave a note', icon: Send, color: '#d97706' },
            { label: 'Resolve', hint: 'Closes the chat', icon: CheckSquare, color: '#059669' },
          ]}
          steps={[
            { icon: UserCheck, color: '#4f46e5', title: 'Take over', text: 'Available while the bot is handling or the visitor is waiting. The visitor gets a greeting.' },
            { icon: Send, color: '#d97706', title: 'Reply or note', text: 'Tick Internal note to write something only your team can see.' },
            { icon: CheckSquare, color: '#059669', title: 'Resolve', text: 'Mark the chat resolved once the visitor is helped.' },
          ]}
          tips={['The thread refreshes every 5 seconds.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

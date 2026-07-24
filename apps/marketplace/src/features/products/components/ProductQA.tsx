import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle, HelpCircle, ThumbsUp, CheckCircle2, Send,
  User, Store, MoreHorizontal, Flag,
} from 'lucide-react';
import { qaApi } from '../api/qa.api';
import { Button, Card, Avatar, Badge, EmptyState } from '@/ui';
import { timeAgo } from '@/lib/format';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

export function ProductQA({ productId }: { productId: string }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const [question, setQuestion] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['product-qa', productId],
    queryFn: () => qaApi.list(productId, 20),
  });

  const askMutation = useMutation({
    mutationFn: () => qaApi.ask(productId, question),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-qa', productId] });
      setQuestion('');
      setShowForm(false);
      toast.success('Question posted!');
    },
    onError: () => toast.error('Please login to ask questions'),
  });

  const voteQuestion = useMutation({
    mutationFn: (qId: string) => qaApi.voteQuestion(qId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-qa', productId] }),
  });

  const voteAnswer = useMutation({
    mutationFn: (aId: string) => qaApi.voteAnswer(aId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-qa', productId] }),
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-info" />
          Questions & Answers
          {data && data.total > 0 && (
            <Badge variant="info" size="lg">{data.total}</Badge>
          )}
        </h2>
        {!showForm && (
          <Button
            variant="gradient"
            size="sm"
            onClick={() => isAuth ? setShowForm(true) : toast.error('Please login')}
            leftIcon={<MessageCircle className="h-4 w-4" />}
          >
            Ask a question
          </Button>
        )}
      </div>

      {/* Ask form */}
      {showForm && (
        <Card className="p-4 space-y-3 animate-slide-down">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about this product..."
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:border-info focus:ring-4 focus:ring-info/10 resize-none"
          />
          <div className="flex items-center justify-between">
            <div className="text-2xs text-content-muted">
              {question.length}/500 characters
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setQuestion(''); }}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                size="sm"
                disabled={question.length < 10}
                loading={askMutation.isPending}
                onClick={() => askMutation.mutate()}
                leftIcon={<Send className="h-3.5 w-3.5" />}
              >
                Post question
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Questions list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-3xl" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={HelpCircle}
          title="No questions yet"
          description="Be the first to ask about this product"
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((q: any) => (
            <Card key={q.id} className="p-4 space-y-3">
              {/* Question */}
              <div className="flex items-start gap-3">
                <Avatar name={q.customer?.fullName} src={q.customer?.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-sm">{q.customer?.fullName || 'Anonymous'}</span>
                    <Badge variant="info" size="sm">
                      <HelpCircle className="h-3 w-3" />
                      Question
                    </Badge>
                    <span className="text-2xs text-content-subtle">{timeAgo(q.createdAt)}</span>
                  </div>
                  <p className="text-sm text-content leading-relaxed">{q.question}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => voteQuestion.mutate(q.id)}
                      className={cn(
                        'inline-flex items-center gap-1 text-2xs font-bold transition',
                        q.hasVoted ? 'text-brand-600' : 'text-content-muted hover:text-brand-600',
                      )}
                    >
                      <ThumbsUp className={cn('h-3.5 w-3.5', q.hasVoted && 'fill-current')} />
                      {q.helpfulCount || 0} helpful
                    </button>
                  </div>
                </div>
              </div>

              {/* Answers */}
              {q.answers?.length > 0 && (
                <div className="pl-11 space-y-3 border-l-2 border-brand-100 dark:border-brand-900/40 ml-4">
                  {q.answers.map((a: any) => (
                    <div key={a.id} className="pl-4">
                      <div className="flex items-start gap-3">
                        {a.isFromShop ? (
                          <div className="h-8 w-8 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
                            <Store className="h-3.5 w-3.5 text-white" />
                          </div>
                        ) : (
                          <Avatar name={a.customer?.fullName} src={a.customer?.avatarUrl} size="sm" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-black text-sm">
                              {a.isFromShop ? `${a.shopName} (seller)` : a.customer?.fullName}
                            </span>
                            {a.isFromShop && (
                              <Badge variant="brand" size="sm">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified seller
                              </Badge>
                            )}
                            <span className="text-2xs text-content-subtle">{timeAgo(a.createdAt)}</span>
                          </div>
                          <p className="text-sm text-content-muted leading-relaxed">{a.answer}</p>
                          <button
                            onClick={() => voteAnswer.mutate(a.id)}
                            className={cn(
                              'inline-flex items-center gap-1 text-2xs font-bold mt-1.5 transition',
                              a.hasVoted ? 'text-brand-600' : 'text-content-muted hover:text-brand-600',
                            )}
                          >
                            <ThumbsUp className={cn('h-3 w-3', a.hasVoted && 'fill-current')} />
                            {a.helpfulCount || 0}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {q.answers?.length === 0 && (
                <div className="pl-11 text-2xs text-content-muted italic">
                  Awaiting answer from seller...
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {data && data.total > 20 && (
        <div className="text-center">
          <Button variant="ghost" size="md">Load more questions</Button>
        </div>
      )}
    </section>
  );
}

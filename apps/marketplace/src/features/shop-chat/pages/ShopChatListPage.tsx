import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MessageCircle, Store, ChevronRight } from 'lucide-react';
import { shopChatApi } from '../api/shop-chat.api';
import { Card, Badge, EmptyState } from '@/ui';
import { timeAgo } from '@/lib/format';

export default function ShopChatListPage() {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: shopChatApi.conversations,
    refetchInterval: 10000,
  });

  return (
    <>
      <Helmet><title>Messages — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-brand-600" />
            Messages
            {conversations && conversations.length > 0 && (
              <Badge variant="brand" size="lg">{conversations.length}</Badge>
            )}
          </h1>
          <p className="text-sm text-content-muted mt-0.5">
            Chat directly with shops
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : !conversations?.length ? (
          <EmptyState
            icon={MessageCircle}
            title="No messages yet"
            description="Start a conversation by tapping 'Message shop' on any shop page"
          />
        ) : (
          <div className="space-y-2">
            {conversations.map((c: any) => {
              const shop = c.shopProfile;
              const unread = c.unreadCount || 0;
              return (
                <Link key={c.id} to={`/messages/${c.id}`}>
                  <Card className="p-4 hover:shadow-soft-lg transition group flex items-center gap-3">
                    {shop?.logoUrl ? (
                      <img src={shop.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
                        <Store className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-black text-content text-sm truncate">
                          {shop?.publicName || 'Shop'}
                        </div>
                        <div className="text-2xs text-content-subtle shrink-0">
                          {timeAgo(c.lastMessageAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="text-xs text-content-muted truncate flex-1">
                          {c.lastMessagePreview || 'No messages yet'}
                        </div>
                        {unread > 0 && (
                          <Badge variant="brand" size="sm" className="shrink-0">{unread}</Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-content-subtle group-hover:text-brand-600 group-hover:translate-x-1 transition shrink-0" />
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

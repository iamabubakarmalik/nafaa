import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { storiesApi } from '../api/stories.api';
import { StoriesViewer } from './StoriesViewer';
import { cn } from '@/lib/cn';

export function StoriesBar() {
  const [viewingShop, setViewingShop] = useState<string | null>(null);

  const { data: feed } = useQuery({
    queryKey: ['stories-feed'],
    queryFn: storiesApi.feed,
    staleTime: 60_000,
  });

  if (!feed?.length) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 -mx-4 px-4">
        {feed.map((shop: any) => {
          const hasUnviewed = shop.stories?.some((s: any) => !s.isViewed);
          return (
            <button
              key={shop.shopId}
              onClick={() => setViewingShop(shop.shopId)}
              className="shrink-0 flex flex-col items-center gap-1.5 group"
            >
              <div className={cn(
                'h-16 w-16 md:h-20 md:w-20 rounded-full p-0.5 transition',
                hasUnviewed
                  ? 'bg-gradient-to-tr from-brand-500 via-accent-500 to-pink-500 animate-gradient bg-[length:200%_200%]'
                  : 'bg-content-subtle/30',
              )}>
                <div className="h-full w-full rounded-full bg-surface p-0.5">
                  {shop.logoUrl ? (
                    <img src={shop.logoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <div className="h-full w-full rounded-full bg-gradient-brand flex items-center justify-center text-white font-black">
                      {shop.publicName[0]}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-2xs font-bold text-content text-center max-w-[70px] truncate">
                {shop.publicName}
              </div>
            </button>
          );
        })}
      </div>

      {viewingShop && (
        <StoriesViewer
          shopId={viewingShop}
          onClose={() => setViewingShop(null)}
        />
      )}
    </>
  );
}

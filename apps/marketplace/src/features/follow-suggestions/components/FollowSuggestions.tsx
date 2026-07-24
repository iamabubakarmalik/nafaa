import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, ChevronRight, Heart, ShieldCheck, Star } from 'lucide-react';
import { marketplaceClient, unwrap } from '@/api/client';
import { shopsApi } from '@/features/shops/api/shops.api';
import { useAuthStore } from '@/stores/auth.store';
import { Card, Button, Avatar, Badge } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

export function FollowSuggestions() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['follow-suggestions'],
    queryFn: () => marketplaceClient.get('/shops/suggestions/for-you').then(unwrap<any[]>),
    enabled: isAuth,
    staleTime: 5 * 60_000,
  });

  const followMutation = useMutation({
    mutationFn: (shopId: string) => shopsApi.follow(shopId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow-suggestions'] });
      qc.invalidateQueries({ queryKey: ['followed-shops'] });
      toast.success('Following! 💚');
    },
  });

  if (!isAuth || !data?.length) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-600" />
          Shops you may like
        </h3>
        <Link to="/shops" className="text-xs font-black text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5">
          See all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
        {data.slice(0, 8).map((s: any) => (
          <Card key={s.shopId} className="shrink-0 w-48 p-3 text-center">
            <Link to={`/shops/${s.slug || s.shopId}`}>
              {s.logoUrl ? (
                <img src={s.logoUrl} alt="" className="h-16 w-16 mx-auto rounded-2xl object-cover" />
              ) : (
                <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-brand flex items-center justify-center text-white font-black text-xl">
                  {s.publicName[0]}
                </div>
              )}
              <div className="mt-2 font-black text-sm truncate">{s.publicName}</div>
              <div className="flex items-center justify-center gap-1 mt-1 text-2xs">
                {s.ratingCount > 0 && (
                  <>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="font-bold">{s.ratingAverage.toFixed(1)}</span>
                  </>
                )}
                {s.verificationLevel === 'GOLD' && (
                  <ShieldCheck className="h-3 w-3 text-amber-500" />
                )}
              </div>
              {s.reason && (
                <div className="text-2xs text-content-muted mt-1 line-clamp-1 italic">
                  {s.reason}
                </div>
              )}
            </Link>
            <Button
              variant="gradient"
              size="xs"
              fullWidth
              className="mt-2"
              onClick={() => followMutation.mutate(s.shopId)}
              loading={followMutation.isPending}
              leftIcon={<Heart className="h-3 w-3" />}
            >
              Follow
            </Button>
          </Card>
        ))}
      </div>
    </Card>
  );
}

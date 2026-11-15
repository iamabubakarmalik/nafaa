'use client';
/** Follow, share and WhatsApp buttons in the shop header. */
import { Heart, MessageCircle, Phone, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { cn } from '@/components/ui';
import { m } from '@/lib/client';
import { whatsappLink } from '@/lib/format';
import type { FollowedShop } from '@/lib/types';

const btn = 'inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-semibold text-gray-800 shadow-card ring-1 ring-gray-200 hover:bg-gray-50';

export function ShopActions({ shopId, name, phone, whatsapp }: { shopId: string; name: string; phone: string | null; whatsapp: string | null }) {
  const app = useApp();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!app.signedIn) return;
    // Public shop reads do not know the customer, so the follow state comes from the followed list.
    m<FollowedShop[]>('followed').then((l) => setFollowing(l.some((s) => s.shopId === shopId))).catch(() => undefined);
  }, [app.signedIn, shopId]);

  const toggle = async () => {
    if (!app.requireSignIn()) return;
    setBusy(true);
    try {
      setFollowing(await m<boolean>(`follow/${shopId}`, { body: { on: !following } }));
    } catch (e) {
      app.toast(app.errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        app.toast(app.t('common.copied'));
      }
    } catch {
      // The customer closed the share sheet.
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={following} className={cn(btn, following && 'bg-brand-50 text-brand-800 ring-brand-300')}>
        <Heart className={cn('h-4 w-4', following && 'fill-brand-600 text-brand-600')} />
        {following ? app.t('common.following') : app.t('common.follow')}
      </button>
      <button type="button" onClick={share} className={btn}><Share2 className="h-4 w-4" />{app.t('common.share')}</button>
      {whatsapp && (
        <a href={whatsappLink(whatsapp, name)} target="_blank" rel="noopener noreferrer" className={btn}>
          <MessageCircle className="h-4 w-4 text-green-600" />{app.t('common.whatsapp')}
        </a>
      )}
      {phone && (
        <a href={`tel:${phone}`} className={btn}><Phone className="h-4 w-4" />{app.t('common.call')}</a>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { CONNECT_MESSAGE, type ConnectMessage } from '../lib/connectPopup';

/**
 * Platform (WooCommerce) "Approve" ke baad yahan wapas aata hai.
 * Popup me khula ho → Nafaa tab ko khabar do aur band ho jao.
 * Poore tab me khula ho (popup block tha) → seedha channel ke safhe par.
 */
export default function ConnectDonePage() {
  const { platform } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const channelId = params.get('channel') ?? '';
  // WooCommerce: success=1 approve, success=0 mana kar diya
  const success = params.get('success') !== '0';
  const error = params.get('error');
  const [closing, setClosing] = useState(true);

  useEffect(() => {
    const msg: ConnectMessage = { type: CONNECT_MESSAGE, channelId, success };
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(msg, window.location.origin);
      } catch { /* opener doosre origin par */ }
      const t = setTimeout(() => window.close(), success ? 1200 : 2500);
      return () => clearTimeout(t);
    }
    setClosing(false);
    const t = setTimeout(() => {
      navigate(channelId ? `/online-store/channels/${channelId}${success ? '?connected=1' : ''}` : '/online-store/connect', { replace: true });
    }, 1200);
    return () => clearTimeout(t);
  }, [channelId, success, navigate]);

  const name = platform === 'woocommerce' ? 'WooCommerce' : platform === 'shopify' ? 'Shopify' : 'Website';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 p-6 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/20 bg-white/10 p-8 text-center shadow-2xl backdrop-blur">
        {success ? (
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-300 animate-in zoom-in duration-300" />
        ) : (
          <XCircle className="mx-auto h-16 w-16 text-rose-300" />
        )}
        <h1 className="mt-4 text-2xl font-black">{success ? `${name} jur gaya!` : platform === 'shopify' ? 'Install nahi hua' : 'Approve nahi hua'}</h1>
        <p className="mt-2 text-sm font-bold text-white/80">
          {success
            ? 'Nafaa ab khud webhooks laga raha hai — orders, stock aur status sab sync honge.'
            : error || 'Aap ne access nahi diya. Nafaa me wapas ja kar dobara koshish karein.'}
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" /> {closing ? 'Ye window band ho rahi hai…' : 'Nafaa par wapas le ja rahe hain…'}
        </div>
      </div>
    </div>
  );
}

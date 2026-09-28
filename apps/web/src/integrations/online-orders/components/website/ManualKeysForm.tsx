import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { apiErrorMessage, onlineOrdersApi } from '../../api/online-orders.api';
import { CHANNELS_KEY } from '../../hooks/useSalesChannels';
import { cn } from '@core/lib/cn';

const input =
  'h-10 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

/** Popup na chale (purana WordPress, security plugin) — WooCommerce → Settings → Advanced → REST API se keys */
export function ManualKeysForm({ channelId, site, onDone }: { channelId: string; site?: string; onDone?: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [ck, setCk] = useState('');
  const [cs, setCs] = useState('');
  const save = useMutation({
    mutationFn: () => onlineOrdersApi.wooKeys(channelId, { consumerKey: ck, consumerSecret: cs, siteUrl: site || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
      qc.invalidateQueries({ queryKey: ['sales-channel', channelId] });
      toast.success('🎉 WooCommerce jur gaya — webhooks lag gaye');
      if (onDone) onDone();
      else navigate(`/online-store/channels/${channelId}?connected=1`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="mt-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
        WordPress → <b>WooCommerce → Settings → Advanced → REST API → Add key</b> · Permissions: <b>Read/Write</b> → Generate
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={ck} onChange={(e) => setCk(e.target.value)} placeholder="Consumer key (ck_…)" className={cn(input, 'font-mono')} />
        <input value={cs} onChange={(e) => setCs(e.target.value)} placeholder="Consumer secret (cs_…)" className={cn(input, 'font-mono')} type="password" />
      </div>
      <Button size="sm" loading={save.isPending} disabled={!ck.startsWith('ck_') || !cs.startsWith('cs_')} onClick={() => save.mutate()}>
        Keys se jorein
      </Button>
    </div>
  );
}


/** API bahar se https par nahi dikhta — WooCommerce ek-click aur orders dono ruk jate hain */
export function HttpsNotice({ reason, fix, compact }: { reason?: string | null; fix?: string | null; compact?: boolean }) {
  return (
    <div className={cn('rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10', compact ? 'p-3' : 'p-4')}>
      <div className="text-sm font-black text-amber-900 dark:text-amber-200">🔒 Ek-click ke liye Nafaa ka API https par chahiye</div>
      <p className="mt-1 text-[12px] font-bold text-amber-800 dark:text-amber-300">
        {reason ?? 'WooCommerce keys aur orders sirf https address par bhejta hai.'} Live (api.nafaa.pk) par ye khud theek hai.
      </p>
      {fix && (
        <p className="mt-2 rounded-xl bg-white/70 dark:bg-slate-900/60 px-3 py-2 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200">
          {fix.replace(/`/g, '')}
        </p>
      )}
      {!compact && (
        <p className="mt-2 text-[12px] font-bold text-amber-800 dark:text-amber-300">
          Tab tak neeche WooCommerce ki REST API keys daal kar jor sakte hain.
        </p>
      )}
    </div>
  );
}

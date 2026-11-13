/**
 * Meta sign-in lands here (/social/accounts/callback?code&state). The page
 * hands the code to the API, lists the Facebook Pages the person manages
 * (with their Instagram business accounts) and connects the one picked.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2, Plug } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHero, PageShell } from '@/design-system/components';
import { brandSocialApi, type MetaCallbackResult, type SocialAccount } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { PlatformMark } from '../lib/platforms';
import { useInvalidate } from '../lib/queries';
import { AccountAvatar } from '../components/SocialUi';
import { useMetaConnect } from './AccountsPage';

const NEEDED = ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish'];

export default function MetaCallbackPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const connect = useMetaConnect();
  const started = useRef(false);
  const [result, setResult] = useState<MetaCallbackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [done, setDone] = useState<SocialAccount[] | null>(null);

  const code = sp.get('code');
  const state = sp.get('state');
  const denied = sp.get('error_description') || sp.get('error');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (denied) { setError(denied === 'access_denied' ? 'Permission was not given on Facebook.' : denied); return; }
    if (!code || !state) { setError('This page opens after signing in with Facebook. Start again from Accounts.'); return; }
    brandSocialApi.metaCallback({ code, state })
      .then((r) => {
        setResult(r);
        const first = r.pages.find((p) => !p.connected) ?? r.pages[0];
        if (first) setPick(first.pageId);
        // Drop the one-time code from the address bar.
        window.history.replaceState(null, '', '/social/accounts/callback');
      })
      .catch((e) => setError(apiError(e, 'Meta did not accept the sign-in. Try again.')));
  }, [code, state, denied]);

  const select = useMutation({
    mutationFn: (pageId: string) => brandSocialApi.metaSelect(pageId),
    onSuccess: (r) => { setDone(r.accounts); invalidate(); toast.success('Connected'); },
    onError: (e) => toast.error(apiError(e)),
  });

  const missing = result ? NEEDED.filter((s) => !result.scopes.includes(s)) : [];

  return (
    <PageShell>
      <PageHero title="Connect Facebook & Instagram" back="/social/accounts" backLabel="Accounts" subtitle={result ? `Signed in as ${result.userName}` : undefined} />
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {error ? (
          <Card>
            <EmptyState icon={<AlertTriangle className="h-7 w-7 text-rose-500" />} title="Could not connect" description={error}
              action={<div className="flex gap-2"><Button leftIcon={<Plug className="h-4 w-4" />} loading={connect.isPending} onClick={() => connect.mutate()}>Try again</Button><Link to="/social/accounts"><Button variant="secondary">Back to accounts</Button></Link></div>} />
          </Card>
        ) : done ? (
          <Card>
            <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-success-600" />} title="All set"
              description="These accounts now publish automatically when a post is approved and due."
              action={<Button onClick={() => navigate('/social/accounts')}>Open accounts</Button>} />
            <ul className="mx-auto mt-2 max-w-sm space-y-2 pb-4">
              {done.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                  <AccountAvatar account={a} platform={a.platform} size={36} />
                  <span className="min-w-0 flex-1"><b className="block truncate text-[0.875rem] text-slate-900">{a.name}</b><span className="text-[0.75rem] text-slate-500">{a.handle ? `@${a.handle.replace(/^@/, '')}` : a.platform}</span></span>
                  <Badge variant="success" size="xs">Connected</Badge>
                </li>
              ))}
            </ul>
          </Card>
        ) : !result ? (
          <Card><div className="flex flex-col items-center gap-3 py-14 text-center"><Loader2 className="h-7 w-7 animate-spin text-brand-600" /><p className="text-[0.875rem] font-medium text-slate-700">Finishing the Meta sign-in…</p></div></Card>
        ) : !result.pages.length ? (
          <Card>
            <EmptyState icon={<AlertTriangle className="h-7 w-7 text-amber-500" />} title="No Facebook Pages found"
              description="This Facebook account does not manage any Page, or the Pages were not ticked on the Meta screen. Reconnect and tick the Nafaa Page."
              action={<Button loading={connect.isPending} onClick={() => connect.mutate()}>Reconnect</Button>} />
          </Card>
        ) : (
          <Card title="Pick the Page" description="Its Instagram business account is connected with it."
            footer={<div className="flex justify-end gap-2"><Link to="/social/accounts"><Button variant="secondary">Cancel</Button></Link><Button disabled={!pick} loading={select.isPending} onClick={() => pick && select.mutate(pick)}>Connect this Page</Button></div>}>
            {missing.length > 0 && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
                Some permissions were not granted ({missing.join(', ')}). Publishing may fail until you reconnect and allow them.
              </p>
            )}
            <ul className="space-y-2" role="radiogroup">
              {result.pages.map((p) => (
                <li key={p.pageId}>
                  <button type="button" role="radio" aria-checked={pick === p.pageId} onClick={() => setPick(p.pageId)}
                    className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start ring-1 transition', pick === p.pageId ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-slate-300')}>
                    {p.picture ? <img src={p.picture} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1877F2] text-lg font-bold text-white">{p.name.charAt(0)}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-slate-900"><PlatformMark p="FACEBOOK" size={14} />{p.name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[0.8125rem] text-slate-500">
                        <PlatformMark p="INSTAGRAM" size={14} />
                        {p.igUsername ? `@${p.igUsername}` : 'No Instagram business account linked'}
                      </span>
                    </span>
                    {p.connected && <Badge size="xs" variant="success">Connected</Badge>}
                    <span className={cn('h-4 w-4 rounded-full ring-2', pick === p.pageId ? 'bg-brand-600 ring-brand-600' : 'ring-slate-300')} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

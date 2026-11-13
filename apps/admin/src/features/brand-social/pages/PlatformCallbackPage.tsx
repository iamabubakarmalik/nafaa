/**
 * Sign-in with Threads, YouTube, TikTok, X or Pinterest lands here
 * (/social/accounts/callback/:platform?code&state). The page hands the code
 * to the API, which saves the account (auto-publish off), and shows the result.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, Plug } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHero, PageShell } from '@/design-system/components';
import { brandSocialApi, isOAuthPlatform, type SocialAccount } from '@/api/admin-brand-social.api';
import { apiError } from '@/lib/errors';
import { PLATFORM } from '../lib/platforms';
import { useInvalidate } from '../lib/queries';
import { AccountAvatar } from '../components/SocialUi';
import { usePlatformConnect } from './AccountsPage';

export default function PlatformCallbackPage() {
  const { platform: slug = '' } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const connect = usePlatformConnect();
  const started = useRef(false);
  const [done, setDone] = useState<{ account: SocialAccount; upgraded: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const key = slug.toUpperCase();
  const platform = isOAuthPlatform(key) ? key : null;
  const label = platform ? PLATFORM[platform].label : 'the platform';
  const code = sp.get('code');
  const state = sp.get('state');
  const denied = sp.get('error_description') || sp.get('error');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!platform) { setError('Unknown platform. Start again from Accounts.'); return; }
    if (denied) { setError(denied === 'access_denied' ? `Permission was not given on ${label}.` : denied); return; }
    if (!code || !state) { setError(`This page opens after signing in with ${label}. Start again from Accounts.`); return; }
    brandSocialApi.platformCallback(platform, { code, state })
      .then((r) => {
        setDone(r);
        invalidate();
        // Drop the one-time code from the address bar.
        window.history.replaceState(null, '', `/social/accounts/callback/${slug}`);
      })
      .catch((e) => setError(apiError(e, `${label} did not accept the sign-in. Try again.`)));
  }, [platform, code, state, denied, label, slug, invalidate]);

  return (
    <PageShell>
      <PageHero title={`Connect ${label}`} back="/social/accounts" backLabel="Accounts" />
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {error ? (
          <Card>
            <EmptyState icon={<AlertTriangle className="h-7 w-7 text-rose-500" />} title="Could not connect" description={error}
              action={<div className="flex gap-2">
                {platform && <Button leftIcon={<Plug className="h-4 w-4" />} loading={connect.isPending} onClick={() => connect.mutate(platform)}>Try again</Button>}
                <Link to="/social/accounts"><Button variant="secondary">Back to accounts</Button></Link>
              </div>} />
          </Card>
        ) : done ? (
          <Card>
            <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-success-600" />} title={`${label} connected`}
              description={`${done.upgraded ? 'The hand-posted account was upgraded in place. ' : ''}Turn on Auto-publish for it on the Accounts page, and approved posts will then go out on their own when due.`}
              action={<Button onClick={() => navigate('/social/accounts')}>Open accounts</Button>} />
            <div className="mx-auto mt-2 flex max-w-sm items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 mb-4">
              <AccountAvatar account={done.account} platform={done.account.platform} size={36} />
              <span className="min-w-0 flex-1"><b className="block truncate text-[0.875rem] text-slate-900">{done.account.name}</b><span className="text-[0.75rem] text-slate-500">{done.account.handle ?? label}</span></span>
              <Badge variant="success" size="xs">Connected</Badge>
            </div>
          </Card>
        ) : (
          <Card><div className="flex flex-col items-center gap-3 py-14 text-center"><Loader2 className="h-7 w-7 animate-spin text-brand-600" /><p className="text-[0.875rem] font-medium text-slate-700">Finishing the {label} sign-in…</p></div></Card>
        )}
      </div>
    </PageShell>
  );
}

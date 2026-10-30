/**
 * Shown on the Settings overview once setup is finished: the setup answers
 * now live in these settings. Offers to run the setup wizard again (data is
 * kept) and can be hidden for a week.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, RotateCcw, Shield, X } from 'lucide-react';
import { onboardingApi } from '@modules/onboarding/api/onboarding.api';
import { Button, IconButton, Modal } from '@/design-system/components';
import { t } from '@core/i18n';

const DISMISS_KEY = 'nafaa-onb-sync-dismissed';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function OnboardingSyncBanner() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const s = sessionStorage.getItem(DISMISS_KEY);
      return s ? Date.now() - JSON.parse(s).timestamp < WEEK : false;
    } catch { return false; }
  });

  const { data: progress } = useQuery({ queryKey: ['onboarding'], queryFn: onboardingApi.get, staleTime: 60000 });

  const resetMutation = useMutation({
    mutationFn: onboardingApi.reset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success(t('Setup dobara shuru ho raha hai'));
      setTimeout(() => navigate('/onboarding'), 500);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('Setup dobara shuru nahi hua')),
  });

  if (dismissed || !progress?.isCompleted) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify({ timestamp: Date.now() })); } catch { /* storage unavailable */ }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-brand-fg"><CheckCircle2 className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{t('Setup mukammal — jawab yahan settings me hain')}</p>
          <p className="text-xs text-slate-600">{t('Business, store, ghante aur payments sab yahan se badlein. Tabdeeli foran lagti hai.')}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setConfirmReset(true)} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>{t('Setup dobara')}</Button>
        <IconButton label={t('Hafte ke liye chhupayein')} onClick={dismiss}><X className="h-4 w-4" /></IconButton>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title={t('Setup dobara chalayein?')}
        description={t('Sirf setup wizard dobara chalega — aap ka data waisa hi rahega.')}
        footer={<>
          <Button variant="secondary" onClick={() => setConfirmReset(false)} disabled={resetMutation.isPending}>{t('Cancel')}</Button>
          <Button loading={resetMutation.isPending} onClick={() => resetMutation.mutate()}>{t('Haan, dobara chalayein')}</Button>
        </>}>
        <ul className="space-y-1.5 text-sm text-slate-700">
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success-600" /> {' '}{t('Products, customers aur Sales waise hi rahenge')}</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success-600" /> {' '}{t('Settings baad me bhi yahan se badal sakte hain')}</li>
          <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-amber-600" /> {' '}{t('Sirf bari tabdeeli (jaise business type) ke liye')}</li>
        </ul>
      </Modal>
    </>
  );
}

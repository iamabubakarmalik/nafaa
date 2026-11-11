/**
 * "Payout mangwayein": asks for the whole available balance after a
 * confirmation. The server checks the minimum, the payout account and
 * whether a request is already open; its message is shown as is.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { confirmDialog } from '@/design-system/components';
import { errorText } from '@/api/client';
import { partnerApi } from '@/api/partner.api';
import { useAuthStore } from '@/store/auth.store';
import { PAYOUT_METHOD } from '@/lib/labels';
import { pkr } from '@/lib/format';

export function usePayout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.me);
  const m = useMutation({
    mutationFn: partnerApi.requestPayout,
    onSuccess: (p) => {
      toast.success(`Payout request bhej di: ${pkr(p.amount)}`, { description: 'Nafaa team check karke paise bhejegi.' });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['earnings'] });
      void qc.invalidateQueries({ queryKey: ['payouts'] });
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const ask = async (available: number) => {
    if (!me?.payoutMethod || !me.payoutAccount) {
      const go = await confirmDialog({ title: 'Payout account nahi likha', text: 'Pehle Profile me JazzCash, Easypaisa ya bank account likhein.', yes: 'Profile kholein' });
      if (go) navigate('/profile#payout');
      return;
    }
    const ok = await confirmDialog({
      title: `${pkr(available)} ka payout mangwayein?`,
      text: `Paise ${PAYOUT_METHOD[me.payoutMethod]} (${me.payoutAccount}) par bheje jayenge. Pura available balance request me jayega.`,
      yes: 'Haan, mangwayein',
    });
    if (ok) m.mutate();
  };

  return { ask, busy: m.isPending };
}

/** Signs out: tells the server (best effort), clears tokens and cached data. */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { confirmDialog } from '@/design-system/components';
import { partnerApi } from '@/api/partner.api';
import { useAuthStore } from '@/store/auth.store';
import { useOutbox } from '@/offline/outbox';

export function useLogout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return useCallback(async () => {
    const waiting = useOutbox.getState().items.length;
    const ok = await confirmDialog(waiting
      ? { title: 'Log out karein?', text: `${waiting} visit abhi bheje nahi gaye. Wo phone me rahenge aur dobara sign in karne par chale jayenge.`, yes: 'Log out' }
      : { title: 'Log out karein?', yes: 'Log out' });
    if (!ok) return;
    const refreshToken = useAuthStore.getState().refreshToken;
    partnerApi.logout(refreshToken).catch(() => undefined);
    useAuthStore.getState().clear();
    qc.clear();
    navigate('/login', { replace: true });
  }, [navigate, qc]);
}

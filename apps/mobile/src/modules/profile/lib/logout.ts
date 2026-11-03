/** Sign out: warns when changes are not sent yet, and tells the server. */

import { authApi } from '@/core/auth/api';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { beforeLogout, dropUnsentAndWipe } from '@/core/offline';
import { confirm } from '@/design';

export async function signOut(): Promise<boolean> {
  const { pending } = await beforeLogout().catch(() => ({ pending: 0, issues: 0 }));
  const ok = await confirm({
    title: t('Logout karein?'),
    message: pending > 0
      ? t('{{count}} changes abhi bheje nahi gaye. Ye is phone par rahenge aur dobara login par bhej diye jayenge.', { count: pending })
      : t('Is device se login khatam ho jayega. Data mehfooz rahega.'),
    confirmLabel: t('Logout'),
    tone: 'danger',
  });
  if (!ok) return false;
  const { refreshToken, logout } = useAuthStore.getState();
  if (refreshToken) authApi.logout(refreshToken).catch(() => undefined);
  await logout();
  return true;
}

/** After the account or business is gone: nothing to keep on this phone. */
export async function signOutAndWipe(): Promise<void> {
  await dropUnsentAndWipe().catch(() => undefined);
  const { refreshToken, logout } = useAuthStore.getState();
  if (refreshToken) authApi.logout(refreshToken).catch(() => undefined);
  await logout();
}

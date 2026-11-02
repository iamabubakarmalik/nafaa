import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getElectron, isElectron } from './electron';
import { t } from '@core/i18n';

/**
 * Listen for deep-link navigation from OS.
 * Example: click nafaa://sales/123 in email → app opens & navigates to /sales/123
 */
export function useDesktopDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isElectron()) return;
    const electron = getElectron() as any;
    if (!electron?.onDeepLinkNavigate) return;

    return electron.onDeepLinkNavigate((path: string) => {
      toast.info(t('Opening: {{path}}', { path }), { duration: 2000 });
      navigate(path);
    });
  }, [navigate]);
}

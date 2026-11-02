import { toast } from 'sonner';
import { getElectron, isElectron } from './electron';
import { usePrinterStore } from './printerStore';
import { t } from '@core/i18n';

/**
 * Cash drawer opener — call after cash/card sale.
 * Uses same printer config for RJ11 kick pulse.
 */
export function useCashDrawer() {
  const openDrawer = async (): Promise<boolean> => {
    if (!isElectron()) {
      toast.info(t('Cash drawer sirf desktop app me kaam karta hai'));
      return false;
    }

    const electron = getElectron() as any;
    if (!electron?.cashDrawerOpen) return false;

    const { config, enabled } = usePrinterStore.getState();
    if (!enabled) {
      toast.warning(t('Pehle printer setup karein — cash drawer usi se juda hota hai'));
      return false;
    }

    if (config.connectionType === 'system') {
      toast.info(t('Cash drawer sirf network/USB thermal printer se open hota hai'));
      return false;
    }

    try {
      const result = await electron.cashDrawerOpen({
        connectionType: config.connectionType,
        ipAddress: config.ipAddress,
        port: config.port,
        type: config.type,
      });

      if (result.success) {
        toast.success(t('💰 Cash drawer khul gaya'));
        return true;
      } else {
        toast.error(t('Drawer nahi khula: {{message}}', { message: result.message }));
        return false;
      }
    } catch (e: any) {
      toast.error(t('Drawer error: {{message}}', { message: e.message }));
      return false;
    }
  };

  return { openDrawer };
}

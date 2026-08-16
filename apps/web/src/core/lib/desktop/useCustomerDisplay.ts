import { useCallback, useEffect, useState } from 'react';
import { getElectron, isElectron } from './electron';

/**
 * Customer Display — 2nd monitor for customer-facing cart view.
 * Call updateDisplay() whenever cart changes.
 */
export function useCustomerDisplay() {
  const [isOpen, setIsOpen] = useState(false);
  const [screens, setScreens] = useState<Array<any>>([]);

  const electron = getElectron() as any;

  useEffect(() => {
    if (!isElectron() || !electron?.customerDisplayIsOpen) return;
    electron.customerDisplayIsOpen().then(setIsOpen);
    electron.customerDisplayGetScreens?.().then(setScreens);
  }, [electron]);

  const open = useCallback(async () => {
    if (!electron?.customerDisplayOpen) return false;
    const result = await electron.customerDisplayOpen();
    setIsOpen(result.success);
    return result.success;
  }, [electron]);

  const close = useCallback(async () => {
    if (!electron?.customerDisplayClose) return;
    await electron.customerDisplayClose();
    setIsOpen(false);
  }, [electron]);

  const updateDisplay = useCallback(async (data: {
    mode?: 'cart' | 'thank-you';
    shopName?: string;
    items?: Array<{ name: string; quantity: number; price: number; total: number }>;
    subtotal?: number;
    discount?: number;
    total?: number;
    change?: number;
    paymentMethod?: string;
  }) => {
    if (!electron?.customerDisplayUpdate) return;
    await electron.customerDisplayUpdate(data);
  }, [electron]);

  return {
    isSupported: isElectron(),
    isOpen,
    screens,
    hasSecondScreen: screens.filter((s) => !s.isPrimary).length > 0,
    open,
    close,
    updateDisplay,
  };
}

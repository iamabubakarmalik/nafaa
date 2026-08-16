import { toast } from 'sonner';
import { getElectron, isElectron } from './electron';

/**
 * Barcode label printer — for pricing tags, stock labels.
 * Prints via HTML + JsBarcode CDN → any system printer.
 */
export function useLabelPrinter() {
  const printLabel = async (data: {
    productName: string;
    price: number;
    barcode: string;
    sku?: string;
    copies?: number;
    labelSize?: 'small' | 'medium' | 'large';
    showPrice?: boolean;
    showName?: boolean;
  }, printerName?: string): Promise<boolean> => {
    if (!isElectron()) {
      toast.info('Label printing sirf desktop app me kaam karta hai');
      return false;
    }

    const electron = getElectron() as any;
    if (!electron?.labelPrint) return false;

    try {
      const result = await electron.labelPrint(data, printerName);
      if (result.success) {
        toast.success(`${data.copies || 1} label print ho gayi`);
        return true;
      } else {
        toast.error(`Label print fail: ${result.message}`);
        return false;
      }
    } catch (e: any) {
      toast.error(`Label print error: ${e.message}`);
      return false;
    }
  };

  return { printLabel, isSupported: isElectron() };
}

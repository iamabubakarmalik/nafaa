import { getElectron, type ReceiptData } from './electron';
import { usePrinterStore } from './printerStore';
import { toast } from 'sonner';

/**
 * Print receipt — auto-detects desktop vs browser.
 *
 * - Desktop (Electron): Native thermal printer via configured IP
 * - Browser: Fallback to window.print() with formatted HTML
 */
export async function printReceipt(data: ReceiptData): Promise<boolean> {
  const electron = getElectron();
  const { config, enabled } = usePrinterStore.getState();

  // Desktop with thermal printer configured
  if (electron && enabled) {
    try {
      const result = await electron.printerReceipt(config, data);
      if (result.success) {
        toast.success('Receipt printed successfully');
        return true;
      } else {
        toast.error(`Print failed: ${result.message}`);
        // Fallback to browser print
        return browserPrintReceipt(data);
      }
    } catch (e: any) {
      toast.error(`Printer error: ${e.message}`);
      return browserPrintReceipt(data);
    }
  }

  // Browser fallback or desktop without configured printer
  return browserPrintReceipt(data);
}

/**
 * Test thermal printer (only works in desktop)
 */
export async function testPrinter(): Promise<boolean> {
  const electron = getElectron();
  if (!electron) {
    toast.error('Thermal printer sirf desktop app mein available hai');
    return false;
  }

  const { config } = usePrinterStore.getState();
  const result = await electron.printerTest(config);

  if (result.success) {
    toast.success('Printer connection successful! Test page print ho gaya');
    return true;
  } else {
    toast.error(`Printer test fail: ${result.message}`);
    return false;
  }
}

/**
 * Browser fallback — opens print dialog with HTML formatted receipt
 */
function browserPrintReceipt(data: ReceiptData): boolean {
  const html = generateReceiptHTML(data);
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    toast.error('Popup blocked — allow popups to print');
    return false;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, 250);

  return true;
}

function fmt(n: number): string {
  return 'Rs ' + n.toLocaleString('en-PK');
}

function generateReceiptHTML(d: ReceiptData): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt - ${d.invoiceNumber}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: 80mm;
    padding: 8px;
    margin: 0;
    color: #000;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .big { font-size: 16px; }
  .line { border-top: 1px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 2px 0; }
  th { border-bottom: 1px solid #000; }
  .total-row { border-top: 1px solid #000; font-weight: bold; }
</style>
</head>
<body>
  <div class="center bold big">${d.shopName}</div>
  ${d.shopAddress ? `<div class="center">${d.shopAddress}</div>` : ''}
  ${d.shopPhone ? `<div class="center">Phone: ${d.shopPhone}</div>` : ''}
  ${d.shopTaxNumber ? `<div class="center">Tax #: ${d.shopTaxNumber}</div>` : ''}
  <div class="line"></div>
  <div>Invoice: ${d.invoiceNumber}</div>
  <div>Date: ${d.date}</div>
  ${d.cashier ? `<div>Cashier: ${d.cashier}</div>` : ''}
  ${d.customer?.name ? `<div>Customer: ${d.customer.name}</div>` : ''}
  ${d.customer?.phone ? `<div>Phone: ${d.customer.phone}</div>` : ''}
  <div class="line"></div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Item</th>
        <th>Qty</th>
        <th class="right">Price</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${d.items
        .map(
          (i) => `<tr>
        <td>${i.name}</td>
        <td class="center">${i.quantity}${i.unit ? ' ' + i.unit : ''}</td>
        <td class="right">${fmt(i.price)}</td>
        <td class="right">${fmt(i.total)}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>
  <div class="line"></div>
  <table>
    <tr><td>Subtotal:</td><td class="right">${fmt(d.subtotal)}</td></tr>
    ${d.discount ? `<tr><td>Discount:</td><td class="right">-${fmt(d.discount)}</td></tr>` : ''}
    ${d.tax ? `<tr><td>Tax:</td><td class="right">${fmt(d.tax)}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL:</td><td class="right">${fmt(d.total)}</td></tr>
  </table>
  <div class="line"></div>
  ${d.paymentMethod ? `<div>Paid via: ${d.paymentMethod}</div>` : ''}
  <div>Paid: ${fmt(d.paid)}</div>
  ${d.change && d.change > 0 ? `<div>Change: ${fmt(d.change)}</div>` : ''}
  <div class="line"></div>
  <div class="center">${d.footerText || 'Shukriya! Phir tashreef laaiye'}</div>
  <div class="center" style="margin-top:8px">Powered by Nafaa.pk</div>
</body>
</html>`;
}

import { ipcMain, BrowserWindow } from 'electron';
import log from 'electron-log';

/* ═══════════════════════════════════════════════════════════
   BARCODE LABEL PRINTER
   ─────────────────────────────────────────────────────────
   Prints product labels with:
   • Product name
   • Price
   • Barcode (CODE128)
   Multi-copy support (e.g. 50 stickers ek din me)
   ═══════════════════════════════════════════════════════════ */

export interface LabelData {
  productName: string;
  price: number;
  barcode: string;
  sku?: string;
  copies?: number;
  labelSize?: 'small' | 'medium' | 'large'; // 40mm / 60mm / 80mm
  showPrice?: boolean;
  showName?: boolean;
}

/**
 * Generate HTML for barcode labels (multiple copies per page)
 */
function generateLabelHTML(data: LabelData): string {
  const copies = data.copies || 1;
  const labelSize = data.labelSize || 'medium';

  const sizes = {
    small: { width: 40, height: 25, fontSize: 8, barcodeHeight: 30 },
    medium: { width: 60, height: 40, fontSize: 10, barcodeHeight: 40 },
    large: { width: 80, height: 50, fontSize: 12, barcodeHeight: 50 },
  };
  const s = sizes[labelSize];

  const labelHTML = Array(copies).fill(0).map(() => `
    <div class="label">
      ${data.showName !== false ? `<div class="name">${escapeHtml(data.productName)}</div>` : ''}
      ${data.showPrice !== false ? `<div class="price">Rs ${data.price.toLocaleString('en-PK')}</div>` : ''}
      <svg class="barcode" id="bc-${Math.random().toString(36).slice(2, 8)}" data-value="${escapeHtml(data.barcode)}"></svg>
      <div class="code">${escapeHtml(data.barcode)}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Barcode Labels</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<style>
  @page { size: A4; margin: 5mm; }
  body {
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 2mm;
  }
  .label {
    width: ${s.width}mm;
    height: ${s.height}mm;
    padding: 2mm;
    border: 1px dashed #ccc;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    box-sizing: border-box;
    page-break-inside: avoid;
  }
  .name {
    font-size: ${s.fontSize}pt;
    font-weight: 700;
    line-height: 1.1;
    max-height: ${s.fontSize * 2.5}pt;
    overflow: hidden;
    color: #000;
  }
  .price {
    font-size: ${s.fontSize + 2}pt;
    font-weight: 900;
    color: #000;
    margin-top: 1mm;
  }
  .barcode { margin-top: 1mm; width: 100%; height: ${s.barcodeHeight * 0.4}mm; }
  .code {
    font-size: ${s.fontSize - 2}pt;
    color: #333;
    font-family: 'Menlo', monospace;
    letter-spacing: 0.5px;
  }
  @media print {
    .label { border: none; }
  }
</style>
</head>
<body>
  ${labelHTML}
  <script>
    window.addEventListener('load', () => {
      document.querySelectorAll('svg.barcode').forEach(el => {
        try {
          JsBarcode(el, el.dataset.value, {
            format: 'CODE128',
            displayValue: false,
            height: ${s.barcodeHeight},
            width: 1.5,
            margin: 0,
          });
        } catch (e) {
          el.outerHTML = '<div style="color:red;font-size:8pt">Invalid barcode: ' + el.dataset.value + '</div>';
        }
      });
      setTimeout(() => window.print(), 500);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Print labels — opens hidden print window
 */
async function printLabels(data: LabelData, printerName?: string): Promise<{ success: boolean; message?: string }> {
  return new Promise((resolve) => {
    try {
      const html = generateLabelHTML(data);

      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      printWindow.webContents.on('did-finish-load', () => {
        // Wait for JsBarcode to render
        setTimeout(() => {
          const printOptions: Electron.WebContentsPrintOptions = {
            silent: !!printerName,
            printBackground: true,
            deviceName: printerName,
            copies: 1,
            margins: { marginType: 'none' },
            pageSize: 'A4',
          };

          printWindow.webContents.print(printOptions, (success, failureReason) => {
            printWindow.close();
            if (success) {
              log.info(`Label print successful (${data.copies} copies)`);
              resolve({ success: true });
            } else {
              log.error(`Label print failed: ${failureReason}`);
              resolve({ success: false, message: failureReason || 'Print cancelled' });
            }
          });
        }, 1000);
      });

      printWindow.webContents.on('did-fail-load', (_e, code, description) => {
        printWindow.close();
        resolve({ success: false, message: `Load failed: ${description}` });
      });
    } catch (e: any) {
      log.error('printLabels error:', e);
      resolve({ success: false, message: e.message });
    }
  });
}

export function setupLabelPrinterHandlers() {
  ipcMain.handle('label:print', async (_event, data: LabelData, printerName?: string) => {
    return printLabels(data, printerName);
  });

  log.info('Label printer handlers registered');
}

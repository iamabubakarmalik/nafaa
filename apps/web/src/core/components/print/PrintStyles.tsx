/**
 * Poori app ka print CSS — ek jagah.
 *
 * Kyun: kai pages par Print button to tha lekin print CSS nahi, is liye
 * kaghaz par sidebar, gradient hero aur dark background sab chhap jate the.
 * Ab har page sirf `<PrintStyles />` lagata hai aur print saaf nikalta hai.
 *
 * `orientation`:
 *   'portrait'  — list aur detail pages (default)
 *   'landscape' — chaure tables (sales, stock, IMEI list)
 */
export function PrintStyles({
  orientation = 'portrait',
  title,
  subtitle,
}: {
  orientation?: 'portrait' | 'landscape';
  /** Print par upar chhapne wala heading (screen par nahi dikhta) */
  title?: string;
  subtitle?: string;
}) {
  return (
    <>
      {title && (
        <div className="hidden print:block mb-4">
          <div className="flex items-end justify-between border-b-4 border-slate-900 pb-2">
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">{title}</h1>
              {subtitle && <p className="text-[11px] text-slate-600 font-semibold mt-0.5">{subtitle}</p>}
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase font-bold text-slate-500">Generated</div>
              <div className="text-[11px] font-bold text-slate-900">
                {new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4 ${orientation}; margin: 10mm 8mm; }

          /* Kaghaz hamesha safed — dark mode print me nahi jana chahiye */
          html, body, #root {
            background: #fff !important;
            color: #0f172a !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          .dark body, .dark, .dark * {
            background-color: transparent !important;
            color: #0f172a !important;
            border-color: #cbd5e1 !important;
          }

          .print\\:hidden { display: none !important; }
          .print\\:block  { display: block !important; }

          /* App ka chrome — sidebar, topbar, floating cheezein */
          aside[class*="sidebar"], nav[class*="sidebar"],
          header[class*="topbar"], [data-app-chrome],
          [class*="fixed"] { display: none !important; }

          /* Toasts / overlays */
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; }

          /* Gradient hero aur bhaari shadows kaghaz par bekaar lagte hain */
          [class*="bg-gradient"] {
            background: #f1f5f9 !important;
            color: #0f172a !important;
          }
          section, div, table { box-shadow: none !important; }

          /* Table ki rows beech se na tootein */
          tr, .print-keep { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }

          /* Charts kaghaz par dhang se nahi aate — chhupa do */
          .recharts-wrapper, .recharts-responsive-container { display: none !important; }
          .print\\:show-chart .recharts-wrapper,
          .print\\:show-chart .recharts-responsive-container { display: block !important; }
        }
      `}</style>
    </>
  );
}

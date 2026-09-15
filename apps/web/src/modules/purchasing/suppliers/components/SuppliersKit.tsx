import { useEffect } from 'react';
import { X, GraduationCap, Printer, Keyboard } from 'lucide-react';

/* ═════════════════════════════════════════════════════════════
   SUPPLIERS KIT — teeno safhon ka sanjha saman
   ─────────────────────────────────────────────────────────────
   List, form aur detail — teeno ek hi zaban bolte hain. Hero ka
   gradient, KPI ka card, teacher modal, print ka kaghaz: sab
   yahin se aata hai taake teen jagah teen tarah ka na lage.
   ═════════════════════════════════════════════════════════════ */

export const SUPPLIER_GRADIENT = 'from-slate-950 via-teal-900 to-emerald-700';

export const fmtDate = (v?: string | Date | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v)) : '—';

export const fmtDateTime = (v?: string | Date | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : '—';

export const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

export const initials = (name?: string | null) =>
  (name ?? '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/** "12 din pehle" — number se zyada samajh aata hai */
export const daysPhrase = (d: number | null | undefined) => {
  if (d === null || d === undefined) return 'kabhi nahi';
  if (d === 0) return 'aaj';
  if (d === 1) return 'kal';
  if (d < 30) return `${d} din pehle`;
  if (d < 365) return `${Math.floor(d / 30)} mahine pehle`;
  return `${Math.floor(d / 365)} saal pehle`;
};

/** Pakistan ke number ko WhatsApp wala shakl */
export const waNumber = (phone?: string | null) => {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('92')) return d;
  if (d.startsWith('0')) return `92${d.slice(1)}`;
  if (d.length === 10) return `92${d}`;
  return d;
};

export const PAY_META: Record<string, { label: string; hex: string }> = {
  CASH: { label: 'Cash', hex: '#10b981' },
  CARD: { label: 'Card', hex: '#3b82f6' },
  JAZZCASH: { label: 'JazzCash', hex: '#e11d48' },
  EASYPAISA: { label: 'EasyPaisa', hex: '#84cc16' },
  BANK_TRANSFER: { label: 'Bank', hex: '#8b5cf6' },
  CREDIT: { label: 'Udhaar', hex: '#f59e0b' },
  OTHER: { label: 'Doosra', hex: '#64748b' },
};
export const payMeta = (m?: string | null) => PAY_META[m ?? 'OTHER'] ?? PAY_META.OTHER;

/* ─────────────────── Chhote purzay ─────────────────── */

export const inputCls =
  'w-full h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-[#ffffff] dark:bg-slate-800 ' +
  'px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 ' +
  'focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-500/30 transition';

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-mono text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
      {children}
    </span>
  );
}

export function Kpi({ icon: Icon, label, value, sub, tone = 'slate', onClick, active, hint }: {
  icon: any; label: string; value: React.ReactNode; sub?: React.ReactNode;
  tone?: 'slate' | 'teal' | 'emerald' | 'rose' | 'amber' | 'blue' | 'violet' | 'indigo';
  onClick?: () => void; active?: boolean; hint?: string;
}) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    teal: 'from-teal-500 to-emerald-700',
    emerald: 'from-emerald-500 to-green-700',
    rose: 'from-rose-500 to-red-700',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-indigo-700',
    violet: 'from-violet-500 to-purple-700',
    indigo: 'from-indigo-500 to-blue-700',
  };
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} title={hint}
      className={[
        'relative overflow-hidden rounded-2xl border-2 p-3 sm:p-4 text-left w-full transition',
        'bg-[#ffffff] dark:bg-slate-900',
        active ? 'border-teal-500 ring-2 ring-teal-200 dark:ring-teal-500/30'
               : 'border-slate-200 dark:border-slate-800',
        onClick ? 'hover:border-teal-400 hover:shadow-lg active:scale-[0.98] cursor-pointer' : '',
      ].join(' ')}>
      <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${tones[tone]} opacity-10`} />
      <div className={`relative h-9 w-9 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="relative mt-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="relative text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
      {sub && <div className="relative text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{sub}</div>}
    </Tag>
  );
}

export function Panel({ icon: Icon, title, desc, tone = 'teal', right, children, className = '' }: {
  icon?: any; title: string; desc?: string; tone?: string; right?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  const tones: Record<string, string> = {
    teal: 'from-teal-500 to-emerald-700', blue: 'from-blue-500 to-indigo-700',
    rose: 'from-rose-500 to-red-700', amber: 'from-amber-500 to-orange-600',
    violet: 'from-violet-500 to-purple-700', emerald: 'from-emerald-500 to-green-700',
    slate: 'from-slate-500 to-slate-700', indigo: 'from-indigo-500 to-blue-700',
  };
  return (
    <section className={`rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${tones[tone] ?? tones.teal} text-white flex items-center justify-center shadow shrink-0`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white truncate">{title}</h3>
            {desc && <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{desc}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Empty({ icon: Icon, title, desc, action }: { icon: any; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="py-14 text-center">
      <div className="h-16 w-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <p className="font-black text-slate-800 dark:text-slate-200">{title}</p>
      {desc && <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ title, subtitle, icon, onClose, children, wide }: {
  title: string; subtitle?: string; icon?: React.ReactNode; onClose: () => void;
  children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} bg-[#ffffff] dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col`}>
        <div className={`shrink-0 relative bg-gradient-to-br ${SUPPLIER_GRADIENT} text-white px-5 py-4 overflow-hidden`}>
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-black flex items-center gap-2">{icon}{title}</h3>
              {subtitle && <p className="text-xs font-bold text-white/85 mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────── Teacher ─────────────────── */

export function Teacher({ title, subtitle, steps, tips, onClose }: {
  title: string; subtitle?: string;
  steps: Array<{ icon?: string; head: string; body: string }>;
  tips?: string[];
  onClose: () => void;
}) {
  return (
    <Modal title={title} subtitle={subtitle} icon={<GraduationCap className="h-5 w-5" />} onClose={onClose} wide>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white flex items-center justify-center font-black shrink-0">
              {s.icon ?? i + 1}
            </div>
            <div className="min-w-0">
              <div className="font-black text-slate-900 dark:text-white text-sm">{s.head}</div>
              <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{s.body}</p>
            </div>
          </div>
        ))}
        {tips && tips.length > 0 && (
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
            <div className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider mb-2">💡 Kaam ki baatein</div>
            <ul className="space-y-1.5">
              {tips.map((t, i) => (
                <li key={i} className="text-[13px] font-semibold text-amber-900 dark:text-amber-100 flex gap-2">
                  <span className="text-amber-500">•</span><span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function Shortcuts({ list, onClose }: { list: Array<[string, string]>; onClose: () => void }) {
  return (
    <Modal title="Keyboard Shortcuts" subtitle="Haath mouse par le jane ki zaroorat nahi"
      icon={<Keyboard className="h-5 w-5" />} onClose={onClose}>
      <div className="space-y-2">
        {list.map(([k, d]) => (
          <div key={k} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{d}</span>
            <Kbd>{k}</Kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ─────────────────── Print + CSV ─────────────────── */

export function printHtml(html: string) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) { alert('Print window khul nahi saki — popup allow karein'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 350);
}

export function a4Shell(title: string, body: string, meta?: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { font-size: 11px; color: #64748b; margin-bottom: 14px; }
  .bar { height: 4px; background: linear-gradient(90deg,#0d9488,#059669); border-radius: 999px; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; background: #f1f5f9; padding: 7px 8px; font-size: 10px;
       text-transform: uppercase; letter-spacing: .04em; border-bottom: 2px solid #cbd5e1; }
  td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .r { text-align: right; } .num { font-variant-numeric: tabular-nums; }
  .cards { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  .card { flex: 1 1 130px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; }
  .card .l { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: .05em; }
  .card .v { font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .foot { margin-top: 16px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  .due { color: #be123c; font-weight: 800; }
  .ok { color: #047857; font-weight: 800; }
</style></head><body>
<h1>${title}</h1>
<div class="sub">${meta ?? ''}</div>
<div class="bar"></div>
${body}
<div class="foot">Nafaa — ${new Date().toLocaleString('en-PK')}</div>
</body></html>`;
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  // Excel ko UTF-8 batane ke liye BOM — warna Urdu/PKR alamat toot jati hai
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const printAction = (fn: () => void) => ({ icon: Printer, onClick: fn });

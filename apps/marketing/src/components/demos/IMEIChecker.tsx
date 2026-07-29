'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Check, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';

interface IMEIResult {
  imei: string;
  brand: string;
  model: string;
  ptaStatus: 'approved' | 'non-pta' | 'pending';
  taxDue: number;
  inStock: boolean;
}

const sampleResults: Record<string, IMEIResult> = {
  '356789104567890': { imei: '356789104567890', brand: 'Apple', model: 'iPhone 15 Pro', ptaStatus: 'approved', taxDue: 0, inStock: true },
  '356789104567891': { imei: '356789104567891', brand: 'Samsung', model: 'Galaxy S24 Ultra', ptaStatus: 'non-pta', taxDue: 135000, inStock: false },
  '356789104567892': { imei: '356789104567892', brand: 'Xiaomi', model: 'Redmi Note 13 Pro', ptaStatus: 'approved', taxDue: 0, inStock: true },
};

export function IMEIChecker() {
  const [imei, setImei] = useState('');
  const [result, setResult] = useState<IMEIResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const check = async () => {
    if (imei.length < 14) return;
    setChecking(true);
    setResult(null);
    setNotFound(false);
    await new Promise((r) => setTimeout(r, 1000));
    setChecking(false);
    const found = sampleResults[imei] || (imei.startsWith('35') ? { imei, brand: 'Apple', model: 'iPhone 15', ptaStatus: 'approved' as const, taxDue: 0, inStock: Math.random() > 0.5 } : null);
    if (found) setResult(found);
    else setNotFound(true);
  };

  const statusCfg = {
    approved: { label: 'PTA Approved', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400', icon: Check },
    'non-pta': { label: 'Non-PTA', cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400', icon: AlertTriangle },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400', icon: AlertTriangle },
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
      <div className="flex items-center gap-2 mb-6">
        <Smartphone className="h-5 w-5 text-violet-600" />
        <span className="font-display font-bold text-lg">IMEI & PTA Status Checker</span>
      </div>

      <div className="flex gap-2 mb-5">
        <input value={imei} onChange={(e) => setImei(e.target.value.replace(/\D/g, '').slice(0, 15))}
          placeholder="Enter 15-digit IMEI number"
          className="flex-1 h-12 px-4 rounded-xl bg-ink-50 dark:bg-ink-900 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500 outline-none font-mono text-sm tracking-wider" />
        <Button onClick={check} disabled={imei.length < 14 || checking} leftIcon={!checking ? <Search className="h-4 w-4" /> : undefined}>
          {checking ? 'Checking...' : 'Check'}
        </Button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        <span className="text-xs text-ink-500">Try a sample:</span>
        {Object.keys(sampleResults).map((s) => (
          <button key={s} onClick={() => setImei(s)} className="text-xs font-mono px-2 py-1 rounded-md bg-ink-100 dark:bg-ink-900 hover:bg-brand-100 dark:hover:bg-brand-950/40 transition">
            {s.slice(0, 6)}...
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div key={result.imei} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl bg-ink-50 dark:bg-ink-900 p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-3xl">📱</div>
              <div className="flex-1">
                <div className="font-display font-extrabold text-xl">{result.brand} {result.model}</div>
                <div className="text-xs font-mono text-ink-500">IMEI: {result.imei}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white dark:bg-ink-800 p-3 text-center">
                <div className="text-[10px] font-mono uppercase font-bold text-ink-500">PTA status</div>
                <div className={cn('mt-1 inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full', statusCfg[result.ptaStatus].cls)}>
                  {(() => { const Icon = statusCfg[result.ptaStatus].icon; return <Icon className="h-3 w-3" /> })()}
                  {statusCfg[result.ptaStatus].label}
                </div>
              </div>
              <div className="rounded-xl bg-white dark:bg-ink-800 p-3 text-center">
                <div className="text-[10px] font-mono uppercase font-bold text-ink-500">Tax due</div>
                <div className={cn('mt-1 font-bold tabular-nums', result.taxDue > 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {result.taxDue > 0 ? `Rs ${result.taxDue.toLocaleString()}` : 'None'}
                </div>
              </div>
              <div className="rounded-xl bg-white dark:bg-ink-800 p-3 text-center">
                <div className="text-[10px] font-mono uppercase font-bold text-ink-500">In stock</div>
                <div className={cn('mt-1 font-bold', result.inStock ? 'text-emerald-600' : 'text-amber-600')}>
                  {result.inStock ? 'Yes' : 'No'}
                </div>
              </div>
            </div>

            <Button fullWidth className="mt-4">Add to sale</Button>
          </motion.div>
        )}

        {notFound && (
          <motion.div key="nf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-5 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <p className="text-sm text-amber-700 dark:text-amber-400">IMEI not found in inventory. Add it as a new device?</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

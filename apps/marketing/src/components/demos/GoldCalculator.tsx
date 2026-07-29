'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gem, TrendingUp } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';

const karats = [
  { id: '24', label: '24K', purity: 0.999, color: '#f4c531' },
  { id: '22', label: '22K', purity: 0.916, color: '#eab308' },
  { id: '21', label: '21K', purity: 0.875, color: '#ca8a04' },
  { id: '18', label: '18K', purity: 0.750, color: '#a16207' },
];

export function GoldCalculator() {
  const [karat, setKarat] = useState(karats[1]);
  const [weight, setWeight] = useState(10); // grams
  const [making, setMaking] = useState(15); // percent
  const [liveRate, setLiveRate] = useState(218500); // per 10g 24K

  // Simulated live rate fluctuation
  useEffect(() => {
    const t = setInterval(() => {
      setLiveRate((r) => r + Math.floor((Math.random() - 0.45) * 200));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const perGram24 = liveRate / 10;
  const perGram = perGram24 * karat.purity;
  const goldValue = perGram * weight;
  const makingCharge = goldValue * (making / 100);
  const total = goldValue + makingCharge;

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Gem className="h-5 w-5 text-gold" />
          <span className="font-display font-bold text-lg">Live Gold Rate Calculator</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-mono font-bold text-emerald-600">LIVE</span>
        </div>
      </div>

      {/* Live rate banner */}
      <div className="rounded-2xl bg-gradient-to-br from-gold/10 to-amber-500/10 p-4 mb-5 flex items-center justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500">24K rate (per 10g)</div>
          <motion.div key={liveRate} initial={{ opacity: 0.5, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="font-display font-extrabold text-2xl tabular-nums">
            Rs {liveRate.toLocaleString()}
          </motion.div>
        </div>
        <TrendingUp className="h-8 w-8 text-emerald-600" />
      </div>

      <div className="space-y-5">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500 mb-2">Karat purity</div>
          <div className="grid grid-cols-4 gap-2">
            {karats.map((k) => (
              <button key={k.id} onClick={() => setKarat(k)}
                className={cn('rounded-xl p-3 text-center ring-1 ring-inset transition',
                  karat.id === k.id ? 'text-white ring-transparent' : 'bg-ink-50 dark:bg-ink-900 ring-ink-200 dark:ring-ink-700')}
                style={karat.id === k.id ? { background: `linear-gradient(135deg, ${k.color}, ${k.color}dd)` } : {}}>
                <div className="font-display font-extrabold">{k.label}</div>
                <div className="text-[10px] opacity-80">{(k.purity * 100).toFixed(1)}%</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500">Weight (grams)</span>
            <span className="font-bold tabular-nums">{weight}g</span>
          </div>
          <input type="range" min={1} max={500} value={weight} onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-ink-100 dark:bg-ink-700 accent-gold cursor-pointer" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500">Making charges</span>
            <span className="font-bold tabular-nums">{making}%</span>
          </div>
          <input type="range" min={0} max={30} value={making} onChange={(e) => setMaking(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-ink-100 dark:bg-ink-700 accent-gold cursor-pointer" />
        </div>

        {/* Results */}
        <div className="rounded-2xl bg-ink-50 dark:bg-ink-900 p-5 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">{karat.label} rate per gram</span>
            <span className="font-bold tabular-nums">Rs {perGram.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Gold value ({weight}g)</span>
            <span className="font-bold tabular-nums">Rs {goldValue.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Making charges ({making}%)</span>
            <span className="font-bold tabular-nums">Rs {makingCharge.toFixed(0)}</span>
          </div>
          <div className="pt-2.5 border-t border-ink-200 dark:border-ink-700 flex justify-between">
            <span className="font-display font-bold text-lg">Total price</span>
            <span className="font-display font-extrabold text-2xl text-gradient-brand tabular-nums">Rs {total.toFixed(0)}</span>
          </div>
        </div>

        <Button fullWidth>Generate invoice</Button>
        <p className="text-center text-xs text-ink-400">Live rates simulated for demo · Real Nafaa pulls actual Karachi Sarafa rates</p>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, Check, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';

const sizes = [
  { id: '1lb', label: '1 lb', price: 1200, emoji: '🧁' },
  { id: '2lb', label: '2 lb', price: 2200, emoji: '🍰' },
  { id: '3lb', label: '3 lb', price: 3200, emoji: '🎂' },
  { id: '5lb', label: '5 lb', price: 5200, emoji: '🎉' },
];

const flavors = [
  { id: 'chocolate', label: 'Chocolate', emoji: '🍫', price: 0 },
  { id: 'vanilla', label: 'Vanilla', emoji: '🥛', price: 0 },
  { id: 'red-velvet', label: 'Red Velvet', emoji: '❤️', price: 200 },
  { id: 'pistachio', label: 'Pistachio', emoji: '🟢', price: 300 },
];

const toppings = [
  { id: 'photo', label: 'Photo Print', emoji: '📸', price: 500 },
  { id: 'candles', label: 'Candles', emoji: '🕯️', price: 100 },
  { id: 'msg', label: 'Custom Message', emoji: '✍️', price: 200 },
  { id: 'fondant', label: 'Fondant Design', emoji: '🎨', price: 800 },
];

export function CakeBuilder() {
  const [size, setSize] = useState(sizes[1]);
  const [flavor, setFlavor] = useState(flavors[0]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const total = size.price + flavor.price + selectedToppings.reduce((s, id) => s + (toppings.find((t) => t.id === id)?.price || 0), 0);

  const toggleTopping = (id: string) => {
    setSelectedToppings((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
      <div className="flex items-center gap-2 mb-6">
        <Cake className="h-5 w-5 text-amber-600" />
        <span className="font-display font-bold text-lg">Custom Cake Order Builder</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-8 flex flex-col items-center justify-center min-h-[280px]">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }} className="text-8xl mb-4">
            {size.emoji}
          </motion.div>
          <div className="text-center">
            <div className="font-display font-extrabold text-2xl">{size.label} {flavor.label}</div>
            <div className="text-sm text-ink-500 mt-1">
              {selectedToppings.length > 0 ? `+ ${selectedToppings.map((id) => toppings.find((t) => t.id === id)?.label).join(', ')}` : 'Plain cake'}
            </div>
            {message && (
              <div className="mt-3 px-4 py-2 rounded-xl bg-white dark:bg-ink-800 text-sm italic">"{message}"</div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-5">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500 mb-2">Size</div>
            <div className="grid grid-cols-4 gap-2">
              {sizes.map((s) => (
                <button key={s.id} onClick={() => setSize(s)}
                  className={cn('rounded-xl p-3 text-center ring-1 ring-inset transition',
                    size.id === s.id ? 'bg-gradient-brand text-white ring-transparent' : 'bg-ink-50 dark:bg-ink-900 ring-ink-200 dark:ring-ink-700')}>
                  <div className="text-2xl">{s.emoji}</div>
                  <div className="text-xs font-bold mt-1">{s.label}</div>
                  <div className="text-[10px] tabular-nums">Rs {s.price}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500 mb-2">Flavor</div>
            <div className="grid grid-cols-4 gap-2">
              {flavors.map((f) => (
                <button key={f.id} onClick={() => setFlavor(f)}
                  className={cn('rounded-xl p-3 text-center ring-1 ring-inset transition',
                    flavor.id === f.id ? 'bg-gradient-brand text-white ring-transparent' : 'bg-ink-50 dark:bg-ink-900 ring-ink-200 dark:ring-ink-700')}>
                  <div className="text-xl">{f.emoji}</div>
                  <div className="text-xs font-bold mt-0.5">{f.label}</div>
                  {f.price > 0 && <div className="text-[10px] tabular-nums">+Rs {f.price}</div>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500 mb-2">Toppings</div>
            <div className="grid grid-cols-2 gap-2">
              {toppings.map((t) => {
                const selected = selectedToppings.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggleTopping(t.id)}
                    className={cn('flex items-center gap-2 rounded-xl p-2.5 ring-1 ring-inset transition text-left',
                      selected ? 'bg-brand-50 dark:bg-brand-950/40 ring-brand-400' : 'bg-ink-50 dark:bg-ink-900 ring-ink-200 dark:ring-ink-700')}>
                    <span className="text-lg">{t.emoji}</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold">{t.label}</div>
                      <div className="text-[10px] tabular-nums">+Rs {t.price}</div>
                    </div>
                    {selected && <Check className="h-4 w-4 text-brand-600" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedToppings.includes('msg') && (
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Cake message (e.g., Happy Birthday Ali)"
              className="w-full h-11 px-4 rounded-xl bg-ink-50 dark:bg-ink-900 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
          )}

          {/* Total + Add */}
          <div className="pt-4 border-t border-ink-100 dark:border-ink-700/60">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold">Total</span>
              <span className="font-display font-extrabold text-2xl text-gradient-brand tabular-nums">Rs {total.toLocaleString()}</span>
            </div>
            <Button fullWidth leftIcon={<ShoppingCart className="h-4 w-4" />}>Add to order</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

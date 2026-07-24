import { useState } from 'react';
import {
  Bell, Phone, DoorOpen, PackageCheck, Building,
  Camera, Volume2,
} from 'lucide-react';
import { Card, Input } from '@/ui';
import { cn } from '@/lib/cn';

interface Props {
  onChange: (data: { instruction: string; leaveAt: string; contact: string; details: string }) => void;
}

const QUICK_INSTRUCTIONS = [
  { key: 'ring_bell',      icon: Bell,          label: 'Ring the bell' },
  { key: 'call_arrival',   icon: Phone,         label: 'Call on arrival' },
  { key: 'leave_at_door',  icon: DoorOpen,      label: 'Leave at door' },
  { key: 'contactless',    icon: PackageCheck,  label: 'Contactless delivery' },
  { key: 'reception',      icon: Building,      label: 'Leave at reception' },
  { key: 'silent',         icon: Volume2,       label: 'Silent knock' },
  { key: 'photo_proof',    icon: Camera,        label: 'Take photo when delivered' },
];

export function DeliveryInstructionsSelector({ onChange }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customNote, setCustomNote] = useState('');

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
    updateParent(next, customNote);
  };

  const updateNote = (note: string) => {
    setCustomNote(note);
    updateParent(selected, note);
  };

  const updateParent = (s: Set<string>, note: string) => {
    const labels = QUICK_INSTRUCTIONS.filter((i) => s.has(i.key)).map((i) => i.label);
    const combined = [...labels, note].filter(Boolean).join('. ');
    onChange({ instruction: combined, leaveAt: '', contact: '', details: '' });
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-black text-content-muted uppercase tracking-wider">
        Delivery preferences
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {QUICK_INSTRUCTIONS.map((inst) => {
          const Icon = inst.icon;
          const active = selected.has(inst.key);
          return (
            <button
              key={inst.key}
              type="button"
              onClick={() => toggle(inst.key)}
              className={cn(
                'p-3 rounded-2xl border-2 flex items-center gap-2 transition text-left',
                active
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                  : 'border-border bg-surface hover:border-brand-300',
              )}
            >
              <Icon className={cn(
                'h-4 w-4 shrink-0',
                active ? 'text-brand-600' : 'text-content-muted',
              )} />
              <span className={cn(
                'text-xs font-bold',
                active ? 'text-brand-700 dark:text-brand-400' : 'text-content-muted',
              )}>
                {inst.label}
              </span>
            </button>
          );
        })}
      </div>

      <textarea
        value={customNote}
        onChange={(e) => updateNote(e.target.value)}
        placeholder="Any other specific instructions?"
        rows={2}
        maxLength={200}
        className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none"
      />
    </div>
  );
}

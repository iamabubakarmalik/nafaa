/**
 * Customize the dashboard: which widgets show, their order and width, which
 * headline numbers appear, and the daily sales target. Every change applies
 * and saves immediately.
 */

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, GripVertical, Lock } from 'lucide-react';
import { Badge, Button, IconButton, Input, Modal, Switch, Tabs } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { useOverview } from '../data/queries';
import { IconBubble } from './parts';
import type { DashboardConfig, WidgetSize } from './types';
import type { CustomizeTab, DashboardContextValue } from './useDashboardLayout';

const SIZE_LABEL: Record<WidgetSize, string> = { third: 'S', half: 'M', wide: 'L', full: 'Full' };
const SIZE_ORDER: WidgetSize[] = ['third', 'half', 'wide', 'full'];
const MAX_KPIS = 8;

interface Props {
  open: boolean;
  tab: CustomizeTab;
  onTab: (tab: CustomizeTab) => void;
  onClose: () => void;
  config: DashboardConfig;
  layout: DashboardContextValue;
  costHidden: boolean;
}

function WidgetsTab({ layout, costHidden }: Pick<Props, 'layout' | 'costHidden'>) {
  const { widgets: items, setVisible, setSize, moveTo } = layout;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <ul className="-mx-1 divide-y divide-slate-100">
      {items.map(({ widget, visible, size }, index) => {
        const sizes = SIZE_ORDER.filter((s) => (widget.sizes ?? [widget.size]).includes(s));
        return (
          <li
            key={widget.id}
            draggable
            onDragStart={(e) => { setDragId(widget.id); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); setOverIndex(index); }}
            onDragEnd={() => { setDragId(null); setOverIndex(null); }}
            onDrop={(e) => { e.preventDefault(); if (dragId) moveTo(dragId, index); setDragId(null); setOverIndex(null); }}
            className={cn(
              'flex flex-wrap items-center gap-x-2 gap-y-2 px-1 py-2.5 transition sm:flex-nowrap',
              dragId === widget.id && 'opacity-40',
              overIndex === index && dragId && dragId !== widget.id && 'bg-brand-50',
            )}
          >
            <GripVertical className="hidden h-4 w-4 shrink-0 cursor-grab text-slate-400 sm:block" aria-hidden />
            <div className="flex shrink-0 flex-col">
              <IconButton label={`${widget.title} upar`} size="sm" disabled={index === 0} onClick={() => moveTo(widget.id, index - 1)}>
                <ArrowUp className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton label={`${widget.title} neeche`} size="sm" disabled={index === items.length - 1} onClick={() => moveTo(widget.id, index + 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
              </IconButton>
            </div>
            <div className={cn('min-w-0 flex-1', !visible && 'opacity-55')}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[0.875rem] font-medium text-slate-900">{widget.title}</span>
                {widget.sensitive && costHidden && <Badge variant="outline" size="xs"><Lock className="mr-1 h-3 w-3" />Cost lock</Badge>}
              </div>
              <p className="text-[0.75rem] text-slate-500">{widget.description}</p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-3">
              {sizes.length > 1 && (
                <div role="radiogroup" aria-label={`${widget.title} size`} className="inline-flex rounded-md bg-slate-100 p-0.5">
                  {sizes.map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={size === s} disabled={!visible} onClick={() => setSize(widget.id, s)}
                      className={cn('h-6 min-w-[1.75rem] rounded px-1.5 text-[0.6875rem] font-semibold transition disabled:opacity-40',
                        size === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                      {SIZE_LABEL[s]}
                    </button>
                  ))}
                </div>
              )}
              <Switch size="sm" checked={visible} onChange={(e) => setVisible(widget.id, e.target.checked)} aria-label={`${widget.title} dikhayein`} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function NumbersTab({ config, layout, costHidden }: Pick<Props, 'config' | 'layout' | 'costHidden'>) {
  const selected = layout.kpis.map((k) => k.id);
  const toggle = (id: string) => {
    if (selected.includes(id)) layout.setKpis(selected.filter((x) => x !== id));
    else if (selected.length < MAX_KPIS) layout.setKpis([...selected, id]);
  };
  return (
    <div>
      <p className="mb-3 text-[0.8125rem] text-slate-600">
        Upar wale cards me kya dikhe — {MAX_KPIS} tak chunein. Jis sort se chunenge, usi sort se nazar aayenge.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {config.kpis.map((k) => {
          const pos = selected.indexOf(k.id);
          const on = pos >= 0;
          return (
            <button key={k.id} type="button" onClick={() => toggle(k.id)} aria-pressed={on}
              disabled={!on && selected.length >= MAX_KPIS}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50',
                on ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300',
              )}>
              <IconBubble icon={k.icon} tone={k.tone ?? 'brand'} />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.875rem] font-medium text-slate-900">{k.label}</span>
                {k.sensitive && costHidden && <span className="text-[0.6875rem] text-slate-500">Cost lock me chhupa rahega</span>}
              </span>
              <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold',
                on ? 'bg-brand-600 text-brand-fg' : 'border border-slate-300 text-transparent')}>
                {on ? pos + 1 : <Check className="h-3 w-3" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => layout.setKpis([])}>Default numbers</Button>
      </div>
    </div>
  );
}

function TargetTab({ layout }: Pick<Props, 'layout'>) {
  const { data } = useOverview();
  const [value, setValue] = useState(layout.target ? String(layout.target) : '');
  useEffect(() => setValue(layout.target ? String(layout.target) : ''), [layout.target]);
  const week = data?.salesTrend7Days ?? [];
  const avg = week.length ? week.reduce((x, p) => x + Number(p.sales || 0), 0) / week.length : 0;
  const suggestions = avg > 0 ? [1, 1.1, 1.25].map((m) => Math.ceil((avg * m) / 500) * 500) : [];
  const save = (n: number) => { layout.setTarget(n); setValue(n ? String(n) : ''); };

  return (
    <div className="space-y-4">
      <p className="text-[0.8125rem] text-slate-600">
        Rozana kitni sale ka irada hai? Dashboard ke upar ring dikhayegi ke aaj kitna poora hua. Ye sirf aap ke liye hai.
      </p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); save(Number(value) || 0); }}>
        <Input type="number" inputMode="numeric" min={0} step={500} value={value} onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 50000" aria-label="Rozana target" leftIcon={<span className="text-[0.75rem] font-semibold text-slate-500">Rs</span>} wrapperClassName="flex-1" />
        <Button type="submit">Save</Button>
      </form>
      {suggestions.length > 0 && (
        <div>
          <p className="mb-1.5 text-[0.75rem] text-slate-500">Pichhle 7 din ka ausat {formatPKR(avg)} — in me se chunein:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button key={s} type="button" onClick={() => save(s)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-[0.8125rem] font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700">
                {formatPKR(s)} <span className="text-slate-400">{['ausat', '+10%', '+25%'][i]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {layout.target > 0 && <Button variant="ghost" size="sm" onClick={() => save(0)}>Target hatayein</Button>}
    </div>
  );
}

export function CustomizeDialog({ open, tab, onTab, onClose, config, layout, costHidden }: Props) {
  const shown = layout.widgets.filter((i) => i.visible).length;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Dashboard apni marzi ka"
      description="Har tabdeeli foran lagti hai aur aap ke account me save hoti hai — phone aur computer dono par wahi."
      footer={
        <>
          <Button variant="ghost" onClick={layout.reset} disabled={!layout.isCustomized}>Sab pehle jaisa</Button>
          <Button onClick={onClose}>Ho gaya</Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={onTab}
        className="mb-4"
        items={[
          { value: 'widgets', label: 'Hisse', count: shown },
          { value: 'numbers', label: 'Numbers', count: layout.kpis.length },
          { value: 'target', label: 'Target' },
        ]}
      />
      {tab === 'widgets' && (
        <>
          <p className="mb-2 hidden text-[0.75rem] text-slate-500 sm:block">Ghaseet kar sort badlein · S M L Full se chaurai chunein</p>
          <WidgetsTab layout={layout} costHidden={costHidden} />
        </>
      )}
      {tab === 'numbers' && <NumbersTab config={config} layout={layout} costHidden={costHidden} />}
      {tab === 'target' && <TargetTab layout={layout} />}
    </Modal>
  );
}

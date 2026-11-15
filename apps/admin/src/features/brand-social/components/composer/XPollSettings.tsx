/**
 * Composer: an optional poll for the X version of a text post (X API v2
 * `poll`: 2 to 4 choices of up to 25 characters, open 5 minutes to 7 days).
 * A post with a poll cannot carry media on X.
 */

import { BarChart3, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Select, Switch } from '@/design-system/components';
import type { XPoll } from '@/api/admin-brand-social.api';
import { PlatformMark } from '../../lib/platforms';

const DURATIONS = [
  { value: '60', label: '1 hour' }, { value: '360', label: '6 hours' }, { value: '1440', label: '1 day' },
  { value: '4320', label: '3 days' }, { value: '10080', label: '7 days' },
];

export function XPollSettings({ value, onChange, hasMedia, disabled }: { value: XPoll | null | undefined; onChange: (v: XPoll | null) => void; hasMedia: boolean; disabled?: boolean }) {
  const on = !!value;
  const options = value?.options ?? [];
  const setOption = (i: number, v: string) => onChange({ options: options.map((o, j) => (j === i ? v.slice(0, 25) : o)), durationMinutes: value?.durationMinutes ?? 1440 });
  return (
    <Card title={<span className="flex items-center gap-2"><PlatformMark p="X" size={16} />Poll on X</span>}
      description={hasMedia ? 'X does not allow a poll on a post with images or video.' : 'Optional. Only the X version gets the poll; other platforms get the text.'}
      actions={<Switch checked={on} disabled={disabled || (hasMedia && !on)} aria-label="Add a poll on X"
        onChange={(e) => onChange(e.target.checked ? { options: ['', ''], durationMinutes: 1440 } : null)} />}>
      {on ? (
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-end gap-2">
              <Input wrapperClassName="flex-1" label={`Choice ${i + 1}`} value={o} maxLength={25} disabled={disabled} placeholder={i < 2 ? 'Required' : 'Optional'}
                hint={`${[...o].length} / 25`} onChange={(e) => setOption(i, e.target.value)} />
              {options.length > 2 && (
                <Button size="sm" variant="ghost" aria-label={`Remove choice ${i + 1}`} disabled={disabled} onClick={() => onChange({ options: options.filter((_, j) => j !== i), durationMinutes: value!.durationMinutes })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-end justify-between gap-2">
            {options.length < 4 && (
              <Button size="xs" variant="secondary" leftIcon={<Plus className="h-3.5 w-3.5" />} disabled={disabled} onClick={() => onChange({ options: [...options, ''], durationMinutes: value!.durationMinutes })}>Add a choice</Button>
            )}
            <Select label="Open for" value={String(value!.durationMinutes)} disabled={disabled} wrapperClassName="ms-auto w-40"
              options={DURATIONS} onChange={(e) => onChange({ options, durationMinutes: Number(e.target.value) })} />
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-[0.8125rem] text-slate-500"><BarChart3 className="h-4 w-4" />Turn on to ask a question with 2 to 4 choices.</p>
      )}
    </Card>
  );
}

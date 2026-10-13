/**
 * One block on the Appearance page, drawn with the shared Card: title,
 * short help text, where the current value comes from, and a reset link
 * when the layer being edited overrides it.
 */

import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Card } from '@/design-system/components';
import type { ValueSource } from '../hooks/useAppearanceEditor';

const SOURCE_LABEL: Record<ValueSource, string> = {
  personal: 'Aap ki pasand',
  business: 'Business default',
  platform: 'Nafaa default',
  default: 'Nafaa default',
};

interface SettingCardProps {
  id?: string;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  source?: ValueSource;
  /** Shown when the value is set in the layer being edited. */
  onReset?: () => void;
  children: ReactNode;
}

export function SettingCard({ id, title, description, icon, source, onReset, children }: SettingCardProps) {
  return (
    <Card id={id} className="scroll-mt-24 rounded-2xl"
      title={<span className="flex items-center gap-2">
        {icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
        {title}
      </span>}
      description={description}
      actions={(source || onReset) && <>
        {source && <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600 sm:inline">{SOURCE_LABEL[source]}</span>}
        {onReset && (
          <button type="button" onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.75rem] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </>}>
      {children}
    </Card>
  );
}

/**
 * One block on the Appearance page, drawn with the settings SectionCard so
 * it matches the other settings pages: title, short help text, where the
 * current value comes from, and a reset link when the layer being edited
 * overrides it.
 */

import type { ComponentProps, ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { SectionCard } from '@modules/organization/settings/components/UI';
import type { ValueSource } from '../hooks/useAppearanceEditor';

const SOURCE_LABEL: Record<ValueSource, string> = {
  personal: 'Aap ki pasand',
  business: 'Business default',
  platform: 'Nafaa default',
  default: 'Nafaa default',
};

type SectionProps = ComponentProps<typeof SectionCard>;

interface SettingCardProps {
  id?: string;
  title: string;
  description?: ReactNode;
  icon?: SectionProps['icon'];
  color?: SectionProps['color'];
  source?: ValueSource;
  /** Shown when the value is set in the layer being edited. */
  onReset?: () => void;
  children: ReactNode;
}

export function SettingCard({ id, title, description, icon, color, source, onReset, children }: SettingCardProps) {
  return (
    <SectionCard id={id} title={title} desc={description} icon={icon} color={color}
      action={(source || onReset) && (
        <div className="flex items-center gap-1.5">
          {source && <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600 sm:inline">{SOURCE_LABEL[source]}</span>}
          {onReset && (
            <button type="button" onClick={onReset}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.75rem] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>
      )}>
      {children}
    </SectionCard>
  );
}

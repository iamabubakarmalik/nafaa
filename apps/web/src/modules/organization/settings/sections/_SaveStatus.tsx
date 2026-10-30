import { CheckCircle2, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { HeaderActions } from '../components/SettingsFrame';
import { t } from '@core/i18n';

/** Save state shown in the page header; changes save by themselves. */
export function SaveStatusBar({ saving, dirty }: { saving: boolean; dirty: boolean }) {
  const [Icon, text, tone] = saving
    ? [Loader2, t('Save ho raha hai…'), 'text-blue-700 bg-blue-50 ring-blue-200']
    : dirty
      ? [CloudOff, t('Abhi save nahi hua'), 'text-amber-800 bg-amber-50 ring-amber-200']
      : [CheckCircle2, t('Sab save hai'), 'text-success-700 bg-success-50 ring-success-200'];
  return (
    <HeaderActions>
      <div role="status" title={text} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1 ring-inset', tone)}>
        <Icon className={cn('h-3.5 w-3.5', saving && 'animate-spin')} /> <span className="hidden sm:inline">{text}</span>
      </div>
    </HeaderActions>
  );
}

import { Wrench } from 'lucide-react';
import { t } from '@core/i18n';
import { useMaintenanceNotice } from '@core/api/maintenance';

/** Shown while the API reports maintenance mode. Clears itself when the API answers normally again. */
export function MaintenanceBanner() {
  const notice = useMaintenanceNotice();
  if (!notice) return null;
  const until = notice.until ? new Date(notice.until) : null;
  const time = until && !Number.isNaN(until.getTime()) ? until.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;
  return (
    <div role="status" className="w-full bg-slate-900 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Wrench className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {t('Nafaa par maintenance chal rahi hai')}
            {time ? <span className="font-normal text-white/80"> · {t('Andaazan {{time}} tak', { time })}</span> : null}
          </p>
          {notice.message ? <p className="mt-0.5 text-xs leading-snug text-white/85">{notice.message}</p> : null}
        </div>
      </div>
    </div>
  );
}

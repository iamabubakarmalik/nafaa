import { Loader2, CheckCircle2, Cloud, CloudOff } from 'lucide-react';

export function SaveStatusBar({ saving, dirty }: { saving: boolean; dirty: boolean }) {
  if (saving) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 border-2 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-[11px] font-extrabold">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
      </div>
    );
  }
  if (dirty) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/15 border-2 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold">
        <CloudOff className="h-3 w-3" /> Unsaved changes
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border-2 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold">
      <CheckCircle2 className="h-3 w-3" /> All saved
    </div>
  );
}

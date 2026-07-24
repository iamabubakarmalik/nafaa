import { useEffect, useState } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { Card } from '@/ui';

export function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setShowUpdate(true);
      },
      onOfflineReady() {
        // Ready to work offline
      },
    });
    setUpdateSW(() => update);
  }, []);

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-40 max-w-sm animate-slide-up">
      <Card className="p-4 shadow-2xl border-2 border-brand-500/30 bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/40 dark:to-emerald-950/30">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0 animate-bounce-soft">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-black text-sm">New version available</div>
            <div className="text-xs text-content-muted mt-0.5">Refresh to get the latest features</div>
          </div>
          <button
            onClick={() => setShowUpdate(false)}
            className="text-content-subtle hover:text-content"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => updateSW?.(true)}
          className="mt-3 w-full h-10 rounded-xl bg-gradient-brand text-white font-black text-sm flex items-center justify-center gap-2 hover:shadow-brand transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh now
        </button>
      </Card>
    </div>
  );
}

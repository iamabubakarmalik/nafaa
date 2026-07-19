import { AlertCircle } from 'lucide-react';

/**
 * HotelWizardStep1Basic — placeholder stub.
 * The full Hotel Room-Type wizard is being built in a follow-up batch.
 * This file exists so the wizard page compiles today.
 */
export function HotelWizardStep1Basic(_: any) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="text-sm text-amber-900">
        <div className="font-extrabold mb-1">Hotel wizard coming soon</div>
        <div className="font-semibold">
          The full room-type wizard is under construction. In the meantime,
          add rooms from the <strong>Hotel &rarr; Rooms</strong> page.
        </div>
      </div>
    </div>
  );
}

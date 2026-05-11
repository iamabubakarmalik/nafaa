import { Field, TextInput, Toggle } from './_shared';

export default function NotificationsSection({ s, set }: any) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-bold text-slate-800 mb-2">Channels</h4>
        <Toggle checked={s.emailNotifications} onChange={(v) => set('emailNotifications', v)} label="Email" desc="Email notifications enable karein" />
        <Toggle checked={s.smsNotifications} onChange={(v) => set('smsNotifications', v)} label="SMS" desc="SMS notifications (chargeable)" />
        <Toggle checked={s.whatsappNotifications} onChange={(v) => set('whatsappNotifications', v)} label="WhatsApp" />
        <Toggle checked={s.pushNotifications} onChange={(v) => set('pushNotifications', v)} label="Push (Mobile)" desc="Mobile app push notifications" />
      </div>

      <div className="border-t border-slate-100 pt-3">
        <h4 className="font-bold text-slate-800 mb-2">Events</h4>
        <Toggle checked={s.notifyLowStock} onChange={(v) => set('notifyLowStock', v)} label="Low stock alerts" />
        <Toggle checked={s.notifyOutOfStock} onChange={(v) => set('notifyOutOfStock', v)} label="Out of stock alerts" />
        <Toggle checked={s.notifyNewSale} onChange={(v) => set('notifyNewSale', v)} label="New sale" desc="Har sale par notification" />
        <Toggle checked={s.notifyNewCustomer} onChange={(v) => set('notifyNewCustomer', v)} label="New customer" />
      </div>

      <div className="border-t border-slate-100 pt-3">
        <h4 className="font-bold text-slate-800 mb-2">Daily Summary</h4>
        <Toggle checked={s.notifyDailySummary} onChange={(v) => set('notifyDailySummary', v)} label="Send daily sales summary" />
        {s.notifyDailySummary && (
          <Field label="Summary Time" hint="Roz is time pe summary aayegi">
            <TextInput type="time" value={s.dailySummaryTime} onChange={(v: string) => set('dailySummaryTime', v)} />
          </Field>
        )}
      </div>
    </div>
  );
}

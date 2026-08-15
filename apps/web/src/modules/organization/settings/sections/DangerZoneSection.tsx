import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, UserCheck, Shield, Ban, X, Lock } from 'lucide-react';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { Button } from '@core/ui/Button';
import { Field, TextInput, SectionCard, Alert } from '../components/UI';

const CONFIRM_TEXT = 'DELETE MY SHOP';

export function DangerZoneSection() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [password, setPassword] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => settingsApi.deleteTenant(deleteText, password),
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Deletion queued (7-day grace period)');
      setConfirmDelete(false);
      setDeleteText('');
      setPassword('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail'),
  });

  const cancelDeletion = async () => {
    setCancelBusy(true);
    try {
      await settingsApi.cancelDeletion();
      toast.success('Deletion cancel ho gayi ✅');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Cancel fail');
    } finally {
      setCancelBusy(false);
    }
  };

  const canConfirm = deleteText === CONFIRM_TEXT && password.length >= 4;

  return (
    <div className="space-y-4">
      {/* Hero warning */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 text-white p-5 shadow-xl">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 ring-4 ring-white/10">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/70">Careful zone</div>
            <h3 className="font-extrabold text-xl mt-0.5">⚠️ Danger Zone</h3>
            <p className="text-sm text-white/90 mt-1 font-semibold leading-relaxed">
              In actions ko sirf tab karein jab bilkul yaqeen ho. Ye <strong>permanent</strong> aur asaani se undo nahi hoti.
            </p>
          </div>
        </div>
      </div>

      {/* Transfer ownership */}
      <SectionCard
        title="Transfer Ownership"
        desc="Shop ka ownership kisi doosre user ko de dein"
        icon={UserCheck}
        color="amber"
      >
        <Alert tone="amber" icon={Shield}>
          Transfer ke baad aap <strong>Manager</strong> ban jayenge — kuch permissions kam ho jayengi (billing, danger zone).
          Naya owner poori control le lega.
        </Alert>
        <div className="mt-3">
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-md shadow-amber-500/30"
            onClick={() => toast.info('Support se rabta karein — team-based transfer flow abhi manual hai')}
          >
            <UserCheck className="h-4 w-4" /> Request Transfer
          </Button>
        </div>
      </SectionCard>

      {/* Delete shop */}
      <SectionCard
        title="Delete Shop Permanently"
        desc="Poora shop aur uska data delete karein"
        icon={Trash2}
        color="rose"
      >
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4 space-y-1.5 text-xs font-semibold text-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> Products, sales, customers, receipts — <strong>sab delete</strong> ho jayenge</div>
          <div className="flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> 7 din ka <strong>grace period</strong> milega — us dauran cancel kar sakte hain</div>
          <div className="flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> 7 din baad <strong>irreversible</strong> — koi recovery nahi</div>
          <div className="flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> Subscription <strong>cancel</strong> ho jayegi, refund policy ke mutabiq</div>
        </div>

        {!confirmDelete ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => setConfirmDelete(true)}
              className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold shadow-lg shadow-rose-500/30"
            >
              <Trash2 className="h-4 w-4" /> Delete My Shop
            </Button>
            <Button
              variant="secondary"
              onClick={cancelDeletion}
              loading={cancelBusy}
              className="border-2 border-slate-200 dark:border-slate-700 font-extrabold"
            >
              <X className="h-4 w-4" /> Cancel Pending Deletion
            </Button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border-2 border-rose-300 dark:border-rose-500/40 bg-white dark:bg-slate-900 p-4 space-y-3 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-sm font-extrabold">
              <Lock className="h-4 w-4" /> Aakhri confirmation
            </div>

            <Field
              label={`Type "${CONFIRM_TEXT}" to confirm`}
              hint="Exact text likhna hoga (case-sensitive)"
            >
              <TextInput
                value={deleteText}
                onChange={(v: string) => setDeleteText(v)}
                placeholder={CONFIRM_TEXT}
                autoFocus
              />
            </Field>

            <Field label="Current Password" required>
              <TextInput
                type="password"
                value={password}
                onChange={(v: string) => setPassword(v)}
                placeholder="••••••••"
                prefix={<Lock className="h-4 w-4" />}
              />
            </Field>

            <div className="flex gap-2 pt-2 border-t-2 border-rose-100 dark:border-rose-500/20">
              <Button
                variant="secondary"
                onClick={() => { setConfirmDelete(false); setDeleteText(''); setPassword(''); }}
                className="flex-1 font-extrabold"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold shadow-lg shadow-rose-500/30 disabled:opacity-40"
                disabled={!canConfirm}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                <Trash2 className="h-4 w-4" /> Confirm Delete
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

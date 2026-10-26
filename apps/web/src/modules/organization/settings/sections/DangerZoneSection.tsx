/**
 * Danger zone: handing the store to another owner, and deleting the store.
 * Deleting needs the exact confirmation text and the password, and starts a
 * 7-day grace period that can be cancelled from here.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Ban, Lock, Shield, Trash2, UserCheck, X } from 'lucide-react';
import { Alert, Button, Input } from '@/design-system/components';
import { settingsApi } from '../api/settings.api';
import { SectionCard } from '../components/SettingsBlocks';

const CONFIRM_TEXT = 'DELETE MY SHOP';

export function DangerZoneSection() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [password, setPassword] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => settingsApi.deleteTenant(deleteText, password),
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Delete ki darkhwast lag gayi — 7 din me cancel kar sakte hain');
      setConfirmDelete(false);
      setDeleteText('');
      setPassword('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua'),
  });

  const cancelDeletion = useMutation({
    mutationFn: settingsApi.cancelDeletion,
    onSuccess: () => toast.success('Delete cancel ho gaya'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cancel nahi hua'),
  });

  const reset = () => { setConfirmDelete(false); setDeleteText(''); setPassword(''); };
  const canConfirm = deleteText === CONFIRM_TEXT && password.length >= 4;

  return (
    <div className="space-y-4">
      <Alert tone="danger" title="Soch samajh kar" icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}>
        Yahan ke kaam <strong>wapas nahi hote</strong>. Sirf tab karein jab poora yaqeen ho — pehle <Link to="/backup" className="font-semibold underline underline-offset-2">Backup</Link> le lein.
      </Alert>

      <SectionCard title="Ownership transfer" desc="Store ka malikana kisi doosre user ko dein" icon={UserCheck} color="amber">
        <Alert tone="warning" icon={<Shield className="h-4 w-4" />}>
          Transfer ke baad aap <strong>Manager</strong> ban jayenge — billing aur Danger zone jaisi permissions chali jayengi. Naya malik poora control le leta hai.
        </Alert>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="secondary" leftIcon={<UserCheck className="h-4 w-4" />}
            onClick={() => toast.info('Support se rabta karein — transfer abhi support team karti hai')}>
            Transfer ki darkhwast
          </Button>
          <p className="text-xs text-slate-500">Abhi transfer support team ke zariye hota hai.</p>
        </div>
      </SectionCard>

      <SectionCard title="Store delete" desc="Poora store aur us ka data delete karein" icon={Trash2} color="rose">
        <ul className="space-y-1.5 rounded-lg bg-rose-50 p-3 text-xs text-rose-900 ring-1 ring-inset ring-rose-200">
          <li className="flex items-center gap-1.5"><Ban className="h-3.5 w-3.5 shrink-0" /> Products, Sales, customers, receipts — <strong>sab delete</strong> ho jayenge</li>
          <li className="flex items-center gap-1.5"><Ban className="h-3.5 w-3.5 shrink-0" /> 7 din ki <strong>mohlat</strong> milti hai — us dauran cancel kar sakte hain</li>
          <li className="flex items-center gap-1.5"><Ban className="h-3.5 w-3.5 shrink-0" /> 7 din baad <strong>wapas nahi</strong> aata — koi recovery nahi</li>
          <li className="flex items-center gap-1.5"><Ban className="h-3.5 w-3.5 shrink-0" /> Subscription <strong>cancel</strong> ho jayegi, refund policy ke mutabiq</li>
        </ul>

        {!confirmDelete ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => setConfirmDelete(true)} leftIcon={<Trash2 className="h-4 w-4" />}>Store delete karein</Button>
            <Button variant="secondary" onClick={() => cancelDeletion.mutate()} loading={cancelDeletion.isPending} leftIcon={<X className="h-4 w-4" />}>
              Delete ki darkhwast cancel karein
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3 rounded-lg border border-rose-300 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-rose-700"><Lock className="h-4 w-4" /> Aakhri tasdeeq</p>
            <Input label={`Tasdeeq ke liye "${CONFIRM_TEXT}" likhein`} hint="Bilkul isi tarah, bare harfon me"
              value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder={CONFIRM_TEXT} autoFocus />
            <Input label="Abhi ka password" required hint="Wohi password jis se aap login karte hain" type="password"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" leftIcon={<Lock className="h-4 w-4" />} />
            <div className="flex gap-2 border-t border-rose-100 pt-3">
              <Button variant="secondary" className="flex-1" onClick={reset} leftIcon={<X className="h-4 w-4" />}>Wapas</Button>
              <Button variant="danger" className="flex-1" disabled={!canConfirm} loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}
                leftIcon={<Trash2 className="h-4 w-4" />}>
                Pakka delete karein
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

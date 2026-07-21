import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, UserCheck } from 'lucide-react';
import { settingsApi } from '@/api/settings.api';
import { Button } from '@/components/ui/Button';
import { Field, TextInput, SectionCard } from '../components/UI';

export default function DangerZoneSection() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [password, setPassword] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => settingsApi.deleteTenant(deleteText, password),
    onSuccess: (data: any) => { toast.success(data?.message || 'Deletion queued'); setConfirmDelete(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail'),
  });

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-300 p-5 shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-rose-900 text-lg">Danger Zone</h3>
            <p className="text-xs text-rose-700 font-medium">Ye actions permanent aur irreversible hain</p>
          </div>
        </div>
      </div>

      <SectionCard title="Transfer Ownership" desc="Shop ka ownership kisi doosre user ko transfer karein" icon={UserCheck} color="amber">
        <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-xs text-amber-900 font-medium">
          ⚠️ Ownership transfer ke baad aap Manager ban jayenge — aap ke sab permissions kam ho jayenge
        </div>
        <Button className="mt-3 bg-amber-600 hover:bg-amber-700" onClick={() => toast.info('Coming soon — abhi manually team se contact karein')}>
          Request Ownership Transfer
        </Button>
      </SectionCard>

      <SectionCard title="Delete Shop Permanently" desc="Poora shop, saara data delete kar dein" icon={Trash2} color="rose">
        <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-4 space-y-2 text-xs text-rose-900 font-medium">
          <div>❌ Products, sales, customers — sab delete ho jayenge</div>
          <div>❌ Ye action <strong>irreversible</strong> hai (7 din grace period ke baad)</div>
          <div>❌ Aap ki subscription cancel ho jayegi</div>
        </div>
        {!confirmDelete ? (
          <Button onClick={() => setConfirmDelete(true)} className="mt-4 bg-rose-600 hover:bg-rose-700">
            <Trash2 className="h-4 w-4" />
            Delete My Shop
          </Button>
        ) : (
          <div className="mt-4 space-y-3 p-4 rounded-xl border-2 border-rose-300 bg-white">
            <Field label={`Type "DELETE MY SHOP" to confirm`}>
              <TextInput value={deleteText} onChange={(v: string) => setDeleteText(v)} placeholder="DELETE MY SHOP" />
            </Field>
            <Field label="Current Password">
              <TextInput type="password" value={password} onChange={(v: string) => setPassword(v)} />
            </Field>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setConfirmDelete(false); setDeleteText(''); setPassword(''); }}>Cancel</Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700"
                disabled={deleteText !== 'DELETE MY SHOP' || !password}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                <Trash2 className="h-4 w-4" />
                Confirm Delete
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

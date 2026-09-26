import { X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAYA CUSTOMER — counter par, sale rokay baghair
   ─────────────────────────────────────────────────────────────
   Retail POS ka design, ab shared. Sirf naam aur phone: udhaar
   dete waqt dukaan-daar ke paas poora form bharne ka waqt nahi
   hota, aur baqi tafseel baad me khate se bhari ja sakti hai.
   Khane bade rakhe gaye hain — counter par ungli se type hota
   hai, keyboard se nahi.
   ═════════════════════════════════════════════════════════════ */

export function PosCustomerAddModal({
  value, onChange, onSubmit, saving, onClose,
}: {
  value: { name: string; phone: string };
  onChange: (v: { name: string; phone: string }) => void;
  onSubmit: (v: { name: string; phone?: string }) => void;
  saving?: boolean;
  onClose: () => void;
}) {
  const newCustomer = value;
  const setNewCustomer = onChange;
  const setShowCustomerAdd = (_: boolean) => onClose();
  const addCustomerMutation = { isPending: saving, mutate: onSubmit };
  return (
<div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
  <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
    <div className="px-5 py-4 bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-between">
      <div className="flex items-center gap-2">
        <UserPlus className="h-6 w-6" />
        <h3 className="font-extrabold text-xl">Naya Customer</h3>
      </div>
      <button onClick={() => setShowCustomerAdd(false)} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center">
        <X className="h-5 w-5" />
      </button>
    </div>
    <div className="p-5 space-y-3">
      <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
        placeholder="Customer ka naam"
        className="h-16 w-full rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
      <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
        placeholder="03XX XXXXXXX"
        className="h-16 w-full rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500" />
      <button onClick={() => {
        if (!newCustomer.name.trim()) return toast.error('Naam likhein');
        addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined });
      }} disabled={addCustomerMutation.isPending}
        className="w-full h-16 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-700 active:scale-95 font-extrabold text-white text-xl shadow-lg transition disabled:opacity-50">
        Add Karein
      </button>
    </div>
  </div>
</div>
  );
}

export default PosCustomerAddModal;

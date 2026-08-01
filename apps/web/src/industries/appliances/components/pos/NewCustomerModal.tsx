import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';

interface Props {
  onClose: () => void;
  onCreated: (customer: any) => void;
}

export function NewCustomerModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const create = useMutation({
    mutationFn: () => customersApi.create({ name: name.trim(), phone: phone.trim() || undefined, address: address.trim() || undefined }),
    onSuccess: (c: any) => {
      toast.success(`${c.name} added`);
      onCreated(c);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            <h3 className="font-extrabold text-xl">New Customer</h3>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Customer name *"
            className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-violet-500" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="03XX XXXXXXX"
            className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-violet-500" />
          <textarea value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="Delivery address (optional)" rows={3}
            className="w-full rounded-2xl border-4 border-slate-200 px-4 py-3 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          <button onClick={() => {
            if (!name.trim()) return toast.error('Name required');
            create.mutate();
          }} disabled={create.isPending}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 font-extrabold text-white text-xl shadow-lg transition disabled:opacity-50">
            {create.isPending ? 'Adding...' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

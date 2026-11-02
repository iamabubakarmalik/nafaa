/** Add a customer with just a name and phone; warns when the phone already belongs to someone. */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Crown } from 'lucide-react';
import { Button, Input, Modal, Switch } from '@/design-system/components';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { directoryApi } from '../api';
import { t as tr, Trans } from '@core/i18n';

const digits = (v: string) => v.replace(/\D/g, '');
const validPhone = (v: string) => !v || /^(92|0)?3\d{9}$/.test(digits(v));

export function QuickAddModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vip, setVip] = useState(false);
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(digits(phone)), 300); return () => clearTimeout(t); }, [phone]);
  const dup = useQuery({
    queryKey: ['customer-phone-check', debounced],
    enabled: debounced.length >= 10,
    queryFn: () => directoryApi.list({ search: debounced, status: 'all', type: 'all', activity: 'all', sort: 'recent', scope: 'all' }, 1, 3),
  });
  const existing = dup.data?.items[0];
  const save = useMutation({
    mutationFn: () => customersApi.create({ name: name.trim(), phone: phone.trim() || undefined, isVip: vip }),
    onSuccess: (c) => { toast.success(tr('{{name}} jor diya', { name: c.name })); onCreated(c.id); },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || tr('Nahi bana')),
  });
  const ok = name.trim().length > 0 && validPhone(phone);
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Naya customer')} description={tr('Baqi details baad mein bhi bhar sakte hain')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button disabled={!ok} loading={save.isPending} onClick={() => save.mutate()}>{tr('Jor dein')}</Button>
      </>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ok) save.mutate(); }}>
        <Input label={tr('Naam')} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Jaise: Ahmed bhai')} />
        <Input label={tr('Phone')} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300-1234567"
          error={!validPhone(phone) ? tr('Mobile number theek nahi (03xx-xxxxxxx)') : undefined} />
        {existing && (
          <p className="rounded-xl bg-amber-50 p-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <Trans text="Yeh number pehle se {{name}} ka hai." values={{ name: <Link to={`/customers/${existing.id}`} className="font-semibold underline">{existing.name}</Link> }} />
          </p>
        )}
        <Switch label={<span className="inline-flex items-center gap-1.5"><Crown className="h-4 w-4 text-amber-500" />{tr('VIP customer')}</span>} checked={vip} onChange={(e) => setVip(e.target.checked)} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

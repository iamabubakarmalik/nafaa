/** Quick add of a customer from the counter: name and phone, nothing else. */

import { Button, Input, Modal } from '@/design-system/components';

export function PosCustomerAddModal({ value, onChange, onSubmit, saving, onClose }: {
  value: { name: string; phone: string };
  onChange: (v: { name: string; phone: string }) => void;
  onSubmit: (v: { name: string; phone?: string }) => void;
  saving?: boolean;
  onClose: () => void;
}) {
  const submit = () => onSubmit({ name: value.name, phone: value.phone || undefined });
  return (
    <Modal open onClose={onClose} size="sm" title="Naya customer" description="Baqi details baad me Customers page se"
      footer={<><Button variant="ghost" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={saving}>Add karein</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Naam" required autoFocus value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="e.g. Ahmed Ali" />
        <Input label="Phone" inputMode="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} placeholder="03xx xxxxxxx" hint="Bill aur udhaar ki yaad-dehani WhatsApp par" />
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}

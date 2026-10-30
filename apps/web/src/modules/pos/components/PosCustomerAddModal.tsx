/** Quick add of a customer from the counter: name and phone, nothing else. */

import { Button, Input, Modal } from '@/design-system/components';
import { t } from '@core/i18n';

export function PosCustomerAddModal({ value, onChange, onSubmit, saving, onClose }: {
  value: { name: string; phone: string };
  onChange: (v: { name: string; phone: string }) => void;
  onSubmit: (v: { name: string; phone?: string }) => void;
  saving?: boolean;
  onClose: () => void;
}) {
  const submit = () => onSubmit({ name: value.name, phone: value.phone || undefined });
  return (
    <Modal open onClose={onClose} size="sm" title={t('Naya customer')} description={t('Baqi details baad me Customers page se')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button><Button onClick={submit} loading={saving}>{t('Add karein')}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label={t('Naam')} required autoFocus value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder={t('e.g. Ahmed Ali')} />
        <Input label={t('Phone')} inputMode="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} placeholder={t('03xx xxxxxxx')} hint={t('Bill aur udhaar ki yaad-dehani WhatsApp par')} />
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}

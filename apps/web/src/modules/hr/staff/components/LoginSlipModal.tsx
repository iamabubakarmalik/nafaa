/**
 * Shown once after a login is made or its password is reset: the email and
 * password to hand over, with copy, WhatsApp and a printed slip. The
 * password is not stored anywhere after this closes.
 */

import { toast } from 'sonner';
import { Copy, KeyRound, MessageCircle } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { PrintButton } from '@core/print';
import { loginSlipDoc, type LoginSlip } from './print';
import { waLink } from './meta';
import { t } from '@core/i18n';

export function LoginSlipModal({ slip, phone, title, onClose }: { slip: LoginSlip; phone?: string | null; title: string; onClose: () => void }) {
  // Message sent to the staff member; it follows the shop's language once that exists, not the screen's.
  // i18n-ignore
  const text = `Assalam o alaikum ${slip.name},\nNafaa me aap ka login:\nEmail: ${slip.email}\nPassword: ${slip.password}\n${window.location.origin}/login\nPehli dafa login ke baad password badal lein.`;
  const copy = () => navigator.clipboard?.writeText(text).then(() => toast.success(t('Copy ho gaya')), () => toast.error(t('Copy nahi hua')));
  return (
    <Modal open onClose={onClose} size="md" closeOnBackdrop={false} title={title} description={t('Yeh password sirf abhi dikh raha hai — band karne ke baad dobara nahi milega')}
      footer={<>
        <span className="me-auto [&_button]:h-10"><PrintButton doc={() => loginSlipDoc(slip)} label={t('Parchi')} /></span>
        <Button onClick={onClose}>{t('Ho gaya')}</Button>
      </>}>
      <div className="space-y-3">
        <dl className="divide-y divide-slate-100 rounded-2xl bg-slate-50 px-4 ring-1 ring-slate-200">
          {([[t('Naam'), slip.name], [t('Role'), slip.role], [t('Branch'), slip.branch ?? t('Sab branches')], [t('Login (email)'), slip.email]] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2 text-sm"><dt className="text-slate-500">{k}</dt><dd className="truncate font-medium text-slate-900">{v}</dd></div>
          ))}
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="inline-flex items-center gap-1.5 text-sm text-slate-500"><KeyRound className="h-4 w-4" />{t('Password')}</dt>
            <dd className="font-mono text-lg font-bold tracking-wide text-slate-900">{slip.password}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copy} leftIcon={<Copy className="h-4 w-4" />}>{t('Copy')}</Button>
          {phone && (
            <a href={waLink(phone, text)} target="_blank" rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700">
              <MessageCircle className="h-4 w-4" /> {' '}{t('WhatsApp par bhejein')}
            </a>
          )}
        </div>
        <p className="text-[0.75rem] text-slate-500">{t('Bande ko kahein ke pehli dafa login ke baad Profile se apna password badal le.')}</p>
      </div>
    </Modal>
  );
}

/**
 * Ways to reach one shop, shared by the Support inbox and the Shops pages:
 * Message (opens or starts its support chat), in-app notification, email,
 * SMS, WhatsApp and Sign in as shop. Every send goes through the API and is
 * written to the admin audit log.
 */

import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, LogIn, Mail, MessageCircle, MessageSquareText, MoreHorizontal, Smartphone } from 'lucide-react';
import { Button, Input, Menu, MenuItem, MenuSeparator, Modal, Textarea, confirmDialog, heroButton } from '@/design-system/components';
import { adminSupportApi } from '@/api/admin-support.api';
import { adminImpersonateApi } from '@/api/admin-impersonate.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';

export interface ShopRef { id: string; name: string; phone?: string | null; ownerPhone?: string | null; ownerEmail?: string | null }

type Dialog = 'notify' | 'email' | 'sms' | 'message' | null;

const waLink = (phone: string | null | undefined) => {
  const d = (phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
  return d.length >= 10 ? `https://wa.me/${d}` : null;
};

export function useShopContact(shop: ShopRef) {
  const can = useCan();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const canSend = can('support.reply') || can('communications.manage');
  const canChat = can('support.reply');
  const wa = waLink(shop.ownerPhone ?? shop.phone);

  const impersonate = useMutation({
    mutationFn: () => adminImpersonateApi.impersonate(shop.id),
    onSuccess: (data) => {
      const tenantUrl = (import.meta.env.VITE_TENANT_URL as string) || 'http://localhost:5173';
      window.open(`${tenantUrl}/login?impersonate=1&access=${encodeURIComponent(data.accessToken)}&refresh=${encodeURIComponent(data.refreshToken)}`, '_blank');
      toast.success('Opening the shop in a new tab. This is logged.');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const signInAs = async () => {
    if (await confirmDialog({ title: `Sign in as ${shop.name}?`, text: 'Opens their merchant app in a new tab with owner access. Anything you do there is real and is logged under your name.', yes: 'Sign in as shop' })) impersonate.mutate();
  };

  const actions = {
    message: canChat ? () => setDialog('message') : null,
    notify: canSend ? () => setDialog('notify') : null,
    email: canSend ? () => setDialog('email') : null,
    sms: canSend ? () => setDialog('sms') : null,
    whatsapp: wa,
    signInAs: can('tenants.impersonate') ? signInAs : null,
  };

  const dialogs = (
    <>
      <MessageDialog open={dialog === 'message'} shop={shop} onClose={() => setDialog(null)} onOpened={(id) => navigate(`/support?c=${id}`)} />
      <NotifyDialog open={dialog === 'notify'} shop={shop} onClose={() => setDialog(null)} />
      <EmailDialog open={dialog === 'email'} shop={shop} onClose={() => setDialog(null)} />
      <SmsDialog open={dialog === 'sms'} shop={shop} onClose={() => setDialog(null)} />
    </>
  );
  return { actions, dialogs };
}

/**
 * Compact "…" menu for a table row (clicks do not open the row), or a
 * "Contact" hero button on a detail page (`hero`).
 */
export function ShopContactMenu({ shop, hero, hideSignIn }: { shop: ShopRef; hero?: boolean; hideSignIn?: boolean }) {
  const { actions, dialogs } = useShopContact(shop);
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const any = Object.values(actions).some(Boolean);
  if (!any) return null;
  const item = (icon: ReactNode, label: string, fn: (() => void) | null) => fn && (
    <MenuItem icon={icon} onClick={() => { setOpen(false); fn(); }}>{label}</MenuItem>
  );
  return (
    <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {hero ? (
        <button ref={anchor} type="button" onClick={() => setOpen(true)} className={heroButton}><MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Contact</span></button>
      ) : (
        <button ref={anchor} type="button" onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Contact ${shop.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
      <Menu open={open} onClose={() => setOpen(false)} anchorRef={anchor} align="end" width="w-52">
        {item(<MessageCircle />, 'Message', actions.message)}
        {item(<Bell />, 'Notify in app', actions.notify)}
        {item(<Mail />, 'Email', actions.email)}
        {item(<Smartphone />, 'SMS', actions.sms)}
        {actions.whatsapp && <MenuItem icon={<MessageSquareText />} onClick={() => { setOpen(false); window.open(actions.whatsapp!, '_blank', 'noopener'); }}>WhatsApp</MenuItem>}
        {actions.signInAs && !hideSignIn && <><MenuSeparator />{item(<LogIn />, 'Sign in as shop', actions.signInAs)}</>}
      </Menu>
      {dialogs}
    </span>
  );
}

function MessageDialog({ open, shop, onClose, onOpened }: { open: boolean; shop: ShopRef; onClose: () => void; onOpened: (id: string) => void }) {
  const [text, setText] = useState('');
  const m = useMutation({
    mutationFn: () => adminSupportApi.start({ tenantId: shop.id, text: text.trim() || undefined }),
    onSuccess: (c) => { toast.success('Chat opened. The shop sees it in their support chat.'); setText(''); onClose(); onOpened(c.id); },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <Modal open={open} onClose={onClose} title={`Message ${shop.name}`} description="Opens this shop's support chat (or starts one) and sends your message there."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={() => m.mutate()}>{text.trim() ? 'Send' : 'Open chat'}</Button></>}>
      <Textarea label="Message (optional)" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Assalam o Alaikum! …" />
    </Modal>
  );
}

function NotifyDialog({ open, shop, onClose }: { open: boolean; shop: ShopRef; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const m = useMutation({
    mutationFn: () => adminSupportApi.notify(shop.id, { title: title.trim(), message: message.trim(), link: link.trim() || undefined }),
    onSuccess: () => { toast.success('Notification sent'); setTitle(''); setMessage(''); setLink(''); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <Modal open={open} onClose={onClose} title={`Notify ${shop.name}`} description="Shows in this shop's notification bell (and as a push on their phones)."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={m.isPending} disabled={!title.trim() || !message.trim()} onClick={() => m.mutate()}>Send</Button></>}>
      <div className="space-y-3">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        <Textarea label="Message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
        <Input label="Opens page (optional)" hint="A path in the shop app, e.g. /billing" value={link} onChange={(e) => setLink(e.target.value)} />
      </div>
    </Modal>
  );
}

function EmailDialog({ open, shop, onClose }: { open: boolean; shop: ShopRef; onClose: () => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const m = useMutation({
    mutationFn: () => adminSupportApi.email(shop.id, { subject: subject.trim(), body: body.trim(), to: to.trim() || undefined }),
    onSuccess: (r) => { toast.success(`Email sent to ${r.to}`); setSubject(''); setBody(''); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <Modal open={open} onClose={onClose} title={`Email ${shop.name}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={m.isPending} disabled={!subject.trim() || !body.trim()} onClick={() => m.mutate()}>Send email</Button></>}>
      <div className="space-y-3">
        <Input label="To" placeholder={shop.ownerEmail ?? "Owner's email"} hint="Leave empty to send to the owner" value={to} onChange={(e) => setTo(e.target.value)} />
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
        <Textarea label="Message" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
    </Modal>
  );
}

function SmsDialog({ open, shop, onClose }: { open: boolean; shop: ShopRef; onClose: () => void }) {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const m = useMutation({
    mutationFn: () => adminSupportApi.sms(shop.id, { message: message.trim(), to: to.trim() || undefined }),
    onSuccess: (r) => { toast.success(`SMS sent to ${r.to}`); setMessage(''); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <Modal open={open} onClose={onClose} title={`SMS ${shop.name}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={m.isPending} disabled={!message.trim()} onClick={() => m.mutate()}>Send SMS</Button></>}>
      <div className="space-y-3">
        <Input label="To" placeholder={shop.ownerPhone ?? shop.phone ?? 'Phone'} hint="Leave empty to send to the owner's phone" value={to} onChange={(e) => setTo(e.target.value)} />
        <Textarea label="Message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={640} hint={`${message.length}/640`} />
      </div>
    </Modal>
  );
}

/** Shows a new temporary password once, with a copy button. */

import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { Alert, Button, Modal } from '@/design-system/components';

export function TempPasswordModal({ password, name, login, onClose }: { password: string | null; name: string; login?: string; onClose: () => void }) {
  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => toast.success('Copied'), () => toast.error('Could not copy'));
  return (
    <Modal open={!!password} onClose={onClose} title="Temporary password" description={`Give this to ${name}. It is shown only now.`}
      footer={<div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>}>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2.5 text-center font-mono text-[1.125rem] tracking-wider text-slate-900 ring-1 ring-slate-200">{password}</code>
        <Button variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => password && copy(password)}>Copy</Button>
      </div>
      <Alert tone="info" className="mt-3">
        {login ? <>They sign in at the partner portal with <b>{login}</b> and this password. </> : null}
        Ask them to change it from their profile after signing in.
      </Alert>
    </Modal>
  );
}

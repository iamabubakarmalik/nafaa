import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, TestTube } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { newsletterApi } from '../../../../api/marketing/marketing-newsletter.api';
import { PageHeader } from '../../_shared/components/PageHeader';

export function SendNewsletterPage() {
  const nav = useNavigate();
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [html, setHtml] = useState('<p>Assalam-o-Alaikum {{name}},</p>\n<p>Aap ke liye kuch naya hai…</p>');
  const [tags, setTags] = useState('');
  const [testEmail, setTestEmail] = useState('');

  const sendMut = useMutation({
    mutationFn: newsletterApi.send,
    onSuccess: (r: any) => {
      if (r.testMode) toast.success(`Test email sent to ${r.sentTo}`);
      else {
        toast.success(`Newsletter queued for ${r.queuedFor} subscribers`);
        nav('/marketing/newsletter');
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Send fail ho gaya'),
  });

  const send = (testMode: boolean) => {
    if (!subject.trim() || !html.trim()) {
      toast.error('Subject aur body zaroori hai');
      return;
    }
    if (testMode && !testEmail) {
      toast.error('Test email chahiye');
      return;
    }
    sendMut.mutate({
      subject,
      html,
      preheader: preheader || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      testMode,
      testEmail: testMode ? testEmail : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send Newsletter"
        subtitle="{{name}} placeholder use kar sakte hain personalisation ke liye"
        backTo="/marketing/newsletter"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Subject *</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ramzan Special — 20% off"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Preheader</label>
            <input
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              placeholder="Chhota preview text jo inbox mein subject ke baad dikhta hai"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">HTML Body *</label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={16}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Use <code className="rounded bg-neutral-100 px-1">{'{{name}}'}</code> for personalisation.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Tags filter (optional)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="pos-users, karachi (comma separated)"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 font-semibold text-neutral-800">Test send</h3>
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="apna@email.com"
              className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => send(true)}
              disabled={sendMut.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              <TestTube className="h-4 w-4" /> Send Test
            </button>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <h3 className="mb-2 font-semibold text-emerald-900">Ready to launch?</h3>
            <p className="mb-4 text-xs text-emerald-800">
              Test karain, phir sab active subscribers ko bhejain.
            </p>
            <button
              onClick={() => {
                if (confirm('Sab active subscribers ko bhejna hai?')) send(false);
              }}
              disabled={sendMut.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Send Newsletter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

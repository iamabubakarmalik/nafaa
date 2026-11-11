/**
 * Send a newsletter: subject, preheader, HTML body and an optional tag
 * filter. Send a test to one address first, then send to all active
 * subscribers.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle, FlaskConical, PenLine, Send, TestTube, Users } from 'lucide-react';
import { Button, Card, Input, PageHero, PageShell, Textarea, confirmDialog } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { newsletterApi } from '@/api/marketing/marketing-newsletter.api';
import { GuideButton } from '../../lib/kit';

export function SendNewsletterPage() {
  const nav = useNavigate();
  const guide = usePageGuide();
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [html, setHtml] = useState('<p>Assalam-o-Alaikum {{name}},</p>\n<p>Aap ke liye kuch naya hai…</p>');
  const [tags, setTags] = useState('');
  const [testEmail, setTestEmail] = useState('');

  const sendMut = useMutation({
    mutationFn: newsletterApi.send,
    onSuccess: (r: any) => {
      if (r.testMode) toast.success(`Test email sent to ${r.sentTo}`);
      else { toast.success(`Newsletter queued for ${r.queuedFor} subscribers`); nav('/marketing/newsletter'); }
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not send the newsletter'),
  });

  const send = (testMode: boolean) => {
    if (!subject.trim() || !html.trim()) { toast.error('Add a subject and a message body'); return; }
    if (testMode && !testEmail) { toast.error('Enter an email address for the test'); return; }
    sendMut.mutate({
      subject, html,
      preheader: preheader || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      testMode,
      testEmail: testMode ? testEmail : undefined,
    });
  };

  return (
    <PageShell>
      <PageHero
        title="Send newsletter"
        back="/marketing/newsletter"
        backLabel="Subscribers"
        actions={<GuideButton onClick={guide.open} />}
        stats={[
          { label: 'Subject', value: subject ? `${subject.length} chars` : 'Missing' },
          { label: 'Audience', value: tags.trim() ? 'Tagged only' : 'All active' },
          { label: 'Test address', value: testEmail || 'Not set' },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card title="Message" description="Use {{name}} to add the subscriber's name.">
            <div className="space-y-4">
              <Input label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Eid special: 20% off" />
              <Input label="Preheader" value={preheader} onChange={(e) => setPreheader(e.target.value)} hint="Short preview text shown in the inbox after the subject." />
              <Textarea label="HTML body" required value={html} onChange={(e) => setHtml(e.target.value)} rows={16} className="font-mono text-xs" />
              <Input label="Tag filter (optional)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="pos-users, karachi" hint="Comma separated. Empty means all active subscribers." />
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Send a test" description="Check how it looks before it goes to everyone.">
            <div className="space-y-3">
              <Input label="Test email" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
              <Button variant="outline" fullWidth leftIcon={<TestTube className="h-4 w-4" />} loading={sendMut.isPending} onClick={() => send(true)}>Send test</Button>
            </div>
          </Card>
          <Card title="Ready to send?" description="Send a test first, then send to the audience.">
            <Button fullWidth leftIcon={<Send className="h-4 w-4" />} loading={sendMut.isPending} onClick={async () => {
              if (await confirmDialog({ title: 'Send to all active subscribers?', text: tags.trim() ? 'Only subscribers with the tags you entered will get it.' : 'Every active subscriber will get this email.', yes: 'Send newsletter' })) send(false);
            }}>Send newsletter</Button>
          </Card>
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide
          title="Send newsletter"
          description="Write once, test, then send to your subscribers."
          flowTitle="Sending a newsletter"
          flow={[
            { label: 'Write', hint: 'Subject and body', icon: PenLine, color: '#4f46e5' },
            { label: 'Send a test', hint: 'To yourself', icon: FlaskConical, color: '#d97706' },
            { label: 'Send', hint: 'Active subscribers', icon: Users, color: '#0284c7' },
            { label: 'Done', hint: 'Queued', icon: CheckCircle, color: '#059669' },
          ]}
          steps={[
            { icon: PenLine, color: '#4f46e5', title: 'Write', text: 'A subject and an HTML body are required. {{name}} becomes the first name.' },
            { icon: FlaskConical, color: '#d97706', title: 'Test', text: 'Send a test to one address and check it in your inbox.' },
            { icon: Users, color: '#0284c7', title: 'Audience', text: 'Add tags to reach part of the list. Empty means all active subscribers.' },
            { icon: Send, color: '#059669', title: 'Send', text: 'You are asked to confirm, then the emails are queued.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

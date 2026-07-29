import { LegalLayout } from '@/components/legal/LegalLayout';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Terms of service',
  description: 'The terms governing your use of Nafaa — clear, fair, and written for humans.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" subtitle="Clear terms, written for humans" lastUpdated="July 1, 2026">
      <h2>1. The agreement</h2>
      <p>By using Nafaa, you agree to these terms. If you disagree, please do not use the service. You must be at least 18 years old and provide accurate registration information.</p>

      <h2>2. Your data stays yours</h2>
      <p>You own all business data you enter. We claim no ownership. You can export or delete it at any time.</p>

      <h2>3. Subscriptions and payments</h2>
      <ul>
        <li>Free Starter plan requires no credit card</li>
        <li>Paid plans bill monthly or yearly in advance, in PKR</li>
        <li>Payment methods: JazzCash, Easypaisa, Raast, bank transfer, cards</li>
        <li>Auto-renewal applies unless cancelled before the next billing date</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to use Nafaa for illegal activity, attempt unauthorized access, resell without permission, or reverse engineer the platform.</p>

      <h2>5. Service availability</h2>
      <p>We target 99.99% uptime with published status at /status. Scheduled maintenance is announced 72 hours in advance.</p>

      <h2>6. Termination</h2>
      <p>Cancel anytime from account settings. After cancellation, data is retained for 90 days for your convenience, then permanently deleted.</p>

      <h2>7. Governing law</h2>
      <p>These terms are governed by the laws of Pakistan. Disputes are resolved in Gujranwala courts.</p>

      <h2>8. Contact</h2>
      <p>Legal questions: <a href="mailto:legal@nafaa.pk">legal@nafaa.pk</a></p>
    </LegalLayout>
  );
}

import { LegalLayout } from '@/components/legal/LegalLayout';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Refund policy — 30-day money-back guarantee',
  description: 'Every paid Nafaa plan includes a 30-day money-back guarantee, no questions asked. Refunds via your original payment method within days.',
  path: '/refund',
});

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy" subtitle="30-day money-back guarantee — no questions asked" lastUpdated="July 1, 2026">
      <h2>1. The guarantee</h2>
      <p>If you are not satisfied within the first 30 days of your initial paid subscription, we refund your payment in full. No questions, no forms, no negotiations.</p>

      <h2>2. Eligibility</h2>
      <ul>
        <li>Within the first 30 days of your first paid subscription</li>
        <li>Account in good standing</li>
        <li>Applies to monthly and yearly plans equally</li>
      </ul>

      <h2>3. How to request</h2>
      <ol>
        <li>Email <a href="mailto:billing@nafaa.pk">billing@nafaa.pk</a> with subject "Refund request"</li>
        <li>We confirm within 24 hours</li>
        <li>Refund processes to your original payment method</li>
      </ol>

      <h2>4. Refund timelines</h2>
      <ul>
        <li><strong>JazzCash / Easypaisa:</strong> 1-2 business days</li>
        <li><strong>Raast / bank transfer:</strong> 1-3 business days</li>
        <li><strong>Cards:</strong> 5-7 business days</li>
      </ul>

      <h2>5. Not covered</h2>
      <p>Subscription renewals after the first 30 days, one-time professional services already delivered, and custom development work.</p>

      <h2>6. Contact</h2>
      <p>Billing questions: <a href="mailto:billing@nafaa.pk">billing@nafaa.pk</a> or WhatsApp +92 324 1772933</p>
    </LegalLayout>
  );
}

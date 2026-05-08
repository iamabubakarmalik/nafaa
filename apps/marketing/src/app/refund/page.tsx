import { LegalLayout } from '@/components/legal/LegalLayout';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Refund Policy',
  description: 'Nafaa Refund Policy — Our 30-day money-back guarantee.',
  path: '/refund',
});

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy" subtitle="30-day money-back guarantee" lastUpdated="May 8, 2026">
      <h2>1. Money-Back Guarantee</h2>
      <p>
        We offer a <strong>30-day money-back guarantee</strong> on all paid plans. If you're not satisfied within the
        first 30 days of your initial paid subscription, we'll refund your payment in full — no questions asked.
      </p>

      <h2>2. Eligibility</h2>
      <p>You are eligible for a refund if:</p>
      <ul>
        <li>You are within the first 30 days of your initial paid subscription</li>
        <li>This is your first paid subscription with Nafaa</li>
        <li>Your account is in good standing (no policy violations)</li>
      </ul>

      <h2>3. Non-Refundable Items</h2>
      <p>The following are not eligible for refund:</p>
      <ul>
        <li>Subscription renewals (only initial purchase)</li>
        <li>Setup fees or one-time professional services</li>
        <li>Add-ons after initial 30 days</li>
        <li>Custom integration work after delivery</li>
      </ul>

      <h2>4. How to Request a Refund</h2>
      <ol>
        <li>Email <a href="mailto:billing@nafaa.pk">billing@nafaa.pk</a> with subject "Refund Request"</li>
        <li>Include your account email and reason (helps us improve!)</li>
        <li>We'll respond within 24 hours</li>
        <li>Refund processed within 5-7 business days</li>
      </ol>

      <h2>5. Refund Method</h2>
      <p>
        Refunds are issued via the same method used for payment:
      </p>
      <ul>
        <li><strong>Stripe (Credit/Debit Card):</strong> 5-7 business days</li>
        <li><strong>JazzCash/EasyPaisa:</strong> 1-2 business days</li>
        <li><strong>Bank Transfer:</strong> 3-5 business days</li>
      </ul>

      <h2>6. Cancellation vs Refund</h2>
      <p>
        Canceling your subscription stops future billing but does not automatically issue a refund. If you want both
        — cancel AND refund — please mention this in your refund request.
      </p>

      <h2>7. Pro-Rated Refunds</h2>
      <p>
        For yearly subscriptions canceled after 30 days, we may offer pro-rated refunds at our discretion based on
        the unused period.
      </p>

      <h2>8. Disputes</h2>
      <p>
        Please contact us first before initiating a chargeback or dispute. We're committed to resolving issues fairly
        and quickly.
      </p>

      <h2>9. Contact</h2>
      <p>
        Refund questions: <a href="mailto:billing@nafaa.pk">billing@nafaa.pk</a>
        <br />
        WhatsApp: <a href="https://wa.me/923001234567">+92 300 1234567</a>
      </p>
    </LegalLayout>
  );
}

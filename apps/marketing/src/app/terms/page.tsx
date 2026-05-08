import { LegalLayout } from '@/components/legal/LegalLayout';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Terms of Service',
  description: 'Nafaa Terms of Service — Rules and conditions for using our platform.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" subtitle="Please read these terms carefully" lastUpdated="May 8, 2026">
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using Nafaa, you agree to be bound by these Terms of Service. If you disagree, please do not
        use our services.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Nafaa is a cloud-based POS, inventory, and business management software designed for Pakistani retailers.
        Services include the web app, mobile apps, and APIs.
      </p>

      <h2>3. Account Registration</h2>
      <ul>
        <li>You must provide accurate, complete information</li>
        <li>You are responsible for maintaining account security</li>
        <li>You must be at least 18 years old</li>
        <li>One account per business unless explicitly authorized</li>
      </ul>

      <h2>4. Subscription Plans & Payments</h2>
      <h3>4.1 Free Trial</h3>
      <p>We offer a 7-day free trial. No payment information is required upfront.</p>

      <h3>4.2 Paid Plans</h3>
      <ul>
        <li>Plans are billed monthly, quarterly, or yearly in advance</li>
        <li>Prices are in Pakistani Rupees (PKR) unless stated otherwise</li>
        <li>Auto-renewal applies unless canceled before next billing date</li>
        <li>Payment methods: Stripe (cards), JazzCash, EasyPaisa, Bank Transfer</li>
      </ul>

      <h3>4.3 Refunds</h3>
      <p>See our <a href="/refund">Refund Policy</a> for details.</p>

      <h2>5. Acceptable Use</h2>
      <p>You agree NOT to:</p>
      <ul>
        <li>Use the service for illegal activities</li>
        <li>Attempt to gain unauthorized access</li>
        <li>Interfere with or disrupt the service</li>
        <li>Resell or sublicense without permission</li>
        <li>Use the service to spam or phish</li>
        <li>Reverse engineer or copy our software</li>
      </ul>

      <h2>6. Intellectual Property</h2>
      <p>
        All software, designs, logos, and content remain the property of Nafaa Technologies. You retain ownership of
        your business data.
      </p>

      <h2>7. Data Backup & Recovery</h2>
      <p>
        We perform daily automated backups. However, we strongly recommend you also export your data regularly. We are
        not liable for data loss in case of force majeure events.
      </p>

      <h2>8. Service Availability</h2>
      <p>
        We strive for 99.9% uptime. Scheduled maintenance will be announced in advance. We are not liable for
        interruptions caused by third-party providers, internet outages, or force majeure.
      </p>

      <h2>9. Termination</h2>
      <ul>
        <li>You may cancel anytime from account settings</li>
        <li>We may terminate accounts violating these terms</li>
        <li>After cancellation, data is retained for 90 days then deleted</li>
      </ul>

      <h2>10. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Nafaa Technologies shall not be liable for indirect, incidental,
        special, or consequential damages.
      </p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to indemnify Nafaa Technologies from any claims arising from your use of the service or violation
        of these terms.
      </p>

      <h2>12. Governing Law</h2>
      <p>
        These terms are governed by the laws of the Islamic Republic of Pakistan. Disputes shall be resolved in
        Lahore courts.
      </p>

      <h2>13. Changes to Terms</h2>
      <p>
        We may update these terms. Material changes will be notified via email at least 30 days before taking effect.
      </p>

      <h2>14. Contact</h2>
      <p>Questions about these terms: <a href="mailto:legal@nafaa.pk">legal@nafaa.pk</a></p>
    </LegalLayout>
  );
}

import { LegalLayout } from '@/components/legal/LegalLayout';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'Nafaa Privacy Policy — How we collect, use, and protect your data.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" subtitle="Your privacy matters to us" lastUpdated="May 8, 2026">
      <h2>1. Introduction</h2>
      <p>
        Nafaa Technologies ("we", "our", "us") respects your privacy. This Privacy Policy explains how we collect, use,
        store, and protect information when you use our services.
      </p>

      <h2>2. Information We Collect</h2>
      <h3>2.1 Information You Provide</h3>
      <ul>
        <li>Name, email address, phone number</li>
        <li>Shop name, address, and business details</li>
        <li>Payment and billing information</li>
        <li>Customer and product data you enter into the system</li>
      </ul>

      <h3>2.2 Information Collected Automatically</h3>
      <ul>
        <li>IP address, device information, browser type</li>
        <li>Usage patterns and analytics</li>
        <li>Cookies and similar tracking technologies</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Provide, maintain, and improve our services</li>
        <li>Process transactions and send invoices</li>
        <li>Send service updates and notifications</li>
        <li>Provide customer support</li>
        <li>Detect and prevent fraud</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>4. Data Sharing</h2>
      <p>We do <strong>not</strong> sell your personal data. We may share data with:</p>
      <ul>
        <li><strong>Service providers:</strong> Hosting, payment processors (Stripe, JazzCash, EasyPaisa), email/SMS providers</li>
        <li><strong>Legal compliance:</strong> When required by law or court order</li>
        <li><strong>Business transfers:</strong> In case of merger or acquisition</li>
      </ul>

      <h2>5. Data Security</h2>
      <p>
        We use bank-grade encryption (SSL/TLS), secure data centers, regular backups, and strict access controls.
        However, no system is 100% secure — we strive for the best.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain your data as long as your account is active. You can request deletion at any time by contacting{' '}
        <a href="mailto:privacy@nafaa.pk">privacy@nafaa.pk</a>.
      </p>

      <h2>7. Your Rights</h2>
      <ul>
        <li>Access your data</li>
        <li>Correct inaccurate information</li>
        <li>Delete your data ("right to be forgotten")</li>
        <li>Export your data (data portability)</li>
        <li>Opt out of marketing emails</li>
      </ul>

      <h2>8. Children's Privacy</h2>
      <p>Our services are not intended for users under 18. We do not knowingly collect data from minors.</p>

      <h2>9. International Data Transfers</h2>
      <p>
        Your data is primarily stored in Pakistan. Some service providers (like cloud hosting) may store data in other
        countries with adequate data protection laws.
      </p>

      <h2>10. Updates to This Policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be notified via email or a prominent notice
        on our website.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        For privacy questions: <a href="mailto:privacy@nafaa.pk">privacy@nafaa.pk</a>
        <br />
        Postal address: Nafaa Technologies, Lahore, Pakistan
      </p>
    </LegalLayout>
  );
}

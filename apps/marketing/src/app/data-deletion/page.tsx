import { LegalLayout } from '@/components/legal/LegalLayout';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Data deletion request',
  description: 'How to request complete deletion of your business data from Nafaa. Full control over your information.',
  path: '/data-deletion',
});

export default function DataDeletionPage() {
  return (
    <LegalLayout title="Data Deletion Request" subtitle="Your data is yours — delete it anytime, completely" lastUpdated="July 29, 2026">
      <h2>Your right to erasure</h2>
      <p>You can request complete deletion of your business data from Nafaa at any time. We honor every request within 30 days.</p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your account and profile</li>
        <li>All business data (products, customers, sales, khata)</li>
        <li>Uploaded files and images</li>
        <li>Message history and support conversations</li>
        <li>Analytics and usage data tied to your account</li>
      </ul>

      <h2>What we must retain (by law)</h2>
      <ul>
        <li>FBR-submitted invoices — retained for 72 months as required by Pakistani tax law</li>
        <li>Financial transaction records — retained for 6 years as required by SBP regulations</li>
        <li>Records under active legal hold or investigation</li>
      </ul>

      <h2>How to request deletion</h2>
      <ol>
        <li>Email <a href="mailto:privacy@nafaa.pk?subject=Data%20Deletion%20Request">privacy@nafaa.pk</a> from your registered email</li>
        <li>Include your account email and business name</li>
        <li>We confirm within 24 hours</li>
        <li>Complete deletion within 30 days (usually much faster)</li>
        <li>You receive final confirmation email once complete</li>
      </ol>

      <h2>Before you delete — export your data</h2>
      <p>We strongly recommend exporting your data first. In your Nafaa dashboard, go to Settings → Data → Export to download everything in Excel, PDF, and JSON formats. Once deletion completes, recovery is impossible.</p>

      <h2>Contact</h2>
      <p><a href="mailto:privacy@nafaa.pk">privacy@nafaa.pk</a> · WhatsApp +92 324 1772933</p>
    </LegalLayout>
  );
}

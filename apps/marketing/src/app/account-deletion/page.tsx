import { LegalLayout } from '@/components/legal/LegalLayout';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Account deletion',
  description: 'How to delete your Nafaa account permanently. Clear steps, no dark patterns.',
  path: '/account-deletion',
});

export default function AccountDeletionPage() {
  return (
    <LegalLayout title="Account Deletion" subtitle="Delete your account in three clicks — no hidden steps" lastUpdated="July 29, 2026">
      <h2>Self-service deletion</h2>
      <p>You can delete your Nafaa account yourself, anytime:</p>
      <ol>
        <li>Sign in to your Nafaa dashboard</li>
        <li>Go to Settings → Account → Delete account</li>
        <li>Confirm your password and the deletion warning</li>
        <li>Your account is scheduled for deletion within 24 hours</li>
      </ol>

      <h2>What happens after deletion</h2>
      <ul>
        <li>Your account becomes inaccessible immediately</li>
        <li>Business data is soft-deleted for 90 days (recoverable if you change your mind)</li>
        <li>After 90 days, all data is permanently and irreversibly deleted</li>
        <li>Subscription is cancelled — no further charges</li>
      </ul>

      <h2>Prefer to talk to a human?</h2>
      <p>Email <a href="mailto:support@nafaa.pk?subject=Account%20Deletion">support@nafaa.pk</a> or WhatsApp +92 324 1772933. Our team will process it manually if you prefer.</p>

      <h2>Note on active subscriptions</h2>
      <p>Deleting mid-cycle does not trigger a refund unless you are within the 30-day money-back guarantee window. See our <a href="/refund">refund policy</a> for details.</p>
    </LegalLayout>
  );
}

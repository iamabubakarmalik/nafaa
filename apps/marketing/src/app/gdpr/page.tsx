import { LegalLayout } from '@/components/legal/LegalLayout';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'GDPR compliance',
  description: 'How Nafaa handles data subject rights under GDPR and Pakistani data protection standards.',
  path: '/gdpr',
});

export default function GDPRPage() {
  return (
    <LegalLayout title="GDPR & Data Protection" subtitle="Your rights, clearly explained" lastUpdated="July 29, 2026">
      <h2>Your rights</h2>
      <p>Whether you're covered by GDPR, Pakistan's Personal Data Protection Bill, or any similar framework, Nafaa honors these rights:</p>
      <ul>
        <li><strong>Right of access:</strong> Get a copy of all data we hold about you</li>
        <li><strong>Right to rectification:</strong> Correct inaccurate personal data</li>
        <li><strong>Right to erasure:</strong> Request complete deletion (see <a href="/data-deletion">data deletion</a>)</li>
        <li><strong>Right to portability:</strong> Export your data in machine-readable format</li>
        <li><strong>Right to restrict processing:</strong> Pause specific uses of your data</li>
        <li><strong>Right to object:</strong> Opt out of marketing and profiling</li>
        <li><strong>Right to withdraw consent:</strong> Revoke any consent at any time</li>
      </ul>

      <h2>Legal basis for processing</h2>
      <ul>
        <li><strong>Contract:</strong> Processing needed to deliver Nafaa services you subscribed to</li>
        <li><strong>Legal obligation:</strong> FBR compliance, tax records, SBP requirements</li>
        <li><strong>Legitimate interest:</strong> Product improvement, fraud prevention, security</li>
        <li><strong>Consent:</strong> Marketing communications (opt-in, revocable)</li>
      </ul>

      <h2>Data transfers</h2>
      <p>Your data is stored primarily on servers in Pakistan and Singapore. Any cross-border transfers use standard contractual clauses and encryption in transit and at rest.</p>

      <h2>Data protection officer</h2>
      <p>Contact our DPO at <a href="mailto:privacy@nafaa.pk">privacy@nafaa.pk</a>. Response guaranteed within 30 days, usually within 48 hours.</p>

      <h2>Complaints</h2>
      <p>You have the right to lodge a complaint with your local data protection authority. In Pakistan, this is the Ministry of Information Technology and Telecommunication.</p>
    </LegalLayout>
  );
}

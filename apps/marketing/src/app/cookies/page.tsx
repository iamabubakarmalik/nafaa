import { LegalLayout } from '@/components/legal/LegalLayout';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Cookie policy',
  description: 'How Nafaa uses cookies — minimal, transparent, and under your control.',
  path: '/cookies',
});

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" subtitle="Minimal cookies, maximum transparency" lastUpdated="July 1, 2026">
      <h2>1. What we use</h2>
      <h3>Essential (required)</h3>
      <ul>
        <li>Session and authentication</li>
        <li>Security tokens</li>
        <li>Language preference (English / اردو)</li>
        <li>Theme preference (light / dark)</li>
      </ul>

      <h3>Analytics (optional)</h3>
      <ul>
        <li>Vercel Analytics — anonymous performance data</li>
        <li>Google Analytics 4 — aggregate usage patterns</li>
      </ul>

      <h2>2. What we never use</h2>
      <ul>
        <li>Creepy cross-site tracking</li>
        <li>Selling cookie data to advertisers</li>
        <li>Hidden fingerprinting</li>
      </ul>

      <h2>3. Your control</h2>
      <p>Manage cookies through your browser settings. Blocking essential cookies will prevent sign-in; blocking analytics cookies changes nothing about your experience.</p>

      <h2>4. Contact</h2>
      <p>Questions: <a href="mailto:privacy@nafaa.pk">privacy@nafaa.pk</a></p>
    </LegalLayout>
  );
}

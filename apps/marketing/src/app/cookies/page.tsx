import { LegalLayout } from '@/components/legal/LegalLayout';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Cookie Policy',
  description: 'Nafaa Cookie Policy — How we use cookies on our website.',
  path: '/cookies',
});

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" subtitle="How and why we use cookies" lastUpdated="May 8, 2026">
      <h2>1. What Are Cookies?</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website. They help us provide a better
        user experience, remember preferences, and analyze how our site is used.
      </p>

      <h2>2. Types of Cookies We Use</h2>

      <h3>2.1 Essential Cookies</h3>
      <p>Required for basic site functionality:</p>
      <ul>
        <li>Authentication and session management</li>
        <li>Security tokens (CSRF protection)</li>
        <li>Load balancing</li>
      </ul>

      <h3>2.2 Functional Cookies</h3>
      <p>Remember your preferences:</p>
      <ul>
        <li>Language preference (English/Urdu)</li>
        <li>Theme (light/dark mode)</li>
        <li>Recently viewed items</li>
      </ul>

      <h3>2.3 Analytics Cookies</h3>
      <p>Help us understand site usage:</p>
      <ul>
        <li>Google Analytics 4</li>
        <li>Vercel Analytics & Speed Insights</li>
      </ul>

      <h3>2.4 Marketing Cookies</h3>
      <p>Used for advertising and remarketing:</p>
      <ul>
        <li>Google Tag Manager</li>
        <li>Meta (Facebook) Pixel</li>
        <li>TikTok Pixel</li>
      </ul>

      <h2>3. Managing Cookies</h2>
      <p>You can control cookies through your browser settings. Note that disabling some cookies may affect site functionality.</p>
      <ul>
        <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies</li>
        <li><strong>Firefox:</strong> Options → Privacy & Security</li>
        <li><strong>Safari:</strong> Preferences → Privacy</li>
        <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
      </ul>

      <h2>4. Third-Party Cookies</h2>
      <p>
        Some cookies are set by third-party services we integrate with (Google, Meta, TikTok). These are governed by
        their respective privacy policies.
      </p>

      <h2>5. Updates</h2>
      <p>This Cookie Policy may be updated periodically. Last changes are reflected in the date above.</p>

      <h2>6. Contact</h2>
      <p>Questions: <a href="mailto:privacy@nafaa.pk">privacy@nafaa.pk</a></p>
    </LegalLayout>
  );
}

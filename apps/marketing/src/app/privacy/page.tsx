import { LegalLayout } from '@/components/legal/LegalLayout';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Privacy policy',
  description: 'How Nafaa collects, uses, and protects your data. Bank-grade privacy for Pakistani businesses.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" subtitle="Your data is sacred. Here is exactly how we treat it." lastUpdated="July 1, 2026">
      <h2>1. What we collect</h2>
      <p><strong>You provide:</strong> name, email, phone, business details, and the business data you enter (products, customers, sales).</p>
      <p><strong>Automatically:</strong> device information, IP address, and anonymized usage analytics to improve the product.</p>

      <h2>2. How we use it</h2>
      <ul>
        <li>Provide and improve Nafaa services</li>
        <li>Process your transactions and send receipts</li>
        <li>Provide customer support in English and Urdu</li>
        <li>Meet FBR and other legal compliance requirements</li>
      </ul>

      <h2>3. What we never do</h2>
      <ul>
        <li>Sell your data — ever, to anyone</li>
        <li>Use your business data to train AI models</li>
        <li>Share customer khata or sales data with third parties</li>
      </ul>

      <h2>4. Security</h2>
      <p>256-bit encryption in transit and at rest, ISO 27001 certified infrastructure, daily automated backups, and strict role-based access. See our <a href="/security">security page</a> for details.</p>

      <h2>5. Your rights</h2>
      <ul>
        <li>Export all your data anytime (Excel, PDF, JSON)</li>
        <li>Correct inaccurate information</li>
        <li>Request complete deletion via privacy@nafaa.pk</li>
        <li>Opt out of marketing communications</li>
      </ul>

      <h2>6. Contact</h2>
      <p>Privacy questions: <a href="mailto:privacy@nafaa.pk">privacy@nafaa.pk</a><br/>
      Nafaa Technologies, Citi Housing Phase 1, Gujranwala, Pakistan</p>
    </LegalLayout>
  );
}

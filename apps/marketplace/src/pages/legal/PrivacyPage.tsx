import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { Card } from '@/ui';

export default function PrivacyPage() {
  return (
    <>
      <Helmet><title>Privacy Policy — Nafaa Bazaar</title></Helmet>
      <div className="max-w-3xl mx-auto space-y-5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-info to-blue-700 flex items-center justify-center">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Privacy Policy</h1>
              <p className="text-xs text-content-muted">Last updated: July 2026</p>
            </div>
          </div>

          <div className="space-y-5">
            <section>
              <h2 className="text-lg font-black">1. Data We Collect</h2>
              <ul className="text-content-muted text-sm space-y-1 list-disc pl-5 mt-2">
                <li><strong>Account:</strong> Name, email, phone, password (hashed).</li>
                <li><strong>Orders:</strong> Delivery address, payment details (tokenized), order history.</li>
                <li><strong>Usage:</strong> Pages viewed, searches, clicks (anonymized where possible).</li>
                <li><strong>Location:</strong> Only with your permission, for nearby shops.</li>
                <li><strong>Voice search:</strong> Transcripts are logged but audio is not stored.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black">2. How We Use Data</h2>
              <ul className="text-content-muted text-sm space-y-1 list-disc pl-5 mt-2">
                <li>Fulfilling orders and providing customer service.</li>
                <li>Personalizing recommendations via our AI assistant.</li>
                <li>Fraud detection and account security.</li>
                <li>Marketing emails/SMS only if you opt-in.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black">3. Sharing</h2>
              <p className="text-content-muted text-sm">
                We share your details with shops (for order fulfillment), couriers (name/phone/address),
                and payment gateways (JazzCash, EasyPaisa). We never sell personal data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black">4. Your Rights</h2>
              <ul className="text-content-muted text-sm space-y-1 list-disc pl-5 mt-2">
                <li>Access, correct, or delete your data anytime from your profile.</li>
                <li>Opt out of marketing communications with one click.</li>
                <li>Download all your data via /profile/data-export.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black">5. Security</h2>
              <p className="text-content-muted text-sm">
                We use HTTPS, encrypted database fields for sensitive data, and industry-standard
                security practices. Report vulnerabilities to security@nafaa.pk.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black">6. Cookies</h2>
              <p className="text-content-muted text-sm">
                We use essential cookies for login and cart. Analytics cookies (Google Analytics,
                Facebook Pixel) only load with your consent.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black">7. Children</h2>
              <p className="text-content-muted text-sm">
                Nafaa Bazaar is not for children under 13. We do not knowingly collect data from minors.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black">8. Contact</h2>
              <p className="text-content-muted text-sm">
                Privacy questions? Email <a href="mailto:privacy@nafaa.pk" className="text-brand-600 font-bold">privacy@nafaa.pk</a>.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </>
  );
}

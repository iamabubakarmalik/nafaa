import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Card } from '@/ui';

export default function TermsPage() {
  return (
    <>
      <Helmet><title>Terms & Conditions — Nafaa Bazaar</title></Helmet>
      <div className="max-w-3xl mx-auto space-y-5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-brand flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Terms & Conditions</h1>
              <p className="text-xs text-content-muted">Last updated: July 2026</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-5">
            <section>
              <h2 className="text-lg font-black text-content">1. Acceptance of Terms</h2>
              <p className="text-content-muted text-sm leading-relaxed">
                By using Nafaa Bazaar, you agree to these Terms. If you do not agree, please do not use the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-content">2. Accounts</h2>
              <p className="text-content-muted text-sm leading-relaxed">
                You must be 18+ or have parental consent. You are responsible for maintaining
                the confidentiality of your account credentials. Notify us immediately of any unauthorized use.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-content">3. Orders & Payments</h2>
              <ul className="text-content-muted text-sm space-y-1 list-disc pl-5">
                <li>All prices are in Pakistani Rupees (PKR) and include applicable taxes.</li>
                <li>Payment methods: Cash on Delivery, JazzCash, EasyPaisa, Raast, Bank Transfer, Card, Wallet.</li>
                <li>Orders can be cancelled before shipping. Refunds process within 5-7 business days.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black text-content">4. Delivery</h2>
              <p className="text-content-muted text-sm leading-relaxed">
                Delivery times are estimates. Emergency 30-min delivery guarantees refund of the
                surcharge if late. Standard delivery depends on shop location and courier.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-content">5. Bargain, Group Buy & Auctions</h2>
              <ul className="text-content-muted text-sm space-y-1 list-disc pl-5">
                <li>Bargain offers expire in 24 hours. Max 3 counter-offer rounds per bargain.</li>
                <li>Group Buy: If target not reached by deadline, deposits are refunded automatically.</li>
                <li>Auctions: Winning bidder must complete purchase within 24 hours or lose deposit.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black text-content">6. Returns & Refunds</h2>
              <p className="text-content-muted text-sm leading-relaxed">
                Returns must be requested within 7 days of delivery. Items must be unused and in
                original packaging. Try-Before-You-Buy has separate terms with security deposit.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-content">7. Prohibited Conduct</h2>
              <ul className="text-content-muted text-sm space-y-1 list-disc pl-5">
                <li>No fraudulent orders, fake reviews, or manipulating pricing.</li>
                <li>No offensive, hateful, or illegal content in messages or reviews.</li>
                <li>Multiple accounts to abuse promotions may result in permanent bans.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-black text-content">8. Limitation of Liability</h2>
              <p className="text-content-muted text-sm leading-relaxed">
                Nafaa Bazaar acts as a marketplace connecting buyers and sellers. We are not
                responsible for product quality, shop actions, or delivery delays by third-party couriers,
                but we facilitate dispute resolution.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-content">9. Governing Law</h2>
              <p className="text-content-muted text-sm leading-relaxed">
                These terms are governed by the laws of the Islamic Republic of Pakistan.
                Disputes are subject to the jurisdiction of Lahore courts.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-content">10. Contact</h2>
              <p className="text-content-muted text-sm leading-relaxed">
                Questions? Email <a href="mailto:legal@nafaa.pk" className="text-brand-600 font-bold">legal@nafaa.pk</a> or use the in-app support.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </>
  );
}

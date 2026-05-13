export const metadata = {
  title: 'Data Deletion Request — Nafaa',
  description: 'Request deletion of your Nafaa account and data',
};

export default function DataDeletionPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <article className="prose prose-lg dark:prose-invert">
        <h1>Account & Data Deletion Request</h1>
        <p className="lead">
          You can request deletion of your Nafaa account and all associated data at any time.
        </p>

        <h2>App / Developer</h2>
        <p>
          <strong>App:</strong> Nafaa — POS for Pakistan<br/>
          <strong>Developer:</strong> Abubakar Imran<br/>
          <strong>Contact:</strong> <a href="mailto:privacy@nafaa.pk">privacy@nafaa.pk</a>
        </p>

        <h2>How to Request Deletion</h2>
        <ol>
          <li>Email us at <a href="mailto:privacy@nafaa.pk">privacy@nafaa.pk</a></li>
          <li>Subject line: <strong>"Account Deletion Request"</strong></li>
          <li>Include your registered email address used to sign up for Nafaa</li>
          <li>(Optional) Reason for deletion — helps us improve</li>
        </ol>

        <h2>Timeline</h2>
        <ul>
          <li><strong>Within 24 hours:</strong> We confirm receipt of your request</li>
          <li><strong>Within 30 days:</strong> Your account and all personal data are permanently deleted</li>
          <li><strong>Upon completion:</strong> You receive an email confirming deletion</li>
        </ul>

        <h2>What Gets Deleted</h2>
        <p>The following data is permanently and irreversibly deleted:</p>
        <ul>
          <li>Account information (name, email, phone number)</li>
          <li>Authentication credentials and tokens</li>
          <li>Shop profile and settings</li>
          <li>Products, categories, brands, suppliers</li>
          <li>Customer database and contact info</li>
          <li>Sales records, receipts, and transaction history</li>
          <li>Khata/udhaar (credit) records</li>
          <li>Reports and analytics tied to your account</li>
          <li>All uploaded images (product photos, shop logo, receipts)</li>
          <li>Push notification tokens</li>
        </ul>

        <h2>What We Retain (Legal Requirements)</h2>
        <p>Pakistani tax and financial regulations require us to retain certain records:</p>
        <ul>
          <li>
            <strong>Anonymized analytics</strong> — aggregated, cannot be linked back to you
          </li>
          <li>
            <strong>Financial transaction summaries</strong> — retained for 7 years per
            Pakistani tax law, but stripped of personal identifiers
          </li>
          <li>
            <strong>Server access logs</strong> — retained for 90 days for security audit,
            then automatically purged
          </li>
        </ul>

        <h2>Partial Deletion (Optional)</h2>
        <p>
          You can also delete individual records (specific products, customers, or sales)
          directly within the Nafaa app without deleting your entire account. Go to:
        </p>
        <p>
          <strong>Settings → Account → Manage Data</strong>
        </p>

        <h2>Questions?</h2>
        <p>
          For any questions about data deletion or privacy, contact us at{' '}
          <a href="mailto:privacy@nafaa.pk">privacy@nafaa.pk</a> or visit our{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>

        <hr/>
        <p className="text-sm text-neutral-500">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </article>
    </main>
  );
}

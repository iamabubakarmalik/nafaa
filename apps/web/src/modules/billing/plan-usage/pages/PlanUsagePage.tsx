/** /plan-usage — the billing centre opened on usage against plan limits. */

import { BillingCenter } from '@modules/billing/billing/pages/BillingPage';

export default function PlanUsagePage() {
  return <BillingCenter defaultTab="usage" />;
}

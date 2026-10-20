/**
 * "Compare plans": the pricing page's comparison table, generated from the
 * Plan table only (ARCH 8 pricing row: "comparisonTable (plan features from
 * Plan)"). Rows: price per billing period, free-trial days, the four limits,
 * then every plan feature the owner has labelled in settings `pricing`.
 * Nothing here is typed by hand, so changing a plan in Admin → Plans changes
 * this table (tag `plans`).
 *
 * A real <table> with <caption>, row headers and a horizontal scroll area on
 * phones (the table scrolls, the page does not).
 */
import { formatPkr } from '@/components/blocks/lib/format';
import { cx } from '@/components/ui/cx';
import type { PublicPlan } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';

/** The API's "unlimited" sentinels (same rule as the pricing block). */
function limit(value: number, kind: 'products' | 'users' | 'shops' | 'sales'): string {
  const unlimited = kind === 'users' || kind === 'shops' ? value >= 999 : value >= 99_999;
  return unlimited ? 'Unlimited' : value.toLocaleString('en-US');
}

function price(plan: PublicPlan, period: 'monthly' | 'quarterly' | 'yearly'): string {
  const amount = period === 'monthly' ? plan.priceMonthly : period === 'quarterly' ? plan.priceQuarterly : plan.priceYearly;
  if (amount === 0) return plan.trialDays > 0 ? 'Free trial' : 'Free';
  return formatPkr(amount);
}

interface Row {
  label: string;
  cells: (plan: PublicPlan) => string | boolean;
}

export function PlanMatrix({ plans, highlight }: { plans: PublicPlan[]; highlight?: string }) {
  if (plans.length < 2) return null;
  const labelled = new Map<string, string>();
  for (const plan of plans) for (const f of plan.features) labelled.set(f.key, f.label);

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: 'Price',
      rows: [
        { label: 'Monthly', cells: (p) => price(p, 'monthly') },
        { label: 'Quarterly', cells: (p) => price(p, 'quarterly') },
        { label: 'Yearly', cells: (p) => price(p, 'yearly') },
        ...(plans.some((p) => p.trialDays > 0) ? [{ label: 'Free trial', cells: (p: PublicPlan) => (p.trialDays > 0 ? `${p.trialDays} days` : '—') }] : []),
      ],
    },
    {
      title: 'Limits',
      rows: [
        { label: 'Products', cells: (p) => limit(p.limits.maxProducts, 'products') },
        { label: 'Users', cells: (p) => limit(p.limits.maxUsers, 'users') },
        { label: 'Shops', cells: (p) => limit(p.limits.maxShops, 'shops') },
        { label: 'Sales a month', cells: (p) => limit(p.limits.maxSalesPerMonth, 'sales') },
      ],
    },
    ...(labelled.size
      ? [
          {
            title: 'Features',
            rows: [...labelled.entries()].map(([key, label]) => ({
              label,
              cells: (p: PublicPlan) => p.features.find((f) => f.key === key)?.included === true,
            })),
          },
        ]
      : []),
  ];

  const hot = highlight ?? plans.find((p) => p.display.highlight)?.slug;

  return (
    <section aria-labelledby="compare-plans" className="py-section">
      <div className="mx-auto box-content max-w-container px-gutter">
        <div className="max-w-[42rem]">
          <p className="mb-3 text-eyebrow uppercase text-link">Compare</p>
          <h2 id="compare-plans" className="text-h2 text-fg-strong">
            Compare plans
          </h2>
          <p className="mt-4 text-body-lg text-fg-muted">Every price and limit below comes straight from our plan settings, the same ones the app uses.</p>
        </div>
        <div className="mt-10 overflow-x-auto rounded-xl border border-line bg-surface shadow-e1 ink:shadow-none" tabIndex={0} role="region" aria-labelledby="compare-plans">
          <table className="w-full min-w-[40rem] border-collapse text-left text-small">
            <caption className="sr-only">Nafaa plans compared by price, free trial, limits and features</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-[28%] p-4 font-medium text-fg-subtle">
                  Plan
                </th>
                {plans.map((plan) => (
                  <th key={plan.slug} scope="col" className={cx('p-4 align-bottom', plan.slug === hot && 'bg-brand-50/60 ink:bg-brand-400/10')}>
                    <span className="block text-h4 text-fg-strong">{plan.name}</span>
                    {plan.display.tagline ? <span className="mt-0.5 block text-xs font-normal text-fg-subtle">{plan.display.tagline}</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.title}>
                <tr>
                  <th scope="colgroup" colSpan={plans.length + 1} className="bg-surface-2 px-4 py-2 text-eyebrow uppercase text-fg-subtle">
                    {group.title}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <th scope="row" className="p-4 font-medium text-fg">
                      {row.label}
                    </th>
                    {plans.map((plan) => {
                      const value = row.cells(plan);
                      return (
                        <td key={plan.slug} className={cx('p-4 tabular-nums text-fg-strong', plan.slug === hot && 'bg-brand-50/60 ink:bg-brand-400/10')}>
                          {typeof value === 'boolean' ? (
                            value ? (
                              <CmsIcon name="check" size={18} label="Included" className="text-link" />
                            ) : (
                              <span className="text-fg-subtle" aria-label="Not included">
                                —
                              </span>
                            )
                          ) : (
                            value
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </section>
  );
}

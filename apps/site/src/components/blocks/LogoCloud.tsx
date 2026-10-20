/**
 * logoCloud (API-CONTRACT 4.13): logos of customers with LOGO consent only.
 * Nothing is rendered when there are none; never a placeholder (ARCH D12).
 */
import { Container } from '@/components/ui/Container';
import { CmsImage } from '@/lib/media';
import { strings } from './lib/i18n';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';
import styles from './blocks.module.css';

export async function LogoCloud({ block, ctx }: BlockProps<'logoCloud'>) {
  const customers = await ctx.source.customers({
    locale: ctx.locale,
    ids: block.mode === 'pick' ? block.ids : undefined,
    industry: block.mode === 'auto' ? block.filter?.industryId : undefined,
    city: block.mode === 'auto' ? block.filter?.cityId : undefined,
    limit: block.limit,
  });
  if (!customers.length) return null;
  const t = strings(ctx.locale);

  return (
    <Container>
      <h2 id={ctx.headingId} className="text-center text-small font-medium text-fg-muted">
        {block.heading?.trim() || t.logosHeading}
      </h2>
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-8 md:gap-x-16" {...reveal(ctx.index, 'stagger')}>
        {customers.map((customer) => (
          <li key={customer.id} className={styles.logo}>
            <CmsImage media={customer.logo} alt={customer.name} sizes="160px" maxWidth={320} placeholder={false} className="h-10 w-auto" />
          </li>
        ))}
      </ul>
    </Container>
  );
}

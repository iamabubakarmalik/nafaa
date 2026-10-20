/**
 * leadForm (API-CONTRACT 4.21 + 1.1.0): contact, demo or quote ("Quote
 * lein") form. The heading, intro and optional WhatsApp button are server
 * HTML; the form is an island (islands/LeadForm) that posts to the existing
 * public marketing endpoints.
 */
import { Container } from '@/components/ui/Container';
import { buttonClasses } from '@/components/ui/Button';
import { LeadForm } from '@/components/islands/LeadForm';
import { InlineMarkdown } from './rich-text/Markdown';
import { whatsappHref } from './lib/links';
import { strings } from './lib/i18n';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';

export async function LeadFormBlock({ block, ctx }: BlockProps<'leadForm'>) {
  const t = strings(ctx.locale);
  const site = await ctx.source.site(ctx.locale);
  const wa = whatsappHref(site.whatsapp);

  return (
    <Container>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="lg:pt-4" {...reveal(ctx.index)}>
          <h2 id={ctx.headingId} className="text-h2 text-fg-strong">
            {block.heading}
          </h2>
          {block.intro ? (
            <p className="mt-4 text-body-lg text-fg-muted">
              <InlineMarkdown text={block.intro} />
            </p>
          ) : null}
          {block.whatsapp && wa ? (
            <div className="mt-8">
              <p className="text-small text-fg-subtle">{t.form.orWhatsapp}</p>
              <a href={wa} rel="noopener" data-track="whatsapp_click" data-track-label={`lead:${block.form}`} className={buttonClasses({ variant: 'secondary', className: 'mt-3' })}>
                <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" className="text-[rgb(37_211_102)]">
                  <path
                    fill="currentColor"
                    d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3Z"
                  />
                </svg>
                <span>{t.whatsappCta}</span>
              </a>
            </div>
          ) : null}
        </div>
        <LeadForm
          form={block.form}
          formType={block.formType}
          subjectPrefix={block.subjectPrefix}
          successMessage={block.successMessage}
          currencies={block.currencies}
          whatsappHref={wa}
          whatsappLabel={t.whatsappCta}
          sourcePage={ctx.entry.path}
          strings={t.form}
        />
      </div>
    </Container>
  );
}

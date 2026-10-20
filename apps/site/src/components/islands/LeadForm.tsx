'use client';

/**
 * Lead form island (leadForm block, API-CONTRACT 4.21 + 1.1.0).
 *
 * Posts to the existing public endpoints, which create a MarketingLead:
 * - contact → POST /public/marketing/contact-form (SubmitContactFormDto)
 * - demo    → POST /public/marketing/demo-booking (BookDemoDto)
 * - quote   → contact-form with formType SALES; budget, currency, timeline
 *             and country are written into the message ("Quote lein").
 *
 * The API rejects unknown fields (forbidNonWhitelisted), so payloads carry
 * exactly the DTO fields. A hidden honeypot field stops simple bots without
 * a captcha. Events: `form_start` on first input, `demo_submit` after a
 * booked demo.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { track, utmParams } from '@/lib/analytics/track';
import { PUBLIC_API_URL } from '@/lib/cms/env';
import type { BlockStrings } from '@/components/blocks/lib/i18n';

export type LeadFormKind = 'contact' | 'demo' | 'quote';

export interface LeadFormProps {
  form: LeadFormKind;
  formType?: 'SALES' | 'ENTERPRISE' | 'PARTNERSHIP' | 'GENERAL';
  subjectPrefix?: string;
  successMessage: string;
  currencies?: ('PKR' | 'USD')[];
  whatsappHref?: string | null;
  /** CMS path of the page, for the lead's sourcePage. */
  sourcePage: string;
  strings: BlockStrings['form'];
  whatsappLabel: string;
}

type Errors = Partial<Record<'fullName' | 'email' | 'phone' | 'message' | 'preferredDate', string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INPUT =
  'block h-11 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[0.9375rem] text-fg-strong shadow-e1 ' +
  'transition-[border-color,box-shadow] duration-fast placeholder:text-fg-subtle ' +
  'focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/15 ' +
  'aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/15 ink:shadow-none';

function Field({
  id,
  label,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-small font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600 ink:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LeadForm(props: LeadFormProps) {
  const { form, strings: t } = props;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `${uid}-${name}`;
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const [minDate, setMinDate] = useState<string | undefined>(undefined);
  const started = useRef(false);
  const doneRef = useRef<HTMLDivElement>(null);
  const currencies = props.currencies?.length ? props.currencies : (['PKR', 'USD'] as const);

  useEffect(() => {
    // Set after mount so server and client HTML match.
    const today = new Date();
    setMinDate(new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (status === 'done') doneRef.current?.focus();
  }, [status]);

  function onFirstInput() {
    if (started.current) return;
    started.current = true;
    track('form_start', { label: form });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (name: string) => String(data.get(name) ?? '').trim();

    if (get('website')) {
      setStatus('done');
      return;
    }

    const fullName = get('fullName');
    const email = get('email');
    const phone = get('phone');
    const company = get('companyName');
    const message = get('message');
    const next: Errors = {};
    if (fullName.length < 2) next.fullName = t.errorName;
    if (!EMAIL.test(email)) next.email = t.errorEmail;
    if (form === 'demo' && phone.length < 6) next.phone = t.errorPhone;
    if (form === 'demo' && !get('preferredDate')) next.preferredDate = t.errorDate;
    if (form !== 'demo' && message.length < 10) next.message = t.errorMessage;
    setErrors(next);
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0];
      if (first) document.getElementById(id(first))?.focus();
      return;
    }

    const tracking = {
      sourceUrl: window.location.href,
      ...pick(utmParams(), ['utmSource', 'utmMedium', 'utmCampaign']),
    };

    let path: string;
    let body: Record<string, unknown>;
    if (form === 'demo') {
      path = '/public/marketing/demo-booking';
      body = {
        fullName,
        email,
        phone,
        companyName: company || undefined,
        city: get('city') || undefined,
        preferredDate: get('preferredDate'),
        preferredTime: get('preferredTime'),
        painPoints: message || undefined,
        ...tracking,
      };
    } else {
      path = '/public/marketing/contact-form';
      const prefix = props.subjectPrefix?.trim() || (form === 'quote' ? 'Quote request' : 'Website enquiry');
      const lines =
        form === 'quote'
          ? [
              get('budget') ? `Budget: ${get('currency')} ${get('budget')}` : null,
              get('timeline') ? `Timeline: ${get('timeline')}` : null,
              get('country') ? `Country: ${get('country')}` : null,
              '',
              message,
            ].filter((line): line is string => line !== null)
          : [message];
      body = {
        fullName,
        email,
        phone: phone || undefined,
        companyName: company || undefined,
        country: get('country') || undefined,
        formType: props.formType ?? (form === 'quote' ? 'SALES' : undefined),
        subject: `${prefix}: ${company || fullName}`,
        message: lines.join('\n').trim(),
        sourcePage: props.sourcePage,
        ...tracking,
      };
    }

    setStatus('sending');
    try {
      const res = await fetch(`${PUBLIC_API_URL}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'omit',
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('done');
      if (form === 'demo') track('demo_submit', { label: props.sourcePage });
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="flex flex-col items-center rounded-xl border border-line bg-surface px-6 py-14 text-center shadow-e1 outline-none ink:shadow-none">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-brand-500/10 text-link">
          <svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p className="mt-5 max-w-[26rem] text-body-lg font-medium text-fg-strong">{props.successMessage}</p>
      </div>
    );
  }

  const submitLabel = form === 'demo' ? t.submitDemo : form === 'quote' ? t.submitQuote : t.submitContact;
  const invalid = (name: keyof Errors) => (errors[name] ? { 'aria-invalid': true, 'aria-describedby': `${id(name)}-error` } : {});

  return (
    <form noValidate onSubmit={onSubmit} onInput={onFirstInput} className="relative rounded-xl border border-line bg-surface p-6 shadow-e2 ink:shadow-none md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id('fullName')} label={t.name} error={errors.fullName}>
          <input id={id('fullName')} name="fullName" autoComplete="name" required className={INPUT} {...invalid('fullName')} />
        </Field>
        <Field id={id('email')} label={t.email} error={errors.email}>
          <input id={id('email')} name="email" type="email" autoComplete="email" inputMode="email" required className={INPUT} {...invalid('email')} />
        </Field>
        <Field id={id('phone')} label={form === 'demo' ? t.phone : t.phoneOptional} error={errors.phone}>
          <input id={id('phone')} name="phone" type="tel" autoComplete="tel" inputMode="tel" required={form === 'demo'} className={INPUT} {...invalid('phone')} />
        </Field>
        <Field id={id('companyName')} label={t.companyOptional}>
          <input id={id('companyName')} name="companyName" autoComplete="organization" className={INPUT} />
        </Field>

        {form === 'demo' ? (
          <>
            <Field id={id('preferredDate')} label={t.preferredDate} error={errors.preferredDate}>
              <input id={id('preferredDate')} name="preferredDate" type="date" min={minDate} required className={INPUT} {...invalid('preferredDate')} />
            </Field>
            <Field id={id('preferredTime')} label={t.preferredTime}>
              <select id={id('preferredTime')} name="preferredTime" className={INPUT} defaultValue="morning">
                <option value="morning">{t.morning}</option>
                <option value="afternoon">{t.afternoon}</option>
                <option value="evening">{t.evening}</option>
              </select>
            </Field>
            <Field id={id('city')} label={t.city} className="sm:col-span-2">
              <input id={id('city')} name="city" autoComplete="address-level2" className={INPUT} />
            </Field>
          </>
        ) : null}

        {form === 'quote' ? (
          <>
            <Field id={id('budget')} label={t.budget}>
              <div className="flex gap-2">
                <label htmlFor={id('currency')} className="sr-only">
                  {t.currency}
                </label>
                <select id={id('currency')} name="currency" className={`${INPUT} !w-[5.5rem] shrink-0`} defaultValue={currencies[0]}>
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
                <input id={id('budget')} name="budget" inputMode="numeric" autoComplete="off" className={INPUT} />
              </div>
            </Field>
            <Field id={id('timeline')} label={t.timeline}>
              <select id={id('timeline')} name="timeline" className={INPUT} defaultValue="">
                <option value="">–</option>
                <option value={t.timelineAsap}>{t.timelineAsap}</option>
                <option value={t.timeline1to3}>{t.timeline1to3}</option>
                <option value={t.timeline3plus}>{t.timeline3plus}</option>
                <option value={t.timelineUnsure}>{t.timelineUnsure}</option>
              </select>
            </Field>
            <Field id={id('country')} label={t.country} className="sm:col-span-2">
              <input id={id('country')} name="country" autoComplete="country-name" className={INPUT} />
            </Field>
          </>
        ) : null}

        <Field id={id('message')} label={form === 'quote' ? t.details : t.message} error={errors.message} className="sm:col-span-2">
          <textarea
            id={id('message')}
            name="message"
            rows={form === 'demo' ? 3 : 5}
            required={form !== 'demo'}
            className={`${INPUT} h-auto min-h-[7rem] py-3 leading-relaxed`}
            {...invalid('message')}
          />
        </Field>

        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      </div>

      {status === 'error' ? (
        <p role="alert" className="mt-5 rounded-md bg-red-50 px-4 py-3 text-small text-red-800 ink:bg-red-500/10 ink:text-red-300">
          {t.errorGeneric}
          {props.whatsappHref ? (
            <>
              {' '}
              <a href={props.whatsappHref} rel="noopener" className="font-medium underline underline-offset-2">
                {props.whatsappLabel}
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-fg-subtle">{t.privacy}</p>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-brand-700 px-6 text-base font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(2_6_23/0.14)] transition-colors duration-fast hover:bg-brand-800 disabled:opacity-60"
        >
          {status === 'sending' ? t.sending : submitLabel}
        </button>
      </div>

    </form>
  );
}

function pick<T extends Record<string, string>>(source: T, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) if (source[key]) out[key] = source[key] as string;
  return out;
}

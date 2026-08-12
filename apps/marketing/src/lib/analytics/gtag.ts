export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export function pageview(url: string) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('config', GA_ID, { page_path: url });
}

export function event(action: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', action, params);
}

// GTM dataLayer push (for GTM-managed tags)
export function dataLayerPush(payload: Record<string, any>) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

// ─── Consent Mode v2 ───
export function setConsentDefaults() {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  });
}

export function grantConsent() {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('consent', 'update', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  });
}

export function denyConsent() {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('consent', 'update', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });
}

// ─── Nafaa conversion events (GA4 recommended events) ───
export const track = {
  ctaClick: (label: string, location: string) =>
    event('cta_click', { cta_label: label, cta_location: location }),

  signupStart: (plan?: string, industry?: string) =>
    event('sign_up_start', { plan, industry }),

  demoBooked: (slot: string) =>
    event('generate_lead', { lead_type: 'demo', slot }),

  contactSubmit: (topic: string) =>
    event('generate_lead', { lead_type: 'contact', topic }),

  newsletter: (source: string) =>
    event('newsletter_signup', { source }),

  whatsappClick: (page: string) =>
    event('whatsapp_click', { page }),

  quizComplete: (plan: string) =>
    event('quiz_complete', { recommended_plan: plan }),

  roiCalculated: (industry: string, monthlySavings: number) =>
    event('roi_calculated', { industry, monthly_savings: monthlySavings }),

  industryView: (slug: string) =>
    event('view_industry', { industry_slug: slug }),

  integrationView: (slug: string) =>
    event('view_integration', { integration_slug: slug }),

  voiceSearch: (query: string) =>
    event('voice_search', { query_length: query.length }),

  commandPalette: (query: string) =>
    event('command_palette_search', { query_length: query.length }),

  playgroundCheckout: (total: number) =>
    event('playground_checkout', { value: total, currency: 'PKR' }),

  languageSwitch: (to: string) =>
    event('language_switch', { to_locale: to }),

  themeSwitch: (to: string) =>
    event('theme_switch', { to_theme: to }),
};

export const MARKETING_PERMISSIONS = {
  // Dashboard
  MARKETING_DASHBOARD_VIEW: 'marketing.dashboard.view',

  // Newsletter
  NEWSLETTER_VIEW: 'marketing.newsletter.view',
  NEWSLETTER_MANAGE: 'marketing.newsletter.manage',
  NEWSLETTER_EXPORT: 'marketing.newsletter.export',
  NEWSLETTER_SEND: 'marketing.newsletter.send',

  // Contact forms
  CONTACT_FORMS_VIEW: 'marketing.contact_forms.view',
  CONTACT_FORMS_REPLY: 'marketing.contact_forms.reply',
  CONTACT_FORMS_MANAGE: 'marketing.contact_forms.manage',

  // Demo bookings
  DEMO_BOOKINGS_VIEW: 'marketing.demo_bookings.view',
  DEMO_BOOKINGS_MANAGE: 'marketing.demo_bookings.manage',

  // Leads
  LEADS_VIEW: 'marketing.leads.view',
  LEADS_MANAGE: 'marketing.leads.manage',
  LEADS_EXPORT: 'marketing.leads.export',
  LEADS_ASSIGN: 'marketing.leads.assign',

  // Chatbot
  CHATBOT_VIEW: 'marketing.chatbot.view',
  CHATBOT_HANDLE: 'marketing.chatbot.handle',
  CHATBOT_MANAGE: 'marketing.chatbot.manage',

  // Campaigns
  CAMPAIGNS_VIEW: 'marketing.campaigns.view',
  CAMPAIGNS_CREATE: 'marketing.campaigns.create',
  CAMPAIGNS_SEND: 'marketing.campaigns.send',

  // Analytics
  ANALYTICS_VIEW: 'marketing.analytics.view',
  ANALYTICS_EXPORT: 'marketing.analytics.export',

  // SEO
  SEO_VIEW: 'marketing.seo.view',
  SEO_MANAGE: 'marketing.seo.manage',

  // A/B Tests
  AB_TESTS_VIEW: 'marketing.ab_tests.view',
  AB_TESTS_MANAGE: 'marketing.ab_tests.manage',

  // Heatmaps
  HEATMAPS_VIEW: 'marketing.heatmaps.view',

  // Blog analytics
  BLOG_ANALYTICS_VIEW: 'marketing.blog_analytics.view',

  // Conversions
  CONVERSIONS_VIEW: 'marketing.conversions.view',
  CONVERSIONS_MANAGE: 'marketing.conversions.manage',

  // Exports
  MARKETING_EXPORTS: 'marketing.exports',

  // Settings
  MARKETING_SETTINGS: 'marketing.settings.manage',
} as const;

export type MarketingPermissionKey =
  (typeof MARKETING_PERMISSIONS)[keyof typeof MARKETING_PERMISSIONS];

export const ALL_MARKETING_PERMISSIONS: MarketingPermissionKey[] = Object.values(
  MARKETING_PERMISSIONS,
);

// Role → permissions map
export const MARKETING_ROLE_PERMISSIONS: Record<string, MarketingPermissionKey[]> = {
  SUPER: ALL_MARKETING_PERMISSIONS,

  MARKETING_MANAGER: ALL_MARKETING_PERMISSIONS.filter(
    (p) => !p.includes('settings'),
  ),

  CONTENT: [
    MARKETING_PERMISSIONS.MARKETING_DASHBOARD_VIEW,
    MARKETING_PERMISSIONS.NEWSLETTER_VIEW,
    MARKETING_PERMISSIONS.NEWSLETTER_SEND,
    MARKETING_PERMISSIONS.CAMPAIGNS_VIEW,
    MARKETING_PERMISSIONS.CAMPAIGNS_CREATE,
    MARKETING_PERMISSIONS.BLOG_ANALYTICS_VIEW,
    MARKETING_PERMISSIONS.SEO_VIEW,
  ],

  ANALYST: [
    MARKETING_PERMISSIONS.MARKETING_DASHBOARD_VIEW,
    MARKETING_PERMISSIONS.ANALYTICS_VIEW,
    MARKETING_PERMISSIONS.ANALYTICS_EXPORT,
    MARKETING_PERMISSIONS.SEO_VIEW,
    MARKETING_PERMISSIONS.AB_TESTS_VIEW,
    MARKETING_PERMISSIONS.HEATMAPS_VIEW,
    MARKETING_PERMISSIONS.CONVERSIONS_VIEW,
    MARKETING_PERMISSIONS.BLOG_ANALYTICS_VIEW,
    MARKETING_PERMISSIONS.LEADS_VIEW,
  ],

  AGENT: [
    MARKETING_PERMISSIONS.MARKETING_DASHBOARD_VIEW,
    MARKETING_PERMISSIONS.CONTACT_FORMS_VIEW,
    MARKETING_PERMISSIONS.CONTACT_FORMS_REPLY,
    MARKETING_PERMISSIONS.CHATBOT_VIEW,
    MARKETING_PERMISSIONS.CHATBOT_HANDLE,
    MARKETING_PERMISSIONS.LEADS_VIEW,
    MARKETING_PERMISSIONS.LEADS_MANAGE,
    MARKETING_PERMISSIONS.DEMO_BOOKINGS_VIEW,
    MARKETING_PERMISSIONS.DEMO_BOOKINGS_MANAGE,
  ],
};

export function hasMarketingPermission(
  role: string,
  userPermissions: string[],
  required: MarketingPermissionKey,
): boolean {
  if (role === 'SUPER') return true;
  // Custom per-user permissions first
  if (userPermissions.includes(required)) return true;
  // Fall back to role defaults (MARKETING_MANAGER excludes settings correctly)
  const rolePerms = MARKETING_ROLE_PERMISSIONS[role] ?? [];
  return rolePerms.includes(required);
}

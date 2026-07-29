import type { MetadataRoute } from 'next';
import { industries } from '@/lib/data/industries';
import { integrations } from '@/lib/data/integrations';
import { features } from '@/lib/data/features';
import { solutions } from '@/lib/data/solutions';
import { cities } from '@/lib/data/cities';
import { blogPosts } from '@/lib/data/blog';
import { comparisons } from '@/lib/data/compare';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  type Route = { path: string; priority: number; freq: 'daily' | 'weekly' | 'monthly' | 'yearly' };

  // ─── Static routes (all 20 phases) ───────────────
  const staticRoutes: Route[] = [
    // Core
    { path: '', priority: 1.0, freq: 'daily' },
    { path: '/marketplace', priority: 0.95, freq: 'weekly' },
    { path: '/pricing', priority: 0.95, freq: 'weekly' },
    { path: '/playground', priority: 0.95, freq: 'weekly' },
    { path: '/enterprise', priority: 0.9, freq: 'monthly' },
    { path: '/demo', priority: 0.85, freq: 'weekly' },
    { path: '/founder-letter', priority: 0.7, freq: 'monthly' },

    // Main sections
    { path: '/industries', priority: 0.9, freq: 'weekly' },
    { path: '/integrations', priority: 0.9, freq: 'weekly' },
    { path: '/solutions', priority: 0.85, freq: 'weekly' },
    { path: '/product/pos', priority: 0.9, freq: 'monthly' },

    // Content
    { path: '/blog', priority: 0.9, freq: 'daily' },
    { path: '/guides', priority: 0.85, freq: 'weekly' },
    { path: '/glossary', priority: 0.8, freq: 'monthly' },
    { path: '/case-studies', priority: 0.85, freq: 'monthly' },
    { path: '/recipes', priority: 0.8, freq: 'monthly' },
    { path: '/changelog', priority: 0.7, freq: 'weekly' },
    { path: '/roadmap', priority: 0.75, freq: 'weekly' },

    // Interactive tools
    { path: '/roi-calculator', priority: 0.85, freq: 'monthly' },
    { path: '/quiz', priority: 0.9, freq: 'monthly' },
    { path: '/cost-predictor', priority: 0.85, freq: 'monthly' },
    { path: '/migrate', priority: 0.85, freq: 'monthly' },
    { path: '/fbr-wizard', priority: 0.85, freq: 'monthly' },

    // Compare
    { path: '/compare', priority: 0.85, freq: 'weekly' },

    // Academy & templates
    { path: '/academy', priority: 0.85, freq: 'weekly' },
    { path: '/templates', priority: 0.85, freq: 'weekly' },

    // Developer
    { path: '/api-docs', priority: 0.7, freq: 'monthly' },
    { path: '/api-explorer', priority: 0.75, freq: 'monthly' },

    // Company
    { path: '/about', priority: 0.7, freq: 'monthly' },
    { path: '/contact', priority: 0.8, freq: 'monthly' },
    { path: '/careers', priority: 0.75, freq: 'weekly' },
    { path: '/partners', priority: 0.75, freq: 'monthly' },
    { path: '/partner-portal', priority: 0.7, freq: 'monthly' },
    { path: '/press', priority: 0.6, freq: 'monthly' },

    // Support
    { path: '/help', priority: 0.8, freq: 'weekly' },
    { path: '/faq', priority: 0.8, freq: 'monthly' },
    { path: '/status', priority: 0.6, freq: 'daily' },
    { path: '/security', priority: 0.7, freq: 'monthly' },

    // Download
    { path: '/download', priority: 0.85, freq: 'weekly' },

    // Search
    { path: '/search', priority: 0.75, freq: 'weekly' },

    // Legal
    { path: '/privacy', priority: 0.4, freq: 'yearly' },
    { path: '/terms', priority: 0.4, freq: 'yearly' },
    { path: '/refund', priority: 0.4, freq: 'yearly' },
    { path: '/cookies', priority: 0.3, freq: 'yearly' },
    { path: '/gdpr', priority: 0.4, freq: 'yearly' },
    { path: '/data-deletion', priority: 0.4, freq: 'yearly' },
    { path: '/account-deletion', priority: 0.3, freq: 'yearly' },
  ];

  // ─── Dynamic routes ──────────────────────────────
  const featureRoutes: Route[] = features.map((f) => ({
    path: `/product/${f.slug}`, priority: 0.9, freq: 'monthly',
  }));

  const industryRoutes: Route[] = industries.map((i) => ({
    path: `/industries/${i.slug}`, priority: 0.85, freq: 'monthly',
  }));

  const integrationRoutes: Route[] = integrations.map((i) => ({
    path: `/integrations/${i.slug}`, priority: 0.85, freq: 'monthly',
  }));

  const solutionRoutes: Route[] = solutions.map((s) => ({
    path: `/solutions/${s.slug}`, priority: 0.8, freq: 'monthly',
  }));

  const blogRoutes: Route[] = blogPosts.map((p) => ({
    path: `/blog/${p.slug}`, priority: 0.75, freq: 'monthly',
  }));

  const compareRoutes: Route[] = comparisons.map((c) => ({
    path: `/compare/${c.slug}`, priority: 0.8, freq: 'monthly',
  }));

  // Location routes — cities × industries
  const locationRoutes: Route[] = [];
  for (const c of cities) {
    for (const i of industries) {
      locationRoutes.push({
        path: `/${c.slug}/${i.slug}`,
        priority: 0.75,
        freq: 'monthly',
      });
    }
  }

  // ─── Combine all ─────────────────────────────────
  const all = [
    ...staticRoutes,
    ...featureRoutes,
    ...industryRoutes,
    ...integrationRoutes,
    ...solutionRoutes,
    ...blogRoutes,
    ...compareRoutes,
    ...locationRoutes,
  ];

  return all.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
    alternates: {
      languages: {
        'en-PK': `${SITE_URL}${r.path}`,
        'ur-PK': `${SITE_URL}${r.path}`,
      },
    },
  }));
}

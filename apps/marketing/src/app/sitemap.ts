import type { MetadataRoute } from 'next';
import { blogPosts, categories } from '@/lib/blog/posts';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/features', priority: 0.95, changeFrequency: 'weekly' as const },
    { path: '/pricing', priority: 0.95, changeFrequency: 'weekly' as const },
    { path: '/industries', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/blog', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/help', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/integrations', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/api-docs', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/careers', priority: 0.6, changeFrequency: 'weekly' as const },
    { path: '/partners', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/press', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/status', priority: 0.5, changeFrequency: 'daily' as const },
    { path: '/changelog', priority: 0.6, changeFrequency: 'weekly' as const },
    { path: '/security', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.4, changeFrequency: 'yearly' as const },
    { path: '/refund', priority: 0.4, changeFrequency: 'yearly' as const },
    { path: '/cookies', priority: 0.4, changeFrequency: 'yearly' as const },
  ];

  const industries = [
    'bakery', 'kiryana', 'mobile-shop', 'pharmacy', 'restaurant',
    'garments', 'meat', 'vegetables', 'cosmetics', 'electronics',
    'hardware', 'auto-parts',
  ];
  const industryRoutes = industries.map((slug) => ({
    path: `/industries/${slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
  }));

  const blogRoutes = blogPosts.map((p) => ({
    path: `/blog/${p.slug}`,
    priority: 0.7,
    changeFrequency: 'monthly' as const,
    lastModified: new Date(p.publishedAt),
  }));

  const categoryRoutes = categories
    .filter((c) => c.slug !== 'all')
    .map((c) => ({
      path: `/blog/category/${c.slug}`,
      priority: 0.6,
      changeFrequency: 'weekly' as const,
    }));

  const all = [...staticRoutes, ...industryRoutes, ...blogRoutes, ...categoryRoutes];

  return all.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: 'lastModified' in r && r.lastModified ? r.lastModified : now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
    alternates: {
      languages: {
        'en-PK': `${SITE_URL}${r.path}`,
        'ur-PK': `${SITE_URL}${r.path}`,
      },
    },
  }));
}

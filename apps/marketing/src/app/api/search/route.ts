import { NextResponse } from 'next/server';
import { industries } from '@/lib/data/industries';
import { integrations } from '@/lib/data/integrations';
import { features } from '@/lib/data/features';
import { solutions } from '@/lib/data/solutions';
import { blogPosts } from '@/lib/data/blog';
import { comparisons } from '@/lib/data/compare';
import { glossaryTerms } from '@/lib/data/glossary';

interface SearchResult {
  title: string;
  subtitle: string;
  url: string;
  category: string;
  score: number;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], count: 0 });
  }

  const results: SearchResult[] = [];

  const score = (text: string): number => {
    const t = text.toLowerCase();
    if (t === q) return 100;
    if (t.startsWith(q)) return 80;
    if (t.includes(q)) return 50;
    return 0;
  };

  industries.forEach((i) => {
    const s = Math.max(score(i.nameEn), score(i.nameUr), score(i.tagEn));
    if (s > 0) results.push({ title: i.nameEn, subtitle: i.tagEn, url: `/industries/${i.slug}`, category: 'Industry', score: s });
  });

  integrations.forEach((i) => {
    const s = Math.max(score(i.name), score(i.nameUr), score(i.descriptionEn));
    if (s > 0) results.push({ title: i.name, subtitle: i.descriptionEn, url: `/integrations/${i.slug}`, category: 'Integration', score: s });
  });

  features.forEach((f) => {
    const s = Math.max(score(f.nameEn), score(f.taglineEn));
    if (s > 0) results.push({ title: f.nameEn, subtitle: f.taglineEn, url: `/product/${f.slug}`, category: 'Feature', score: s });
  });

  solutions.forEach((sol) => {
    const s = Math.max(score(sol.titleEn), score(sol.descEn));
    if (s > 0) results.push({ title: sol.titleEn, subtitle: sol.descEn, url: `/solutions/${sol.slug}`, category: 'Solution', score: s });
  });

  blogPosts.forEach((p) => {
    const s = Math.max(score(p.title), score(p.excerpt));
    if (s > 0) results.push({ title: p.title, subtitle: p.excerpt, url: `/blog/${p.slug}`, category: 'Blog', score: s });
  });

  comparisons.forEach((c) => {
    const s = Math.max(score(c.competitor), score(c.titleEn));
    if (s > 0) results.push({ title: `Nafaa vs ${c.competitor}`, subtitle: c.verdict, url: `/compare/${c.slug}`, category: 'Compare', score: s });
  });

  glossaryTerms.forEach((t) => {
    const s = Math.max(score(t.term), score(t.definitionEn));
    if (s > 0) results.push({ title: t.term, subtitle: t.definitionEn.slice(0, 120) + '...', url: `/glossary#${t.slug}`, category: 'Glossary', score: s });
  });

  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, 20);

  return NextResponse.json({ results: top, count: results.length, query: q });
}

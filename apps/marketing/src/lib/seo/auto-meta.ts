/**
 * Universal metadata generator — works for any page type
 * Ensures 100% consistent SEO across all 500+ pages
 */

import type { Metadata } from 'next';
import { buildMetadata } from './metadata';

interface AutoMetaProps {
  type: 'industry' | 'integration' | 'feature' | 'blog' | 'city' | 'compare' | 'solution';
  name: string;
  description: string;
  slug: string;
  keywords?: string[];
  image?: string;
  publishedTime?: string;
  author?: string;
}

const TYPE_KEYWORDS: Record<string, (name: string) => string[]> = {
  industry: (name) => [
    `${name.toLowerCase()} software pakistan`,
    `${name.toLowerCase()} pos pakistan`,
    `${name.toLowerCase()} management software`,
    `best ${name.toLowerCase()} software 2026`,
    `${name.toLowerCase()} billing software pakistan`,
    `${name.toLowerCase()} inventory pakistan`,
    `urdu ${name.toLowerCase()} software`,
    `fbr ${name.toLowerCase()} pos`,
  ],
  integration: (name) => [
    `${name} integration pakistan`,
    `connect ${name} to pos`,
    `${name} api pakistan`,
    `nafaa ${name} setup`,
  ],
  feature: (name) => [
    `${name.toLowerCase()} for pakistani business`,
    `${name.toLowerCase()} feature pos`,
    `best ${name.toLowerCase()} software`,
  ],
  blog: (name) => [
    name.toLowerCase(),
    `${name.toLowerCase()} pakistan`,
    `${name.toLowerCase()} guide 2026`,
  ],
  city: (name) => [
    `pos software ${name.toLowerCase()}`,
    `business software ${name.toLowerCase()}`,
    `pos price ${name.toLowerCase()}`,
    `pos dealer ${name.toLowerCase()}`,
  ],
  compare: (name) => [
    `nafaa vs ${name.toLowerCase()}`,
    `${name.toLowerCase()} alternative pakistan`,
    `${name.toLowerCase()} vs nafaa comparison`,
  ],
  solution: (name) => [
    `${name.toLowerCase()} business solution`,
    `${name.toLowerCase()} pakistan software`,
  ],
};

export function autoMeta(p: AutoMetaProps): Metadata {
  const generatedKeywords = TYPE_KEYWORDS[p.type]?.(p.name) || [];

  const typeTitles: Record<string, string> = {
    industry: `${p.name} software in Pakistan — ${p.description}`,
    integration: `${p.name} integration — connect to Nafaa POS`,
    feature: `${p.name} — Nafaa's built-in ${p.type}`,
    blog: p.name,
    city: `Nafaa in ${p.name} — Pakistan's #1 business platform`,
    compare: `Nafaa vs ${p.name} — Which is better for Pakistani businesses?`,
    solution: `${p.name} — Complete business solution by Nafaa`,
  };

  return buildMetadata({
    title: typeTitles[p.type] || p.name,
    description: p.description,
    path: p.slug,
    keywords: [...generatedKeywords, ...(p.keywords || [])],
    image: p.image,
    type: p.type === 'blog' ? 'article' : 'website',
    publishedTime: p.publishedTime,
    authors: p.author ? [p.author] : undefined,
  });
}

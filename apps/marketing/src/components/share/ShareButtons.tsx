'use client';

import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Mail, Facebook, Twitter, Linkedin } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  url: string;
  title?: string;
  description?: string;
  className?: string;
}

export function ShareButtons({ url, title = 'Nafaa - Pakistan\'s #1 Retail POS', description = '', className }: Props) {
  const [copied, setCopied] = useState(false);

  const fullUrl = url.startsWith('http') ? url : `https://nafaa.pk${url}`;
  const shareText = `${title}${description ? ` — ${description}` : ''}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedText = encodeURIComponent(shareText);

  const channels = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-[#25D366] hover:bg-[#1da851]',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-[#1877F2] hover:bg-[#0c63d4]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-slate-900 hover:bg-slate-800',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&via=nafaapk`,
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-[#0A66C2] hover:bg-[#084d96]',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-slate-600 hover:bg-slate-700',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%20${encodedUrl}`,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: shareText, url: fullUrl });
      } catch {}
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mr-2">
        <Share2 className="h-4 w-4" />
        Share:
      </span>

      {channels.map((c) => {
        const Icon = c.icon;
        return (
          <a
            key={c.name}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${c.name}`}
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110',
              c.color,
            )}
          >
            <Icon className="h-4 w-4" />
          </a>
        );
      })}

      <button
        onClick={copyLink}
        aria-label="Copy link"
        className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center transition-all hover:scale-110"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      </button>

      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={nativeShare}
          aria-label="Share via system"
          className="h-10 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold inline-flex items-center gap-2 transition-all hover:scale-105 sm:hidden"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      )}
    </div>
  );
}

import { useState } from 'react';
import { X, Copy, Check, Facebook, Twitter, Link as LinkIcon } from 'lucide-react';
import { Card, Button } from '@/ui';
import { toast } from 'sonner';

interface Props {
  title: string;
  text?: string;
  url: string;
  onClose: () => void;
}

export function ShareModal({ title, text, url, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOn = {
    whatsapp: () => window.open(`https://wa.me/?text=${encodeURIComponent(`${title}\n\n${url}`)}`, '_blank'),
    facebook: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'),
    twitter: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank'),
    telegram: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank'),
    instagram: () => {
      copy();
      toast.info('Link copied — paste in Instagram');
    },
    email: () => window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text || ''}\n\n${url}`)}`,
    sms: () => window.location.href = `sms:?body=${encodeURIComponent(`${title}\n${url}`)}`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <Card
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg">Share</h3>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { key: 'whatsapp', label: 'WhatsApp', emoji: '💬', color: 'from-emerald-500 to-green-600' },
            { key: 'facebook', label: 'Facebook', emoji: '📘', color: 'from-blue-600 to-blue-800' },
            { key: 'twitter', label: 'Twitter', emoji: '🐦', color: 'from-sky-400 to-sky-600' },
            { key: 'telegram', label: 'Telegram', emoji: '✈️', color: 'from-blue-400 to-blue-600' },
            { key: 'instagram', label: 'Instagram', emoji: '📷', color: 'from-pink-500 via-purple-500 to-orange-500' },
            { key: 'sms', label: 'SMS', emoji: '💬', color: 'from-emerald-400 to-teal-600' },
            { key: 'email', label: 'Email', emoji: '✉️', color: 'from-slate-500 to-slate-700' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => (shareOn as any)[s.key]()}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition`}>
                {s.emoji}
              </div>
              <span className="text-2xs font-black text-content-muted">{s.label}</span>
            </button>
          ))}
          <button
            onClick={copy}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-md group-hover:scale-110 transition">
              {copied ? <Check className="h-5 w-5 text-white" /> : <LinkIcon className="h-5 w-5 text-white" />}
            </div>
            <span className="text-2xs font-black text-content-muted">
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-surface-muted font-mono text-2xs break-all">
          {url}
        </div>
      </Card>
    </div>
  );
}

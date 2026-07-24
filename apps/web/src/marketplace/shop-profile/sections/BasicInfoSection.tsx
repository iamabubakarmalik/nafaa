import { useState } from 'react';
import {
  Store, Tag, FileText, Info, X, Image as ImageIcon,
  Sparkles, Type, Layers, CheckCircle2, Camera, Link2,
} from 'lucide-react';
import type { MarketplaceShopProfile } from '../../shared/types';
import { MARKETPLACE_INDUSTRY_THEMES } from '../../shared/industry-themes';
import { UploadDropzone } from '@core/components/uploads';

interface Props {
  s: MarketplaceShopProfile;
  set: <K extends keyof MarketplaceShopProfile>(key: K, value: MarketplaceShopProfile[K]) => void;
  industry?: string | null;
}

export default function BasicInfoSection({ s, set, industry }: Props) {
  const industries = Object.values(MARKETPLACE_INDUSTRY_THEMES).filter((i) => i.id !== 'default');
  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload');
  const [coverMode, setCoverMode] = useState<'upload' | 'url'>('upload');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [coverUrlInput, setCoverUrlInput] = useState('');

  const completionChecks = [
    { label: 'Shop Name', done: !!s.publicName },
    { label: 'Tagline', done: !!s.tagline },
    { label: 'Description', done: !!s.description && s.description.length >= 20 },
    { label: 'Category', done: !!s.industry },
    { label: 'Logo', done: !!s.logoUrl },
    { label: 'Cover Image', done: !!s.coverUrl },
  ];
  const completedCount = completionChecks.filter((c) => c.done).length;
  const completionPct = Math.round((completedCount / completionChecks.length) * 100);

  return (
    <div className="space-y-6">
      {/* Completion Progress */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-black text-emerald-900">Basic Info Completion</span>
          </div>
          <span className="text-2xl font-black text-emerald-700 tabular-nums">{completionPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {completionChecks.map((c) => (
            <span
              key={c.label}
              className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                c.done ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {c.done && <CheckCircle2 className="h-2.5 w-2.5" />}
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Shop Name */}
      <Field label="Public Shop Name" required hint="Ye naam customers ko marketplace pe dikhega" icon={Store}>
        <div className="relative">
          <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={s.publicName || ''}
            onChange={(e) => set('publicName', e.target.value)}
            placeholder="e.g. Ahmad Carpets"
            maxLength={60}
            className="w-full h-12 pl-10 pr-16 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
            {(s.publicName || '').length}/60
          </span>
        </div>
      </Field>

      {/* Tagline */}
      <Field label="Tagline / Slogan" hint="Chhoti si punchline — search results mein dikhta hai" icon={Type}>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={s.tagline || ''}
            onChange={(e) => set('tagline', e.target.value)}
            placeholder="Best quality Persian carpets in Lahore"
            maxLength={100}
            className="w-full h-12 pl-10 pr-16 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
            {(s.tagline || '').length}/100
          </span>
        </div>
      </Field>

      {/* Description */}
      <Field label="Description" hint="Apni shop, quality aur services ke baare mein detail se likhein (min 20 characters)" icon={FileText}>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <textarea
            value={s.description || ''}
            onChange={(e) => set('description', e.target.value)}
            rows={5}
            maxLength={1000}
            placeholder="Hamari shop 20 saal se best quality carpets bech rahi hai. Persian, Turkish, aur Afghani carpets available hain. Free delivery all over Lahore..."
            className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none transition"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            {(s.description || '').length >= 20 && (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            )}
            <span className="text-[10px] font-bold text-slate-400">
              {(s.description || '').length}/1000
            </span>
          </div>
        </div>
      </Field>

      {/* Category */}
      <Field label="Category / Industry" required icon={Layers}>
        <select
          value={s.industry || 'GROCERY'}
          onChange={(e) => set('industry', e.target.value)}
          className="w-full h-12 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition bg-white cursor-pointer"
        >
          {industries.map((i) => (
            <option key={i.id} value={i.id.toUpperCase()}>
              {i.emoji} {i.label}
            </option>
          ))}
          <option value="GROCERY">🛒 Grocery</option>
          <option value="OTHER">📦 Other</option>
        </select>
        {industry && (
          <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 font-medium">
              Aap ke POS mein <strong className="font-black">{industry}</strong> industry detected hui hai — ye category customers ko relevant listings dikhayega.
            </p>
          </div>
        )}
      </Field>

      {/* ═══════════════ LOGO — FIXED HEIGHT ═══════════════ */}
      <MediaBlock
        label="Shop Logo"
        hint="square image, recommended 400×400"
        currentUrl={s.logoUrl}
        onRemove={() => set('logoUrl', '')}
        onAdd={(url) => set('logoUrl', url)}
        mode={logoMode}
        setMode={setLogoMode}
        urlInput={logoUrlInput}
        setUrlInput={setLogoUrlInput}
        uploadPurpose="shop-logo"
        maxSizeMB={5}
        uploadHint="Square logo image (400×400) • JPG, PNG, WebP • Max 5 MB"
        urlPlaceholder="https://your-cdn.com/logo.png"
        previewLayout="side"
      />

      {/* ═══════════════ COVER — FIXED HEIGHT ═══════════════ */}
      <MediaBlock
        label="Cover / Banner Image"
        hint="wide banner 16:9, recommended 1920×1080"
        currentUrl={s.coverUrl}
        onRemove={() => set('coverUrl', '')}
        onAdd={(url) => set('coverUrl', url)}
        mode={coverMode}
        setMode={setCoverMode}
        urlInput={coverUrlInput}
        setUrlInput={setCoverUrlInput}
        uploadPurpose="shop-cover"
        maxSizeMB={10}
        uploadHint="Wide banner (1920×1080) • JPG, PNG, WebP • Max 10 MB"
        urlPlaceholder="https://your-cdn.com/banner.jpg"
        previewLayout="top"
      />
    </div>
  );
}

// ═══════════════ MEDIA BLOCK — Fixed layout, no shift ═══════════════
interface MediaBlockProps {
  label: string;
  hint: string;
  currentUrl?: string;
  onRemove: () => void;
  onAdd: (url: string) => void;
  mode: 'upload' | 'url';
  setMode: (m: 'upload' | 'url') => void;
  urlInput: string;
  setUrlInput: (v: string) => void;
  uploadPurpose: string;
  maxSizeMB: number;
  uploadHint: string;
  urlPlaceholder: string;
  previewLayout: 'side' | 'top';
}

function MediaBlock({
  label, hint, currentUrl, onRemove, onAdd,
  mode, setMode, urlInput, setUrlInput,
  uploadPurpose, maxSizeMB, uploadHint, urlPlaceholder, previewLayout,
}: MediaBlockProps) {
  const CONTAINER_HEIGHT = previewLayout === 'side' ? 'h-[200px]' : 'h-[280px]';

  return (
    <div>
      <label className="text-sm font-black text-slate-700 mb-2 flex items-center gap-1.5">
        <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
        {label}
        <span className="text-slate-500 font-medium">— {hint}</span>
      </label>

      {/* Mode toggle - always visible, doesn't shift */}
      <div className="flex gap-1 mb-3 rounded-xl bg-slate-100 p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode('upload')}
          disabled={!!currentUrl}
          className={`px-4 py-1.5 rounded-lg text-xs font-black transition inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
            mode === 'upload' ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          disabled={!!currentUrl}
          className={`px-4 py-1.5 rounded-lg text-xs font-black transition inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
            mode === 'url' ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Link2 className="h-3.5 w-3.5" />
          Paste URL
        </button>
      </div>

      {/* FIXED HEIGHT CONTAINER — never shifts */}
      <div className={`${CONTAINER_HEIGHT} relative`}>
        {currentUrl ? (
          previewLayout === 'side' ? (
            /* Logo layout: side-by-side, fits in h-[200px] */
            <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 h-full">
              <img
                src={currentUrl}
                alt=""
                className="h-32 w-32 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  UPLOADED
                </div>
                <div className="font-black text-emerald-900 text-sm">Logo added successfully</div>
                <p className="text-[10px] text-emerald-700 font-medium truncate font-mono">{currentUrl}</p>
              </div>
              <button
                onClick={onRemove}
                className="h-9 px-3 rounded-lg bg-white hover:bg-rose-50 text-rose-600 text-xs font-black inline-flex items-center gap-1 border-2 border-rose-200 hover:border-rose-300 transition shrink-0"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            </div>
          ) : (
            /* Cover layout: image on top, banner overlay, fits in h-[280px] */
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 overflow-hidden h-full flex flex-col">
              <div className="relative flex-1 min-h-0">
                <img src={currentUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2">
                  <button
                    onClick={onRemove}
                    className="h-9 px-3 rounded-lg bg-white/95 backdrop-blur hover:bg-rose-50 text-rose-600 text-xs font-black inline-flex items-center gap-1 border-2 border-rose-200 hover:border-rose-300 shadow-lg transition"
                  >
                    <X className="h-3 w-3" /> Remove
                  </button>
                </div>
                <div className="absolute top-2 left-2">
                  <div className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-lg">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    UPLOADED
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 shrink-0 border-t border-emerald-200 bg-emerald-100/50">
                <p className="text-[10px] text-emerald-800 font-mono truncate">{currentUrl}</p>
              </div>
            </div>
          )
        ) : mode === 'upload' ? (
          /* Upload dropzone - fills container */
          <div className="h-full">
            <UploadDropzone
              purpose={uploadPurpose as any}
              multiple={false}
              maxFiles={1}
              maxSizeMB={maxSizeMB}
              hint={uploadHint}
              onUploaded={(records) => {
                if (records[0]?.url) onAdd(records[0].url);
              }}
            />
          </div>
        ) : (
          /* URL paste - fills container */
          <div className="h-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 flex flex-col">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && urlInput.trim()) {
                    e.preventDefault();
                    onAdd(urlInput.trim());
                    setUrlInput('');
                  }
                }}
                placeholder={urlPlaceholder}
                className="flex-1 h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
              <button
                onClick={() => {
                  if (urlInput.trim()) {
                    onAdd(urlInput.trim());
                    setUrlInput('');
                  }
                }}
                disabled={!urlInput.trim()}
                className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-black inline-flex items-center gap-1 transition shrink-0"
              >
                Add
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-2">
              Paste image URL from any hosting service (Cloudinary, imgur, Unsplash direct link, etc.)
            </p>
            {/* Live preview - takes remaining space, hidden if empty */}
            {urlInput.trim() && urlInput.match(/^https?:\/\//) && (
              <div className="flex-1 min-h-0 mt-3 rounded-lg overflow-hidden border border-slate-200 bg-white">
                <img
                  src={urlInput.trim()}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════ FIELD HELPER ═══════════════
function Field({ label, hint, required, children, icon: Icon }: any) {
  return (
    <div>
      <label className="text-sm font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1.5 font-medium">{hint}</p>}
    </div>
  );
}

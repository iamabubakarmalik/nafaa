import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function SectionHeading({ title, text, link, linkLabel, center }: { title: string; text?: string; link?: string | null; linkLabel?: string; center?: boolean }) {
  if (!title && !text) return null;
  return (
    <div className={`mb-6 flex gap-4 md:mb-8 ${center ? 'flex-col items-center text-center' : 'items-end justify-between'}`}>
      <div className={center ? 'max-w-2xl' : ''}>
        {title && <h2 className="h-section">{title}</h2>}
        {text && <p className="mt-2 text-[15px] text-muted">{text}</p>}
      </div>
      {link && linkLabel && (
        <Link href={link} className="group inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-fg underline-offset-4 hover:underline">
          {linkLabel}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
}

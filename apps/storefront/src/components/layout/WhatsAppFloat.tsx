import { waLink } from '@/lib/format';
import { WhatsAppIcon } from '../ui/brand-icons';

/** Floating WhatsApp chat button (settings.whatsappButton). Plain link, no script. */
export function WhatsAppFloat({ number, message, position, label }: { number: string | null; message: string; position: 'left' | 'right'; label: string }) {
  const url = waLink(number, message);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`wa-float group fixed bottom-5 z-50 flex h-14 items-center gap-2 rounded-full bg-wa ps-4 pe-4 text-[#06281a] shadow-pop transition-transform hover:scale-105 md:bottom-6 ${position === 'left' ? 'start-4 md:start-6' : 'end-4 md:end-6'}`}
    >
      <WhatsAppIcon size={26} />
      <span className="hidden text-[14px] font-semibold md:inline">{label}</span>
    </a>
  );
}

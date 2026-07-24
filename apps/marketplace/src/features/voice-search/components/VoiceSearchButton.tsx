import { useState } from 'react';
import { Mic } from 'lucide-react';
import { VoiceSearchModal } from './VoiceSearchModal';
import { cn } from '@/lib/cn';

interface Props {
  className?: string;
  variant?: 'default' | 'pill' | 'floating';
}

export function VoiceSearchButton({ className, variant = 'default' }: Props) {
  const [open, setOpen] = useState(false);

  if (variant === 'floating') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'fixed bottom-24 right-4 lg:right-8 z-30 h-14 w-14 rounded-full bg-gradient-brand shadow-brand',
            'flex items-center justify-center hover:scale-110 transition',
            className,
          )}
          aria-label="Voice search"
        >
          <Mic className="h-6 w-6 text-white" />
        </button>
        {open && <VoiceSearchModal onClose={() => setOpen(false)} />}
      </>
    );
  }

  if (variant === 'pill') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'h-11 px-4 rounded-full bg-gradient-brand text-white shadow-brand',
            'flex items-center gap-2 text-sm font-bold hover:opacity-90 transition',
            className,
          )}
        >
          <Mic className="h-4 w-4" />
          Voice
        </button>
        {open && <VoiceSearchModal onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'h-11 w-11 rounded-2xl bg-gradient-brand text-white shadow-brand',
          'flex items-center justify-center hover:scale-105 transition',
          className,
        )}
        aria-label="Voice search"
      >
        <Mic className="h-4 w-4" />
      </button>
      {open && <VoiceSearchModal onClose={() => setOpen(false)} />}
    </>
  );
}

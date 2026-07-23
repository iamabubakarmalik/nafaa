import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@lib/cn';

interface VoiceSearchButtonProps {
  onResult: (transcript: string) => void;
  lang?: string;
  className?: string;
}

// Browser SpeechRecognition types
type SR = any;
declare global {
  interface Window {
    SpeechRecognition: SR;
    webkitSpeechRecognition: SR;
  }
}

export function VoiceSearchButton({ onResult, lang = 'ur-PK', className }: VoiceSearchButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showModal, setShowModal] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isSupported = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = () => {
    if (!isSupported) {
      toast.error('Voice search aap ke browser mein support nahi karta');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setShowModal(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
      if (result.isFinal) {
        onResult(text);
        setTimeout(() => {
          setShowModal(false);
          setIsListening(false);
        }, 1000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Microphone permission chahiye');
      } else if (event.error === 'no-speech') {
        toast.error('Kuch sunayi nahi diya');
      }
      setIsListening(false);
      setShowModal(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setShowModal(false);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  return (
    <>
      <button
        onClick={startListening}
        className={cn(
          'h-7 w-7 rounded-lg flex items-center justify-center transition',
          isListening
            ? 'bg-rose-100 text-rose-600 animate-pulse'
            : 'hover:bg-slate-100 dark:hover:bg-neutral-800 text-brand-600',
          className,
        )}
        title="Voice search"
      >
        <Mic className="h-4 w-4" />
      </button>

      {/* Voice modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl shadow-soft-xl p-6 text-center animate-scale-in">
            <button
              onClick={stopListening}
              className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Animated mic */}
            <div className="relative inline-flex mb-6 mt-4">
              <div className={cn(
                'h-24 w-24 rounded-full flex items-center justify-center transition-all',
                isListening
                  ? 'bg-gradient-to-br from-rose-500 to-pink-600 animate-pulse-soft shadow-lg shadow-rose-500/50'
                  : 'bg-slate-200 dark:bg-neutral-800',
              )}>
                {isListening ? (
                  <Mic className="h-12 w-12 text-white" />
                ) : (
                  <MicOff className="h-12 w-12 text-slate-500" />
                )}
              </div>
              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-20" />
                  <div className="absolute -inset-2 rounded-full bg-rose-500 animate-ping opacity-10" style={{ animationDelay: '0.5s' }} />
                </>
              )}
            </div>

            <div className="text-lg font-black text-slate-900 dark:text-white mb-2">
              {isListening ? 'Sun raha hoon...' : 'Voice off'}
            </div>

            {transcript ? (
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-white font-bold text-base mb-3">
                "{transcript}"
              </div>
            ) : (
              <div className="text-xs text-slate-500 mb-3">
                Product ka naam boliye — "Chicken karahi" ya "Lawn suit"
              </div>
            )}

            <button
              onClick={stopListening}
              className="text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel karein
            </button>
          </div>
        </div>
      )}
    </>
  );
}

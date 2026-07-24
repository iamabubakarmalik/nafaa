import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, X, Volume2, AlertCircle, Sparkles, Globe,
  ShoppingBag, TrendingUp,
} from 'lucide-react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { voiceSearchApi } from '../api/voice-search.api';
import { Button, Card, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { useTranslation } from 'react-i18next';

interface Props {
  onClose: () => void;
}

const LANGUAGES = [
  { code: 'ur-PK', label: 'Urdu', flag: '🇵🇰', example: 'do kilo aloo chahiye' },
  { code: 'en-PK', label: 'English', flag: '🇬🇧', example: 'I need 2 kg potatoes' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸', example: 'find fresh apples' },
];

export function VoiceSearchModal({ onClose }: Props) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(i18n.language === 'ur' ? 'ur-PK' : 'en-PK');
  const [results, setResults] = useState<any>(null);

  const voice = useVoiceRecognition({
    language: selectedLang,
    interimResults: true,
    continuous: false,
  });

  const searchMutation = useMutation({
    mutationFn: (transcript: string) =>
      voiceSearchApi.search({
        transcript,
        language: selectedLang.split('-')[0],
        durationMs: voice.durationMs,
      }),
    onSuccess: (data) => {
      setResults(data);
      if (data.count === 0) {
        toast.info('No products found. Try different keywords.');
      }
    },
    onError: () => toast.error('Voice search failed'),
  });

  // Auto-search when speech ends with final transcript
  useEffect(() => {
    if (!voice.isListening && voice.transcript && !searchMutation.isPending && !results) {
      searchMutation.mutate(voice.transcript);
    }
  }, [voice.isListening, voice.transcript]);

  const handleStart = () => {
    setResults(null);
    voice.start();
  };

  const goToProduct = (productId: string) => {
    onClose();
    navigate(`/products/${productId}`);
  };

  const goToSearch = () => {
    onClose();
    navigate(`/search?q=${encodeURIComponent(voice.transcript)}`);
  };

  if (!voice.isSupported) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <Card className="max-w-sm w-full p-6 text-center space-y-4 animate-scale-in">
          <div className="h-16 w-16 rounded-full bg-danger/10 text-danger mx-auto flex items-center justify-center">
            <MicOff className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-black text-lg">Voice search unavailable</h3>
            <p className="text-sm text-content-muted mt-1">
              Please use Chrome, Edge, or Safari
            </p>
          </div>
          <Button variant="gradient" fullWidth onClick={onClose}>Close</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <Card className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center">
              <Mic className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Voice Search</h3>
              <p className="text-xs text-content-muted">Speak in Urdu or English</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-surface-muted text-content-subtle flex items-center justify-center transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Language picker */}
          <div>
            <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2 flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              Language
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setSelectedLang(l.code)}
                  disabled={voice.isListening}
                  className={cn(
                    'h-14 rounded-2xl border-2 text-xs font-black transition flex flex-col items-center justify-center gap-0.5',
                    selectedLang === l.code
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400'
                      : 'border-border bg-surface hover:border-brand-300',
                    voice.isListening && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <span className="text-lg">{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mic Button + Waveform */}
          <div className="flex flex-col items-center py-6">
            <div className="relative">
              {/* Pulse rings */}
              {voice.isListening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping-soft opacity-30" />
                  <span
                    className="absolute inset-0 rounded-full bg-brand-500 opacity-20"
                    style={{ transform: `scale(${1 + voice.volume * 0.5})` }}
                  />
                </>
              )}

              <button
                onClick={voice.isListening ? voice.stop : handleStart}
                disabled={searchMutation.isPending}
                className={cn(
                  'relative h-24 w-24 rounded-full flex items-center justify-center transition-all shadow-2xl',
                  voice.isListening
                    ? 'bg-gradient-to-br from-danger to-red-600 scale-110'
                    : 'bg-gradient-brand hover:scale-105',
                )}
                aria-label={voice.isListening ? 'Stop listening' : 'Start listening'}
              >
                {voice.isListening ? (
                  <MicOff className="h-10 w-10 text-white" />
                ) : (
                  <Mic className="h-10 w-10 text-white" />
                )}
              </button>
            </div>

            <div className="mt-6 text-center min-h-[3rem]">
              {voice.isListening ? (
                <div className="animate-pulse-soft">
                  <div className="text-sm font-black text-brand-600 dark:text-brand-400 flex items-center justify-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Listening…
                  </div>
                  <div className="text-xs text-content-muted mt-1">Tap the mic to stop</div>
                </div>
              ) : searchMutation.isPending ? (
                <div className="text-sm font-black text-content-muted">
                  <Sparkles className="h-4 w-4 inline mr-1 animate-spin" />
                  Analyzing your voice…
                </div>
              ) : (
                <div>
                  <div className="text-sm font-black text-content">Tap the mic to start</div>
                  <div className="text-xs text-content-muted mt-1 italic">
                    Try: "{LANGUAGES.find((l) => l.code === selectedLang)?.example}"
                  </div>
                </div>
              )}
            </div>

            {/* Voice bar visualizer */}
            {voice.isListening && (
              <div className="mt-4 flex items-end justify-center gap-1 h-10">
                {[...Array(12)].map((_, i) => {
                  const height = Math.max(4, Math.random() * voice.volume * 40 + 4);
                  return (
                    <div
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-brand-600 to-emerald-400 rounded-full transition-all duration-100"
                      style={{ height: `${height}px` }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Transcript */}
          {(voice.transcript || voice.interimTranscript) && (
            <Card className="p-4 bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-800">
              <div className="text-2xs font-black text-content-muted uppercase tracking-wider mb-1">
                You said:
              </div>
              <div className="text-base font-bold text-content">
                {voice.transcript}
                <span className="text-content-subtle italic ml-1">
                  {voice.interimTranscript}
                </span>
              </div>
            </Card>
          )}

          {/* Error */}
          {voice.error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{voice.error}</span>
            </div>
          )}

          {/* Results */}
          {results && results.products?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-brand-600" />
                  Found {results.count} products
                </h4>
                <button
                  onClick={goToSearch}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  See all →
                </button>
              </div>
              {results.quantity && (
                <Badge variant="brand" size="md">
                  Quantity detected: {results.quantity} {results.unit}
                </Badge>
              )}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {results.products.slice(0, 5).map((p: any) => (
                  <button
                    key={p.productId}
                    onClick={() => goToProduct(p.productId)}
                    className="w-full flex gap-3 p-2 rounded-xl bg-surface hover:bg-surface-muted border border-border transition text-left"
                  >
                    <div className="h-14 w-14 rounded-lg bg-surface-muted overflow-hidden shrink-0">
                      {p.publicImages?.[0] ? (
                        <img src={p.publicImages[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-content-subtle" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm line-clamp-1">{p.publicName}</div>
                      <div className="text-brand-600 font-black text-sm">{formatPrice(p.publicPrice)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results && results.count === 0 && (
            <Card className="p-4 text-center">
              <ShoppingBag className="h-8 w-8 text-content-subtle mx-auto mb-2" />
              <div className="font-black text-sm">No products found</div>
              <div className="text-xs text-content-muted mt-1">Try different keywords</div>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
}

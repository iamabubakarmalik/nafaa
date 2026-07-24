import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceRecognitionOpts {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecognition(opts: UseVoiceRecognitionOpts = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const setupAudioAnalyzer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      const update = () => {
        analyzer.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(avg / 255);
        rafRef.current = requestAnimationFrame(update);
      };
      update();
    } catch (e) {
      // No mic access — voice waveform will be static
    }
  };

  const start = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice search not supported in this browser');
      opts.onError?.('Voice search not supported');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');

    const rec = new SpeechRecognition();
    rec.continuous = opts.continuous ?? false;
    rec.interimResults = opts.interimResults ?? true;
    rec.lang = opts.language ?? 'ur-PK';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      startTimeRef.current = Date.now();
      setupAudioAnalyzer();
    };

    rec.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      setInterimTranscript(interim);
      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
        opts.onResult?.(finalTranscript, true);
      } else if (interim) {
        opts.onResult?.(interim, false);
      }
    };

    rec.onerror = (event: any) => {
      const errMsg = event.error === 'not-allowed'
        ? 'Microphone permission denied'
        : event.error === 'no-speech'
          ? 'No speech detected'
          : `Error: ${event.error}`;
      setError(errMsg);
      opts.onError?.(errMsg);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      cleanup();
    };

    recognitionRef.current = rec;
    rec.start();
  }, [opts]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    cleanup();
  }, []);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    streamRef.current = null;
    audioContextRef.current = null;
    setVolume(0);
  };

  useEffect(() => () => cleanup(), []);

  const durationMs = isListening ? Date.now() - startTimeRef.current : 0;

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    volume,
    durationMs,
    start,
    stop,
  };
}

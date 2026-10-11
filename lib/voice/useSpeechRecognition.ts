'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppLanguage } from '@/types/index';
import { friendlyRecognitionError } from './text';

interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { results: ArrayLike<RecognitionResult> }
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

interface Options {
  locale: string;
  language: AppLanguage;
  /** Called with the final transcript when listening ends and something was heard. */
  onFinished?: (transcript: string) => void;
}

/** Wraps the browser's speech recognition: start and stop, a live transcript, and plain-language errors. */
export function useSpeechRecognition({ locale, language, onFinished }: Options) {
  const [supported] = useState(() => Boolean(recognitionConstructor()));
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<Recognition | null>(null);
  const transcriptRef = useRef('');
  const finishedRef = useRef(onFinished);
  useEffect(() => { finishedRef.current = onFinished; });

  useEffect(() => {
    const Ctor = recognitionConstructor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = locale;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0].transcript).join(' ').trim();
      transcriptRef.current = text;
      setTranscript(text);
    };
    recognition.onerror = (event) => {
      const message = friendlyRecognitionError(event.error, language);
      if (message) setError(message);
    };
    recognition.onend = () => {
      setListening(false);
      const heard = transcriptRef.current.trim();
      if (heard) finishedRef.current?.(heard);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [locale, language]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError(language === 'fr' ? 'La saisie vocale n’est pas disponible dans ce navigateur. Ecrivez votre question.' : 'Voice input is not available in this browser. Type your question instead.');
      return;
    }
    setError('');
    setTranscript('');
    transcriptRef.current = '';
    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if it is already running; the state is already correct.
    }
  }, [language]);

  const stop = useCallback(() => { recognitionRef.current?.stop(); }, []);

  return { supported, listening, transcript, error, start, stop, clearError: () => setError('') };
}

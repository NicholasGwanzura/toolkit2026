'use client';

import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/platformStore';
import { stripMarkdown } from './text';

// System voices vary a lot. Prefer African English, then natural or neural voices, over the robotic default.
const PREFERRED_MARKERS = ['africa', 'south africa', 'south african', 'en-za', 'zulu', 'xhosa', 'natural', 'neural', 'premium', 'enhanced', 'google', 'siri'];
const AFRICAN_LOCALES = ['en-za', 'en-zw', 'en-ke', 'en-ng', 'en-gh', 'en-tz'];

function rank(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const locale = voice.lang.toLowerCase();
  const african = AFRICAN_LOCALES.indexOf(locale);
  if (african !== -1) return african - AFRICAN_LOCALES.length;
  const marker = PREFERRED_MARKERS.findIndex((item) => name.includes(item));
  return marker === -1 ? PREFERRED_MARKERS.length : marker;
}

export function pickDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return voices.length === 0 ? null : [...voices].sort((a, b) => rank(a) - rank(b))[0];
}

function readStored(key: string): string {
  try { return window.localStorage.getItem(key) ?? ''; } catch { return ''; }
}

/** Text to speech with a stop control, a chosen voice, and an auto-speak preference that is remembered. */
export function useSpeechSynthesis(locale: string) {
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState(() => (typeof window === 'undefined' ? '' : readStored(STORAGE_KEYS.ttsVoice)));
  const [autoSpeak, setAutoSpeakState] = useState(() => (typeof window === 'undefined' ? true : readStored(STORAGE_KEYS.voiceAutoSpeak) !== '0'));
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const languageCode = locale.split('-')[0].toLowerCase();
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith(languageCode)));
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, [locale]);

  const activeVoice = voices.find((voice) => voice.name === voiceName) ?? pickDefaultVoice(voices);

  const speak = useCallback((message: string, options: { queue?: boolean } = {}) => {
    if (!('speechSynthesis' in window)) return;
    const text = stripMarkdown(message);
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    if (activeVoice) utterance.voice = activeVoice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(window.speechSynthesis.speaking || window.speechSynthesis.pending);
    utterance.onerror = () => setSpeaking(false);
    if (!options.queue) window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [locale, activeVoice]);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const selectVoice = (name: string) => {
    setVoiceName(name);
    try { window.localStorage.setItem(STORAGE_KEYS.ttsVoice, name); } catch { /* storage unavailable */ }
  };

  const setAutoSpeak = (value: boolean) => {
    setAutoSpeakState(value);
    if (!value) stop();
    try { window.localStorage.setItem(STORAGE_KEYS.voiceAutoSpeak, value ? '1' : '0'); } catch { /* storage unavailable */ }
  };

  return { supported, voices, activeVoice, speaking, autoSpeak, speak, stop, selectVoice, setAutoSpeak };
}

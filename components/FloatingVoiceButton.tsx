'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Globe2, Mic, MicOff, Radio, Volume2, Waves, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEmergencyMode } from '@/lib/emergencyMode';
import { useI18n } from '@/lib/i18n';
import { prependCollectionItem, readCollection, STORAGE_KEYS } from '@/lib/platformStore';
import { buildSafetyAssistantResponse, getRiskSummary } from '@/lib/refrigerantIntelligence';
import { getEmergencySafetyScriptForQuery } from '@/lib/emergencySafety';
import type { SafetySession } from '@/types/index';
import { RefrigerantRiskBadge } from './RefrigerantRiskBadge';

type BrowserSpeechRecognitionResult = {
  0: { transcript: string };
};

type BrowserSpeechRecognitionEvent = {
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognitionErrorEvent = {
  error: string;
};

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionConstructor = new () => BrowserSpeechRecognition;

type ChatTurn = { role: 'user' | 'model'; text: string };

// Higher-quality system voices ship with these markers in their names; the bare
// browser default is often the most robotic one available.
const PREFERRED_VOICE_MARKERS = ['africa', 'south africa', 'south african', 'en-za', 'zulu', 'xhosa', 'natural', 'neural', 'premium', 'enhanced', 'google', 'siri'];

const AFRICAN_ENGLISH_LOCALES = ['en-za', 'en-zw', 'en-ke', 'en-ng', 'en-gh', 'en-tz'];

function rankVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const locale = voice.lang.toLowerCase();
  const africanLocaleIndex = AFRICAN_ENGLISH_LOCALES.indexOf(locale);
  if (africanLocaleIndex !== -1) return africanLocaleIndex - AFRICAN_ENGLISH_LOCALES.length;
  const markerIndex = PREFERRED_VOICE_MARKERS.findIndex((marker) => name.includes(marker));
  return markerIndex === -1 ? PREFERRED_VOICE_MARKERS.length : markerIndex;
}

function pickDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  return [...voices].sort((a, b) => rankVoice(a) - rankVoice(b))[0];
}

async function fetchGeminiResponse(message: string, history: ChatTurn[]): Promise<{ answer: string | null; error?: string }> {
  try {
    const res = await fetch('/api/voice-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      return { answer: null, error: data?.error ?? 'The live assistant is unavailable.' };
    }
    const data = await res.json() as { answer: string | null; fallback: boolean };
    return { answer: data.fallback ? null : data.answer };
  } catch {
    return { answer: null, error: 'Network unavailable. Using offline safety guidance.' };
  }
}

async function buildContextualResponse(
  query: string,
  emergencyMode: boolean,
  language: 'en' | 'fr',
  history: ChatTurn[],
) : Promise<{ response: string; fallbackNotice?: string }> {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return {
      response: language === 'fr'
        ? 'Posez une question de securite, de refrigerant, ou de certificat pour commencer.'
        : 'Ask a safety, refrigerant, or certificate question to get started.',
    };
  }

  if (lower.includes('coc')) {
    return { response: language === 'fr'
      ? 'Le flux COC reste dans Field Toolkit. Confirmez l’installation, joignez les photos, puis soumettez la demande avant emission.'
      : 'The COC workflow stays in Field Toolkit. Confirm the installation, attach photos, then submit the request before issuance.' };
  }

  if (lower.includes('certificate') || lower.includes('certification')) {
    return { response: language === 'fr'
      ? 'Utilisez le portail public de verification avec le numero de certificat ou le code QR pour confirmer le statut et la date d’expiration.'
      : 'Use the public verification portal with the certificate number or QR code to confirm status and expiry.' };
  }

  // Gemini (grounded in the real WhatGas registry via tool-calling) is the primary responder;
  // the rule-based baseline is the offline/failure fallback so field techs on poor connectivity
  // or during a Gemini outage still get a real answer, not an error.
  const gemini = await fetchGeminiResponse(trimmed, history);
  const baseline = gemini.answer ?? await buildSafetyAssistantResponse(trimmed, language);

  if (!emergencyMode) {
    return { response: baseline, fallbackNotice: gemini.answer ? undefined : gemini.error };
  }

  const script = getEmergencySafetyScriptForQuery(trimmed, language);
  const emergencySteps = script
    ? script.steps.join(' ')
    : language === 'fr'
      ? 'N’entrez pas dans une zone dangereuse. Isolez la zone, ventilez si vous pouvez le faire sans risque et contactez les secours ou votre superviseur.'
      : 'Do not enter a hazardous area. Isolate the area, ventilate only if it is safe to do so, and contact emergency services or your supervisor.';

  const prefix = language === 'fr' ? 'URGENCE — ' : 'EMERGENCY — ';
  return { response: `${prefix}${emergencySteps} ${baseline}`, fallbackNotice: gemini.answer ? undefined : gemini.error };
}

export function FloatingVoiceButton() {
  const { user } = useAuth();
  const { language, speechLocale } = useI18n();
  const { emergencyMode, toggleEmergencyMode } = useEmergencyMode();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [browserCapabilities] = useState(() => {
    if (typeof window === 'undefined') {
      return { speechSupported: false };
    }

    const browserWindow = window as Window & {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    };

    return {
      speechSupported: Boolean(browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition),
    };
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported] = useState(browserCapabilities.speechSupported);
  const [query, setQuery] = useState('');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessions, setSessions] = useState<SafetySession[]>(() =>
    readCollection<SafetySession>(STORAGE_KEYS.voiceSessions, [])
  );
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(STORAGE_KEYS.ttsVoice) ?? '';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const languageCode = speechLocale.split('-')[0].toLowerCase();
      const matching = window.speechSynthesis
        .getVoices()
        .filter((voice) => voice.lang.toLowerCase().startsWith(languageCode));
      setAvailableVoices(matching);
    };

    // Voice lists load asynchronously in Chrome; the event fires once ready.
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [speechLocale]);

  const activeVoice =
    availableVoices.find((voice) => voice.name === selectedVoiceName) ??
    pickDefaultVoice(availableVoices);

  const selectVoice = (name: string) => {
    setSelectedVoiceName(name);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.ttsVoice, name);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const browserWindow = window as Window & {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
      speechSynthesis?: SpeechSynthesis;
    };

    const RecognitionClass = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!RecognitionClass) {
      return;
    }

    const recognition = new RecognitionClass();
    recognition.lang = speechLocale;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const nextTranscript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim();
      setTranscript(nextTranscript);
      setQuery(nextTranscript);
    };
    recognition.onerror = (event) => {
      setErrorMessage(`Voice input error: ${event.error}`);
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [speechLocale]);

  const [latestRisk, setLatestRisk] = useState<Awaited<ReturnType<typeof getRiskSummary>>>(null);

  useEffect(() => {
    let cancelled = false;
    const source = (query || transcript).trim();

    const timer = setTimeout(() => {
      if (cancelled) return;

      if (!source) {
        setLatestRisk(null);
        return;
      }

      getRiskSummary(source).then((risk) => {
        if (!cancelled) setLatestRisk(risk);
      });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, transcript]);

  const recentSessions = sessions.slice(0, 3);

  const speakResponse = (message: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = speechLocale;
    if (activeVoice) {
      utterance.voice = activeVoice;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const persistSession = async (nextQuery: string, nextResponse: string) => {
    const risk = await getRiskSummary(nextQuery);
    const session: SafetySession = {
      id: `voice-${Date.now()}`,
      technicianId: user?.id ?? 'public-user',
      query: nextQuery,
      response: nextResponse,
      sourceDocuments: emergencyMode
        ? ['Offline safety scripts', 'WhatGas refrigerant intelligence']
        : ['WhatGas refrigerant intelligence', 'HEVACRAZ workflow guidance'],
      refrigerantClass: risk?.profile.ashraeSafetyClass,
      createdAt: new Date().toISOString(),
      language,
      emergencyMode,
    };

    const nextSessions = prependCollectionItem<SafetySession>(STORAGE_KEYS.voiceSessions, session, sessions);
    setSessions(nextSessions);
  };

  const submitQuery = async (value: string) => {
    const nextQuery = value.trim();
    if (!nextQuery) return;

    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await buildContextualResponse(nextQuery, emergencyMode, language, chatHistory);
      setResponse(result.response);
      if (result.fallbackNotice) setErrorMessage(result.fallbackNotice);
      setChatHistory((prev) => [
        ...prev,
        { role: 'user' as const, text: nextQuery },
        { role: 'model' as const, text: result.response },
      ].slice(-12));
      await persistSession(nextQuery, result.response);
      speakResponse(result.response);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      setErrorMessage('Voice capture is not available in this browser.');
      return;
    }

    setErrorMessage('');
    setTranscript('');
    setQuery('');
    setIsListening(true);
    recognitionRef.current.lang = speechLocale;
    recognitionRef.current.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const quickPrompts = [
    'R-290 leak response',
    'R-32 pre-job checklist',
    'COC request status',
    'Certificate verification help',
  ];

  return (
    <>
      <div className="fixed bottom-4 right-3 z-50 sm:bottom-5 sm:right-5">
        <button
          onClick={() => setShowOverlay(true)}
          className={`group relative flex h-12 w-12 items-center justify-center rounded-full shadow-2xl sm:h-16 sm:w-16 transition-all duration-300 hover:scale-105 ${
            emergencyMode
              ? 'bg-gradient-to-br from-red-600 to-red-700'
              : 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500'
          }`}
          aria-label="Voice assistant"
        >
          {isListening && <span className="absolute inset-0 rounded-full bg-red-400/70 animate-ping" />}
          {isListening ? <Mic className="relative z-10 h-7 w-7 text-white" /> : <Mic className="h-6 w-6 text-white" />}
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap bg-gray-900 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            {emergencyMode ? 'Emergency safety assistant' : 'Voice assistant'}
          </div>
        </button>
      </div>

      {showOverlay && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <div className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white sm:w-[560px] sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Voice AI Safety Desk</h3>
                <p className="text-sm text-gray-500">
                  {language === 'fr' ? 'Assistant vocal EN / FR pour la securite RAC' : 'EN / FR refrigerant-aware field guidance'}
                </p>
              </div>
              <button
                onClick={() => setShowOverlay(false)}
                className="rounded-full p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              <div
                className={`border p-4 ${
                  emergencyMode ? 'border-red-200 bg-red-50' : 'border-blue-100 bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {emergencyMode ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Radio className="h-5 w-5 text-blue-600" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {emergencyMode ? 'Emergency Mode active' : 'Operational Mode active'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isSpeechSupported ? `Voice locale: ${speechLocale}` : 'Voice capture unavailable, use text input.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleEmergencyMode}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      emergencyMode ? 'bg-red-600 text-white' : 'bg-white text-blue-700'
                    }`}
                  >
                    {emergencyMode ? 'Disable' : 'Enable'} emergency mode
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
                  <Globe2 className="h-3.5 w-3.5" />
                  {language === 'fr' ? 'Francais' : 'English'}
                </div>
                {latestRisk && (
                  <div className="rounded-full border border-gray-200 bg-white px-2 py-1">
                    <RefrigerantRiskBadge color={latestRisk.color} label={latestRisk.label} />
                  </div>
                )}
              </div>

              <div className="border border-gray-200 bg-gray-50 p-6">
                <div className="mb-4 flex items-center justify-center">
                  <div
                    className={`relative flex h-28 w-28 items-center justify-center rounded-full ${
                      isListening ? 'bg-red-50' : 'bg-white'
                    }`}
                  >
                    {isListening && (
                      <>
                        <span className="absolute inset-0 rounded-full border-2 border-red-400/40 animate-ping" />
                        <span
                          className="absolute inset-3 rounded-full border-2 border-red-400/60 animate-ping"
                          style={{ animationDelay: '0.2s' }}
                        />
                      </>
                    )}
                    <div
                      className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full ${
                        isListening ? 'bg-red-500' : 'bg-orange-500'
                      }`}
                    >
                      {isListening ? <Mic className="h-8 w-8 text-white" /> : <Waves className="h-8 w-8 text-white" />}
                    </div>
                  </div>
                </div>

                <p className="text-center text-lg font-medium text-gray-700">
                  {isListening ? 'Listening for field guidance...' : 'Speak or type a safety question'}
                </p>
                <p className="mt-1 text-center text-sm text-gray-500">
                  {emergencyMode
                    ? 'Emergency mode adds offline safety scripts and faster response prompts.'
                    : 'Ask about refrigerant class, leak response, COC steps, or certificate verification.'}
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ${
                      isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isListening ? 'Stop listening' : 'Start voice capture'}
                  </button>
                  {response && (
                    <button
                      onClick={() => speakResponse(response)}
                      className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                      <Volume2 className="h-4 w-4" />
                      Replay response
                    </button>
                  )}
                </div>
              </div>

              {availableVoices.length > 0 && (
                <div className="flex items-center gap-3">
                  <Volume2 className="h-4 w-4 flex-shrink-0 text-gray-500" />
                  <label className="text-sm font-semibold text-gray-700" htmlFor="voice-assistant-voice">
                    Voice
                  </label>
                  <select
                    id="voice-assistant-voice"
                    value={activeVoice?.name ?? ''}
                    onChange={(event) => selectVoice(event.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500"
                  >
                    {availableVoices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => speakResponse(language === 'fr' ? 'Voici ma voix.' : 'This is how I sound.')}
                    className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                  >
                    Test
                  </button>
                </div>
              )}

              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitQuery(query);
                }}
              >
                <label htmlFor="voice-assistant-prompt" className="block text-sm font-semibold text-gray-700">Prompt</label>
                <textarea
                  id="voice-assistant-prompt"
                  rows={3}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Example: What safety controls do I need before charging R-290?"
                  className="w-full border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                      event.preventDefault();
                      void submitQuery(query);
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setQuery(prompt);
                        submitQuery(prompt);
                      }}
                      className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!query.trim() || isSubmitting}
                  className="w-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Preparing safety guidance…' : 'Generate response'}
                </button>
                {transcript && (
                  <div className="border border-orange-100 bg-orange-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Transcript</p>
                    <p className="mt-2 text-sm text-orange-900">{transcript}</p>
                  </div>
                )}
                {errorMessage && (
                  <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
                )}
              </form>

              {response && (
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">Assistant response</p>
                  <p className="mt-3 text-sm leading-6 text-gray-700">{response}</p>
                  {latestRisk && (
                    <div className="mt-4 border border-gray-100 bg-gray-50 p-4">
                      <p className="text-sm font-semibold text-gray-900">{latestRisk.profile.code} risk summary</p>
                      <p className="mt-1 text-sm text-gray-600">{latestRisk.guidance}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="border border-gray-200 bg-white p-5">
                <p className="text-sm font-semibold text-gray-900">Recent safety sessions</p>
                <div className="mt-3 space-y-3">
                  {recentSessions.length === 0 ? (
                    <p className="text-sm text-gray-500">No sessions saved yet.</p>
                  ) : (
                    recentSessions.map((session) => (
                      <div key={session.id} className="bg-gray-50 p-3">
                        <p className="text-sm font-semibold text-gray-900">{session.query}</p>
                        <p className="mt-1 text-xs text-gray-500">{new Date(session.createdAt).toLocaleString('en-ZW')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

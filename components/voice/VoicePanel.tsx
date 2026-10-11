'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Globe2, Mic, MicOff, Send, Square, Trash2, Volume2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useEmergencyMode } from '@/lib/emergencyMode';
import { useI18n } from '@/lib/i18n';
import { STORAGE_KEYS } from '@/lib/platformStore';
import { getRiskSummary } from '@/lib/refrigerantIntelligence';
import { commandHref, describeCommand } from '@/lib/voice/commands';
import { extractRefrigerantCode } from '@/lib/voice/text';
import { useAssistant, type AnswerSource } from '@/lib/voice/useAssistant';
import { useSpeechRecognition } from '@/lib/voice/useSpeechRecognition';
import { useSpeechSynthesis } from '@/lib/voice/useSpeechSynthesis';
import { useVoiceSessions } from '@/lib/voice/useVoiceSessions';
import { RefrigerantRiskBadge } from '@/components/RefrigerantRiskBadge';

const QUICK_PROMPTS = {
  en: ['R-290 leak response', 'R-32 pre-job checklist', 'How do I request a COC?', 'Open the checklist'],
  fr: ['Reponse a une fuite de R-290', 'Liste de controle R-32', 'Comment demander un COC ?', 'Ouvrir la liste de controle'],
};

const SOURCE_LABEL: Record<AnswerSource, { en: string; fr: string; style: string }> = {
  emergency: { en: 'Emergency steps (stored on this device)', fr: 'Etapes d’urgence (stockees sur cet appareil)', style: 'bg-red-50 text-red-700' },
  ai: { en: 'AI assistant', fr: 'Assistant IA', style: 'bg-blue-50 text-blue-700' },
  offline: { en: 'Offline guidance', fr: 'Conseils hors ligne', style: 'bg-amber-50 text-amber-700' },
  info: { en: 'Guidance', fr: 'Conseil', style: 'bg-stone-100 text-stone-700' },
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function VoicePanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const { language, speechLocale } = useI18n();
  const { emergencyMode, toggleEmergencyMode } = useEmergencyMode();
  const t = (en: string, fr: string) => (language === 'fr' ? fr : en);

  const dialogRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState('');
  const [handsFree, setHandsFree] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEYS.voiceHandsFree) === '1'; } catch { return false; }
  });
  const { sessions, add: addSession, clear: clearSessions } = useVoiceSessions();
  const synthesis = useSpeechSynthesis(speechLocale);

  const assistant = useAssistant({
    language,
    emergencyMode,
    role: user?.role,
    userId: user?.id,
    speak: synthesis.speak,
    autoSpeak: synthesis.autoSpeak,
    onSession: addSession,
  });
  const { ask, reset } = assistant;

  const recognition = useSpeechRecognition({
    locale: speechLocale,
    language,
    onFinished: (heard) => {
      setQuery(heard);
      if (handsFree) void ask(heard);
    },
  });

  useEffect(() => { promptRef.current?.focus(); }, []);

  const close = () => {
    synthesis.stop();
    recognition.stop();
    reset();
    onClose();
  };

  // Keyboard: Escape closes, Tab stays inside the dialog.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.stopPropagation(); close(); return; }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  // The risk badge follows the refrigerant named in the question, not the whole sentence.
  const spoken = query || recognition.transcript;
  const code = useMemo(() => extractRefrigerantCode(spoken), [spoken]);
  const [riskFor, setRiskFor] = useState<{ code: string; result: Awaited<ReturnType<typeof getRiskSummary>> } | null>(null);
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const timer = setTimeout(() => { void getRiskSummary(code).then((result) => { if (!cancelled) setRiskFor({ code, result }); }); }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [code]);
  // Only show a badge that belongs to the refrigerant currently named.
  const risk = code && riskFor?.code === code ? riskFor.result : null;

  const submit = (value: string) => { synthesis.stop(); void ask(value); };

  const toggleHandsFree = (value: boolean) => {
    setHandsFree(value);
    try { window.localStorage.setItem(STORAGE_KEYS.voiceHandsFree, value ? '1' : '0'); } catch { /* storage unavailable */ }
  };

  const confirmCommand = () => {
    if (!assistant.command) return;
    const href = commandHref(assistant.command);
    assistant.clearCommand();
    close();
    router.push(href);
  };

  const error = recognition.error;
  const listening = recognition.listening;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onKeyDown={onKeyDown}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="voice-panel-title" className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white sm:w-[560px] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div>
            <h2 id="voice-panel-title" className="text-lg font-semibold text-gray-900">{t('Voice safety desk', 'Assistant vocal securite')}</h2>
            <p className="flex items-center gap-1.5 text-sm text-gray-500"><Globe2 className="h-3.5 w-3.5" aria-hidden="true" />{language === 'fr' ? 'Francais' : 'English'} · {t('ask a question or give a command', 'posez une question ou donnez une commande')}</p>
          </div>
          <button type="button" onClick={close} aria-label={t('Close voice assistant', 'Fermer l’assistant vocal')} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className={`flex items-center justify-between gap-3 border p-3 ${emergencyMode ? 'border-red-200 bg-red-50' : 'border-blue-100 bg-blue-50'}`}>
            <div className="flex items-center gap-2">
              {emergencyMode ? <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" /> : <Mic className="h-5 w-5 text-blue-600" aria-hidden="true" />}
              <p className="text-sm font-semibold text-gray-900">{emergencyMode ? t('Emergency mode is on', 'Mode urgence active') : t('Normal mode', 'Mode normal')}</p>
            </div>
            <button type="button" onClick={toggleEmergencyMode} aria-pressed={emergencyMode} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${emergencyMode ? 'bg-red-600 text-white' : 'bg-white text-blue-700'}`}>
              {emergencyMode ? t('Turn off', 'Desactiver') : t('Turn on emergency mode', 'Activer le mode urgence')}
            </button>
          </div>
          {emergencyMode && <p className="-mt-3 text-xs text-gray-600">{t('Emergency steps appear straight away. The AI adds detail if you have a connection.', 'Les etapes d’urgence s’affichent tout de suite. L’IA ajoute des details si vous etes connecte.')}</p>}

          <div className="space-y-3 border border-gray-200 bg-gray-50 p-5 text-center">
            <button
              type="button"
              onClick={listening ? recognition.stop : recognition.start}
              disabled={!recognition.supported}
              aria-pressed={listening}
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition ${listening ? 'animate-pulse bg-red-600' : 'bg-orange-500 hover:bg-orange-600'} disabled:cursor-not-allowed disabled:bg-gray-300`}
              aria-label={listening ? t('Stop listening', 'Arreter l’ecoute') : t('Start voice input', 'Demarrer la saisie vocale')}
            >
              {listening ? <MicOff className="h-9 w-9" aria-hidden="true" /> : <Mic className="h-9 w-9" aria-hidden="true" />}
            </button>
            <p className="text-sm font-medium text-gray-700" aria-live="polite">
              {!recognition.supported ? t('Voice input is not available here. Type below.', 'La saisie vocale n’est pas disponible ici. Ecrivez ci-dessous.') : listening ? t('Listening…', 'J’ecoute…') : t('Tap the microphone and speak', 'Touchez le microphone et parlez')}
            </p>
            {recognition.supported && <p className="text-xs text-gray-500">{t('Your voice is sent to your browser’s speech service (Google or Apple) to be turned into text. It needs a connection.', 'Votre voix est envoyee au service vocal de votre navigateur (Google ou Apple) pour etre transcrite. Une connexion est necessaire.')}</p>}
            {recognition.transcript && listening && <p className="rounded bg-white px-3 py-2 text-sm italic text-gray-700">“{recognition.transcript}”</p>}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); submit(query); }} className="space-y-3">
            <label htmlFor="voice-prompt" className="block text-sm font-semibold text-gray-700">{t('Your question or command', 'Votre question ou commande')}</label>
            <textarea
              id="voice-prompt"
              ref={promptRef}
              rows={3}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); submit(query); } }}
              placeholder={t('Try: "What controls do I need before charging R-290?" or "Log 5 kg R-290 recovery for Shoprite"', 'Essayez : « Quelles precautions avant de charger du R-290 ? »')}
              className="w-full border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS[language === 'fr' ? 'fr' : 'en'].map((prompt) => (
                <button key={prompt} type="button" onClick={() => { setQuery(prompt); submit(prompt); }} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200">{prompt}</button>
              ))}
            </div>
            <button type="submit" disabled={!query.trim() || assistant.busy} className="flex w-full items-center justify-center gap-2 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-4 w-4" aria-hidden="true" />
              {assistant.busy ? t('Working on it…', 'En cours…') : t('Ask', 'Demander')}
            </button>
          </form>

          {error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {risk && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <RefrigerantRiskBadge color={risk.color} label={risk.label} />
              <span>{risk.profile.code}</span>
            </div>
          )}

          {assistant.command && (
            <div role="group" aria-label={t('Confirm command', 'Confirmer la commande')} className="space-y-3 border-2 border-orange-300 bg-orange-50 p-4">
              <p className="text-sm font-semibold text-gray-900">{t('I understood this command', 'J’ai compris cette commande')}</p>
              <p className="text-sm text-gray-800">{describeCommand(assistant.command, language)}</p>
              <div className="flex gap-2">
                <button type="button" onClick={confirmCommand} className="bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">{t('Yes, do it', 'Oui, executer')}</button>
                <button type="button" onClick={assistant.clearCommand} className="border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">{t('Cancel', 'Annuler')}</button>
              </div>
            </div>
          )}

          {assistant.parts.length > 0 && (
            <div className="space-y-3" aria-live="polite">
              {assistant.parts.map((part, index) => (
                <div key={index} className="border border-gray-200 bg-white p-4 shadow-sm">
                  <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${SOURCE_LABEL[part.source].style}`}>{SOURCE_LABEL[part.source][language === 'fr' ? 'fr' : 'en']}</span>
                  <p className="mt-2 text-sm leading-6 text-gray-800">{part.text}</p>
                  {part.source === 'ai' && <p className="mt-2 text-xs text-gray-500">{t('Generated by AI. Check it against the manufacturer’s safety data sheet before acting.', 'Genere par IA. Verifiez avec la fiche de securite du fabricant avant d’agir.')}</p>}
                  {part.source === 'offline' && <p className="mt-2 text-xs text-gray-500">{t('The live assistant could not be reached, so this is general guidance.', 'L’assistant en direct est injoignable : conseil general.')}</p>}
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button" onClick={() => synthesis.speak(assistant.parts.map((part) => part.text).join(' '))} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"><Volume2 className="h-4 w-4" aria-hidden="true" />{t('Read aloud', 'Lire a voix haute')}</button>
                {synthesis.speaking && <button type="button" onClick={synthesis.stop} className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Square className="h-4 w-4" aria-hidden="true" />{t('Stop speaking', 'Arreter la lecture')}</button>}
              </div>
            </div>
          )}

          <fieldset className="space-y-3 border border-gray-200 p-4">
            <legend className="px-1 text-sm font-semibold text-gray-700">{t('Settings', 'Reglages')}</legend>
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" checked={handsFree} onChange={(event) => toggleHandsFree(event.target.checked)} className="h-4 w-4" />
              {t('Hands-free: send my question as soon as I stop speaking', 'Mains libres : envoyer ma question des que je m’arrete de parler')}
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" checked={synthesis.autoSpeak} onChange={(event) => synthesis.setAutoSpeak(event.target.checked)} className="h-4 w-4" />
              {t('Read answers aloud automatically', 'Lire les reponses a voix haute automatiquement')}
            </label>
            {synthesis.voices.length > 0 && (
              <div className="flex items-center gap-3">
                <label htmlFor="voice-select" className="text-sm font-semibold text-gray-700">{t('Voice', 'Voix')}</label>
                <select id="voice-select" value={synthesis.activeVoice?.name ?? ''} onChange={(event) => synthesis.selectVoice(event.target.value)} className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  {synthesis.voices.map((voice) => <option key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</option>)}
                </select>
                <button type="button" onClick={() => synthesis.speak(t('This is how I sound.', 'Voici ma voix.'))} className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200">{t('Test', 'Tester')}</button>
              </div>
            )}
          </fieldset>

          <div className="border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{t('Recent questions on this device', 'Questions recentes sur cet appareil')}</p>
              {sessions.length > 0 && <button type="button" onClick={clearSessions} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />{t('Clear', 'Effacer')}</button>}
            </div>
            <ul className="mt-3 space-y-2">
              {sessions.length === 0 ? <li className="text-sm text-gray-500">{t('Nothing saved yet.', 'Rien d’enregistre.')}</li> : sessions.slice(0, 3).map((session) => (
                <li key={session.id} className="bg-gray-50 p-3">
                  <button type="button" onClick={() => setQuery(session.query)} className="text-left text-sm font-semibold text-gray-900 hover:underline">{session.query}</button>
                  <p className="mt-1 text-xs text-gray-500">{new Date(session.createdAt).toLocaleString('en-ZW')}{session.refrigerantClass ? ` · class ${session.refrigerantClass}` : ''}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

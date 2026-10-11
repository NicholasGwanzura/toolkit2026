'use client';

import { useCallback, useRef, useState } from 'react';
import { buildSafetyAssistantResponse, getRiskSummary } from '@/lib/refrigerantIntelligence';
import { getEmergencySafetyScriptForQuery } from '@/lib/emergencySafety';
import type { AppLanguage, SafetySession, UserRole } from '@/types/index';
import { canUseCommand, parseVoiceCommand, type VoiceCommand } from './commands';
import { extractRefrigerantCode, matchShortcut } from './text';

export type AnswerSource = 'emergency' | 'ai' | 'offline' | 'info';
export interface AnswerPart { source: AnswerSource; text: string }
type Turn = { role: 'user' | 'model'; text: string };

const AI_TIMEOUT_MS = 10_000;
const EMERGENCY_AI_TIMEOUT_MS = 8_000;

async function askLiveAssistant(message: string, history: Turn[], language: AppLanguage, emergencyMode: boolean, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/voice-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({ message, history, language, emergencyMode }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { answer: string | null; fallback: boolean };
    return data.fallback ? null : data.answer;
  } catch {
    return null; // offline, timed out or blocked: the caller falls back to offline guidance
  } finally {
    clearTimeout(timer);
  }
}

function emergencyText(query: string, language: AppLanguage): string {
  const script = getEmergencySafetyScriptForQuery(query, language);
  const steps = script
    ? script.steps.join(' ')
    : language === 'fr'
      ? 'N’entrez pas dans une zone dangereuse. Isolez la zone, ventilez si vous pouvez le faire sans risque et contactez les secours ou votre superviseur.'
      : 'Do not enter a hazardous area. Isolate the area, ventilate only if it is safe to do so, and contact emergency services or your supervisor.';
  return `${language === 'fr' ? 'URGENCE. ' : 'EMERGENCY. '}${steps}`;
}

interface Options {
  language: AppLanguage;
  emergencyMode: boolean;
  role: UserRole | undefined;
  userId: string | undefined;
  /** Speak a piece of the answer. `queue` adds to what is already being read instead of replacing it. */
  speak: (text: string, options?: { queue?: boolean }) => void;
  autoSpeak: boolean;
  onSession: (session: SafetySession) => void;
}

export function useAssistant({ language, emergencyMode, role, userId, speak, autoSpeak, onSession }: Options) {
  const [parts, setParts] = useState<AnswerPart[]>([]);
  const [busy, setBusy] = useState(false);
  const [command, setCommand] = useState<VoiceCommand | null>(null);
  const [notice, setNotice] = useState('');
  const history = useRef<Turn[]>([]);
  const runId = useRef(0);

  const ask = useCallback(async (raw: string) => {
    const query = raw.trim();
    if (!query) return;
    const id = ++runId.current;
    const stillCurrent = () => runId.current === id;
    setNotice('');
    setCommand(null);

    // 1. A command is confirmed, never run silently.
    const parsed = parseVoiceCommand(query);
    if (parsed) {
      if (!canUseCommand(parsed, role)) {
        setParts([{ source: 'info', text: language === 'fr' ? 'Cette page n’est pas disponible pour votre role.' : 'That is not available for your role.' }]);
        return;
      }
      setParts([]);
      setCommand(parsed);
      return;
    }

    setBusy(true);
    const collected: AnswerPart[] = [];
    const show = (next: AnswerPart[]) => { if (stillCurrent()) setParts(next); };
    try {
      let aiText: string | null = null;

      if (emergencyMode) {
        // The scripted steps are on the device already, so show and read them at once. The AI adds detail if it arrives.
        collected.push({ source: 'emergency', text: emergencyText(query, language) });
        show([...collected]);
        if (autoSpeak) speak(collected[0].text);
        aiText = await askLiveAssistant(query, history.current, language, true, EMERGENCY_AI_TIMEOUT_MS);
        if (aiText) {
          collected.push({ source: 'ai', text: aiText });
          if (autoSpeak && stillCurrent()) speak(aiText, { queue: true });
        }
      } else {
        const shortcut = matchShortcut(query, language);
        if (shortcut) {
          collected.push({ source: 'info', text: shortcut });
        } else {
          aiText = await askLiveAssistant(query, history.current, language, false, AI_TIMEOUT_MS);
          if (aiText) collected.push({ source: 'ai', text: aiText });
          else collected.push({ source: 'offline', text: await buildSafetyAssistantResponse(query, language) });
        }
        if (autoSpeak && stillCurrent()) speak(collected.map((part) => part.text).join(' '));
      }
      show([...collected]);

      if (!aiText && emergencyMode) {
        collected.push({ source: 'offline', text: await buildSafetyAssistantResponse(query, language) });
        show([...collected]);
      }

      const answerText = collected.map((part) => part.text).join(' ');
      history.current = [...history.current, { role: 'user' as const, text: query }, { role: 'model' as const, text: answerText }].slice(-12);

      // The refrigerant class comes from the refrigerant named in the question, not from the whole sentence.
      const code = extractRefrigerantCode(query);
      const risk = code ? await getRiskSummary(code) : null;
      onSession({
        id: `voice-${Date.now()}`,
        technicianId: userId ?? 'public-user',
        query,
        response: answerText,
        sourceDocuments: emergencyMode ? ['Offline safety scripts', 'WhatGas refrigerant intelligence'] : ['WhatGas refrigerant intelligence', 'HEVACRAZ workflow guidance'],
        refrigerantClass: risk?.profile.ashraeSafetyClass,
        createdAt: new Date().toISOString(),
        language,
        emergencyMode,
      });
    } finally {
      if (stillCurrent()) setBusy(false);
    }
  }, [autoSpeak, emergencyMode, language, onSession, role, speak, userId]);

  const reset = useCallback(() => {
    runId.current++;
    setParts([]);
    setCommand(null);
    setNotice('');
    setBusy(false);
  }, []);

  return { parts, busy, command, notice, ask, clearCommand: () => setCommand(null), reset };
}

import { GoogleGenAI, FunctionCallingConfigMode, type FunctionDeclaration, type Content, Type } from '@google/genai';
import { searchRefrigerants } from '@/lib/whatgas/repository';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash';

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!API_KEY) return null;
  if (!_client) _client = new GoogleGenAI({ apiKey: API_KEY });
  return _client;
}

const lookupRefrigerantTool: FunctionDeclaration = {
  name: 'lookup_refrigerant',
  description:
    'Looks up a refrigerant in the UNEP WhatGas registry by name, ASHRAE code, formula, or CAS number. ' +
    'Returns real ASHRAE safety class, GWP, ODP, and flammability/toxicity data. Always call this before ' +
    'stating safety-class, GWP, or ODP figures for a specific refrigerant — never state them from memory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Refrigerant code, name, or formula to search for, e.g. "R-290" or "propane".',
      },
    },
    required: ['query'],
  },
};

async function runLookupRefrigerant(query: string): Promise<string> {
  const { rows } = await searchRefrigerants({ q: query }, 1, 3);
  if (rows.length === 0) {
    return JSON.stringify({ found: false, message: `No refrigerant matched "${query}" in the WhatGas registry.` });
  }
  return JSON.stringify({
    found: true,
    matches: rows.map((r) => ({
      code: r.ashraeCode,
      name: r.odsName,
      ashraeSafetyClass: r.ashraeSafetyGroup,
      gwp: r.gwp,
      odp: r.odp,
      flammability: r.flammability,
      toxicity: r.toxicity,
      isHFC: r.isHFC,
      isHCFC: r.isHCFC,
      isCFC: r.isCFC,
    })),
  });
}

const BASE_INSTRUCTION = `You are the HEVACRAZ / National Ozone Unit Zimbabwe field safety voice assistant, used by \
HVAC-R technicians on job sites. Your answers are spoken aloud, so write 2 to 4 plain sentences with no markdown, \
no lists and no symbols. Be practical and safety-first. Cover: refrigerant handling and safety class, leak response, \
PPE, ventilation, COC and certificate workflow questions, and general HVAC-R compliance. Always use the \
lookup_refrigerant tool before stating any refrigerant's safety class, GWP or ODP. Never guess these from memory. \
You do not have the text of Zimbabwean laws or regulations: for questions about what a specific regulation or SI \
requires, say you cannot confirm it and point to the National Ozone Unit or the manufacturer's safety data sheet. \
If asked something outside HVAC-R, safety or compliance, say so briefly and redirect.`;

function systemInstruction(context: VoiceContext): string {
  const language = context.language === 'fr' ? 'Reply in French.' : 'Reply in English.';
  const emergency = context.emergencyMode
    ? ' The technician has switched on emergency mode: lead with the immediate action (move people away, no ignition sources, ventilate only if safe, call for help), then one sentence of detail.'
    : '';
  return `${BASE_INSTRUCTION} ${language}${emergency}`;
}

export type ChatTurn = { role: 'user' | 'model'; text: string };
export interface VoiceContext { language: 'en' | 'fr'; emergencyMode: boolean }

const REQUEST_TIMEOUT_MS = 9000;
const MAX_TOOL_ROUNDS = 3;

/**
 * Gemini-backed voice assistant response, grounded in the real WhatGas refrigerant registry via
 * function calling. Returns null (never throws) on any failure, timeout or missing API key, so callers
 * can fall back to offline guidance: field technicians need the assistant to keep working even when
 * Gemini is unreachable or unconfigured.
 */
export async function getVoiceAssistantResponse(
  message: string,
  history: ChatTurn[] = [],
  context: VoiceContext = { language: 'en', emergencyMode: false },
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const contents: Content[] = [
      ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const config = {
      systemInstruction: systemInstruction(context),
      tools: [{ functionDeclarations: [lookupRefrigerantTool] }],
      temperature: 0.3,
      // On the 2.5 models, hidden "thinking" counts toward the output limit and could leave nothing
      // to say. A short spoken answer does not need it.
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 500,
      abortSignal: controller.signal,
    };

    let response = await client.models.generateContent({
      model: MODEL,
      contents,
      config: { ...config, toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } } },
    });

    // The model may ask for several lookups, in one turn or over a few turns.
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const calls = response.functionCalls;
      if (!calls || calls.length === 0) break;

      contents.push({ role: 'model', parts: calls.map((call) => ({ functionCall: call })) });
      const results = await Promise.all(
        calls.map(async (call) => ({
          functionResponse: { name: call.name!, response: { result: await runLookupRefrigerant(String(call.args?.query ?? '')) } },
        })),
      );
      contents.push({ role: 'user', parts: results });

      response = await client.models.generateContent({ model: MODEL, contents, config });
    }

    return response.text?.trim() || null;
  } catch (err) {
    console.error('[gemini] voice assistant request failed:', err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Validation for the voice-assistant API request. Pure, so the limits can be tested.
export const MAX_MESSAGE_CHARS = 600;
export const MAX_HISTORY_TURNS = 6;
export const MAX_TURN_CHARS = 1000;

export interface AssistantRequest {
  message: string;
  history: Array<{ role: 'user' | 'model'; text: string }>;
  language: 'en' | 'fr';
  emergencyMode: boolean;
}

export function parseAssistantRequest(body: unknown): { ok: true; value: AssistantRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'A request body is required.' };
  const input = body as Record<string, unknown>;

  if (typeof input.message !== 'string' || !input.message.trim()) return { ok: false, error: 'message is required' };
  const message = input.message.trim();
  if (message.length > MAX_MESSAGE_CHARS) return { ok: false, error: `Keep your question under ${MAX_MESSAGE_CHARS} characters.` };

  const rawHistory = Array.isArray(input.history) ? input.history.slice(-MAX_HISTORY_TURNS) : [];
  const history: AssistantRequest['history'] = [];
  for (const turn of rawHistory) {
    if (!turn || typeof turn !== 'object') continue;
    const { role, text } = turn as Record<string, unknown>;
    if ((role !== 'user' && role !== 'model') || typeof text !== 'string' || !text.trim()) continue;
    history.push({ role, text: text.trim().slice(0, MAX_TURN_CHARS) });
  }

  return {
    ok: true,
    value: { message, history, language: input.language === 'fr' ? 'fr' : 'en', emergencyMode: input.emergencyMode === true },
  };
}

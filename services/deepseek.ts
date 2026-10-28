import { parseNameplateSuggestion, type NameplateAiSuggestion } from '@/lib/nameplate-ai';

const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';
const REQUEST_TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT =
  'You are a world-class HVAC and Commercial Refrigeration Engineer. Provide precise, technical, and safety-oriented advice regarding refrigerant GWP, installation best practices, and ASHRAE sizing standards. Keep responses concise but technically accurate.';

const NAMEPLATE_SYSTEM_PROMPT = `You correct equipment nameplate text that was read by an OCR scanner for HVAC and refrigeration technicians.
Reply with a single JSON object and nothing else, in this exact shape:
{"manufacturer": string|null, "model": string|null, "serialNumber": string|null, "refrigerantCode": string|null, "chargeKg": number|null, "note": string|null}

Rules:
- Only return values that are visible in the supplied text. Never invent a manufacturer, model, serial number, refrigerant or charge.
- Use null for anything the text does not show.
- Fix an obvious OCR slip only when the intended value is unambiguous from the text.
- refrigerantCode must be a code such as R-410A or R-1234yf.
- chargeKg is the factory charge in kilograms. Convert grams to kilograms. Use null when the unit is not clear.
- note is at most 20 words flagging anything the technician must verify on the plate. Use null when nothing is doubtful.`;

interface ChatOptions {
  maxTokens?: number;
  json?: boolean;
}

/** One chat completion. Returns null when the service is not configured or the call fails. */
async function callChat(systemPrompt: string, userPrompt: string, options: ChatOptions = {}): Promise<string | null> {
  if (!API_KEY) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: options.maxTokens ?? 1024,
        stream: false,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('DeepSeek API Error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const getTechnicalAdvice = async (prompt: string): Promise<string> => {
  if (!API_KEY) {
    return 'AI technical verification is currently unavailable. Configure DEEPSEEK_API_KEY to enable live sizing advice.';
  }

  const content = await callChat(SYSTEM_PROMPT, prompt);
  return content ?? 'Technical assistant unavailable. Please check your network connection.';
};

/**
 * A second, advisory read of a nameplate's OCR text. The model only sees text, never the photo, and
 * the reply is validated before it reaches the scanner; null means the check could not be completed.
 */
export const suggestNameplateDetails = async (rawText: string): Promise<NameplateAiSuggestion | null> => {
  const content = await callChat(NAMEPLATE_SYSTEM_PROMPT, rawText, { maxTokens: 400, json: true });
  return parseNameplateSuggestion(content);
};

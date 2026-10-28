const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';
const REQUEST_TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT =
  'You are a world-class HVAC and Commercial Refrigeration Engineer. Provide precise, technical, and safety-oriented advice regarding refrigerant GWP, installation best practices, and ASHRAE sizing standards. Keep responses concise but technically accurate.';

export const getTechnicalAdvice = async (prompt: string): Promise<string> => {
  if (!API_KEY) {
    return 'AI technical verification is currently unavailable. Configure DEEPSEEK_API_KEY to enable live sizing advice.';
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1024,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('DeepSeek API Error:', response.status, response.statusText);
      return 'Technical assistant unavailable. Please check your network connection.';
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || 'No response generated';
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    return 'Technical assistant unavailable. Please check your network connection.';
  } finally {
    clearTimeout(timer);
  }
};

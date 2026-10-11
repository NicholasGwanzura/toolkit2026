import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { VALID_ROLES } from '@/lib/roles';
import { getVoiceAssistantResponse } from '@/services/gemini';
import { parseAssistantRequest } from '@/lib/voice/request';

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, [...VALID_ROLES]);
  } catch (e) {
    return e as Response;
  }

  if (!checkRateLimit(`voice-assistant:${session.id}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  const parsed = parseAssistantRequest(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { message, history, language, emergencyMode } = parsed.value;

  const answer = await getVoiceAssistantResponse(message, history, { language, emergencyMode });
  if (answer === null) return NextResponse.json({ answer: null, fallback: true });
  return NextResponse.json({ answer, fallback: false });
}

import { NextResponse } from 'next/server';
import { readSessionFromRequest } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getTechnicalAdvice } from '@/services/deepseek';

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const MAX_PROMPT_LENGTH = 4000;

export async function POST(req: Request) {
  const session = await readSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRateLimit(`sizing-advice:${session.id}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({})) as { prompt?: string };
  if (!body.prompt || typeof body.prompt !== 'string') {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }
  if (body.prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json({ error: 'prompt is too long' }, { status: 400 });
  }

  const advice = await getTechnicalAdvice(body.prompt);
  return NextResponse.json({ advice });
}

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { MAX_RAW_TEXT_FOR_AI } from '@/lib/nameplate-ai';
import { suggestNameplateDetails } from '@/services/deepseek';

const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Optional second read of a nameplate. Only the OCR text leaves the device; the photo stays in the
 * browser. Suggestions are advisory and never replace the technician's confirmation.
 */
export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  if (!checkRateLimit(`nameplate-ai:${session.id}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many AI checks. Try again in a few minutes.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({})) as { rawText?: unknown };
  if (typeof body.rawText !== 'string' || !body.rawText.trim()) {
    return NextResponse.json({ error: 'rawText is required' }, { status: 400 });
  }

  const suggestion = await suggestNameplateDetails(body.rawText.trim().slice(0, MAX_RAW_TEXT_FOR_AI));
  if (!suggestion) {
    return NextResponse.json({ error: 'The AI check is not available right now. Use the extracted fields below.' }, { status: 503 });
  }

  return NextResponse.json({ suggestion });
}

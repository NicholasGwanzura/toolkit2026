import { publicLookupLimit } from '@/lib/server/rate-limit';
import { NextResponse } from 'next/server';
import { searchRefrigerants, type RefrigerantFilters } from '@/lib/whatgas/service';

const MAX_PAGE_SIZE = 20;

// Public refrigerant search — the underlying WhatGas registry is itself a public UNEP
// database, so there's nothing sensitive to gate here. Used by unauthenticated signup forms
// (e.g. supplier registration) that need a real refrigerant picker before the applicant has
// an account/session yet. Capped to a small page size since it's autocomplete-only, not the
// full catalogue browser (that stays behind auth at /api/refrigerants).
export async function GET(req: Request) {
  const limited = publicLookupLimit(req, 'refrigerants');
  if (limited) return limited;
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [], page: 1, pageSize: MAX_PAGE_SIZE, total: 0, totalPages: 1 });
  }

  const filters: RefrigerantFilters = { q };
  const { rows, total } = await searchRefrigerants(filters, 1, MAX_PAGE_SIZE);

  return NextResponse.json({
    data: rows,
    page: 1,
    pageSize: MAX_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / MAX_PAGE_SIZE)),
  });
}

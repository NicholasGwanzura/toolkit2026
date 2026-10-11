import { NextResponse } from 'next/server';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from '@/db/client';
import { emailLog, memberships, technicians } from '@/db/schema/index';
import { describeReminder, dueReminders, EXPIRED_REMINDER_WINDOW_DAYS, type ExpiryItem } from '@/lib/expiry-reminders';
import { sendExpiryReminderEmail } from '@/lib/server/email';
import { isUndeliverableAddress } from '@/lib/deliverable-address';
import { notifyRegistryTechnician } from '@/lib/server/notifications';

// Run once a day by an external scheduler:
//   POST /api/cron/expiry-reminders   Authorization: Bearer <CRON_SECRET>
// A reminder is sent once per record, stage (30 days, 7 days, expired) and expiry date.
const MAX_PER_RUN = 200;
const LOOK_AHEAD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const from = new Date(now.getTime() - EXPIRED_REMINDER_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10);
  const to = new Date(now.getTime() + LOOK_AHEAD_DAYS * DAY_MS).toISOString().slice(0, 10);

  try {
    const [registrations, memberRows] = await Promise.all([
      db.select({ id: technicians.id, name: technicians.name, email: technicians.email, expiryDate: technicians.expiryDate })
        .from(technicians)
        .where(and(eq(technicians.status, 'active'), gte(technicians.expiryDate, from), lte(technicians.expiryDate, to))),
      db.select({ id: memberships.id, technicianId: memberships.technicianId, expiryDate: memberships.expiryDate })
        .from(memberships)
        .where(and(eq(memberships.status, 'active'), gte(memberships.expiryDate, from), lte(memberships.expiryDate, to))),
    ]);

    const memberTechIds = [...new Set(memberRows.map((m) => m.technicianId))];
    const memberTechs = memberTechIds.length
      ? await db.select({ id: technicians.id, name: technicians.name, email: technicians.email }).from(technicians).where(inArray(technicians.id, memberTechIds))
      : [];
    const techById = new Map(memberTechs.map((t) => [t.id, t]));

    const items: ExpiryItem[] = [
      ...registrations.map((t): ExpiryItem => ({ kind: 'registration', id: t.id, technicianId: t.id, name: t.name, email: t.email, expiryDate: t.expiryDate })),
      ...memberRows.map((m): ExpiryItem => {
        const tech = techById.get(m.technicianId);
        return { kind: 'membership', id: m.id, technicianId: m.technicianId, name: tech?.name ?? 'Member', email: tech?.email ?? null, expiryDate: m.expiryDate };
      }),
    ];

    const sentRows = await db.select({ label: emailLog.relatedLabel }).from(emailLog).where(and(eq(emailLog.emailType, 'expiry_reminder'), eq(emailLog.status, 'sent')));
    const alreadySent = new Set(sentRows.map((r) => r.label).filter((l): l is string => !!l));

    // Seed and demo records use placeholder addresses that can never receive mail.
    const deliverable = items.map((item) => (item.email && !isUndeliverableAddress(item.email) ? item : { ...item, email: null }));
    const due = dueReminders(deliverable, now, alreadySent).slice(0, MAX_PER_RUN);
    let sent = 0;
    let failed = 0;
    for (const reminder of due) {
      const text = describeReminder(reminder);
      const result = await sendExpiryReminderEmail({
        email: reminder.email as string,
        name: reminder.name,
        subject: text.subject,
        headline: text.headline,
        detail: text.detail,
        expiryDate: reminder.expiryDate,
        log: { type: 'expiry_reminder', entityType: 'technician', entityId: reminder.technicianId, label: reminder.key },
      });
      if (result.sent) {
        sent += 1;
        await notifyRegistryTechnician(reminder.technicianId, { kind: 'expiry_reminder', title: text.subject, body: text.detail, link: '/dashboard' });
      } else {
        failed += 1;
      }
    }
    return NextResponse.json({ checked: items.length, due: due.length, sent, failed });
  } catch (error) {
    console.error('[cron/expiry-reminders] failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Reminder run failed' }, { status: 500 });
  }
}

// Voice commands: turn "open the planner" or "log 5 kg R-290 recovery for Shoprite" into a typed action.
// Commands never change data. They navigate, or open a form with details filled in, and the person
// still reviews and presses Save.
import type { AppLanguage, UserRole } from '@/types/index';
import { extractRefrigerantCode } from './text';

export type GasAction = 'Charge' | 'Recovery' | 'Leak Repair';

export type VoiceCommand =
  | { kind: 'navigate'; label: string; href: string; roles: UserRole[] }
  | { kind: 'log-gas'; amountKg: number; action?: GasAction; refrigerantCode?: string; client?: string };

const FIELD: UserRole[] = ['technician', 'contractor'];
const FIELD_ADMIN: UserRole[] = ['technician', 'contractor', 'org_admin'];
const EVERYONE_LEARNING: UserRole[] = ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'];

interface NavTarget { label: string; href: string; roles: UserRole[]; words: RegExp }

// Role lists mirror the access rules in middleware.ts, so a command never offers a page the person cannot open.
const NAV_TARGETS: NavTarget[] = [
  { label: 'Job planner', href: '/field-operations?tab=planner', roles: FIELD_ADMIN, words: /\b(job\s+)?planner\b|\bschedule\b|\bplanificat\w*/i },
  { label: 'Jobs and logs', href: '/field-operations?tab=logs', roles: FIELD_ADMIN, words: /\bjobs?\s+and\s+logs\b|\bmy\s+jobs\b/i },
  { label: 'Installation checklist', href: '/field-toolkit?tab=checklist', roles: FIELD_ADMIN, words: /\bchecklist\b|\bliste\s+de\s+controle\b/i },
  { label: 'Installations', href: '/field-toolkit?tab=installations', roles: FIELD_ADMIN, words: /\binstallations?\b/i },
  { label: 'Gas register', href: '/field-toolkit?tab=register', roles: FIELD_ADMIN, words: /\b(gas|refrigerant)\s+(register|log)\b|\bregistre\b/i },
  { label: 'Nameplate scanner', href: '/field-toolkit?tab=scan', roles: FIELD_ADMIN, words: /\b(scan|scanner)\b|\bnameplate\b|\bplaque\b/i },
  { label: 'Field toolkit', href: '/field-toolkit', roles: FIELD_ADMIN, words: /\b(field\s+)?toolkit\b|\bboite\s+a\s+outils\b/i },
  { label: 'Sizing tool', href: '/sizing-tool', roles: FIELD, words: /\bsizing\b|\bdimensionnement\b/i },
  { label: 'Refrigerant lookup', href: '/whatgas', roles: EVERYONE_LEARNING, words: /\bwhat\s*gas\b|\brefrigerant\s+(lookup|search|risk)\b/i },
  { label: 'Safety center', href: '/safety-center', roles: EVERYONE_LEARNING, words: /\bsafety\b|\bsecurite\b/i },
  { label: 'Learning hub', href: '/learn', roles: EVERYONE_LEARNING, words: /\b(learning|courses?|training|cours)\b/i },
  { label: 'Certifications', href: '/certifications', roles: EVERYONE_LEARNING, words: /\bcertifications?\b|\bcertificats?\b/i },
  { label: 'Rewards', href: '/rewards', roles: ['technician', 'contractor', 'vendor', 'org_admin'], words: /\brewards?\b|\brecompenses?\b/i },
  { label: 'Dashboard', href: '/dashboard', roles: ['technician', 'trainer', 'lecturer', 'vendor', 'org_admin', 'student', 'contractor'], words: /\bdashboard\b|\bhome\b|\baccueil\b|\btableau\s+de\s+bord\b/i },
  { label: 'Vendor reorder', href: '/suppliers/reorder', roles: ['vendor'], words: /\breorder\b|\bre-order\b|\bcommander\b/i },
  { label: 'Verify buyer', href: '/suppliers/verify-buyer', roles: ['vendor'], words: /\bverify\s+(a\s+)?buyer\b|\bbuyer\s+check\b/i },
  { label: 'Applications', href: '/admin/applications', roles: ['org_admin'], words: /\bapplications?\b|\bdemandes?\b/i },
];

const OPEN_VERB = /^\s*(?:please\s+)?(?:open|go\s+to|show(?:\s+me)?|take\s+me\s+to|navigate\s+to|ouvre[rz]?|aller\s+(?:a|au|aux)|affiche[rz]?)\b/i;

/** "log 5 kg R-290 recovery for Shoprite": amount is required, nothing else is guessed. */
const LOG_VERB = /\b(?:log|record|add|enter|enregistre[rz]?|ajoute[rz]?)\b/i;
const AMOUNT = /(\d+(?:[.,]\d+)?)\s*(?:kg|kgs|kilo|kilos|kilogram|kilograms|kilogramme|kilogrammes)\b/i;

function detectAction(text: string): GasAction | undefined {
  if (/\bleak\s+repair\w*\b|\brepar\w*\s+(?:de\s+)?fuite\b/i.test(text)) return 'Leak Repair';
  if (/\brecover\w*\b|\brecuper\w*\b|\brecup\w*\b/i.test(text)) return 'Recovery';
  if (/\bcharg\w*\b|\brecharg\w*\b/i.test(text)) return 'Charge';
  return undefined;
}

function detectClient(text: string): string | undefined {
  const match = text.match(/\b(?:for|at|pour|chez)\s+(.{2,80})$/i);
  if (!match) return undefined;
  const client = match[1].replace(/[.,;!?]+$/, '').trim();
  return client.length >= 2 ? client : undefined;
}

export function parseVoiceCommand(input: string): VoiceCommand | null {
  const text = input.trim();
  if (!text) return null;

  if (LOG_VERB.test(text)) {
    const amountMatch = text.match(AMOUNT);
    if (amountMatch) {
      const amountKg = Number(amountMatch[1].replace(',', '.'));
      if (Number.isFinite(amountKg) && amountKg > 0 && amountKg <= 10000) {
        return { kind: 'log-gas', amountKg, action: detectAction(text), refrigerantCode: extractRefrigerantCode(text), client: detectClient(text) };
      }
    }
  }

  if (OPEN_VERB.test(text)) {
    // The most specific phrase wins, because the list is ordered from specific to general.
    const target = NAV_TARGETS.find(item => item.words.test(text));
    if (target) return { kind: 'navigate', label: target.label, href: target.href, roles: target.roles };
  }
  return null;
}

export function canUseCommand(command: VoiceCommand, role: UserRole | undefined): boolean {
  if (!role) return false;
  return command.kind === 'log-gas' ? FIELD_ADMIN.includes(role) : command.roles.includes(role);
}

export function commandHref(command: VoiceCommand): string {
  if (command.kind === 'navigate') return command.href;
  const params = new URLSearchParams({ tab: 'register', amount: String(command.amountKg) });
  if (command.action) params.set('action', command.action);
  if (command.refrigerantCode) params.set('refrigerant', command.refrigerantCode);
  if (command.client) params.set('client', command.client);
  return `/field-toolkit?${params.toString()}`;
}

export function describeCommand(command: VoiceCommand, language: AppLanguage): string {
  const fr = language === 'fr';
  if (command.kind === 'navigate') return fr ? `Ouvrir : ${command.label}` : `Open ${command.label}`;
  const parts = [`${command.amountKg} kg`, command.refrigerantCode, command.action?.toLowerCase()].filter(Boolean).join(' ');
  const who = command.client ? (fr ? ` pour ${command.client}` : ` for ${command.client}`) : '';
  return fr
    ? `Ouvrir le registre de gaz avec : ${parts}${who}. Vous verifiez puis enregistrez.`
    : `Open the gas register with: ${parts}${who}. You review it and press Save.`;
}

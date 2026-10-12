// Pure text helpers for the voice assistant: no browser or network access, so they can be tested.
import type { AppLanguage } from '@/types/index';

export { extractRefrigerantCode } from '@/lib/refrigerant-code';

/** Remove markdown so a speech engine does not read "asterisk asterisk" aloud. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/(\*\*|__|\*|_)(.+?)\1/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();
}

const SAFETY_WORDS = /\b(leak|leaking|fuite|smell|odou?r|odeur|fire|feu|flame|burn|explo\w*|evacuat\w*|recover\w*|charg\w*|ventilat\w*|ppe|danger|toxic\w*|r[-\s]?\d{2,4})\b/i;

/**
 * A short canned answer for a plain COC or certificate question. It never applies when the question
 * is about safety or names a refrigerant, so a real question is not swallowed by a keyword.
 */
export function matchShortcut(query: string, language: AppLanguage): string | null {
  if (SAFETY_WORDS.test(query)) return null;
  const fr = language === 'fr';
  if (/\bcocs?\b/i.test(query)) {
    return fr
      ? 'Le flux COC reste dans la boite a outils terrain. Confirmez l’installation, joignez les photos, puis soumettez la demande avant emission.'
      : 'The COC workflow stays in the Field Toolkit. Confirm the installation, attach photos, then submit the request before issuance.';
  }
  if (/\b(certificates?|certifications?|certificats?)\b/i.test(query)) {
    return fr
      ? 'Utilisez le portail public de verification avec le numero de certificat ou le code QR pour confirmer le statut et la date d’expiration.'
      : 'Use the public verification portal with the certificate number or QR code to confirm status and expiry.';
  }
  return null;
}

const RECOGNITION_ERRORS: Record<string, { en: string; fr: string }> = {
  'not-allowed': { en: 'The microphone is blocked. Allow microphone access for this site in your browser settings, or type your question.', fr: 'Le microphone est bloque. Autorisez-le dans les parametres du navigateur, ou ecrivez votre question.' },
  'service-not-allowed': { en: 'Voice input is not allowed on this device. Type your question instead.', fr: 'La saisie vocale n’est pas autorisee sur cet appareil. Ecrivez votre question.' },
  'no-speech': { en: 'I did not hear anything. Tap the microphone and try again.', fr: 'Je n’ai rien entendu. Touchez le microphone et reessayez.' },
  'audio-capture': { en: 'No microphone was found.', fr: 'Aucun microphone trouve.' },
  network: { en: 'Voice input needs an internet connection. You can still type your question.', fr: 'La saisie vocale demande une connexion internet. Vous pouvez ecrire votre question.' },
  'language-not-supported': { en: 'This browser cannot listen in that language. Type your question instead.', fr: 'Ce navigateur ne comprend pas cette langue. Ecrivez votre question.' },
};

/** Plain-language message for a speech-recognition error code, or null when it needs no message (the user stopped it). */
export function friendlyRecognitionError(code: string, language: AppLanguage): string | null {
  if (code === 'aborted') return null;
  const known = RECOGNITION_ERRORS[code];
  if (known) return known[language === 'fr' ? 'fr' : 'en'];
  return language === 'fr' ? 'La saisie vocale a echoue. Reessayez ou ecrivez votre question.' : 'Voice input failed. Try again or type your question.';
}

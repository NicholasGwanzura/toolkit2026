'use client';

import { useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { useEmergencyMode } from '@/lib/emergencyMode';
import { useI18n } from '@/lib/i18n';
import { VoicePanel } from '@/components/voice/VoicePanel';

/** The floating microphone. All the behaviour lives in `VoicePanel` and the hooks under `lib/voice`. */
export function FloatingVoiceButton() {
  const { language } = useI18n();
  const { emergencyMode } = useEmergencyMode();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const label = language === 'fr' ? (emergencyMode ? 'Assistant d’urgence' : 'Assistant vocal') : (emergencyMode ? 'Emergency safety assistant' : 'Voice assistant');

  const close = () => {
    setOpen(false);
    // Give focus back to the button that opened the dialog.
    requestAnimationFrame(() => buttonRef.current?.focus());
  };

  return (
    <>
      <div className="fixed bottom-4 right-3 z-50 sm:bottom-5 sm:right-5">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          aria-haspopup="dialog"
          title={label}
          className={`flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-105 sm:h-16 sm:w-16 ${emergencyMode ? 'bg-gradient-to-br from-red-600 to-red-700' : 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500'}`}
        >
          <Mic className="h-6 w-6 text-white" aria-hidden="true" />
        </button>
      </div>
      {open && <VoicePanel onClose={close} />}
    </>
  );
}

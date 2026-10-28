'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Set when the dialog contains a form so Enter still submits from the body. */
  bodyClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = 'lg',
  bodyClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div className="absolute inset-0 bg-[#1C1917]/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#E7E5E4] bg-white shadow-2xl outline-none sm:rounded-2xl',
          SIZE_CLASSES[size],
        )}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1C1917] via-[#D97706] to-[#5A7D5A]" aria-hidden="true" />
        <div className="flex items-start gap-3 border-b border-[#E7E5E4] px-5 py-4 sm:px-6">
          {icon && (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#b45309]">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="text-lg font-bold tracking-tight text-[#1C1917]">{title}</h2>
            {description && <p id="modal-description" className="mt-1 text-sm leading-6 text-[#78716C]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#78716C] transition hover:bg-[#FAFAF9] hover:text-[#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>

        {footer && <div className="border-t border-[#E7E5E4] bg-[#FAFAF9] px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

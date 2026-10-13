'use client';

import type { ReactNode } from 'react';
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}

/**
 * A modal dialog on React Aria: focus moves in and is trapped, Escape closes it, the page behind is
 * inert for screen readers, and focus returns to what opened it. Use this instead of hand-built overlays.
 */
export function Dialog({ isOpen, onOpenChange, title, description, children, size = 'md' }: DialogProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    >
      <Modal className={cn('flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl', size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <AriaDialog className="flex min-h-0 flex-1 flex-col outline-none">
          {({ close }) => (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
                <div className="min-w-0">
                  <Heading slot="title" className="text-lg font-semibold text-stone-900">{title}</Heading>
                  {description && <p className="mt-1 text-sm text-stone-600">{description}</p>}
                </div>
                <button type="button" onClick={close} aria-label="Close" className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

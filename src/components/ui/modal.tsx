"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  /** Omit to make the modal non-dismissable — used for end-of-run screens. */
  onClose?: () => void;
  eyebrow?: string;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * One modal shell for every overlay in the app — results, give up, rules.
 *
 * Sharing it is what keeps them feeling like one product rather than three
 * separately styled dialogs, and it means the close affordance, the scroll
 * behaviour and the escape key only have to be right once.
 */
export function Modal({
  open,
  onClose,
  eyebrow,
  title,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text/20 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[88dvh] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[12px] border border-line bg-canvas shadow-[0_16px_48px_rgba(0,0,0,0.14)]",
            className,
          )}
          onOpenAutoFocus={(event) => event.preventDefault()}
          // A finished run has no "cancel": the only ways out are the actions.
          onEscapeKeyDown={(event) => {
            if (!onClose) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (!onClose) event.preventDefault();
          }}
        >
          <div className="relative border-b border-line px-6 pt-6 pb-5">
            {eyebrow && <div className="label mb-2">{eyebrow}</div>}
            <Dialog.Title asChild>
              <div>{title}</div>
            </Dialog.Title>

            {onClose && (
              <Dialog.Close
                className="absolute top-5 right-5 rounded-[5px] p-1.5 text-muted transition-colors hover:bg-surface hover:text-text"
                aria-label="Close"
              >
                <X className="size-4" aria-hidden />
              </Dialog.Close>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>

          {footer && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

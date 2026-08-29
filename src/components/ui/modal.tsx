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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--color-backdrop-ink)]/40 backdrop-blur-xs" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[88dvh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[22px] border-2 border-black bg-canvas shadow-[-5px_7px_0_rgba(11,26,74,0.1),-16px_30px_70px_-26px_rgba(10,24,80,0.62),-5px_12px_26px_-14px_rgba(10,24,80,0.34),0_2px_8px_rgba(10,24,80,0.14)]",
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
          <div className="relative px-6 pt-6 pb-2">
            {eyebrow && (
              <div className="font-display mb-1.5 text-xs font-bold tracking-[0.12em] text-[var(--color-backdrop-ink)]/70 uppercase">
                {eyebrow}
              </div>
            )}
            <Dialog.Title asChild>
              <div className="font-display">{title}</div>
            </Dialog.Title>

            {onClose && (
              <Dialog.Close
                className="absolute top-5 right-5 rounded-full p-1.5 text-muted transition-colors hover:bg-black/5 hover:text-black"
                aria-label="Close"
              >
                <X className="size-4 stroke-[2.5]" aria-hidden />
              </Dialog.Close>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
            {children}
          </div>

          {footer && (
            <div className="px-6 pt-6 pb-6">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

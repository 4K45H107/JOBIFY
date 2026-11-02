"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * A modal on the native <dialog>: the browser moves focus in, keeps Tab inside, makes the page
 * behind inert and closes on Escape. Clicking the backdrop closes it, and focus returns to
 * whatever opened it.
 */
export function Modal({
  onClose,
  labelledBy,
  label,
  className,
  children,
}: {
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  /** The panel's own classes (size, padding, layout). */
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // jsdom has no showModal; tests still get the content.
    if (dialog && !dialog.open) dialog.showModal?.();
    return () => {
      dialog?.close?.();
      opener?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-label={label}
      onCancel={(e) => {
        // Escape: let the parent decide, so its state stays in sync.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the dialog element itself is a click on the backdrop around the panel.
        if (e.target === ref.current) onClose();
      }}
      className="m-auto max-h-none max-w-none bg-transparent p-4 text-fg backdrop:bg-black/50"
    >
      <div className={cn("rounded-[10px] bg-bg", className)}>{children}</div>
    </dialog>
  );
}

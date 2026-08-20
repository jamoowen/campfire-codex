import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, labelledBy, className = "", children }: ModalProps) {
  const surfaceRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add("modal-open");
    const selector =
      "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const timer = window.setTimeout(() => {
      const focusable = surfaceRef.current?.querySelector<HTMLElement>(selector);
      (focusable ?? surfaceRef.current)?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !surfaceRef.current) return;

      const focusable = [...surfaceRef.current.querySelectorAll<HTMLElement>(selector)].filter(
        (element) => element.getClientRects().length > 0,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        surfaceRef.current.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
      previous?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        ref={surfaceRef}
        className={`modal-surface ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}

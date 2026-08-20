import { useEffect } from 'react';
import { CloseIcon } from '../icons';

export interface ToastMessage {
  id: number;
  text: string;
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span>{toast.text}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message">
        <CloseIcon />
      </button>
    </div>
  );
}

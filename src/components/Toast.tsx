import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast { id: string; kind: ToastKind; message: string; }

let pushToastFn: ((kind: ToastKind, message: string) => void) | null = null;

export function toast(kind: ToastKind, message: string) {
  pushToastFn?.(kind, message);
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    pushToastFn = (kind, message) => {
      const id = Math.random().toString(36).slice(2);
      setToasts(t => [...t, { id, kind, message }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
    };
    return () => { pushToastFn = null; };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl shadow-lg px-4 py-3 animate-slide-up border ${
            t.kind === 'success' ? 'bg-white border-forest-200' :
            t.kind === 'error' ? 'bg-white border-red-200' :
            'bg-white border-navy-200'
          }`}
        >
          {t.kind === 'success' && <CheckCircle2 className="text-forest-600 shrink-0 mt-0.5" size={20} />}
          {t.kind === 'error' && <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />}
          {t.kind === 'info' && <Info className="text-navy-600 shrink-0 mt-0.5" size={20} />}
          <p className="text-sm text-navy-800 flex-1">{t.message}</p>
          <button
            onClick={() => setToasts(x => x.filter(x => x.id !== t.id))}
            className="text-navy-300 hover:text-navy-600"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

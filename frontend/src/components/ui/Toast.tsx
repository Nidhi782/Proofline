import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'default' | 'success' | 'destructive' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title?: string;
  description: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: { title?: string; description: string; type?: ToastType; duration?: number }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      type = 'default',
      duration = 4500,
    }: {
      title?: string;
      description: string;
      type?: ToastType;
      duration?: number;
    }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, title, description, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-md w-full pointer-events-none p-4">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-lg transform transition-all duration-300 animate-in slide-in-from-bottom-5',
              item.type === 'success' && 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-950/40',
              item.type === 'destructive' && 'bg-slate-900/95 border-red-500/40 text-slate-100 shadow-red-950/40',
              item.type === 'warning' && 'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-amber-950/40',
              item.type === 'info' && 'bg-slate-900/95 border-indigo-500/40 text-slate-100 shadow-indigo-950/40',
              (!item.type || item.type === 'default') && 'bg-slate-900/95 border-slate-700 text-slate-100'
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {item.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {item.type === 'destructive' && <XCircle className="w-5 h-5 text-red-400" />}
              {item.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400" />}
              {item.type === 'info' && <Info className="w-5 h-5 text-indigo-400" />}
              {(!item.type || item.type === 'default') && <Info className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="flex-1 min-w-0">
              {item.title && <h4 className="text-sm font-semibold text-white mb-0.5">{item.title}</h4>}
              <p className="text-xs text-slate-300 leading-relaxed break-words">{item.description}</p>
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="flex-shrink-0 text-slate-400 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-md hover:bg-slate-800"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

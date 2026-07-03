import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: 'bg-white border border-green-200 text-slate-900',
  error: 'bg-white border border-red-200 text-slate-900',
};

const DOT_STYLES = {
  success: 'bg-green-600',
  error: 'bg-red-600',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    counter.current += 1;
    const id = counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            data-testid="toast-notification"
            className={`${TOAST_STYLES[t.type] || TOAST_STYLES.success} rounded-lg shadow-sm px-4 py-3 flex items-center gap-2 text-sm font-medium animate-[fadeIn_0.2s_ease-out]`}
          >
            <span className={`${DOT_STYLES[t.type] || DOT_STYLES.success} w-2 h-2 rounded-full flex-shrink-0`} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

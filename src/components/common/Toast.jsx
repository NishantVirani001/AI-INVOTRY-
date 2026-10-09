import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ACCENTS = {
  success: "border-l-stock-in",
  error: "border-l-stock-out",
  warning: "border-l-stock-low",
  info: "border-l-stock-info",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts = {}) => {
      const id = crypto.randomUUID();
      const type = opts.type || (opts.tone === "warning" ? "warning" : opts.tone === "error" || opts.tone === "danger" ? "error" : opts.tone === "success" ? "success" : "info");
      const message = opts.message || (opts.title ? `${opts.title}${opts.description ? `: ${opts.description}` : ''}` : opts.description) || "Notification";
      const duration = opts.duration !== undefined ? opts.duration : 4000;
      setToasts((prev) => [...prev, { id, type, message }]);
      if (duration) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map(({ id, type, message }) => {
          const Icon = ICONS[type] || Info;
          return (
            <div
              key={id}
              role="status"
              className={`panel flex items-start gap-3 border-l-4 p-3 pr-2 ${ACCENTS[type]} animate-[fadeIn_0.15s_ease-out]`}
            >
              <Icon size={18} className="mt-0.5 shrink-0 text-graphite-700 dark:text-paper-200" />
              <p className="flex-1 text-sm text-graphite-800 dark:text-paper-100">
                {message}
              </p>
              <button
                onClick={() => dismiss(id)}
                aria-label="Dismiss notification"
                className="rounded p-1 text-graphite-500 hover:bg-graphite-800/5 dark:hover:bg-paper-100/10"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

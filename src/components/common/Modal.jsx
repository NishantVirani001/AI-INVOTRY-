import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, title, children, footer, size = "md" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-graphite-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`panel relative w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between border-b border-graphite-800/10 px-5 py-4 dark:border-paper-100/10">
          <h2 className="font-display text-lg font-semibold text-graphite-900 dark:text-paper-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1.5 text-graphite-500 hover:bg-graphite-800/5 dark:hover:bg-paper-100/10"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-graphite-800/10 px-5 py-4 dark:border-paper-100/10">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

import clsx from "clsx";

const fieldBase =
  "w-full rounded-tag border bg-transparent px-3 py-2 text-sm text-graphite-900 placeholder:text-graphite-400 focus:border-signal dark:text-paper-100 dark:placeholder:text-paper-300/40";

function FieldWrapper({ label, error, required, children, hint }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-graphite-600 dark:text-paper-300/70">
          {label} {required && <span className="text-stock-out">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-graphite-500 dark:text-paper-300/50">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-stock-out">{error}</p>}
    </div>
  );
}

export function Input({ label, error, required, hint, className, ...props }) {
  return (
    <FieldWrapper label={label} error={error} required={required} hint={hint}>
      <input
        className={clsx(
          fieldBase,
          error
            ? "border-stock-out"
            : "border-graphite-800/15 dark:border-paper-100/15",
          className
        )}
        {...props}
      />
    </FieldWrapper>
  );
}

export function Select({ label, error, required, hint, options = [], className, ...props }) {
  return (
    <FieldWrapper label={label} error={error} required={required} hint={hint}>
      <select
        className={clsx(
          fieldBase,
          "bg-white dark:bg-graphite-900",
          error
            ? "border-stock-out"
            : "border-graphite-800/15 dark:border-paper-100/15",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

export function Textarea({ label, error, required, hint, className, ...props }) {
  return (
    <FieldWrapper label={label} error={error} required={required} hint={hint}>
      <textarea
        className={clsx(
          fieldBase,
          "min-h-[90px] resize-y",
          error
            ? "border-stock-out"
            : "border-graphite-800/15 dark:border-paper-100/15",
          className
        )}
        {...props}
      />
    </FieldWrapper>
  );
}

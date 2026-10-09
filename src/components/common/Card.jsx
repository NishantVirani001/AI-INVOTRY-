import clsx from "clsx";

export default function Card({ children, className, ...props }) {
  return (
    <div className={clsx("panel p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-lg font-semibold tracking-tight text-graphite-900 dark:text-paper-100">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-graphite-500 dark:text-paper-300/60">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

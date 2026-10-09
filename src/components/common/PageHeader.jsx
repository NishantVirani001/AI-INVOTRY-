export default function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="manifest-label mb-1">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold tracking-tight text-graphite-900 dark:text-paper-100">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-graphite-500 dark:text-paper-300/60">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

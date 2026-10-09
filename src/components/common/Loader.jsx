import { Loader2, PackageSearch } from "lucide-react";

export function Loader({ label = "Loading" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-graphite-500 dark:text-paper-300/60">
      <Loader2 size={22} className="animate-spin" />
      <span className="manifest-label">{label}</span>
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full bg-graphite-800/5 p-4 dark:bg-paper-100/5">
        <PackageSearch size={26} className="text-graphite-400 dark:text-paper-300/50" />
      </div>
      <div>
        <p className="font-medium text-graphite-800 dark:text-paper-100">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-graphite-500 dark:text-paper-300/60">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

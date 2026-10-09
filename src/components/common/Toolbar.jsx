import { Search } from "lucide-react";

export default function Toolbar({ searchValue, onSearchChange, placeholder = "Search...", filters, right }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite-400 dark:text-paper-300/40"
        />
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-tag border border-graphite-800/15 bg-white py-2 pl-9 pr-3 text-sm text-graphite-900 placeholder:text-graphite-400 focus:border-signal dark:border-paper-100/15 dark:bg-graphite-900 dark:text-paper-100 dark:placeholder:text-paper-300/40"
        />
      </div>
      {filters}
      {right}
    </div>
  );
}

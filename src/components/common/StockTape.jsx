import { stockPercent, stockStatusMeta } from "../../utils/formatters";

/**
 * Signature UI motif: a hazard-tape styled bar that communicates stock level
 * at a glance. Used on stat cards, the product table, and the dashboard.
 */
export default function StockTape({ quantity = 0, reorderLevel = 1, status, showLabel = true }) {
  const qty = Number(quantity) || 0;
  const rop = Number(reorderLevel) || 1;
  const pct = stockPercent(qty, rop);

  const resolvedStatus = status || (qty <= 0 ? "out" : qty <= rop ? "low" : "in");
  const meta = stockStatusMeta[resolvedStatus] || stockStatusMeta.in;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1 flex items-center justify-between">
          <span className="manifest-label">{meta?.label || "In Stock"}</span>
          <span className="font-mono text-[11px] text-graphite-500 dark:text-paper-300/60">
            {qty} units
          </span>
        </div>
      )}
      <div className="tape-track">
        <div
          className="tape-fill"
          style={{ width: `${pct}%`, backgroundColor: meta?.hex || "#22c55e" }}
        />
      </div>
    </div>
  );
}

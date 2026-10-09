export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );

export const formatNumber = (value) =>
  new Intl.NumberFormat("en-US").format(value);

export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const stockStatusMeta = {
  in: { label: "In Stock", color: "stock-in", hex: "#33C481" },
  low: { label: "Low Stock", color: "stock-low", hex: "#F2A93B" },
  out: { label: "Out of Stock", color: "stock-out", hex: "#F0525B" },
};

export const stockPercent = (quantity, reorderLevel) => {
  if (quantity === 0) return 0;
  const target = reorderLevel * 3 || 1;
  return Math.min(100, Math.round((quantity / target) * 100));
};

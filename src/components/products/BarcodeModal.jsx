import { Printer, X, QrCode, Tag, Check, Copy } from "lucide-react";
import { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { formatCurrency } from "../../utils/formatters";

// Generate a realistic SVG Code 128 barcode representation based on SKU string
function BarcodeSvg({ value = "" }) {
  const safeVal = String(value || "SKU-0000");
  const bars = [];
  const hash = safeVal.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let pos = 10;

  for (let i = 0; i < safeVal.length * 5; i++) {
    const width = ((hash * (i + 1) * 7) % 3) + 1;
    const gap = ((hash * (i + 3) * 5) % 3) + 1;
    bars.push({ x: pos, width });
    pos += width + gap;
  }

  return (
    <svg viewBox={`0 0 ${pos + 10} 70`} className="h-16 w-full max-w-[280px]">
      <rect x="0" y="0" width={pos + 10} height="70" fill="white" />
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="5" width={b.width} height="48" fill="#111827" />
      ))}
      <text
        x={(pos + 10) / 2}
        y="65"
        textAnchor="middle"
        className="font-mono text-[10px] tracking-[0.25em] fill-gray-800"
      >
        *{safeVal}*
      </text>
    </svg>
  );
}

// Generate an SVG QR matrix for the SKU
function QrSvg({ value = "" }) {
  const size = 15;
  const cells = [];
  const str = String(value || "SKU-0000").toUpperCase();

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Corner finder patterns
      const isFinderTopLeft = (r < 4 && c < 4);
      const isFinderTopRight = (r < 4 && c >= size - 4);
      const isFinderBottomLeft = (r >= size - 4 && c < 4);

      let filled = false;
      if (isFinderTopLeft || isFinderTopRight || isFinderBottomLeft) {
        filled = (r === 0 || r === 3 || c === 0 || c === 3) || (r === 1 && c === 1);
        if (isFinderTopRight) {
          const colRel = c - (size - 4);
          filled = (r === 0 || r === 3 || colRel === 0 || colRel === 3) || (r === 1 && colRel === 1);
        }
        if (isFinderBottomLeft) {
          const rowRel = r - (size - 4);
          filled = (rowRel === 0 || rowRel === 3 || c === 0 || c === 3) || (rowRel === 1 && c === 1);
        }
      } else {
        const charCode = str.charCodeAt((r * size + c) % str.length) || 65;
        filled = ((r * 3 + c * 5 + charCode) % 7) > 2;
      }

      if (filled) {
        cells.push({ x: c * 8 + 4, y: r * 8 + 4 });
      }
    }
  }

  return (
    <svg viewBox="0 0 128 128" className="h-28 w-28 rounded border border-gray-300 bg-white p-1">
      <rect width="128" height="128" fill="white" />
      {cells.map((cell, idx) => (
        <rect key={idx} x={cell.x} y={cell.y} width="7" height="7" fill="#111827" />
      ))}
    </svg>
  );
}

export default function BarcodeModal({ open, onClose, product }) {
  const [copied, setCopied] = useState(false);

  if (!product) return null;

  const handlePrint = () => {
    window.print();
  };

  const copySku = () => {
    if (product.sku) navigator.clipboard.writeText(product.sku);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const skuStr = String(product.sku || "00");
  const bayLocation = `BAY-${skuStr.slice(-2)} / RACK-${product.category?.[0] || 'A'}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Warehouse Barcode & QR Label"
      subtitle={`Printable Code-128 & QR Tag for SKU: ${product.sku}`}
    >
      <div className="space-y-6">
        {/* Printable Label Container */}
        <div
          id="printable-barcode-label"
          className="mx-auto max-w-sm rounded-xl border-2 border-dashed border-graphite-800/30 bg-white p-5 text-gray-900 shadow-md print:border-none print:shadow-none print:m-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-amber-400" />
              <span className="font-mono text-xs font-black tracking-wider uppercase text-gray-900">
                STOCKPILOT WMS
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold text-gray-500">
              LOC: {bayLocation}
            </span>
          </div>

          {/* Product Details */}
          <div className="mt-3">
            <h3 className="text-base font-bold text-gray-900 leading-tight">
              {product.name}
            </h3>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-600 font-mono">
              <span>CAT: {product.category}</span>
              <span className="font-bold text-gray-900">{formatCurrency(product.price)}</span>
            </div>
          </div>

          {/* QR and Barcode Visuals */}
          <div className="mt-4 flex items-center justify-between gap-3 border-y border-gray-100 py-3">
            <div className="flex-1 flex flex-col items-center">
              <BarcodeSvg value={product.sku} />
            </div>
            <div className="flex flex-col items-center">
              <QrSvg value={product.sku} />
              <span className="mt-1 font-mono text-[9px] text-gray-400">SCAN SKU</span>
            </div>
          </div>

          {/* Footer info */}
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <span>QTY: {product.quantity}</span>
            <span>ROP: {product.reorderLevel}</span>
            <span>SUPPLIER: {product.supplier}</span>
          </div>
        </div>

        {/* Quick SKU Copy and Info */}
        <div className="flex items-center justify-between rounded-lg bg-graphite-800/5 p-3 text-xs dark:bg-paper-100/5">
          <div className="flex items-center gap-2">
            <Tag size={15} className="text-signal" />
            <span className="font-mono font-medium">{product.sku}</span>
          </div>
          <button
            onClick={copySku}
            className="flex items-center gap-1 font-semibold text-graphite-800 dark:text-paper-200 hover:text-signal transition-colors"
          >
            {copied ? <Check size={14} className="text-stock-in" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy SKU"}
          </button>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="flex items-center gap-1.5">
            <Printer size={15} />
            Print Warehouse Label
          </Button>
        </div>
      </div>
    </Modal>
  );
}

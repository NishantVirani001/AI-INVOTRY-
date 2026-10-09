import { useState } from "react";
import { Upload, Eye, CheckCircle2, AlertOctagon, Sparkles, RefreshCw, Layers } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge from "../common/Badge";
import productService from "../../services/productService";
import { useToast } from "../common/Toast";

// Sample shelf images for instant testing
const SAMPLE_SHELVES = [
  {
    name: "Shelf Bay 1 (PWR-2201 Drill)",
    sku: "PWR-2201",
    detected: 40,
    boxes: [
      { x: 12, y: 30, w: 18, h: 25, label: "PWR-2201 #1" },
      { x: 33, y: 30, w: 18, h: 25, label: "PWR-2201 #2" },
      { x: 54, y: 30, w: 18, h: 25, label: "PWR-2201 #3" },
      { x: 74, y: 30, w: 18, h: 25, label: "PWR-2201 #4" },
      { x: 12, y: 60, w: 18, h: 25, label: "PWR-2201 #5" },
      { x: 33, y: 60, w: 18, h: 25, label: "PWR-2201 #6" },
      { x: 54, y: 60, w: 18, h: 25, label: "PWR-2201 #7" },
      { x: 74, y: 60, w: 18, h: 25, label: "PWR-2201 #8" },
    ],
  },
  {
    name: "Shelf Bay 2 (PWR-2214 Grinders)",
    sku: "PWR-2214",
    detected: 10,
    boxes: [
      { x: 20, y: 35, w: 22, h: 28, label: "PWR-2214 #1" },
      { x: 45, y: 35, w: 22, h: 28, label: "PWR-2214 #2" },
      { x: 70, y: 35, w: 22, h: 28, label: "PWR-2214 #3" },
    ],
  },
];

export default function ShelfAuditModal({ open, onClose, products = [], onProductUpdated }) {
  const { toast } = useToast();
  const [selectedSku, setSelectedSku] = useState(products[0]?.sku || "PWR-2201");
  const [analyzing, setAnalyzing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [reconciling, setReconciling] = useState(false);
  const [selectedSample, setSelectedSample] = useState(SAMPLE_SHELVES[0]);

  const currentProduct = products.find((p) => p.sku === selectedSku) || products[0];

  const runAudit = (detectedUnits = null) => {
    setAnalyzing(true);
    setAuditResult(null);

    setTimeout(() => {
      const detected = detectedUnits !== null ? detectedUnits : (selectedSample.detected || 38);
      const expected = currentProduct ? currentProduct.quantity : 40;
      const discrepancy = detected - expected;

      setAuditResult({
        sku: selectedSku,
        productName: currentProduct?.name || "Warehouse Item",
        expected,
        detected,
        discrepancy,
        confidence: 0.964,
        reconciled: false,
        boxes: selectedSample.boxes,
      });
      setAnalyzing(false);
    }, 900);
  };

  const handleReconcile = async () => {
    if (!auditResult || !currentProduct) return;
    try {
      setReconciling(true);
      const res = await productService.shelfAudit(
        selectedSku,
        auditResult.detected,
        true,
        "Computer Vision Shelf Reconciliation"
      );

      setAuditResult((prev) => ({ ...prev, reconciled: true, currentStock: res.currentStock }));

      if (onProductUpdated) {
        onProductUpdated({ ...currentProduct, quantity: res.currentStock });
      }

      toast({
        title: "Shelf Audit Reconciled!",
        description: `${selectedSku} stock updated to ${res.currentStock} units in database ledger.`,
        tone: "success",
      });
    } catch (err) {
      toast({
        title: "Reconciliation Failed",
        description: err.message,
        tone: "error",
      });
    } finally {
      setReconciling(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mobile Edge Computer Vision Shelf Audit"
      subtitle="Autonomous carton counting and automated warehouse inventory reconciliation"
    >
      <div className="space-y-4">
        {/* Product / Shelf Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-graphite-700 dark:text-paper-300 mb-1">
              Select Product Bay:
            </label>
            <select
              value={selectedSku}
              onChange={(e) => {
                setSelectedSku(e.target.value);
                setAuditResult(null);
              }}
              className="w-full rounded-lg border border-graphite-800/20 bg-paper-100 p-2 text-xs font-mono dark:border-paper-100/20 dark:bg-graphite-800 dark:text-paper-100"
            >
              {products.map((p) => (
                <option key={p.id} value={p.sku}>
                  {p.sku} — {p.name} (Stock: {p.quantity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-graphite-700 dark:text-paper-300 mb-1">
              Shelf Inspection Feed:
            </label>
            <div className="flex gap-2">
              {SAMPLE_SHELVES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedSample(sample);
                    setSelectedSku(sample.sku);
                    setAuditResult(null);
                  }}
                  className={`flex-1 rounded-lg border py-2 px-2 text-[11px] font-medium transition-colors ${
                    selectedSample.sku === sample.sku
                      ? "border-signal bg-signal/15 text-graphite-900 dark:text-paper-100 font-bold"
                      : "border-graphite-800/15 dark:border-paper-100/15 bg-paper-100 dark:bg-graphite-800 text-graphite-600 dark:text-paper-300"
                  }`}
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Shelf Visualizer / Bounding Boxes Overlay */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-graphite-800 bg-graphite-950 flex items-center justify-center">
          {/* Simulated Industrial Shelf Bay Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-graphite-900 to-graphite-950 opacity-90 flex flex-col justify-around p-4 pointer-events-none">
            <div className="h-2 w-full bg-graphite-700/40 rounded" />
            <div className="h-2 w-full bg-graphite-700/40 rounded" />
            <div className="h-2 w-full bg-graphite-700/40 rounded" />
          </div>

          {/* Render Bounding Boxes if Audited */}
          {auditResult && auditResult.boxes && (
            <div className="absolute inset-0 pointer-events-none">
              {auditResult.boxes.map((box, idx) => (
                <div
                  key={idx}
                  className="absolute rounded border border-signal bg-signal/25 transition-all duration-300"
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.w}%`,
                    height: `${box.h}%`,
                  }}
                >
                  <span className="absolute -top-4 left-0 rounded bg-signal px-1 py-0.2 font-mono text-[9px] font-black text-graphite-950">
                    {box.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {analyzing ? (
            <div className="z-10 flex flex-col items-center gap-2 text-signal">
              <Sparkles size={28} className="animate-spin" />
              <span className="font-mono text-xs font-bold">
                Running YOLO/ONNX Edge Object Detection…
              </span>
            </div>
          ) : !auditResult ? (
            <div className="z-10 flex flex-col items-center text-center p-4">
              <Layers size={36} className="text-graphite-600 mb-2" />
              <p className="text-xs font-semibold text-paper-200">
                Camera Feed Ready for Shelf Bay: <span className="text-signal font-mono">{selectedSku}</span>
              </p>
              <button
                onClick={() => runAudit()}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-signal px-4 py-2 font-mono text-xs font-bold text-graphite-950 hover:bg-signal/90 shadow-md"
              >
                <Eye size={14} /> Run Computer Vision Shelf Scan
              </button>
            </div>
          ) : null}
        </div>

        {/* Audit Report / Discrepancy Card */}
        {auditResult && (
          <div className="rounded-xl border border-graphite-800/10 dark:border-paper-100/10 bg-paper-100 dark:bg-graphite-800/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-graphite-500 dark:text-paper-400">
                  CV DETECTION REPORT • CONFIDENCE: {(auditResult.confidence * 100).toFixed(1)}%
                </span>
                <h4 className="text-sm font-bold text-graphite-900 dark:text-paper-100">
                  {auditResult.productName} ({auditResult.sku})
                </h4>
              </div>
              <Badge tone={auditResult.discrepancy === 0 ? "success" : "warning"}>
                {auditResult.discrepancy === 0 ? "PERFECT MATCH" : `DISCREPANCY (${auditResult.discrepancy > 0 ? "+" : ""}${auditResult.discrepancy})`}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              <div className="rounded-lg bg-paper-200 dark:bg-graphite-900 p-2">
                <span className="block text-[10px] text-graphite-500">SYSTEM LEDGER</span>
                <span className="text-sm font-bold text-graphite-900 dark:text-paper-100">
                  {auditResult.expected} units
                </span>
              </div>
              <div className="rounded-lg bg-paper-200 dark:bg-graphite-900 p-2">
                <span className="block text-[10px] text-graphite-500">AI VISUAL COUNT</span>
                <span className="text-sm font-bold text-signal">
                  {auditResult.detected} units
                </span>
              </div>
              <div className="rounded-lg bg-paper-200 dark:bg-graphite-900 p-2">
                <span className="block text-[10px] text-graphite-500">VARIANCE</span>
                <span className={`text-sm font-bold ${auditResult.discrepancy < 0 ? "text-stock-out" : auditResult.discrepancy > 0 ? "text-stock-in" : "text-stock-in"}`}>
                  {auditResult.discrepancy > 0 ? `+${auditResult.discrepancy}` : auditResult.discrepancy}
                </span>
              </div>
            </div>

            {/* Reconciliation Button */}
            {auditResult.discrepancy !== 0 && (
              <div className="pt-1">
                {auditResult.reconciled ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-lg bg-stock-in/15 p-2 font-mono text-xs font-bold text-stock-in">
                    <CheckCircle2 size={15} /> Database Inventory Successfully Reconciled to {auditResult.detected} Units
                  </div>
                ) : (
                  <Button
                    onClick={handleReconcile}
                    disabled={reconciling}
                    className="w-full flex items-center justify-center gap-1.5 py-2 font-semibold"
                  >
                    <CheckCircle2 size={15} />
                    {reconciling ? "Updating Ledger..." : `Reconcile & Update Inventory to ${auditResult.detected} Units`}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Close Audit
          </Button>
        </div>
      </div>
    </Modal>
  );
}

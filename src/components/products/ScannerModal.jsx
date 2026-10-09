import { useState, useEffect, useRef } from "react";
import { Camera, Scan, CheckCircle2, AlertTriangle, Plus, Minus, RefreshCw, X, Package } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { formatCurrency } from "../../utils/formatters";
import productService from "../../services/productService";
import { useToast } from "../common/Toast";

export default function ScannerModal({ open, onClose, products = [], onProductUpdated }) {
  const { toast } = useToast();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustQty, setAdjustQty] = useState(1);

  // Start camera on modal open
  useEffect(() => {
    if (!open) {
      stopCamera();
      setScannedProduct(null);
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported by your browser environment.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError("Unable to access camera. Please check permissions or use simulation mode below.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleRecognizedSku = (sku) => {
    const found = products.find(
      (p) => p.sku.toLowerCase() === sku.toLowerCase() || p.id.toLowerCase() === sku.toLowerCase()
    );
    if (found) {
      setScannedProduct(found);
      toast({
        title: `SKU Recognized: ${found.sku}`,
        description: `${found.name} (Current Stock: ${found.quantity})`,
        tone: "info",
      });
    } else {
      toast({
        title: `SKU Not Found`,
        description: `Code "${sku}" is not in the active catalog.`,
        tone: "warning",
      });
    }
  };

  const handleAdjustStock = async (delta) => {
    if (!scannedProduct) return;
    try {
      setAdjusting(true);
      const updated = await productService.adjustStock(
        scannedProduct.id,
        delta,
        `Floor Barcode Scan Adjustment (${delta > 0 ? "+" : ""}${delta})`
      );

      setScannedProduct(updated);
      if (onProductUpdated) onProductUpdated(updated);

      toast({
        title: delta > 0 ? "Stock Added" : "Stock Deducted",
        description: `${scannedProduct.sku} new quantity: ${updated.quantity}`,
        tone: "success",
      });
    } catch (err) {
      toast({
        title: "Adjustment Failed",
        description: err.message || "Failed to update stock",
        tone: "error",
      });
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Warehouse Mobile Barcode & QR Scanner"
      subtitle="Point camera at product barcode/QR label or use one-click test simulation"
    >
      <div className="space-y-4">
        {/* Camera Viewport / Reticle */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-graphite-950 flex items-center justify-center border border-graphite-800">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${!cameraActive ? "hidden" : ""}`}
          />

          {!cameraActive && (
            <div className="flex flex-col items-center justify-center p-6 text-center text-paper-300">
              <Camera size={40} className="mb-2 text-graphite-600" />
              <p className="text-sm font-semibold">{cameraError || "Camera Standby"}</p>
              <p className="text-xs text-graphite-400 mt-1 max-w-xs">
                You can test scanning immediately using the catalog SKU buttons below.
              </p>
              <button
                onClick={startCamera}
                className="mt-3 flex items-center gap-1.5 rounded bg-signal px-3 py-1.5 text-xs font-bold text-graphite-950 hover:bg-signal/90"
              >
                <RefreshCw size={13} /> Retry Camera
              </button>
            </div>
          )}

          {/* Viewfinder Target Overlay */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative h-44 w-60 rounded-lg border-2 border-dashed border-signal/80 bg-signal/5">
                {/* Sweeping Laser Line Animation */}
                <div className="absolute left-0 right-0 top-0 h-0.5 bg-signal shadow-[0_0_8px_#F5C518] animate-bounce" />
                <div className="absolute -top-6 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-wider text-signal">
                  Align Barcode Inside Box
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Simulator Bar (Always allows instant testing) */}
        <div>
          <div className="text-xs font-semibold text-graphite-700 dark:text-paper-300 mb-1.5 flex items-center justify-between">
            <span>Simulate Physical Scan (Select Catalog SKU):</span>
            <span className="font-mono text-[10px] text-graphite-400">Instant Test</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-graphite-800/5 dark:bg-paper-100/5 rounded-lg border border-graphite-800/10 dark:border-paper-100/10">
            {products.slice(0, 8).map((p) => (
              <button
                key={p.id}
                onClick={() => handleRecognizedSku(p.sku)}
                className={`rounded px-2 py-1 font-mono text-[11px] font-semibold transition-all ${
                  scannedProduct?.sku === p.sku
                    ? "bg-signal text-graphite-950 shadow-sm"
                    : "bg-paper-100 dark:bg-graphite-800 text-graphite-800 dark:text-paper-200 hover:border-signal border border-transparent"
                }`}
              >
                {p.sku}
              </button>
            ))}
          </div>
        </div>

        {/* Scanned Product Card & Actions */}
        {scannedProduct ? (
          <div className="rounded-xl border border-signal/40 bg-signal/10 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal text-graphite-950 font-bold">
                  <Package size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-graphite-900 dark:text-paper-100 text-sm">
                    {scannedProduct.name}
                  </h4>
                  <div className="font-mono text-xs text-graphite-600 dark:text-paper-300">
                    SKU: {scannedProduct.sku} • {scannedProduct.category}
                  </div>
                </div>
              </div>
              <Badge tone={scannedProduct.stockStatus === "out" ? "danger" : scannedProduct.stockStatus === "low" ? "warning" : "success"}>
                {scannedProduct.stockStatus.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg bg-paper-100/80 dark:bg-graphite-900/80 p-2.5 text-center font-mono text-xs">
              <div>
                <span className="block text-[10px] text-graphite-400">ON HAND</span>
                <span className="text-sm font-bold text-graphite-900 dark:text-paper-100">
                  {scannedProduct.quantity} units
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-graphite-400">PRICE</span>
                <span className="text-sm font-bold text-graphite-900 dark:text-paper-100">
                  {formatCurrency(scannedProduct.price)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-graphite-400">REORDER PT</span>
                <span className="text-sm font-bold text-graphite-900 dark:text-paper-100">
                  {scannedProduct.reorderLevel} units
                </span>
              </div>
            </div>

            {/* Quick Adjustment Controls */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-semibold text-graphite-700 dark:text-paper-300">
                Floor Adjustment:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleAdjustStock(-1)}
                  disabled={adjusting || scannedProduct.quantity <= 0}
                  className="flex items-center gap-1 rounded bg-stock-out/20 px-2.5 py-1.5 text-xs font-bold text-stock-out hover:bg-stock-out/30 disabled:opacity-40"
                >
                  <Minus size={13} /> 1 Stock-Out
                </button>
                <button
                  onClick={() => handleAdjustStock(1)}
                  disabled={adjusting}
                  className="flex items-center gap-1 rounded bg-stock-in/20 px-2.5 py-1.5 text-xs font-bold text-stock-in hover:bg-stock-in/30 disabled:opacity-40"
                >
                  <Plus size={13} /> 1 Stock-In
                </button>
                <button
                  onClick={() => handleAdjustStock(5)}
                  disabled={adjusting}
                  className="flex items-center gap-1 rounded bg-signal/30 px-2 py-1.5 text-xs font-bold text-graphite-900 dark:text-paper-100 hover:bg-signal/40 disabled:opacity-40"
                >
                  +5 In
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-graphite-800/10 dark:border-paper-100/10 p-4 text-center text-xs text-graphite-400">
            Scan a barcode or click any SKU above to inspect inventory & perform rapid stock-in/out.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Done Scanning
          </Button>
        </div>
      </div>
    </Modal>
  );
}

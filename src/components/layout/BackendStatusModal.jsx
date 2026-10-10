import { useState, useEffect } from "react";
import { Cloud, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink, Wifi, WifiOff } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { Input } from "../common/Input";
import { getBackendUrl, setBackendUrl, testBackendConnection } from "../../services/apiClient";

export default function BackendStatusModal({ open, onClose }) {
  const [currentUrl, setCurrentUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [status, setStatus] = useState("checking"); // 'online' | 'waking' | 'offline' | 'checking'
  const [message, setMessage] = useState("");
  const [latency, setLatency] = useState(null);
  const [testing, setTesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      const active = getBackendUrl();
      setCurrentUrl(active);
      setInputUrl(active);
      checkConnection(active);
    }
  }, [open]);

  const checkConnection = async (target) => {
    setTesting(true);
    setStatus("checking");
    setMessage("Checking connection...");
    const res = await testBackendConnection(target);
    setTesting(false);
    if (res.ok) {
      setStatus("online");
      setLatency(res.latency);
      setMessage(res.message || `Connected (${res.latency}ms)`);
    } else {
      setStatus("offline");
      setLatency(null);
      setMessage(res.message || "Cannot reach backend");
    }
  };

  const handleSave = async () => {
    const cleaned = (inputUrl || "").trim().replace(/\/+$/, "");
    setBackendUrl(cleaned);
    setCurrentUrl(cleaned);
    setSavedSuccess(true);
    await checkConnection(cleaned);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleReset = async () => {
    setBackendUrl("");
    setCurrentUrl("");
    setInputUrl("");
    await checkConnection("");
  };

  return (
    <Modal open={open} onClose={onClose} title="Cloud Backend Synchronization" size="md">
      <div className="space-y-4">
        {/* Status Banner */}
        <div
          className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm ${
            status === "online"
              ? "border-stock-in/30 bg-stock-in/10 text-stock-in"
              : status === "waking"
              ? "border-stock-reorder/30 bg-stock-reorder/10 text-stock-reorder"
              : status === "checking"
              ? "border-signal/30 bg-signal/10 text-signal"
              : "border-stock-out/30 bg-stock-out/10 text-stock-out"
          }`}
        >
          {status === "online" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : status === "waking" ? (
            <RefreshCw size={18} className="mt-0.5 shrink-0 animate-spin" />
          ) : status === "checking" ? (
            <RefreshCw size={18} className="mt-0.5 shrink-0 animate-spin" />
          ) : (
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            <div className="font-semibold">
              {status === "online"
                ? "Backend Connected & Synchronized"
                : status === "waking"
                ? "Render Backend Waking Up (Cold Start)..."
                : status === "checking"
                ? "Verifying Cloud Connection..."
                : "Cloud Backend Not Connected"}
            </div>
            <div className="mt-0.5 text-xs opacity-90">{message}</div>
          </div>
          {latency && (
            <span className="shrink-0 rounded bg-black/10 px-2 py-0.5 font-mono text-xs font-semibold dark:bg-white/10">
              {latency}ms
            </span>
          )}
        </div>

        {/* Configuration Field */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-graphite-700 dark:text-paper-200">
            Render / Cloud Backend URL
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://ai-invotry-backend.onrender.com"
                className="font-mono text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkConnection(inputUrl)}
              disabled={testing}
              className="shrink-0"
            >
              {testing ? <RefreshCw size={14} className="animate-spin" /> : "Test"}
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-graphite-500 dark:text-paper-400">
            Paste your Render Web Service URL. Changes apply instantly across all pages without rebuilding Vercel.
          </p>
        </div>

        {/* Quick presets or current info */}
        <div className="rounded border border-graphite-800/10 bg-graphite-800/5 p-3 text-xs dark:border-paper-100/10 dark:bg-graphite-900/40">
          <div className="font-semibold text-graphite-800 dark:text-paper-100 mb-1">
            Active Connection:
          </div>
          <div className="font-mono text-[11px] text-graphite-600 dark:text-paper-300 break-all">
            {currentUrl ? currentUrl : "Relative Proxy (/api) — Default Localhost / Vercel Host"}
          </div>
          {currentUrl && (
            <div className="mt-2 flex items-center gap-2">
              <a
                href={`${currentUrl}/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-signal hover:underline"
              >
                Open FastAPI Docs (/docs) <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>

        {/* Vercel Tip */}
        <div className="rounded border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-800 dark:text-blue-300">
          <div className="font-semibold mb-0.5">Permanent Vercel Sync Tip</div>
          <div>
            To bake this Render URL into all future Vercel deployments: Go to <strong>Vercel Dashboard &rarr; Project Settings &rarr; Environment Variables</strong>, add <code>VITE_API_BASE</code> with your Render URL, and redeploy.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-graphite-800/10 dark:border-paper-100/10">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-graphite-500 hover:text-graphite-800 dark:text-paper-400 dark:hover:text-paper-100 underline"
          >
            Reset to Auto
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={testing}>
              {savedSuccess ? "Saved & Connected!" : "Save & Sync Now"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

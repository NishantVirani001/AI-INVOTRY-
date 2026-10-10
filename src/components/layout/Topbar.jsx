import { useState, useEffect } from "react";
import { Menu, Sun, Moon, LogOut, ChevronDown, Cloud, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import Badge from "../common/Badge";
import BackendStatusModal from "./BackendStatusModal";
import { getBackendUrl } from "../../services/apiClient";

export default function Topbar({ onOpenMobile, pageTitle }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState("unknown"); // 'online' | 'waking' | 'offline' | 'unknown'

  useEffect(() => {
    // Check initial state
    const current = getBackendUrl();
    if (current) {
      setBackendStatus("online");
    }

    const handleStatus = (e) => {
      if (e.detail?.status) {
        setBackendStatus(e.detail.status);
      }
    };

    window.addEventListener("stockpilot-backend-status", handleStatus);
    return () => {
      window.removeEventListener("stockpilot-backend-status", handleStatus);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-graphite-800/10 bg-white/90 px-4 py-3 backdrop-blur dark:border-paper-100/10 dark:bg-graphite-950/90 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="rounded p-1.5 text-graphite-600 hover:bg-graphite-800/5 dark:text-paper-200 dark:hover:bg-paper-100/10 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <h2 className="font-display text-base font-semibold text-graphite-900 dark:text-paper-100 sm:text-lg">
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Backend Cloud Status Pill */}
        <button
          onClick={() => setStatusModalOpen(true)}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${
            backendStatus === "online"
              ? "border-stock-in/30 bg-stock-in/10 text-stock-in hover:bg-stock-in/20"
              : backendStatus === "waking"
              ? "border-stock-reorder/30 bg-stock-reorder/10 text-stock-reorder hover:bg-stock-reorder/20 animate-pulse"
              : backendStatus === "offline"
              ? "border-stock-out/30 bg-stock-out/10 text-stock-out hover:bg-stock-out/20"
              : "border-graphite-800/15 bg-graphite-800/5 text-graphite-700 hover:bg-graphite-800/10 dark:border-paper-100/15 dark:bg-paper-100/5 dark:text-paper-200"
          }`}
          title="Click to check or configure Render backend cloud connection"
        >
          {backendStatus === "online" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-stock-in shrink-0" />
              <span className="hidden sm:inline">Render API</span>
              <span className="sm:hidden">API</span>
            </>
          ) : backendStatus === "waking" ? (
            <>
              <RefreshCw size={11} className="animate-spin text-stock-reorder shrink-0" />
              <span className="hidden sm:inline">Waking Render...</span>
              <span className="sm:hidden">Waking...</span>
            </>
          ) : backendStatus === "offline" ? (
            <>
              <WifiOff size={11} className="shrink-0" />
              <span className="hidden sm:inline">Connect Cloud</span>
              <span className="sm:hidden">Connect</span>
            </>
          ) : (
            <>
              <Cloud size={12} className="shrink-0" />
              <span className="hidden sm:inline">Backend Sync</span>
              <span className="sm:hidden">Sync</span>
            </>
          )}
        </button>

        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="rounded-tag p-2 text-graphite-600 hover:bg-graphite-800/5 dark:text-paper-200 dark:hover:bg-paper-100/10"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-tag px-2 py-1.5 hover:bg-graphite-800/5 dark:hover:bg-paper-100/10"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-semibold text-graphite-950"
              style={{ backgroundColor: user?.avatarColor }}
            >
              {user?.name?.charAt(0)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-graphite-900 dark:text-paper-100">
                {user?.name}
              </span>
            </span>
            <ChevronDown size={14} className="text-graphite-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="panel absolute right-0 z-20 mt-2 w-48 p-2">
                <div className="px-2 py-1.5">
                  <Badge tone="signal">{user?.role}</Badge>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setStatusModalOpen(true);
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-tag px-2 py-2 text-left text-sm text-graphite-700 hover:bg-graphite-800/5 dark:text-paper-200 dark:hover:bg-paper-100/10"
                >
                  <Cloud size={15} /> Backend Settings
                </button>
                <button
                  onClick={logout}
                  className="mt-1 flex w-full items-center gap-2 rounded-tag px-2 py-2 text-left text-sm text-stock-out hover:bg-stock-out/10"
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <BackendStatusModal open={statusModalOpen} onClose={() => setStatusModalOpen(false)} />
    </header>
  );
}


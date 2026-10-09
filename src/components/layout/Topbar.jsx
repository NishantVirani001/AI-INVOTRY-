import { useState } from "react";
import { Menu, Sun, Moon, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import Badge from "../common/Badge";

export default function Topbar({ onOpenMobile, pageTitle }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

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
    </header>
  );
}

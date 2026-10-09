import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Tags,
  Truck,
  ShoppingCart,
  PackagePlus,
  Users,
  Bell,
  BarChart3,
  Sparkles,
  Warehouse,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../context/AuthContext";
import { mockNotifications } from "../../data/mockData";

import { useState, useEffect } from "react";
import notificationService from "../../services/notificationService";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["Admin", "Manager", "Employee"] },
  { to: "/products", label: "Products", icon: Boxes, roles: ["Admin", "Manager", "Employee"] },
  { to: "/categories", label: "Categories", icon: Tags, roles: ["Admin", "Manager"] },
  { to: "/suppliers", label: "Suppliers", icon: Truck, roles: ["Admin", "Manager"] },
  { to: "/sales", label: "Sales", icon: ShoppingCart, roles: ["Admin", "Manager", "Employee"] },
  { to: "/purchases", label: "Purchases", icon: PackagePlus, roles: ["Admin", "Manager"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["Admin", "Manager", "Employee"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["Admin", "Manager", "Employee"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["Admin", "Manager"] },
  { to: "/ai-insights", label: "AI Insights", icon: Sparkles, roles: ["Admin", "Manager"] },
];

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(mockNotifications.length);

  useEffect(() => {
    notificationService.getAll()
      .then((res) => {
        if (Array.isArray(res)) setUnreadCount(res.length);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-graphite-950/60 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-graphite-800/10 bg-white transition-transform dark:border-paper-100/10 dark:bg-graphite-900 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2 border-b border-graphite-800/10 px-5 py-5 dark:border-paper-100/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-tag bg-signal text-graphite-950">
            <Warehouse size={18} />
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-none tracking-tight text-graphite-900 dark:text-paper-100">
              StockPilot
            </p>
            <p className="manifest-label leading-none">AI Inventory</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.filter((item) => item.roles.includes(user?.role)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                clsx(
                  "flex items-center justify-between gap-3 rounded-tag px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-signal/15 text-signal-dim dark:text-signal"
                    : "text-graphite-600 hover:bg-graphite-800/5 dark:text-paper-300/80 dark:hover:bg-paper-100/5"
                )
              }
            >
              <span className="flex items-center gap-3">
                <item.icon size={17} />
                {item.label}
              </span>
              {item.to === "/notifications" && unreadCount > 0 && (
                <span className="rounded-full bg-stock-out px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-graphite-800/10 px-4 py-4 dark:border-paper-100/10">
          <p className="manifest-label">Signed in as</p>
          <p className="mt-0.5 truncate text-sm font-medium text-graphite-800 dark:text-paper-100">
            {user?.name}
          </p>
        </div>
      </aside>
    </>
  );
}

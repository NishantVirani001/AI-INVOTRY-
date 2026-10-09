import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ChatAssistant from "../ai/ChatAssistant";

const TITLES = {
  "/": "Dashboard",
  "/products": "Products",
  "/categories": "Categories",
  "/suppliers": "Suppliers",
  "/sales": "Sales",
  "/purchases": "Purchases",
  "/customers": "Customers",
  "/notifications": "Notifications",
  "/reports": "Reports & Analytics",
  "/ai-insights": "AI Insights",
};

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const pageTitle = TITLES[location.pathname] || "StockPilot";

  return (
    <div className="flex min-h-screen bg-paper-100 dark:bg-graphite-950">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col lg:ml-0">
        <Topbar onOpenMobile={() => setMobileOpen(true)} pageTitle={pageTitle} />
        <main className="flex-1 px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
      <ChatAssistant />
    </div>
  );
}

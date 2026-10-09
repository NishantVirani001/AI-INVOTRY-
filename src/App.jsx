import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Suppliers from "./pages/Suppliers";
import Sales from "./pages/Sales";
import Purchases from "./pages/Purchases";
import Customers from "./pages/Customers";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import AIInsights from "./pages/AIInsights";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route
          path="/categories"
          element={
            <ProtectedRoute roles={["Admin", "Manager"]}>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute roles={["Admin", "Manager"]}>
              <Suppliers />
            </ProtectedRoute>
          }
        />
        <Route path="/sales" element={<Sales />} />
        <Route
          path="/purchases"
          element={
            <ProtectedRoute roles={["Admin", "Manager"]}>
              <Purchases />
            </ProtectedRoute>
          }
        />
        <Route path="/customers" element={<Customers />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={["Admin", "Manager"]}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-insights"
          element={
            <ProtectedRoute roles={["Admin", "Manager"]}>
              <AIInsights />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

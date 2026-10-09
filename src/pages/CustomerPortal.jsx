import { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  PackageCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Eye,
  Store,
  IndianRupee,
  Search,
  Filter,
  Package,
  Layers,
  ArrowRight,
  Activity,
  Award,
  Calendar,
  Sparkles,
  ShieldCheck,
  Truck,
  Check,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card, { CardHeader } from "../components/common/Card";
import StatCard from "../components/dashboard/StatCard";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Modal from "../components/common/Modal";
import Table, { Td, Tr } from "../components/common/Table";
import { Input, Select, Textarea } from "../components/common/Input";
import { Loader, EmptyState } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";
import { useAuth } from "../context/AuthContext";
import productService from "../services/productService";
import categoryService from "../services/categoryService";
import orderService from "../services/orderService";
import { formatCurrency, formatDate } from "../utils/formatters";

export default function CustomerPortal({ defaultTab = "catalog" }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync tab with route props
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Activity filter
  const [activityFilter, setActivityFilter] = useState("all");

  // Order modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");

  // Detail modal
  const [detailOrder, setDetailOrder] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodsRes, catsRes, ordersRes] = await Promise.allSettled([
        productService.getAll(),
        categoryService.getAll(),
        orderService.getAll(),
      ]);

      if (prodsRes.status === "fulfilled" && Array.isArray(prodsRes.value)) {
        setProducts(prodsRes.value);
      }
      if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value)) {
        setCategories(catsRes.value);
      }
      if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
        // Filter orders for this customer (match by name or email)
        const myName = (user?.name || "").trim().toLowerCase();
        const myEmail = (user?.email || "").trim().toLowerCase();
        const filtered = ordersRes.value.filter((o) => {
          const cust = (o.customer || "").trim().toLowerCase();
          return cust === myName || cust === myEmail || cust.includes(myName);
        });
        setMyOrders(filtered);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle open order modal
  const handleOpenOrder = (prod = null) => {
    const targetProd = prod || products[0] || null;
    setSelectedProduct(targetProd);
    setQuantity(1);
    setNotes("");
    setOrderError("");
    setOrderModalOpen(true);
  };

  // Submit order
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      setOrderError("Please select a product to order.");
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setOrderError("Quantity must be at least 1.");
      return;
    }
    if (selectedProduct.quantity < qty) {
      setOrderError(`Only ${selectedProduct.quantity} units currently available in warehouse stock.`);
      return;
    }

    setSubmitting(true);
    setOrderError("");
    try {
      const res = await orderService.create({
        customer: user?.name || "Customer",
        product: selectedProduct.sku || selectedProduct.id,
        quantity: qty,
        status: "Pending", // Awaiting manager acceptance
      });

      toast({
        type: "success",
        title: "Order Placed Successfully!",
        message: `Order ${res.invoice} has been submitted to warehouse management. You can track live status in the Orders tab.`,
      });

      setOrderModalOpen(false);
      setActiveTab("orders");
      await loadData();
    } catch (err) {
      setOrderError(err.message || "Failed to submit order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered products for Catalog tab
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      selectedCategory === "all" ||
      p.category === selectedCategory ||
      p.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Customer statistics
  const pendingCount = myOrders.filter((o) => o.status === "Pending").length;
  const acceptedCount = myOrders.filter((o) => o.status === "Accepted").length;
  const completedCount = myOrders.filter((o) => o.status === "Completed").length;
  const totalSpent = myOrders
    .filter((o) => o.status === "Accepted" || o.status === "Completed")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // Loyalty status
  const loyaltyTier = totalSpent >= 10000 ? "Gold Tier Member" : totalSpent >= 3000 ? "Silver Member" : "Standard Customer";
  const tierTone = totalSpent >= 10000 ? "text-amber-500" : totalSpent >= 3000 ? "text-slate-300" : "text-signal";

  // Build Customer Activities
  const customerActivities = useMemo(() => {
    const list = [];

    // Order events
    myOrders.forEach((o) => {
      // 1. Order Placed event
      list.push({
        id: `act-placed-${o.id || o.invoice}`,
        type: "order",
        icon: ShoppingBag,
        title: `Order Submitted (${o.invoice})`,
        description: `Placed order for ${o.items} unit${o.items !== 1 ? "s" : ""} totaling ${formatCurrency(o.total)}`,
        status: o.status,
        timestamp: o.date ? formatDate(o.date) : "Recently",
        badge: "Order Placed",
      });

      // 2. Status event if Accepted or Completed
      if (o.status === "Accepted") {
        list.push({
          id: `act-accepted-${o.id || o.invoice}`,
          type: "status",
          icon: CheckCircle2,
          title: `Order Accepted by Warehouse Manager`,
          description: `Stock allocated for invoice ${o.invoice}. Preparation underway in central warehouse.`,
          status: "Accepted",
          timestamp: o.date ? formatDate(o.date) : "Recently",
          badge: "Stock Allocated",
        });
      } else if (o.status === "Completed") {
        list.push({
          id: `act-completed-${o.id || o.invoice}`,
          type: "status",
          icon: PackageCheck,
          title: `Order Delivered & Fulfilled`,
          description: `Invoice ${o.invoice} has been delivered and completed successfully.`,
          status: "Completed",
          timestamp: o.date ? formatDate(o.date) : "Recently",
          badge: "Delivered",
        });
      } else if (o.status === "Rejected") {
        list.push({
          id: `act-rejected-${o.id || o.invoice}`,
          type: "status",
          icon: XCircle,
          title: `Order Not Accepted`,
          description: `Invoice ${o.invoice} could not be fulfilled by warehouse management.`,
          status: "Rejected",
          timestamp: o.date ? formatDate(o.date) : "Recently",
          badge: "Declined",
        });
      }
    });

    // Account setup milestone
    list.push({
      id: "act-registered",
      type: "account",
      icon: ShieldCheck,
      title: "Customer Account Activated",
      description: `Welcome aboard, ${user?.name || "Customer"}. Direct access granted to live inventory stock and purchasing.`,
      status: "Active",
      timestamp: "Account Creation",
      badge: "Verified Buyer",
    });

    return list;
  }, [myOrders, user]);

  const filteredActivities = customerActivities.filter((a) => {
    if (activityFilter === "all") return true;
    if (activityFilter === "orders") return a.type === "order" || a.type === "status";
    if (activityFilter === "account") return a.type === "account";
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Clock size={12} /> Awaiting Manager Approval
          </span>
        );
      case "Accepted":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={12} /> Approved & In Warehouse
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <PackageCheck size={12} /> Fulfilled & Delivered
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <XCircle size={12} /> Declined
          </span>
        );
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <PageHeader
        eyebrow="Customer Dashboard"
        title={`Welcome, ${user?.name?.split(" ")[0] || "Customer"}`}
        subtitle="Explore live warehouse inventory, place orders, and track your order timeline in real-time."
        action={
          <Button icon={Plus} onClick={() => handleOpenOrder()}>
            Place New Order
          </Button>
        }
      />

      {/* Customer Key Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={Store}
          label="Available Products"
          value={products.length}
          tone="neutral"
        />
        <StatCard
          icon={ShoppingBag}
          label="My Orders Placed"
          value={myOrders.length}
          tone="signal"
        />
        <StatCard
          icon={Clock}
          label="Pending Approval"
          value={pendingCount}
          tone={pendingCount > 0 ? "low" : "neutral"}
        />
        <StatCard
          icon={IndianRupee}
          label="Lifetime Spend"
          value={formatCurrency(totalSpent)}
          tone="in"
        />
      </div>

      {/* Loyalty & Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-graphite-800/10 bg-gradient-to-r from-graphite-900 via-graphite-900 to-graphite-950 p-4 text-paper-100 shadow-sm dark:border-paper-100/10">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-signal/20 p-2.5 text-signal">
            <Award size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${tierTone}`}>{loyaltyTier}</span>
              <span className="rounded-full bg-paper-100/10 px-2 py-0.5 text-[10px] font-medium text-paper-200">
                Verified Buyer Account
              </span>
            </div>
            <p className="text-xs text-paper-300/80 mt-0.5">
              Direct wholesale order pricing enabled. All submitted orders are routed directly to warehouse managers for rapid dispatch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("activity")}
            className="flex items-center gap-1.5 rounded-lg bg-paper-100/10 px-3 py-1.5 text-xs font-semibold text-paper-100 hover:bg-paper-100/20 transition-colors"
          >
            <Activity size={14} className="text-signal" />
            <span>View Activity Log</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-graphite-800/10 dark:border-paper-100/10 gap-2">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "catalog"
              ? "border-signal text-graphite-900 dark:text-paper-100"
              : "border-transparent text-graphite-500 hover:text-graphite-800 dark:text-paper-300/70 dark:hover:text-paper-100"
          }`}
        >
          <Store size={16} />
          <span>Product Catalog ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "orders"
              ? "border-signal text-graphite-900 dark:text-paper-100"
              : "border-transparent text-graphite-500 hover:text-graphite-800 dark:text-paper-300/70 dark:hover:text-paper-100"
          }`}
        >
          <PackageCheck size={16} />
          <span>My Orders ({myOrders.length})</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.2 font-mono text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "activity"
              ? "border-signal text-graphite-900 dark:text-paper-100"
              : "border-transparent text-graphite-500 hover:text-graphite-800 dark:text-paper-300/70 dark:hover:text-paper-100"
          }`}
        >
          <Activity size={16} />
          <span>Customer Activity ({customerActivities.length})</span>
        </button>
      </div>

      {/* TAB 1: PRODUCT CATALOG */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* Catalog Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl bg-graphite-800/5 p-3 dark:bg-paper-100/5">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-3 text-graphite-400" />
              <input
                type="text"
                placeholder="Search products or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-graphite-800/15 bg-white py-2 pl-9 pr-3 text-sm text-graphite-900 placeholder:text-graphite-400 focus:border-signal focus:outline-none dark:border-paper-100/15 dark:bg-graphite-900 dark:text-paper-100"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-graphite-500 flex items-center gap-1 shrink-0">
                <Filter size={13} /> Category:
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-graphite-800/15 bg-white px-3 py-1.5 text-xs text-graphite-900 dark:border-paper-100/15 dark:bg-graphite-900 dark:text-paper-100"
              >
                <option value="all">All Categories ({products.length})</option>
                {categories.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader label="Loading warehouse catalog..." />
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="No products available"
              subtitle="No warehouse products match your search criteria."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((p) => {
                const inStock = (p.quantity || 0) > 0;
                return (
                  <Card key={p.id || p.sku} className="flex flex-col justify-between hover:border-signal/40 transition-colors">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded bg-graphite-800/5 px-2 py-0.5 font-mono text-[11px] text-graphite-600 dark:bg-paper-100/5 dark:text-paper-300">
                          {p.sku}
                        </span>
                        <Badge tone={inStock ? "in" : "out"}>
                          {inStock ? `${p.quantity} in stock` : "Out of stock"}
                        </Badge>
                      </div>

                      <h4 className="mt-3 font-display text-base font-bold text-graphite-900 dark:text-paper-100">
                        {p.name}
                      </h4>
                      <p className="text-xs text-graphite-500 dark:text-paper-300/70 mt-0.5">
                        Category: {p.category || "General"}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-graphite-800/10 pt-3 dark:border-paper-100/10">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-graphite-400 tracking-wider">Unit Price</span>
                        <div className="font-mono text-lg font-bold text-graphite-900 dark:text-paper-100">
                          {formatCurrency(p.price)}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={!inStock}
                        onClick={() => handleOpenOrder(p)}
                        className="flex items-center gap-1.5"
                      >
                        <ShoppingBag size={14} />
                        {inStock ? "Order Now" : "Out of Stock"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY ORDERS & LIVE TRACKING */}
      {activeTab === "orders" && (
        <Card>
          <CardHeader
            title="My Orders"
            subtitle="Real-time order statuses and manager fulfillment approvals"
            action={
              <Button size="sm" icon={Plus} onClick={() => handleOpenOrder()}>
                New Order
              </Button>
            }
          />

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader label="Loading your orders..." />
            </div>
          ) : myOrders.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
              <div className="rounded-full bg-signal/10 p-3 text-signal-dim dark:text-signal">
                <ShoppingBag size={24} />
              </div>
              <p className="mt-3 text-sm font-semibold text-graphite-900 dark:text-paper-100">
                You haven't placed any orders yet
              </p>
              <p className="mt-1 text-xs text-graphite-500 dark:text-paper-300/70 max-w-sm">
                Browse our live product catalog and submit your first order. It will be immediately routed to warehouse managers for fulfillment.
              </p>
              <Button className="mt-4" icon={Store} onClick={() => setActiveTab("catalog")}>
                Browse Catalog & Place Order
              </Button>
            </div>
          ) : (
            <Table
              columns={[
                { key: "invoice", label: "Invoice #" },
                { key: "date", label: "Date Placed" },
                { key: "items", label: "Ordered Items" },
                { key: "total", label: "Order Total" },
                { key: "status", label: "Warehouse Status" },
                { key: "actions", label: "" },
              ]}
            >
              {myOrders.map((o) => (
                <Tr key={o.id || o.invoice}>
                  <Td className="font-mono text-xs font-bold text-signal-dim dark:text-signal">
                    {o.invoice}
                  </Td>
                  <Td className="font-mono text-xs text-graphite-500 dark:text-paper-300/70">
                    {formatDate(o.date)}
                  </Td>
                  <Td>
                    <span className="font-medium text-graphite-900 dark:text-paper-100">
                      {o.items} unit{o.items !== 1 ? "s" : ""}
                    </span>
                    {o.itemsDetail && o.itemsDetail[0] && (
                      <span className="block text-[11px] text-graphite-500 dark:text-paper-300/70 truncate max-w-xs">
                        {o.itemsDetail[0].name}
                      </span>
                    )}
                  </Td>
                  <Td className="font-mono font-bold text-graphite-900 dark:text-paper-100">
                    {formatCurrency(o.total)}
                  </Td>
                  <Td>{getStatusBadge(o.status)}</Td>
                  <Td className="text-right">
                    <button
                      onClick={() => setDetailOrder(o)}
                      className="rounded p-1 text-graphite-500 hover:bg-graphite-800/10 dark:text-paper-300 dark:hover:bg-paper-100/10"
                      title="View order details"
                    >
                      <Eye size={15} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {/* TAB 3: CUSTOMER ACTIVITY & AUDIT TIMELINE */}
      {activeTab === "activity" && (
        <Card>
          <CardHeader
            title="Customer Activity & Audit Log"
            subtitle="Full chronological history of your orders, approvals, and account milestones"
            action={
              <div className="flex items-center gap-1.5 rounded-lg bg-graphite-800/5 p-1 dark:bg-paper-100/5">
                <button
                  onClick={() => setActivityFilter("all")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    activityFilter === "all"
                      ? "bg-white text-graphite-900 shadow-sm dark:bg-graphite-800 dark:text-paper-100"
                      : "text-graphite-500 hover:text-graphite-900 dark:text-paper-300/70 dark:hover:text-paper-100"
                  }`}
                >
                  All ({customerActivities.length})
                </button>
                <button
                  onClick={() => setActivityFilter("orders")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    activityFilter === "orders"
                      ? "bg-white text-graphite-900 shadow-sm dark:bg-graphite-800 dark:text-paper-100"
                      : "text-graphite-500 hover:text-graphite-900 dark:text-paper-300/70 dark:hover:text-paper-100"
                  }`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setActivityFilter("account")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    activityFilter === "account"
                      ? "bg-white text-graphite-900 shadow-sm dark:bg-graphite-800 dark:text-paper-100"
                      : "text-graphite-500 hover:text-graphite-900 dark:text-paper-300/70 dark:hover:text-paper-100"
                  }`}
                >
                  Account
                </button>
              </div>
            }
          />

          <div className="relative border-l-2 border-graphite-800/10 pl-6 ml-4 space-y-6 my-4 dark:border-paper-100/10">
            {filteredActivities.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div className="absolute -left-[35px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-signal/20 text-signal dark:border-graphite-900 shadow-sm">
                    <Icon size={14} />
                  </div>

                  <div className="rounded-xl border border-graphite-800/10 bg-graphite-800/5 p-4 transition-all hover:border-signal/30 dark:border-paper-100/10 dark:bg-paper-100/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-graphite-900 dark:text-paper-100">
                          {act.title}
                        </span>
                        <span className="rounded bg-graphite-800/10 px-2 py-0.5 text-[10px] font-semibold text-graphite-700 dark:bg-paper-100/10 dark:text-paper-200">
                          {act.badge}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-graphite-400">
                        {act.timestamp}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-graphite-600 dark:text-paper-300/80">
                      {act.description}
                    </p>

                    {act.status && act.type === "order" && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[11px] text-graphite-500">Live Status:</span>
                        {getStatusBadge(act.status)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* PLACE NEW ORDER MODAL */}
      <Modal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title="Place Customer Order"
        subtitle="Submit order directly to warehouse management for acceptance and inventory allocation."
      >
        <form onSubmit={handleSubmitOrder} className="space-y-4">
          {orderError && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-600 dark:text-rose-400">
              {orderError}
            </div>
          )}

          {/* Select Product */}
          <div>
            <label className="manifest-label mb-1.5 block">Select Product</label>
            <select
              value={selectedProduct?.sku || ""}
              onChange={(e) => {
                const found = products.find((p) => p.sku === e.target.value);
                setSelectedProduct(found);
              }}
              className="w-full rounded-lg border border-graphite-800/15 bg-transparent p-2.5 text-xs text-graphite-900 dark:border-paper-100/15 dark:text-paper-100"
              required
            >
              {products.map((p) => (
                <option key={p.id || p.sku} value={p.sku} className="dark:bg-graphite-900">
                  {p.name} ({p.sku}) — {p.quantity} in stock — {formatCurrency(p.price)}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="rounded-lg bg-graphite-800/5 p-3 text-xs dark:bg-paper-100/5 space-y-1">
              <div className="flex justify-between">
                <span className="text-graphite-500 dark:text-paper-300/70">Warehouse Stock Available:</span>
                <span className="font-mono font-bold text-graphite-900 dark:text-paper-100">
                  {selectedProduct.quantity} units
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-graphite-500 dark:text-paper-300/70">Unit Price:</span>
                <span className="font-mono font-bold text-graphite-900 dark:text-paper-100">
                  {formatCurrency(selectedProduct.price)}
                </span>
              </div>
            </div>
          )}

          {/* Quantity */}
          <Input
            label="Quantity to Order"
            type="number"
            min="1"
            max={selectedProduct ? selectedProduct.quantity : undefined}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          {/* Pricing Preview */}
          {selectedProduct && (
            <div className="flex justify-between items-center rounded-lg border border-signal/30 bg-signal/10 p-3 font-mono">
              <span className="text-xs font-semibold text-graphite-700 dark:text-paper-300">Total Order Value:</span>
              <span className="text-base font-bold text-graphite-900 dark:text-paper-100">
                {formatCurrency(selectedProduct.price * Number(quantity || 0))}
              </span>
            </div>
          )}

          <Textarea
            label="Delivery Instructions / Order Notes (Optional)"
            placeholder="e.g. Priority shipping, please contact on arrival..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="mt-6 flex justify-end gap-2 border-t border-graphite-800/10 pt-4 dark:border-paper-100/10">
            <Button variant="outline" type="button" onClick={() => setOrderModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting Order..." : "Confirm & Place Order"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL WITH VISUAL MULTI-STEP TIMELINE TRACKER */}
      {detailOrder && (
        <Modal
          open={!!detailOrder}
          onClose={() => setDetailOrder(null)}
          title={`Order Tracking: ${detailOrder.invoice}`}
          subtitle={`Placed on ${formatDate(detailOrder.date)}`}
        >
          <div className="space-y-6">
            {/* Visual 3-Step Order Progress Tracker */}
            <div className="rounded-xl border border-graphite-800/10 bg-graphite-800/5 p-4 dark:border-paper-100/10 dark:bg-paper-100/5">
              <p className="manifest-label mb-3 text-xs">Fulfillment Timeline</p>
              <div className="flex items-center justify-between relative">
                {/* Connecting Line */}
                <div className="absolute left-6 right-6 top-3 h-0.5 bg-graphite-800/20 dark:bg-paper-100/20 -z-0" />

                {/* Step 1: Placed */}
                <div className="flex flex-col items-center z-10 text-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs shadow">
                    <Check size={14} />
                  </div>
                  <span className="text-[11px] font-bold mt-1 text-graphite-900 dark:text-paper-100">1. Placed</span>
                  <span className="text-[9px] text-graphite-500">Order Sent</span>
                </div>

                {/* Step 2: Manager Review / Approval */}
                <div className="flex flex-col items-center z-10 text-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs shadow ${
                      detailOrder.status === "Accepted" || detailOrder.status === "Completed"
                        ? "bg-emerald-500 text-white"
                        : detailOrder.status === "Rejected"
                        ? "bg-rose-500 text-white"
                        : "bg-amber-500 text-white animate-pulse"
                    }`}
                  >
                    {detailOrder.status === "Accepted" || detailOrder.status === "Completed" ? (
                      <Check size={14} />
                    ) : detailOrder.status === "Rejected" ? (
                      <XCircle size={14} />
                    ) : (
                      <Clock size={14} />
                    )}
                  </div>
                  <span className="text-[11px] font-bold mt-1 text-graphite-900 dark:text-paper-100">
                    2. Approval
                  </span>
                  <span className="text-[9px] text-graphite-500">
                    {detailOrder.status === "Accepted" || detailOrder.status === "Completed"
                      ? "Approved"
                      : detailOrder.status === "Rejected"
                      ? "Declined"
                      : "Manager Reviewing"}
                  </span>
                </div>

                {/* Step 3: Fulfilled / Delivered */}
                <div className="flex flex-col items-center z-10 text-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs shadow ${
                      detailOrder.status === "Completed"
                        ? "bg-blue-500 text-white"
                        : "bg-graphite-300 dark:bg-graphite-700 text-graphite-600 dark:text-paper-300"
                    }`}
                  >
                    {detailOrder.status === "Completed" ? <Check size={14} /> : <Truck size={14} />}
                  </div>
                  <span className="text-[11px] font-bold mt-1 text-graphite-900 dark:text-paper-100">
                    3. Delivery
                  </span>
                  <span className="text-[9px] text-graphite-500">
                    {detailOrder.status === "Completed" ? "Delivered" : "In Queue"}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Status & Total */}
            <div className="flex items-center justify-between rounded-lg bg-graphite-800/5 p-3 dark:bg-paper-100/5">
              <div>
                <span className="manifest-label text-[10px]">Status</span>
                <div className="mt-1">{getStatusBadge(detailOrder.status)}</div>
              </div>
              <div className="text-right">
                <span className="manifest-label text-[10px]">Total Amount</span>
                <div className="font-mono text-base font-bold text-graphite-900 dark:text-paper-100">
                  {formatCurrency(detailOrder.total)}
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div>
              <p className="manifest-label mb-2 text-xs">Ordered Products</p>
              <div className="divide-y divide-graphite-800/10 rounded-lg border border-graphite-800/10 dark:divide-paper-100/10 dark:border-paper-100/10">
                {(detailOrder.itemsDetail || [{ name: "Catalog Product", quantity: detailOrder.items, price: detailOrder.total / detailOrder.items }]).map(
                  (item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <p className="font-semibold text-graphite-900 dark:text-paper-100">{item.name}</p>
                        <p className="font-mono text-[11px] text-graphite-500 dark:text-paper-300/70">
                          {item.quantity} units @ {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div className="font-mono font-bold text-graphite-900 dark:text-paper-100">
                        {formatCurrency(item.quantity * item.price)}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setDetailOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

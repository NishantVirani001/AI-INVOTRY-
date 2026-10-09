import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  Eye,
  AlertTriangle,
  PackageCheck,
  ShoppingCart,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Toolbar from "../components/common/Toolbar";
import Table, { Td, Tr } from "../components/common/Table";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { Input, Select } from "../components/common/Input";
import { Loader, EmptyState } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";
import orderService from "../services/orderService";
import productService from "../services/productService";
import customerService from "../services/customerService";
import { mockSales, mockCustomers, mockProducts } from "../data/mockData";
import { formatCurrency, formatDate } from "../utils/formatters";

const emptyForm = {
  customer: "",
  product: "",
  quantity: 1,
  orderType: "Pending", // "Pending" = Customer order awaiting supplier acceptance; "Completed" = In-store POS sale
};

const TABS = [
  { key: "all", label: "All Orders" },
  { key: "Pending", label: "Pending Approval" },
  { key: "Accepted", label: "Accepted" },
  { key: "Completed", label: "Completed" },
  { key: "Rejected", label: "Rejected" },
];

export default function Sales() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "pending" ? "Pending" : "all";

  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState(null);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [salesRes, prodsRes, custsRes] = await Promise.allSettled([
        orderService.getAll(),
        productService.getAll(),
        customerService.getAll(),
      ]);

      const salesList =
        salesRes.status === "fulfilled" && Array.isArray(salesRes.value)
          ? salesRes.value
          : mockSales;
      const prodsList =
        prodsRes.status === "fulfilled" && Array.isArray(prodsRes.value)
          ? prodsRes.value
          : mockProducts;
      const custList =
        custsRes.status === "fulfilled" &&
        Array.isArray(custsRes.value) &&
        custsRes.value.length > 0
          ? custsRes.value
          : mockCustomers;

      setSales(salesList);
      setProducts(prodsList);
      setCustomers(custList);

      if (prodsList.length > 0 && !form.product) {
        setForm((prev) => ({
          ...prev,
          customer: custList[0]?.name || "Denver Build Co.",
          product: prodsList[0].sku,
        }));
      }
    } catch {
      setSales(mockSales);
      setProducts(mockProducts);
      setCustomers(mockCustomers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync tab with URL param if present
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "pending") {
      setActiveTab("Pending");
    }
  }, [searchParams]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: sales.length,
      Pending: sales.filter((s) => s.status === "Pending").length,
      Accepted: sales.filter((s) => s.status === "Accepted").length,
      Completed: sales.filter((s) => s.status === "Completed").length,
      Rejected: sales.filter((s) => s.status === "Rejected").length,
    };
  }, [sales]);

  const filtered = useMemo(() => {
    return sales
      .filter((s) => {
        if (activeTab === "all") return true;
        return s.status === activeTab;
      })
      .filter(
        (s) =>
          s.invoice.toLowerCase().includes(search.toLowerCase()) ||
          s.customer.toLowerCase().includes(search.toLowerCase())
      );
  }, [sales, activeTab, search]);

  // Accept incoming customer order
  const handleAcceptOrder = async (order) => {
    setProcessingOrderId(order.id);
    try {
      const res = await orderService.accept(order.id || order.invoice);

      // Update state locally
      setSales((prev) =>
        prev.map((s) =>
          s.id === order.id || s.invoice === order.invoice
            ? { ...s, status: "Accepted" }
            : s
        )
      );

      // Refresh product quantities from backend
      try {
        const updatedProds = await productService.getAll();
        if (Array.isArray(updatedProds)) setProducts(updatedProds);
      } catch {
        // Fallback: local deduction if backend unavailable
        if (order.itemsDetail) {
          setProducts((prev) =>
            prev.map((p) => {
              const matchedItem = order.itemsDetail.find(
                (item) => item.sku === p.sku || item.productId === p.id
              );
              return matchedItem
                ? { ...p, quantity: Math.max(0, p.quantity - matchedItem.quantity) }
                : p;
            })
          );
        }
      }

      if (detailOrder && (detailOrder.id === order.id || detailOrder.invoice === order.invoice)) {
        setDetailOrder((prev) => ({ ...prev, status: "Accepted" }));
      }

      toast({
        type: "success",
        message: `Order ${order.invoice} accepted! Warehouse stock allocated & audit ledger updated.`,
      });
    } catch (err) {
      toast({
        type: "error",
        message: err.message || `Failed to accept order ${order.invoice}. Check stock availability.`,
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Reject customer order
  const handleRejectOrder = async (order) => {
    if (!window.confirm(`Are you sure you want to reject order ${order.invoice}?`)) {
      return;
    }
    setProcessingOrderId(order.id);
    try {
      await orderService.reject(order.id || order.invoice, "Rejected by supplier");
      setSales((prev) =>
        prev.map((s) =>
          s.id === order.id || s.invoice === order.invoice
            ? { ...s, status: "Rejected" }
            : s
        )
      );
      if (detailOrder && (detailOrder.id === order.id || detailOrder.invoice === order.invoice)) {
        setDetailOrder((prev) => ({ ...prev, status: "Rejected" }));
      }
      toast({
        type: "neutral",
        message: `Order ${order.invoice} has been rejected.`,
      });
    } catch (err) {
      toast({
        type: "error",
        message: err.message || `Failed to reject order ${order.invoice}.`,
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Mark order completed / fulfilled
  const handleCompleteOrder = async (order) => {
    setProcessingOrderId(order.id);
    try {
      await orderService.complete(order.id || order.invoice);
      setSales((prev) =>
        prev.map((s) =>
          s.id === order.id || s.invoice === order.invoice
            ? { ...s, status: "Completed" }
            : s
        )
      );
      if (detailOrder && (detailOrder.id === order.id || detailOrder.invoice === order.invoice)) {
        setDetailOrder((prev) => ({ ...prev, status: "Completed" }));
      }
      toast({
        type: "success",
        message: `Order ${order.invoice} marked as Fulfilled / Completed!`,
      });
    } catch (err) {
      toast({
        type: "error",
        message: err.message || `Failed to complete order ${order.invoice}.`,
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Submit new customer order / record sale
  const save = async (e) => {
    e.preventDefault();
    const qty = Number(form.quantity);

    if (!qty || qty <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }

    const selectedProd = products.find(
      (p) => p.sku === form.product || p.id === form.product
    );

    // If immediate completion, verify stock
    if (form.orderType === "Completed" && selectedProd && qty > selectedProd.quantity) {
      setError(`Only ${selectedProd.quantity} units of ${selectedProd.name} available in stock.`);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const newOrder = await orderService.create({
        customer: form.customer || customers[0]?.name || "Direct Customer",
        product: form.product,
        quantity: qty,
        status: form.orderType || "Pending",
      });

      setSales((prev) => [newOrder, ...prev]);

      // If created as Completed, deduct local stock
      if (newOrder.status === "Completed") {
        setProducts((prev) =>
          prev.map((p) =>
            p.sku === form.product || p.id === form.product
              ? { ...p, quantity: Math.max(0, p.quantity - qty) }
              : p
          )
        );
      }

      if (newOrder.status === "Pending") {
        toast({
          type: "success",
          message: `Incoming Customer Order ${newOrder.invoice} received! Awaiting your acceptance below.`,
        });
        setActiveTab("Pending");
      } else {
        toast({
          type: "success",
          message: `Sale ${newOrder.invoice} recorded and stock deducted.`,
        });
      }

      setModalOpen(false);
      setForm({
        ...emptyForm,
        customer: customers[0]?.name || "",
        product: products[0]?.sku || "",
      });
    } catch (err) {
      setError(err.message || "Failed to create customer order.");
      toast({ type: "error", message: err.message || "Failed to create order." });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <Clock size={12} /> Awaiting Acceptance
          </span>
        );
      case "Accepted":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={12} /> Accepted (Stock Allocated)
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            <PackageCheck size={12} /> Completed / Delivered
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Transactions & Fulfillment"
        title="Sales & Customer Orders"
        subtitle="Receive customer orders, review warehouse stock, and accept orders to allocate inventory"
        action={
          <Button icon={Plus} onClick={() => setModalOpen(true)}>
            Receive Customer Order
          </Button>
        }
      />

      {/* Prominent Supplier Alert Banner when orders are pending */}
      {counts.Pending > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400 shrink-0">
              <ShoppingCart size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-graphite-900 dark:text-paper-100 flex items-center gap-2">
                <span>{counts.Pending} Customer Order{counts.Pending > 1 ? "s" : ""} Awaiting Your Acceptance</span>
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase">Supplier Action Required</span>
              </p>
              <p className="text-xs text-graphite-600 dark:text-paper-300 mt-0.5">
                Click <strong>"Accept Order"</strong> on any pending order to verify stock availability, deduct units from warehouse catalog, and write to the audit ledger.
              </p>
            </div>
          </div>
          {activeTab !== "Pending" && (
            <button
              onClick={() => setActiveTab("Pending")}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-700 transition-colors shrink-0"
            >
              Filter Pending Orders ({counts.Pending}) <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = counts[t.key] ?? 0;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 rounded-tag px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-graphite-900 text-paper-100 dark:bg-signal dark:text-graphite-950 font-semibold"
                  : "bg-graphite-800/5 text-graphite-600 dark:bg-paper-100/5 dark:text-paper-300 hover:bg-graphite-800/10"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-semibold ${
                  t.key === "Pending" && count > 0
                    ? "bg-amber-500 text-white"
                    : isActive
                    ? "bg-paper-100 text-graphite-900 dark:bg-graphite-950 dark:text-paper-100"
                    : "bg-graphite-800/15 dark:bg-paper-100/15"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <Toolbar
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Search by invoice number or customer name..."
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader label="Loading customer orders..." />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={`No ${activeTab === "all" ? "" : activeTab.toLowerCase()} orders found`}
            subtitle="Try a different search term or receive a new customer order."
          />
        ) : (
          <Table
            columns={[
              { key: "invoice", label: "Invoice" },
              { key: "customer", label: "Customer" },
              { key: "items", label: "Ordered Items" },
              { key: "total", label: "Total Amount" },
              { key: "status", label: "Fulfillment Status" },
              { key: "date", label: "Date Received" },
              { key: "actions", label: "Supplier Actions" },
            ]}
          >
            {filtered.map((s) => {
              const isProcessing = processingOrderId === s.id;
              const isPending = s.status === "Pending";
              const isAccepted = s.status === "Accepted";

              return (
                <Tr key={s.id || s.invoice} className={isPending ? "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]" : ""}>
                  <Td>
                    <button
                      onClick={() => setDetailOrder(s)}
                      className="font-mono text-xs font-bold text-signal-dim dark:text-signal hover:underline flex items-center gap-1"
                      title="Click to view full order details"
                    >
                      {s.invoice}
                      <Eye size={12} className="opacity-60" />
                    </button>
                  </Td>

                  <Td className="font-semibold text-graphite-900 dark:text-paper-100">
                    {s.customer}
                  </Td>

                  <Td>
                    <span className="font-medium text-graphite-800 dark:text-paper-200">
                      {s.items} unit{s.items !== 1 ? "s" : ""}
                    </span>
                    {s.itemsDetail && s.itemsDetail[0] && (
                      <span className="block text-[11px] text-graphite-500 dark:text-paper-300/70 truncate max-w-xs">
                        {s.itemsDetail[0].name}
                      </span>
                    )}
                  </Td>

                  <Td className="font-mono font-semibold text-graphite-900 dark:text-paper-100">
                    {formatCurrency(s.total)}
                  </Td>

                  <Td>{getStatusBadge(s.status)}</Td>

                  <Td className="text-graphite-500 dark:text-paper-300/60 font-mono text-xs">
                    {formatDate(s.date)}
                  </Td>

                  <Td>
                    <div className="flex items-center gap-1.5">
                      {isPending && (
                        <>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleAcceptOrder(s)}
                            title="Accept incoming customer order & deduct stock"
                            className="flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle2 size={13} />
                            {isProcessing ? "Accepting..." : "Accept"}
                          </button>

                          <button
                            disabled={isProcessing}
                            onClick={() => handleRejectOrder(s)}
                            title="Reject customer order"
                            className="flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
                          >
                            <XCircle size={13} />
                            Reject
                          </button>
                        </>
                      )}

                      {isAccepted && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleCompleteOrder(s)}
                          title="Mark order as fulfilled / delivered"
                          className="flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
                        >
                          <PackageCheck size={13} />
                          {isProcessing ? "Processing..." : "Complete"}
                        </button>
                      )}

                      <button
                        onClick={() => setDetailOrder(s)}
                        title="View order details"
                        className="rounded p-1 text-graphite-500 hover:bg-graphite-800/10 dark:text-paper-300 dark:hover:bg-paper-100/10"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </Card>

      {/* Modal: Receive Customer Order / Record Sale */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError("");
        }}
        title="Receive Customer Order"
        subtitle="When an order is submitted as Pending, you as the supplier can review and accept it."
      >
        <form onSubmit={save} className="space-y-4">
          <div className="rounded-lg border border-signal/25 bg-signal/10 p-3 text-xs text-graphite-800 dark:text-paper-100">
            <span className="font-semibold block mb-0.5">Workflow Explanation:</span>
            Choose <strong>"Incoming Customer Order (Pending Acceptance)"</strong> to test the supplier reception and acceptance flow. Or choose <strong>"Instant POS Sale"</strong> for walk-in immediate stock deduction.
          </div>

          <div className="space-y-1">
            <label className="manifest-label text-xs">Order Type / Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, orderType: "Pending" })}
                className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${
                  form.orderType === "Pending"
                    ? "border-amber-500 bg-amber-500/15 font-semibold text-amber-700 dark:text-amber-400"
                    : "border-graphite-800/15 text-graphite-600 hover:bg-graphite-800/5 dark:border-paper-100/15 dark:text-paper-300"
                }`}
              >
                <div className="flex items-center gap-1 font-bold">
                  <Clock size={13} /> Incoming Customer Order
                </div>
                <div className="mt-0.5 text-[10px] opacity-80">
                  Status: Pending. Supplier receives and accepts.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, orderType: "Completed" })}
                className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${
                  form.orderType === "Completed"
                    ? "border-signal bg-signal/15 font-semibold text-signal-dim dark:text-signal"
                    : "border-graphite-800/15 text-graphite-600 hover:bg-graphite-800/5 dark:border-paper-100/15 dark:text-paper-300"
                }`}
              >
                <div className="flex items-center gap-1 font-bold">
                  <CheckCircle2 size={13} /> Direct POS Sale
                </div>
                <div className="mt-0.5 text-[10px] opacity-80">
                  Status: Completed. Deducts inventory immediately.
                </div>
              </button>
            </div>
          </div>

          <Select
            label="Customer"
            options={customers.map((c) => ({ value: c.name, label: c.name }))}
            value={form.customer}
            onChange={(e) => setForm({ ...form, customer: e.target.value })}
          />

          <Select
            label="Product"
            options={products.map((p) => ({
              value: p.sku,
              label: `${p.name} (${p.sku}) — ${p.quantity} in stock ($${p.price.toFixed(2)})`,
            }))}
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
          />

          <Input
            label="Quantity Requested"
            type="number"
            min="1"
            required
            value={form.quantity}
            error={error}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />

          {/* Pricing summary preview */}
          {(() => {
            const p = products.find((prod) => prod.sku === form.product);
            const total = p ? (p.price * Number(form.quantity || 1)).toFixed(2) : "0.00";
            return (
              <div className="flex justify-between items-center rounded bg-graphite-800/5 p-2 text-xs font-mono dark:bg-paper-100/5">
                <span className="text-graphite-600 dark:text-paper-300">Estimated Total:</span>
                <span className="font-bold text-graphite-900 dark:text-paper-100 text-sm">${total}</span>
              </div>
            );
          })()}

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setModalOpen(false);
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Submitting..."
                : form.orderType === "Pending"
                ? "Submit Customer Order"
                : "Record Sale"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Order Details & Direct Acceptance Action */}
      {detailOrder && (
        <Modal
          open={Boolean(detailOrder)}
          onClose={() => setDetailOrder(null)}
          title={`Order Details: ${detailOrder.invoice}`}
          subtitle={`Placed by ${detailOrder.customer} on ${formatDate(detailOrder.date)}`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-graphite-800/5 p-3 dark:bg-paper-100/5">
              <div>
                <span className="manifest-label text-[10px]">Current Status</span>
                <div className="mt-1">{getStatusBadge(detailOrder.status)}</div>
              </div>
              <div className="text-right">
                <span className="manifest-label text-[10px]">Total Order Value</span>
                <div className="font-mono text-base font-bold text-graphite-900 dark:text-paper-100">
                  {formatCurrency(detailOrder.total)}
                </div>
              </div>
            </div>

            {/* Items Breakdown */}
            <div>
              <p className="manifest-label mb-2 text-xs">Products in Order</p>
              <div className="divide-y divide-graphite-800/10 rounded-lg border border-graphite-800/10 dark:divide-paper-100/10 dark:border-paper-100/10">
                {(detailOrder.itemsDetail || [{ name: "Catalog Product", quantity: detailOrder.items, price: detailOrder.total / detailOrder.items }]).map(
                  (item, idx) => {
                    const matched = products.find(
                      (p) => p.sku === item.sku || p.id === item.productId
                    );
                    const stock = matched ? matched.quantity : "N/A";
                    const isSufficient = matched ? matched.quantity >= item.quantity : true;

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 text-xs">
                        <div>
                          <p className="font-semibold text-graphite-900 dark:text-paper-100">
                            {item.name}
                          </p>
                          <p className="font-mono text-[11px] text-graphite-500 dark:text-paper-300/70">
                            Ordered: {item.quantity} unit{item.quantity !== 1 ? "s" : ""} • Warehouse Stock: {stock}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                              isSufficient
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isSufficient ? "Stock Available" : "Stock Shortage"}
                          </span>
                          <p className="font-mono text-xs font-bold text-graphite-900 dark:text-paper-100 mt-1">
                            {formatCurrency((item.price || 0) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Actions inside Modal */}
            <div className="mt-6 flex items-center justify-between border-t border-graphite-800/10 pt-4 dark:border-paper-100/10">
              <Button variant="outline" size="sm" onClick={() => setDetailOrder(null)}>
                Close
              </Button>

              <div className="flex items-center gap-2">
                {detailOrder.status === "Pending" && (
                  <>
                    <button
                      onClick={() => handleRejectOrder(detailOrder)}
                      className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                    >
                      Reject Order
                    </button>
                    <button
                      onClick={() => handleAcceptOrder(detailOrder)}
                      className="flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                    >
                      <CheckCircle2 size={14} /> Accept & Allocate Stock
                    </button>
                  </>
                )}

                {detailOrder.status === "Accepted" && (
                  <button
                    onClick={() => handleCompleteOrder(detailOrder)}
                    className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
                  >
                    <PackageCheck size={14} /> Mark as Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

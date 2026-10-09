import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, CheckCircle } from "lucide-react";
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
import purchaseService from "../services/purchaseService";
import supplierService from "../services/supplierService";
import productService from "../services/productService";
import { mockPurchases, mockSuppliers, mockProducts } from "../data/mockData";
import { formatCurrency, formatDate } from "../utils/formatters";

const emptyForm = { supplier: "", product: "", quantity: 1 };

export default function Purchases() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [posRes, supsRes, prodsRes] = await Promise.allSettled([
        purchaseService.getAll(),
        supplierService.getAll(),
        productService.getAll(),
      ]);

      const posList = posRes.status === "fulfilled" && Array.isArray(posRes.value)
        ? posRes.value
        : mockPurchases;
      const supsList = supsRes.status === "fulfilled" && Array.isArray(supsRes.value)
        ? supsRes.value
        : mockSuppliers;
      const prodsList = prodsRes.status === "fulfilled" && Array.isArray(prodsRes.value)
        ? prodsRes.value
        : mockProducts;

      setPurchases(posList);
      setSuppliers(supsList);
      setProducts(prodsList);

      if (location.state?.newPurchaseSku) {
        setForm({
          supplier: location.state.supplier || supsList[0]?.name || "",
          product: location.state.newPurchaseSku,
          quantity: 1,
        });
        setModalOpen(true);
        navigate(location.pathname, { replace: true });
      } else if (supsList.length > 0 && prodsList.length > 0) {
        setForm((prev) => ({
          ...prev,
          supplier: supsList[0]?.name || "",
          product: prodsList[0]?.sku || "",
        }));
      }
    } catch {
      setPurchases(mockPurchases);
      setSuppliers(mockSuppliers);
      setProducts(mockProducts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(
    () =>
      purchases.filter(
        (p) =>
          p.po.toLowerCase().includes(search.toLowerCase()) ||
          p.supplier.toLowerCase().includes(search.toLowerCase())
      ),
    [purchases, search]
  );

  const save = async (e) => {
    e.preventDefault();
    const qty = Number(form.quantity);

    if (!qty || qty <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const created = await purchaseService.create({
        supplier: form.supplier || suppliers[0]?.name,
        product: form.product || products[0]?.sku,
        quantity: qty,
      });

      setPurchases((prev) => [created, ...prev]);
      toast({
        type: "success",
        message: `Purchase order ${created.po} issued to ${created.supplier}.`,
      });

      setModalOpen(false);
      setForm({ ...emptyForm, supplier: suppliers[0]?.name || "", product: products[0]?.sku || "" });
    } catch (err) {
      setError(err.message || "Failed to create purchase order.");
      toast({ type: "error", message: err.message || "Failed to create PO." });
    } finally {
      setSubmitting(false);
    }
  };

  const receivePO = async (po) => {
    try {
      await purchaseService.receive(po.id);
      setPurchases((prev) =>
        prev.map((item) => (item.id === po.id ? { ...item, status: "Received" } : item))
      );
      toast({
        type: "success",
        message: `${po.po} marked as Received — inventory stock updated!`,
      });
    } catch (err) {
      toast({ type: "error", message: err.message || "Failed to receive order." });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Transactions"
        title="Purchases"
        subtitle="Receiving a purchase automatically increases product stock and writes to the ledger"
        action={<Button icon={Plus} onClick={() => setModalOpen(true)}>New Purchase</Button>}
      />

      <Card>
        <Toolbar searchValue={search} onSearchChange={setSearch} placeholder="Search PO or supplier..." />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader label="Loading purchase orders..." />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No purchases found" subtitle="Try a different search term or issue a new PO." />
        ) : (
          <Table
            columns={[
              { key: "po", label: "PO Number" },
              { key: "supplier", label: "Supplier" },
              { key: "items", label: "Items" },
              { key: "total", label: "Total" },
              { key: "status", label: "Status" },
              { key: "date", label: "Date" },
              { key: "actions", label: "" },
            ]}
          >
            {filtered.map((p) => (
              <Tr key={p.id || p.po}>
                <Td className="font-mono text-xs">{p.po}</Td>
                <Td className="font-medium text-graphite-900 dark:text-paper-100">{p.supplier}</Td>
                <Td>{p.items}</Td>
                <Td className="font-mono">{formatCurrency(p.total)}</Td>
                <Td><Badge tone={p.status === "Received" ? "in" : "low"}>{p.status}</Badge></Td>
                <Td className="text-graphite-500 dark:text-paper-300/60">{formatDate(p.date)}</Td>
                <Td>
                  {p.status === "Pending" && (
                    <button
                      onClick={() => receivePO(p)}
                      className="flex items-center gap-1 rounded bg-signal/15 px-2 py-1 text-xs font-semibold text-signal-dim transition-colors hover:bg-signal/25 dark:text-signal"
                    >
                      <CheckCircle size={13} /> Receive
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setError(""); }}
        title="New Purchase Order"
        subtitle="Generates PO and queues vendor restock."
      >
        <form onSubmit={save} className="space-y-4">
          <Select
            label="Supplier"
            options={suppliers.map((s) => ({ value: s.name, label: s.name }))}
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
          />
          <Select
            label="Product"
            options={products.map((p) => ({ value: p.sku, label: `${p.name} (${p.sku})` }))}
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
          />
          <Input
            label="Quantity"
            type="number"
            min="1"
            required
            value={form.quantity}
            error={error}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Issuing..." : "Issue Purchase Order"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

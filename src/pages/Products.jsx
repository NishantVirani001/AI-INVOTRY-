import { useMemo, useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Scan, Layers, QrCode } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Toolbar from "../components/common/Toolbar";
import Table, { Td, Tr } from "../components/common/Table";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { Input, Select } from "../components/common/Input";
import { Loader, EmptyState } from "../components/common/Loader";
import StockTape from "../components/common/StockTape";
import { useToast } from "../components/common/Toast";
import { useAuth } from "../context/AuthContext";
import productService from "../services/productService";
import categoryService from "../services/categoryService";
import supplierService from "../services/supplierService";
import BarcodeModal from "../components/products/BarcodeModal";
import ScannerModal from "../components/products/ScannerModal";
import ShelfAuditModal from "../components/products/ShelfAuditModal";
import { mockProducts, mockCategories, mockSuppliers } from "../data/mockData";
import { formatCurrency, stockStatusMeta } from "../utils/formatters";

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  supplier: "",
  price: "",
  cost: "",
  quantity: "",
  reorderLevel: "",
};

export default function Products() {
  const { user } = useAuth();

  // Strict role protection: Customers must never add/edit products or view internal inventory management
  if (user?.role === "Customer") {
    return <Navigate to="/customer/catalog" replace />;
  }

  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const handleProductUpdated = (updated) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id || p.sku === updated.sku ? { ...p, ...updated } : p))
    );
  };

  // Fetch products, categories, suppliers
  const loadData = async () => {
    try {
      setLoading(true);
      const [prodsData, catsData, supsData] = await Promise.allSettled([
        productService.getAll(),
        categoryService.getAll(),
        supplierService.getAll(),
      ]);

      const prods = prodsData.status === "fulfilled" && Array.isArray(prodsData.value)
        ? prodsData.value
        : [];
      const cats = catsData.status === "fulfilled" && Array.isArray(catsData.value)
        ? catsData.value
        : [];
      const sups = supsData.status === "fulfilled" && Array.isArray(supsData.value)
        ? supsData.value
        : [];

      setProducts(prods);
      setCategories(cats);
      setSuppliers(sups);
    } catch {
      setProducts([]);
      setCategories([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("stockpilot-data-updated", handleUpdate);
    return () => {
      window.removeEventListener("stockpilot-data-updated", handleUpdate);
    };
  }, []);

  const filtered = useMemo(() => {
    const s = (search || "").toLowerCase();
    return products.filter((p) => {
      if (!p) return false;
      const pName = (p.name || "").toLowerCase();
      const pSku = (p.sku || "").toLowerCase();
      const matchesSearch = pName.includes(s) || pSku.includes(s);
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || p.stockStatus === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      category: categories[0]?.name || "",
      supplier: suppliers[0]?.name || "",
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      supplier: p.supplier,
      price: p.price,
      cost: p.cost,
      quantity: p.quantity,
      reorderLevel: p.reorderLevel,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Product name is required.";
    if (!form.sku.trim()) e.sku = "SKU is required.";
    if (!form.category) e.category = "Please select a category.";
    if (!form.supplier) e.supplier = "Please select a supplier.";
    if (!form.price || Number(form.price) <= 0) e.price = "Enter a valid price.";
    if (form.quantity === "" || Number(form.quantity) < 0) e.quantity = "Enter a valid quantity.";
    if (!form.reorderLevel || Number(form.reorderLevel) < 0) e.reorderLevel = "Enter a reorder level.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const payload = {
      ...form,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      quantity: parseInt(form.quantity, 10) || 0,
      reorderLevel: parseInt(form.reorderLevel, 10) || 0,
    };

    try {
      if (editingId) {
        const updated = await productService.update(editingId, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingId ? { ...p, ...updated } : p))
        );
        toast({ type: "success", message: `${form.name} updated successfully.` });
      } else {
        const created = await productService.create(payload);
        setProducts((prev) => [created, ...prev]);
        toast({ type: "success", message: `${form.name} added to inventory.` });
      }
      setModalOpen(false);
    } catch (err) {
      toast({ type: "error", message: err.message || "Failed to save product." });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await productService.delete(confirmDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      toast({ type: "info", message: `${confirmDelete.name} removed from inventory.` });
    } catch (err) {
      toast({ type: "error", message: err.message || "Failed to delete product." });
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Products"
        subtitle={`${products.length} products across ${categories.length} categories`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" icon={Scan} onClick={() => setScannerOpen(true)}>
              Scan Barcode
            </Button>
            <Button variant="secondary" icon={Layers} onClick={() => setAuditOpen(true)}>
              Shelf Audit (CV)
            </Button>
            <Button icon={Plus} onClick={openAdd}>
              Add Product
            </Button>
          </div>
        }
      />

      <Card>
        <Toolbar
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Search by name or SKU..."
          filters={
            <>
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-tag border border-graphite-800/15 bg-transparent px-3 py-1.5 text-xs text-graphite-700 dark:border-paper-100/15 dark:text-paper-200"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.id || c.name} value={c.name} className="dark:bg-graphite-900">
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by stock status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-tag border border-graphite-800/15 bg-transparent px-3 py-1.5 text-xs text-graphite-700 dark:border-paper-100/15 dark:text-paper-200"
              >
                <option value="all">All stock</option>
                <option value="in" className="dark:bg-graphite-900">In stock</option>
                <option value="low" className="dark:bg-graphite-900">Low stock</option>
                <option value="out" className="dark:bg-graphite-900">Out of stock</option>
              </select>
            </>
          }
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader label="Loading live inventory..." />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No products found"
            subtitle="Try clearing filters or search to view items."
          />
        ) : (
          <Table
            columns={[
              { key: "sku", label: "SKU" },
              { key: "name", label: "Product" },
              { key: "category", label: "Category" },
              { key: "price", label: "Price / Cost" },
              { key: "stock", label: "Stock Level" },
              { key: "status", label: "Status" },
              { key: "actions", label: "" },
            ]}
          >
            {filtered.map((p) => {
              const meta = stockStatusMeta[p.stockStatus] || stockStatusMeta.in;
              return (
                <Tr key={p.id || p.sku}>
                  <Td className="font-mono text-xs text-graphite-500 dark:text-paper-300/60">
                    {p.sku}
                  </Td>
                  <Td>
                    <div className="font-medium text-graphite-900 dark:text-paper-100">
                      {p.name}
                    </div>
                    <div className="text-xs text-graphite-500 dark:text-paper-300/60">
                      {p.supplier}
                    </div>
                  </Td>
                  <Td className="text-xs">{p.category}</Td>
                  <Td>
                    <div className="font-mono text-sm font-semibold text-graphite-900 dark:text-paper-100">
                      {formatCurrency(p.price)}
                    </div>
                    <div className="font-mono text-xs text-graphite-400">
                      cost {formatCurrency(p.cost)}
                    </div>
                  </Td>
                  <Td>
                    <div className="w-36 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-medium text-graphite-800 dark:text-paper-200">
                          {p.quantity} units
                        </span>
                        <span className="text-[10px] text-graphite-400">
                          min {p.reorderLevel}
                        </span>
                      </div>
                      <StockTape
                        quantity={p.quantity}
                        reorderLevel={p.reorderLevel}
                        status={p.stockStatus}
                        showLabel={false}
                      />
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={meta.badgeTone}>{meta.label}</Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      {p.stockStatus !== "in" && (
                        <button
                          onClick={() =>
                            navigate("/purchases", {
                              state: { newPurchaseSku: p.sku, supplier: p.supplier },
                            })
                          }
                          className="rounded px-2 py-1 text-xs font-semibold text-signal-dim hover:bg-signal/10 dark:text-signal"
                        >
                          Reorder
                        </button>
                      )}
                      <button
                        onClick={() => setBarcodeProduct(p)}
                        className="rounded p-1.5 text-graphite-400 hover:text-signal dark:hover:text-signal transition-colors"
                        title="Print Barcode & QR Label"
                      >
                        <QrCode size={15} />
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded p-1.5 text-graphite-400 hover:text-graphite-700 dark:hover:text-paper-100"
                        title="Edit product"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        className="rounded p-1.5 text-graphite-400 hover:text-stock-out"
                        title="Delete product"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </Card>

      {/* Add / Edit Product Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Product" : "New Product"}
        subtitle="Maintain accurate catalog and threshold details."
      >
        <form onSubmit={save} className="space-y-4">
          <Input
            label="Product Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            placeholder="e.g. 18V Cordless Drill"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
              error={errors.sku}
              placeholder="PWR-2201"
            />
            <Select
              label="Category"
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              error={errors.category}
              options={[
                { value: "", label: "-- Select a Category --" },
                ...categories.map((c) => ({ value: c.name, label: c.name })),
              ]}
            />
          </div>

          <Select
            label="Supplier"
            required
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            error={errors.supplier}
            options={[
              { value: "", label: "-- Select a Supplier --" },
              ...suppliers.map((s) => ({ value: s.name, label: s.name })),
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Selling Price (₹)"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              error={errors.price}
            />
            <Input
              label="Unit Cost (₹)"
              type="number"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Current Quantity"
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              error={errors.quantity}
            />
            <Input
              label="Reorder Level"
              type="number"
              value={form.reorderLevel}
              onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
              error={errors.reorderLevel}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingId ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Product"
        subtitle={`Are you sure you want to delete ${confirmDelete?.name}?`}
      >
        <p className="text-sm text-graphite-600 dark:text-paper-300">
          This will permanently remove SKU <span className="font-mono font-semibold">{confirmDelete?.sku}</span> from live inventory.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={remove}>
            Confirm Delete
          </Button>
        </div>
      </Modal>

      {/* Barcode & QR Modal */}
      <BarcodeModal
        open={!!barcodeProduct}
        onClose={() => setBarcodeProduct(null)}
        product={barcodeProduct}
      />

      {/* Barcode Scanner Modal */}
      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        products={products}
        onProductUpdated={handleProductUpdated}
      />

      {/* Computer Vision Shelf Audit Modal */}
      <ShelfAuditModal
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        products={products}
        onProductUpdated={handleProductUpdated}
      />
    </div>
  );
}

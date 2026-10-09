import { useState, useEffect } from "react";
import { Plus, Trash2, Star, Mail, Phone } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { Input } from "../components/common/Input";
import { Loader } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";
import supplierService from "../services/supplierService";
import { mockSuppliers } from "../data/mockData";

const emptyForm = { name: "", contact: "", email: "", phone: "" };

export default function Suppliers() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await supplierService.getAll();
      if (Array.isArray(res)) {
        setSuppliers(res);
      } else {
        setSuppliers(mockSuppliers);
      }
    } catch {
      setSuppliers(mockSuppliers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Supplier name is required.";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const created = await supplierService.create(form);
      setSuppliers((prev) => [...prev, created]);
      toast({ type: "success", message: `${form.name} added as a supplier.` });
      setModalOpen(false);
    } catch (err) {
      toast({ type: "error", message: err.message || "Failed to add supplier" });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await supplierService.delete(confirmDelete.id);
      setSuppliers((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      toast({ type: "info", message: `${confirmDelete.name} removed.` });
    } catch (err) {
      toast({ type: "error", message: err.message || "Failed to delete supplier" });
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Network"
        title="Suppliers"
        subtitle="Vendor directory, reliability ratings, and procurement links"
        action={<Button icon={Plus} onClick={openAdd}>Add Supplier</Button>}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader label="Loading suppliers directory..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id || s.name} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-graphite-900 dark:text-paper-100">{s.name}</h3>
                    <p className="text-xs text-graphite-500 dark:text-paper-300/60">
                      Contact: {s.contact || "Purchasing Desk"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setConfirmDelete(s)}
                      className="rounded p-1 text-graphite-400 hover:text-stock-out"
                      title="Delete supplier"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-graphite-600 dark:text-paper-300">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-graphite-400" />
                    <span>{s.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-graphite-400" />
                    <span>{s.phone || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-graphite-800/10 pt-3 text-xs dark:border-paper-100/10">
                <div className="flex items-center gap-1 text-signal-dim dark:text-signal">
                  <Star size={13} fill="currentColor" />
                  <span className="font-mono font-semibold">{s.rating || 4.5}</span>
                </div>
                <span className="text-graphite-400">
                  <strong className="font-mono text-graphite-800 dark:text-paper-200">{s.productsSupplied || 0}</strong> products
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Supplier"
        subtitle="Add a vendor to your procurement directory"
      >
        <form onSubmit={save} className="space-y-4">
          <Input
            label="Supplier Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            placeholder="e.g. Apex Industrial Supplies"
          />
          <Input
            label="Contact Person"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            placeholder="e.g. Marcus Vance"
          />
          <Input
            label="Email Address"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            placeholder="orders@apexsupplies.com"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 555 0192"
          />
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Add Supplier"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Supplier"
        subtitle={`Remove ${confirmDelete?.name}?`}
      >
        <p className="text-sm text-graphite-600 dark:text-paper-300">
          This supplier will be removed from your directory. Make sure no active purchase orders depend on it.
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
    </div>
  );
}

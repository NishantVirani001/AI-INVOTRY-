import { useMemo, useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Toolbar from "../components/common/Toolbar";
import Table, { Td, Tr } from "../components/common/Table";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { Input } from "../components/common/Input";
import { Loader, EmptyState } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";
import customerService from "../services/customerService";
import { mockCustomers } from "../data/mockData";
import { formatCurrency, formatDate } from "../utils/formatters";

const emptyForm = { name: "", email: "", phone: "" };

export default function Customers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerService.getAll();
      if (Array.isArray(res) && res.length > 0) {
        setCustomers(res);
      } else {
        setCustomers(mockCustomers);
      }
    } catch {
      setCustomers(mockCustomers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = useMemo(
    () =>
      customers.filter((c) =>
        (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.email || "").toLowerCase().includes(search.toLowerCase())
      ),
    [customers, search]
  );

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Customer name is required.";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const created = await customerService.create(form);
      setCustomers((prev) => [created, ...prev]);
      toast({ type: "success", message: `${form.name} added.` });
      setModalOpen(false);
      setForm(emptyForm);
    } catch (err) {
      toast({ type: "error", message: err.message || "Failed to add customer." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    try {
      await customerService.delete(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      toast({ type: "success", message: `${name} removed.` });
    } catch (err) {
      toast({ type: "error", message: err.message || "Failed to delete customer." });
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Relationships"
        title="Customers"
        subtitle={`${customers.length} registered customers with lifetime spend records`}
        action={<Button icon={Plus} onClick={() => setModalOpen(true)}>Add Customer</Button>}
      />

      <Card>
        <Toolbar searchValue={search} onSearchChange={setSearch} placeholder="Search customers..." />

        {loading ? (
          <Loader />
        ) : filtered.length === 0 ? (
          <EmptyState title="No customers found" description="Try a different search term or add a new customer." />
        ) : (
          <Table columns={[
            { key: "name", label: "Customer" },
            { key: "contact", label: "Contact" },
            { key: "orders", label: "Orders" },
            { key: "spent", label: "Total Spent" },
            { key: "last", label: "Last Order" },
            { key: "actions", label: "" },
          ]}>
            {filtered.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-graphite-900 dark:text-paper-100">{c.name}</Td>
                <Td>
                  <p className="text-xs text-graphite-500 dark:text-paper-300/60">{c.email}</p>
                  <p className="text-xs text-graphite-500 dark:text-paper-300/60">{c.phone}</p>
                </Td>
                <Td>{c.totalOrders || 0}</Td>
                <Td className="font-mono">{formatCurrency(c.totalSpent || 0)}</Td>
                <Td className="text-graphite-500 dark:text-paper-300/60">{c.lastOrder ? formatDate(c.lastOrder) : "—"}</Td>
                <Td className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-stock-low hover:bg-stock-low/10"
                    onClick={() => setConfirmDelete(c)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Add Customer Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Customer"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={submitting}>
              {submitting ? "Adding..." : "Add customer"}
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <Input label="Customer / Company Name" required value={form.name} error={errors.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" required value={form.email} error={errors.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Customer"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              className="bg-stock-low text-paper-100 hover:bg-stock-low/80"
              onClick={() => handleDelete(confirmDelete.id, confirmDelete.name)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-graphite-700 dark:text-paper-300">
          Are you sure you want to delete customer <strong>{confirmDelete?.name}</strong>?
        </p>
      </Modal>
    </div>
  );
}

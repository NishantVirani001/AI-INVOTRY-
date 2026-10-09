import { useState, useEffect } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { Input, Textarea } from "../components/common/Input";
import { Loader } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";
import categoryService from "../services/categoryService";
import { mockCategories } from "../data/mockData";

const emptyForm = { name: "", description: "" };

export default function Categories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await categoryService.getAll();
      if (Array.isArray(res)) {
        setCategories(res);
      } else {
        setCategories(mockCategories);
      }
    } catch {
      setCategories(mockCategories);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await categoryService.create(form);
      setCategories((prev) => [...prev, created]);
      toast({ type: "success", message: `${form.name} category created.` });
      setModalOpen(false);
    } catch (err) {
      setError(err.message || "Failed to create category");
      toast({ type: "error", message: err.message || "Failed to create category" });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await categoryService.delete(confirmDelete.id);
      setCategories((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      toast({ type: "info", message: `${confirmDelete.name} deleted.` });
    } catch (err) {
      toast({ type: "error", message: err.message || "Failed to delete category" });
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Organization"
        title="Categories"
        subtitle="Group products into operational categories"
        action={<Button icon={Plus} onClick={openAdd}>Add Category</Button>}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader label="Loading categories..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id || c.name} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-tag bg-graphite-800/5 p-2 text-graphite-700 dark:bg-paper-100/5 dark:text-paper-200">
                      <Tag size={16} />
                    </div>
                    <h3 className="font-semibold text-graphite-900 dark:text-paper-100">{c.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setConfirmDelete(c)}
                      className="rounded p-1 text-graphite-400 hover:text-stock-out"
                      title="Delete category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-graphite-500 dark:text-paper-300/60">
                  {c.description || "No description provided."}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-graphite-800/10 pt-3 text-xs dark:border-paper-100/10">
                <span className="text-graphite-400">Assigned products</span>
                <span className="font-mono font-semibold text-graphite-900 dark:text-paper-100">
                  {c.productCount || 0}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Category Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Category"
        subtitle="Define a new product segment"
      >
        <form onSubmit={save} className="space-y-4">
          <Input
            label="Category Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={error}
            placeholder="e.g. Pneumatics"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Summary of goods in this category"
          />
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Category"
        subtitle={`Delete ${confirmDelete?.name}?`}
      >
        <p className="text-sm text-graphite-600 dark:text-paper-300">
          This category will be permanently removed. Ensure no products are currently assigned to it.
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

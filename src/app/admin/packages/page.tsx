"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminTopbar } from "@/components/AdminTopbar";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X } from "lucide-react";

export interface MembershipPackage {
  id?: string;
  name: string;
  price: number;
  description: string;
  features: string;
}

export default function MembershipPackagesPage() {
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<MembershipPackage | null>(null);
  const [form, setForm] = useState({ name: "", price: "", description: "", features: "" });
  const [formError, setFormError] = useState("");
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const q = await getDocs(collection(db, "membership_packages"));
    const arr: MembershipPackage[] = [];
    q.forEach((d) => arr.push({ id: d.id, ...(d.data() as MembershipPackage) }));
    setPackages(arr);
    setLoading(false);
  };

  const openModal = (data?: MembershipPackage) => {
    setEditData(data || null);
    setForm(data
      ? {
          name: data.name,
          price: String(data.price),
          description: data.description,
          features: data.features,
        }
      : { name: "", price: "", description: "", features: "" }
    );
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditData(null);
    setForm({ name: "", price: "", description: "", features: "" });
    setFormError("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.price.trim()) {
      setFormError("Nama dan harga wajib diisi!");
      return;
    }
    if (isNaN(Number(form.price))) {
      setFormError("Harga harus berupa angka.");
      return;
    }

    try {
      if (editData?.id) {
        await updateDoc(doc(db, "membership_packages", editData.id), {
          name: form.name,
          price: Number(form.price),
          description: form.description,
          features: form.features,
        });
      } else {
        await addDoc(collection(db, "membership_packages"), {
          name: form.name,
          price: Number(form.price),
          description: form.description,
          features: form.features,
        });
      }
      await fetchPackages();
      closeModal();
    } catch {
      setFormError("Gagal menyimpan data.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus paket ini?")) return;
    await deleteDoc(doc(db, "membership_packages", id));
    await fetchPackages();
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white relative">
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Paket Membership", href: "/admin/packages" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
        ]}
      />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Paket Membership", href: "/admin/packages" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
        ]}
      />
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Kelola Paket Membership</h1>
          <button
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl shadow-md transition"
            onClick={() => openModal()}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Tambah Paket</span>
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full table-auto">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th className="p-4 text-left">Nama Paket</th>
                <th className="p-4 text-left">Harga</th>
                <th className="p-4 text-left">Fitur/Benefit</th>
                <th className="p-4 text-left">Deskripsi</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="p-4">
                          <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                : packages.map((pkg) => (
                    <motion.tr
                      key={pkg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-4 font-semibold text-gray-800">{pkg.name}</td>
                      <td className="p-4 text-gray-700">Rp {pkg.price.toLocaleString()}</td>
                      <td className="p-4 text-gray-700">{pkg.features}</td>
                      <td className="p-4 text-gray-700">{pkg.description}</td>
                      <td className="p-4 flex gap-2">
                        <button
                          className="p-2 bg-yellow-400 text-white rounded-full hover:scale-110 transition"
                          onClick={() => openModal(pkg)}
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition"
                          onClick={() => pkg.id && handleDelete(pkg.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit Paket */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={closeModal}
                className="absolute top-3 right-3 text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold mb-4">
                {editData ? "Edit Paket Membership" : "Tambah Paket Membership"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Nama Paket</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Harga Paket (Rp)</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    required
                    min={0}
                    className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Fitur/Benefit</label>
                  <textarea
                    name="features"
                    value={form.features}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Contoh: Gym, Studio, Functional, dll"
                    className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Deskripsi Paket</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {formError && (
                  <div className="text-red-500 text-xs">{formError}</div>
                )}
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg shadow hover:bg-blue-700 transition font-bold"
                >
                  {editData ? "Simpan Perubahan" : "Simpan Paket"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

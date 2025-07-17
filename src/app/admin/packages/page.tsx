// src/app/admin/packages/page.tsx

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminTopbar } from "@/components/AdminTopbar";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X } from "lucide-react";

// Daftar fasilitas umum di gym (bisa diubah)
const facilityList = [
  "Akses Gym",
  "Locker",
  "Sauna",
  "Shower",
  "Free Wifi",
  "Minuman Gratis",
];

export interface MembershipPackage {
  id?: string;
  name: string;
  price: number;
  duration: string; // "Bulanan" | "Tahunan"
  description: string;
  facilities: string[]; // array fasilitas
  classAccess: { classId: string; className: string; sessionLimit: string }[]; // dynamic
}

export default function MembershipPackagesPage() {
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [classes, setClasses] = useState<{ id: string; className: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<MembershipPackage | null>(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "Bulanan",
    description: "",
    facilities: [] as string[],
    classAccess: [] as { classId: string; className: string; sessionLimit: string }[],
  });
  const [formError, setFormError] = useState("");
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // Fetch all class data
  useEffect(() => {
    fetchPackages();
    fetchClasses();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const q = await getDocs(collection(db, "membership_packages"));
    const arr: MembershipPackage[] = [];
    q.forEach((d) => arr.push({ id: d.id, ...(d.data() as MembershipPackage) }));
    setPackages(arr);
    setLoading(false);
  };

  const fetchClasses = async () => {
    const q = await getDocs(collection(db, "classes"));
    const all = q.docs.map((doc) => ({
      id: doc.id,
      className: doc.data().type || "Tanpa Nama",
    }));
    // Only unique type/className
    const unique: { id: string; className: string }[] = [];
    const seenType = new Set<string>();
    for (const c of all) {
      if (!seenType.has(c.className)) {
        unique.push(c);
        seenType.add(c.className);
      }
    }
    setClasses(unique);
  };


  // Modal open (untuk edit/tambah)
  const openModal = (data?: MembershipPackage) => {
    setEditData(data || null);
    setForm(
      data
        ? {
            name: data.name,
            price: String(data.price),
            duration: data.duration || "Bulanan",
            description: data.description,
            facilities: data.facilities || [],
            classAccess: data.classAccess || [],
          }
        : {
            name: "",
            price: "",
            duration: "Bulanan",
            description: "",
            facilities: [],
            classAccess: [],
          }
    );
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditData(null);
    setForm({
      name: "",
      price: "",
      duration: "Bulanan",
      description: "",
      facilities: [],
      classAccess: [],
    });
    setFormError("");
  };

  // Fasilitas
  const toggleFacility = (facility: string) => {
    setForm((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  // Class access handler
  const handleClassAccessChange = (classId: string, checked: boolean) => {
    if (checked) {
      const cls = classes.find((c) => c.id === classId);
      setForm((prev) => ({
        ...prev,
        classAccess: [
          ...prev.classAccess,
          { classId, className: cls?.className || "", sessionLimit: "" },
        ],
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        classAccess: prev.classAccess.filter((c) => c.classId !== classId),
      }));
    }
  };

  const handleSessionLimitChange = (classId: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      classAccess: prev.classAccess.map((c) =>
        c.classId === classId ? { ...c, sessionLimit: value } : c
      ),
    }));
  };

  // Harga UX rupiah
  const formatRupiah = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) return "";
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, price: formatRupiah(value) }));
  };

  // CRUD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.price.trim()) {
      setFormError("Nama dan harga wajib diisi!");
      return;
    }
    if (isNaN(Number(form.price.replace(/\./g, "")))) {
      setFormError("Harga harus berupa angka.");
      return;
    }
    try {
      const payload = {
        ...form,
        price: Number(form.price.replace(/\./g, "")),
        facilities: form.facilities,
        classAccess: form.classAccess,
      };
      if (editData?.id) {
        await updateDoc(doc(db, "membership_packages", editData.id), payload);
      } else {
        await addDoc(collection(db, "membership_packages"), payload);
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
                <th className="p-4 text-left">Fasilitas</th>
                <th className="p-4 text-left">Akses Kelas</th>
                <th className="p-4 text-left">Deskripsi</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
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
                      <td className="p-4 text-gray-700">Rp {Number(pkg.price).toLocaleString()}</td>
                      <td className="p-4 text-gray-700">
                        {pkg.facilities?.length ? (
                          <ul className="list-disc ml-4">
                            {pkg.facilities.map((f, idx) => (
                              <li key={idx}>{f}</li>
                            ))}
                          </ul>
                        ) : "-"}
                      </td>
                      <td className="p-4 text-gray-700">
                        {pkg.classAccess?.length ? (
                          <ul className="list-disc ml-4">
                            {pkg.classAccess.map((c, idx) => (
                              <li key={idx}>
                                {c.className} ({c.sessionLimit || "∞"} sesi)
                              </li>
                            ))}
                          </ul>
                        ) : "-"}
                      </td>
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
              className="relative bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl"
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
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Harga Paket (Rp)</label>
                  <input
                    type="text"
                    name="price"
                    value={form.price}
                    onChange={handlePriceChange}
                    required
                    min={0}
                    className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: 250000"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Durasi</label>
                  <select
                    name="duration"
                    value={form.duration}
                    onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Bulanan">Bulanan</option>
                    <option value="Tahunan">Tahunan</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Fasilitas</label>
                  <div className="flex flex-wrap gap-2">
                    {facilityList.map(facility => (
                      <label key={facility} className="flex items-center gap-1 px-3 py-1 rounded border bg-gray-50 shadow-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.facilities.includes(facility)}
                          onChange={() => toggleFacility(facility)}
                          className="accent-blue-500"
                        />
                        <span>{facility}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Akses Kelas & Sesi</label>
                  <div className="space-y-1">
                    {classes.map(cls => {
                      const checked = form.classAccess.some(c => c.classId === cls.id);
                      const sessionLimit = form.classAccess.find(c => c.classId === cls.id)?.sessionLimit || "";
                      return (
                        <div key={cls.id} className="flex items-center gap-3">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => handleClassAccessChange(cls.id, e.target.checked)}
                              className="accent-green-600"
                            />
                            <span>{cls.className}</span>
                          </label>
                          {checked && (
                            <input
                              type="number"
                              min={1}
                              placeholder="Jml sesi/bulan (atau kosong = unlimited)"
                              value={sessionLimit}
                              onChange={e => handleSessionLimitChange(cls.id, e.target.value)}
                              className="border px-2 py-1 rounded w-44 ml-2"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">* Centang kelas lalu isi jumlah sesi/bulan. Kosongkan sesi untuk unlimited.</div>
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Deskripsi Paket</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
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

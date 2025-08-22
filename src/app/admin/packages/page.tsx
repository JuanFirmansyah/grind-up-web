// src/app/admin/packages/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminTopbar } from "@/components/AdminTopbar";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, SortAsc, Search } from "lucide-react";

const colors = {
  base: "#97CCDD",
  light: "#C1E3ED",
  dark: "#6FB5CC",
  darker: "#4A9EBB",
  complementary: "#DDC497",
  accent: "#DD97CC",
  text: "#2D3748",
  textLight: "#F8FAFC",
};

type Tag = "regular" | "functional" | "special";

// ⬇️ Tambah "Harian" di union type durasi
export interface MembershipPackage {
  id?: string;
  name: string;
  price: number;
  duration: "Harian" | "Bulanan" | "Tahunan";
  description: string;
  facilities: string[];
  classAccessRules: { tag: Tag; sessionsPerCycle: number | null }[];
}

type SortMode = "name_asc" | "price_asc";

const facilityList = [
  "Akses Gym",
  "Locker",
  "Sauna",
  "Shower",
  "Free Wifi",
  "Minuman Gratis",
];
const TAGS: Tag[] = ["regular", "functional", "special"];

export default function MembershipPackagesPage() {
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<MembershipPackage | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name_asc");
  const [formError, setFormError] = useState("");

  // ⬇️ default duration sekarang "Bulanan" tapi type mencakup "Harian"
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "Bulanan" as "Harian" | "Bulanan" | "Tahunan",
    description: "",
    facilities: [] as string[],
    classAccessRules: TAGS.map((tag) => ({
      tag,
      sessionsPerCycle: null as number | null,
    })),
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const q = await getDocs(collection(db, "membership_packages"));
      const arr: MembershipPackage[] = [];
      q.forEach((d) =>
        arr.push({ id: d.id, ...(d.data() as MembershipPackage) })
      );
      setPackages(arr);
      setLoading(false);
    })();
  }, []);

  const formatRupiah = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) return "";
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const openModal = (data?: MembershipPackage) => {
    setEditData(data ?? null);
    if (data) {
      setForm({
        name: data.name,
        price: String(data.price),
        duration: data.duration,
        description: data.description ?? "",
        facilities: data.facilities ?? [],
        classAccessRules:
          TAGS.map((tag) => {
            const found = data.classAccessRules?.find((r) => r.tag === tag);
            return {
              tag,
              sessionsPerCycle:
                typeof found?.sessionsPerCycle === "number"
                  ? found.sessionsPerCycle
                  : null,
            };
          }) ?? TAGS.map((tag) => ({ tag, sessionsPerCycle: null })),
      });
    } else {
      setForm({
        name: "",
        price: "",
        duration: "Bulanan",
        description: "",
        facilities: [],
        classAccessRules: TAGS.map((tag) => ({ tag, sessionsPerCycle: null })),
      });
    }
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditData(null);
  };

  const toggleFacility = (facility: string) => {
    setForm((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, price: formatRupiah(cleaned) }));
  };

  // 🛠️ Perbaikan parsing "0": "" => null, "0" => 0
  const setSessions = (tag: Tag, val: string) => {
    setForm((prev) => ({
      ...prev,
      classAccessRules: prev.classAccessRules.map((r) =>
        r.tag === tag
          ? {
              ...r,
              sessionsPerCycle: val === "" ? null : Number(val),
            }
          : r
      ),
    }));
  };

  const savePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.price.trim()) {
      setFormError("Nama dan harga wajib diisi!");
      return;
    }
    const payload: Omit<MembershipPackage, "id"> = {
      name: form.name.trim(),
      price: Number(form.price.replace(/\./g, "")),
      duration: form.duration, // "Harian" | "Bulanan" | "Tahunan"
      description: form.description,
      facilities: form.facilities,
      classAccessRules: [...form.classAccessRules].sort((a, b) =>
        a.tag.localeCompare(b.tag)
      ),
    };
    if (editData?.id) {
      await setDoc(doc(db, "membership_packages", editData.id), payload, {
        merge: true,
      });
    } else {
      await addDoc(collection(db, "membership_packages"), payload);
    }
    // refresh
    const q = await getDocs(collection(db, "membership_packages"));
    const arr: MembershipPackage[] = [];
    q.forEach((d) => arr.push({ id: d.id, ...(d.data() as MembershipPackage) }));
    setPackages(arr);
    closeModal();
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("Yakin ingin menghapus paket ini?")) return;
    await deleteDoc(doc(db, "membership_packages", id));
    const q = await getDocs(collection(db, "membership_packages"));
    const arr: MembershipPackage[] = [];
    q.forEach((d) => arr.push({ id: d.id, ...(d.data() as MembershipPackage) }));
    setPackages(arr);
  };

  const filteredSorted = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = packages.filter((p) => {
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        (p.description || "").toLowerCase().includes(term)
      );
    });
    const sorted = [...base].sort((a, b) => {
      if (sortMode === "name_asc") return a.name.localeCompare(b.name, "id");
      return (a.price ?? 0) - (b.price ?? 0);
    });
    return sorted;
  }, [packages, search, sortMode]);

  return (
    <main
      className="min-h-screen flex flex-col md:flex-row relative"
      style={{
        background: `linear-gradient(135deg, ${colors.light}20 0%, #ffffff 35%, ${colors.base}20 100%)`,
      }}
    >
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Absensi", href: "/admin/attendance" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Paket Membership", href: "/admin/packages" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
          { label: "Galeri", href: "/admin/gallery" },
        ]}
      />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Absensi", href: "/admin/attendance" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Paket Membership", href: "/admin/packages" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
          { label: "Galeri", href: "/admin/gallery" },
        ]}
      />

      <div className="flex-1 p-6 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-6"
        >
          <div
            className="rounded-2xl px-5 py-4 shadow-md border"
            style={{
              background: `linear-gradient(90deg, ${colors.darker} 0%, ${colors.dark} 100%)`,
              color: colors.textLight,
              borderColor: colors.light,
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold">
                Kelola Paket Membership
              </h1>
              <button
                type="button"
                onClick={() => openModal()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl shadow-md transition text-white"
                style={{ background: colors.complementary }}
              >
                <Plus className="w-5 h-5" />
                <span>Tambah Paket</span>
              </button>
            </div>
            <p className="opacity-90 mt-1 text-sm md:text-base">
              Atur akses kelas berdasarkan <b>TAG</b>{" "}
              (regular/functional/special) + kuota sesi/siklus.
            </p>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-2 w-full md:max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari paket (nama / deskripsi)"
                className="w-full pl-9 pr-3 py-2 rounded-xl border shadow-sm focus:outline-none"
                style={{ borderColor: colors.light }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-gray-500" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="border rounded-xl px-3 py-2"
              style={{ borderColor: colors.light }}
            >
              <option value="name_asc">Urut Nama (A → Z)</option>
              <option value="price_asc">Harga (Termurah dulu)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div
          className="overflow-x-auto rounded-2xl border bg-white shadow-sm"
          style={{ borderColor: colors.light }}
        >
          <table className="w-full table-auto">
            <thead
              style={{
                background: `linear-gradient(90deg, ${colors.darker}, ${colors.dark})`,
                color: colors.textLight,
              }}
            >
              <tr>
                <th className="p-4 text-left">Nama Paket</th>
                <th className="p-4 text-left">Harga</th>
                <th className="p-4 text-left">Durasi</th>
                <th className="p-4 text-left">Akses (per TAG)</th>
                <th className="p-4 text-left">Fasilitas</th>
                <th className="p-4 text-left">Deskripsi</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={`sk-${i}-${j}`} className="p-4">
                        <div className="h-5 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredSorted.length ? (
                filteredSorted.map((pkg) => (
                  <motion.tr
                    key={pkg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t hover:bg-gray-50"
                    style={{ borderColor: colors.light }}
                  >
                    <td className="p-4 font-semibold" style={{ color: colors.text }}>
                      {pkg.name}
                    </td>
                    <td className="p-4 text-gray-700">
                      Rp {Number(pkg.price ?? 0).toLocaleString("id-ID")}
                    </td>
                    <td className="p-4">
                      <span
                        className="px-2 py-1 text-xs font-bold rounded-lg"
                        style={{ background: colors.base, color: colors.textLight }}
                      >
                        {pkg.duration}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700">
                      <ul className="list-disc ml-4">
                        {pkg.classAccessRules?.map((r) => (
                          <li key={r.tag}>
                            <span className="capitalize">{r.tag}</span>{" "}
                            (
                            {r.sessionsPerCycle === null
                              ? "unlimited"
                              : `${r.sessionsPerCycle} sesi/siklus`}
                            )
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-4 text-gray-700">
                      {pkg.facilities?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {pkg.facilities.map((f) => (
                            <span
                              key={f}
                              className="px-2 py-0.5 text-xs rounded-full"
                              style={{
                                background: `${colors.base}25`,
                                color: colors.darker,
                              }}
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-700">
                      {pkg.description || (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openModal(pkg)}
                          className="p-2 rounded-full text-white hover:scale-110 transition"
                          style={{ background: colors.complementary }}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(pkg.id)}
                          className="p-2 rounded-full text-white hover:scale-110 transition"
                          style={{ background: "#ef4444" }}
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={7}>
                    Tidak ada paket.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-start md:items-center justify-center px-4 py-6 overflow-y-auto"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-3 right-3 text-gray-400 hover:text-black"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>

              <h2
                className="text-xl font-bold mb-4"
                style={{ color: colors.text }}
              >
                {editData ? "Edit Paket Membership" : "Tambah Paket Membership"}
              </h2>

              <form onSubmit={savePackage} className="space-y-4">
                <div>
                  <label className="block mb-1 font-semibold">Nama Paket</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    required
                    className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: colors.light }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold">
                    Harga Paket (Rp)
                  </label>
                  <input
                    type="text"
                    value={form.price}
                    onChange={handlePriceChange}
                    required
                    inputMode="numeric"
                    className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: colors.light }}
                    placeholder="cth: 250000"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Tampil: Rp{" "}
                    {form.price
                      ? Number(form.price.replace(/\./g, "")).toLocaleString(
                          "id-ID"
                        )
                      : "0"}
                  </div>
                </div>

                <div>
                  <label className="block mb-1 font-semibold">Durasi</label>
                  <select
                    value={form.duration}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        duration: e.target
                          .value as "Harian" | "Bulanan" | "Tahunan",
                      }))
                    }
                    className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: colors.light }}
                  >
                    {/* ⬇️ Tambahan Harian */}
                    <option value="Harian">Harian (Visit)</option>
                    <option value="Bulanan">Bulanan</option>
                    <option value="Tahunan">Tahunan</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold">Fasilitas</label>
                  <div className="flex flex-wrap gap-2">
                    {facilityList.map((f) => (
                      <label
                        key={f}
                        className="flex items-center gap-2 px-3 py-1 rounded border bg-gray-50 shadow-sm cursor-pointer"
                        style={{ borderColor: colors.light }}
                      >
                        <input
                          type="checkbox"
                          checked={form.facilities.includes(f)}
                          onChange={() => toggleFacility(f)}
                          className="accent-blue-600"
                        />
                        <span>{f}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block mb-1 font-semibold">
                    Akses Kelas (per TAG)
                  </label>
                  <div className="space-y-2">
                    {TAGS.map((tag) => {
                      const found =
                        form.classAccessRules.find((r) => r.tag === tag)!;
                      return (
                        <div key={tag} className="flex items-center gap-3">
                          <span className="capitalize w-28">{tag}</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="Sesi/siklus (kosong = unlimited)"
                            value={
                              found.sessionsPerCycle === null
                                ? ""
                                : found.sessionsPerCycle
                            }
                            onChange={(e) => setSessions(tag, e.target.value)}
                            className="border px-2 py-1 rounded w-64"
                            style={{ borderColor: colors.light }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Kosongkan = unlimited. Nilai <b>0</b> disimpan sebagai{" "}
                    <b>0 sesi</b>.
                  </div>
                </div>

                <div>
                  <label className="block mb-1 font-semibold">
                    Deskripsi Paket
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                    rows={3}
                    className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: colors.light }}
                  />
                </div>

                {formError && (
                  <div className="text-red-500 text-xs">{formError}</div>
                )}

                <button
                  type="submit"
                  className="w-full text-white py-3 rounded-lg shadow font-bold hover:opacity-95 transition"
                  style={{ background: colors.darker }}
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

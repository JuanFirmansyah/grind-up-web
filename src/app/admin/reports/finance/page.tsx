// src/app/admin/reports/finance/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { X, DownloadCloud, CheckCircle2, Search, Filter } from "lucide-react";
import * as XLSX from "xlsx";

/* ================== Color Palette (konsisten) ================== */
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

interface Payment {
  id: string;
  userId: string;
  packageName: string;
  price: number;
  method: string;
  status: string;
  proofUrl?: string;
  createdAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  expiresAt?: Date;
}

type StatusFilter = "all" | "pending" | "success" | "failed";
type MethodFilter = "all" | "manual" | "midtrans" | "transfer" | "cash";

export default function ReportFinancePage() {
  const [mounted, setMounted] = useState(false); // ✅ guard mount
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // search & filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");

  // verify modal
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [approvedByInput, setApprovedByInput] = useState("");

  const skeletonCount = 6;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "payments"));
      const data: Payment[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, unknown>;
        const createdAny = (d.created as Timestamp | undefined) || (d.createdAt as Timestamp | undefined);
        const approvedAny = d.approvedAt as Timestamp | undefined;
        const expiresAny = d.expiresAt as Timestamp | undefined;

        data.push({
          id: docSnap.id,
          userId: (d.userId as string) || "-",
          packageName: (d.packageName as string) || "-",
          price: Number(d.price ?? 0),
          method: (d.method as string) || "-",
          status: (d.status as string) || "-",
          proofUrl: (d.proofUrl as string) || (d.imageURL as string) || "",
          createdAt: createdAny?.toDate?.() || new Date(),
          approvedBy: (d.approvedBy as string) || "",
          approvedAt: approvedAny?.toDate?.(),
          expiresAt: expiresAny?.toDate?.(),
        });
      });

      data.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      setPayments(data);
      setLoading(false);
    };

    void fetchData();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return payments.filter((p) => {
      const matchesSearch =
        !s ||
        (p.userId + p.packageName + p.method + p.status + (p.approvedBy || ""))
          .toLowerCase()
          .includes(s);
      const matchesStatus = statusFilter === "all" ? true : p.status === statusFilter;
      const matchesMethod = methodFilter === "all" ? true : p.method === methodFilter;
      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [payments, search, statusFilter, methodFilter]);

  const totalAmount = useMemo(
    () =>
      filtered
        .filter((p) => p.status === "success")
        .reduce((acc, cur) => acc + (typeof cur.price === "number" ? cur.price : 0), 0),
    [filtered]
  );

  function exportToExcel() {
    const dataExport = filtered.map((item, i) => ({
      No: i + 1,
      UID: item.userId,
      Paket: item.packageName,
      Harga: item.price,
      Metode: item.method,
      Status: item.status,
      Dibuat: item.createdAt ? format(item.createdAt, "dd MMM yyyy HH:mm", { locale: localeId }) : "-",
      Disetujui: item.approvedBy || "-",
      TanggalDisetujui: item.approvedAt ? format(item.approvedAt, "dd MMM yyyy HH:mm", { locale: localeId }) : "-",
      Expired: item.expiresAt ? format(item.expiresAt, "dd MMM yyyy", { locale: localeId }) : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    XLSX.writeFile(workbook, `Laporan_Pembayaran_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
  }

  function openVerifyModal(id: string) {
    setVerifyId(id);
    setApprovedByInput("");
    setVerifyOpen(true);
  }

  async function submitVerify() {
    if (!verifyId || !approvedByInput.trim()) return;
    await updateDoc(doc(db, "payments", verifyId), {
      status: "success",
      approvedBy: approvedByInput.trim(),
      approvedAt: Timestamp.now(),
    });
    setPayments((prev) =>
      prev.map((p) =>
        p.id === verifyId
          ? { ...p, status: "success", approvedBy: approvedByInput.trim(), approvedAt: new Date() }
          : p
      )
    );
    setVerifyOpen(false);
    setVerifyId(null);
    setApprovedByInput("");
  }

  /* ========= Rendering guard to avoid SSR/CSR mismatch ========= */
  if (!mounted) {
    // Placeholder yang sama di server & client sebelum mount
    return (
      <main
        className="min-h-screen flex flex-col md:flex-row relative"
        style={{
          background: `linear-gradient(135deg, ${colors.light}20 0%, #ffffff 35%, ${colors.base}20 100%)`,
        }}
        suppressHydrationWarning
      >
        <div className="flex-1 p-6 md:p-8">
          <div
            className="rounded-2xl px-5 py-4 shadow-md border mb-6"
            style={{
              background: `linear-gradient(90deg, ${colors.darker} 0%, ${colors.dark} 100%)`,
              color: colors.textLight,
              borderColor: colors.light,
            }}
          >
            <h1 className="text-2xl md:text-3xl font-extrabold">Laporan Keuangan / Pembayaran Member</h1>
          </div>
          <div className="space-y-3">
            <div className="h-10 bg-white/60 rounded-xl animate-pulse" />
            <div className="h-72 bg-white/60 rounded-2xl animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

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
        <div
          className="rounded-2xl px-5 py-4 shadow-md border mb-6"
          style={{
            background: `linear-gradient(90deg, ${colors.darker} 0%, ${colors.dark} 100%)`,
            color: colors.textLight,
            borderColor: colors.light,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold">
              Laporan Keuangan / Pembayaran Member
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportToExcel}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl shadow-md transition text-white hover:opacity-95"
                style={{ background: colors.complementary }}
                aria-label="Export Excel"
                title="Export Excel"
              >
                <DownloadCloud className="w-5 h-5" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
          <p className="opacity-90 mt-1 text-sm md:text-base">
            Pantau transaksi, verifikasi pembayaran, dan ekspor laporan untuk pembukuan.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 w-full lg:max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 rounded-xl border shadow-sm focus:outline-none"
                style={{ borderColor: colors.light }}
                placeholder="Cari UID / paket / metode / status / admin"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
              <Filter className="w-4 h-4" /> Filter:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="border rounded-xl px-3 py-2"
              style={{ borderColor: colors.light }}
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
              className="border rounded-xl px-3 py-2"
              style={{ borderColor: colors.light }}
            >
              <option value="all">Semua Metode</option>
              <option value="manual">Manual</option>
              <option value="transfer">Transfer</option>
              <option value="cash">Cash</option>
              <option value="midtrans">Midtrans</option>
            </select>
            <div
              className="ml-auto lg:ml-4 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: `${colors.base}20`, color: colors.darker }}
            >
              Total transaksi: {payments.length} •
              <span className="ml-1"> Pendapatan (success): Rp {totalAmount.toLocaleString("id-ID")}</span>
            </div>
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
                <th className="p-4 text-left">UID</th>
                <th className="p-4 text-left">Paket</th>
                <th className="p-4 text-left">Harga</th>
                <th className="p-4 text-left">Metode</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Admin</th>
                <th className="p-4 text-left">Dibuat</th>
                <th className="p-4 text-left">Bukti</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: skeletonCount }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={`sk-${i}-${j}`} className="p-4">
                        <div className="h-5 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-500">
                    Tidak ada data pembayaran.
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.01 }}
                    className="border-t hover:bg-gray-50"
                    style={{ borderColor: colors.light }}
                  >
                    <td className="p-4">{p.userId}</td>
                    <td className="p-4">{p.packageName}</td>
                    <td className="p-4 font-semibold text-green-700">
                      Rp {Number(p.price || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="p-4">
                      <span
                        className="px-2 py-1 text-xs font-bold rounded-lg"
                        style={{ background: `${colors.base}25`, color: colors.darker }}
                      >
                        {p.method}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="p-4">{p.approvedBy || <span className="text-gray-400">-</span>}</td>
                    <td className="p-4 text-sm">
                      {p.createdAt ? format(p.createdAt, "dd MMM yyyy HH:mm", { locale: localeId }) : "-"}
                    </td>
                    <td className="p-4">
                      {p.proofUrl ? (
                        <button
                          type="button"
                          onClick={() => setModalImg(p.proofUrl as string)}
                          className="underline"
                          style={{ color: colors.darker }}
                          aria-label="Lihat bukti pembayaran"
                          title="Lihat bukti pembayaran"
                        >
                          Lihat
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {p.status !== "success" && (
                        <button
                          type="button"
                          onClick={() => openVerifyModal(p.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm"
                          style={{ background: "#16a34a" }}
                          aria-label="Verifikasi pembayaran"
                          title="Verifikasi pembayaran"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Verifikasi
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Preview Bukti */}
      <AnimatePresence>
        {modalImg && (
          <motion.div
            key="modal-img"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
            onClick={() => setModalImg(null)}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white p-4 rounded-xl shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setModalImg(null)}
                className="absolute top-2 right-2 text-gray-600 hover:text-black"
                aria-label="Tutup"
                title="Tutup"
              >
                <X className="w-6 h-6" />
              </button>
              <Image
                src={modalImg}
                alt="Bukti Pembayaran"
                width={820}
                height={620}
                className="rounded-xl w-full h-auto object-contain max-h-[75vh] mx-auto"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Verifikasi Pembayaran */}
      <AnimatePresence>
        {verifyOpen && (
          <motion.div
            key="verify-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
            onClick={() => setVerifyOpen(false)}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white p-6 md:p-7 rounded-2xl shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setVerifyOpen(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-black"
                aria-label="Tutup"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold mb-4" style={{ color: colors.text }}>
                Verifikasi Pembayaran
              </h3>
              <label className="block mb-2 text-sm font-medium" style={{ color: colors.text }}>
                Nama admin yang memverifikasi
              </label>
              <input
                type="text"
                value={approvedByInput}
                onChange={(e) => setApprovedByInput(e.target.value)}
                placeholder="Contoh: Admin Rani"
                className="w-full border px-3 py-2 rounded-lg focus:outline-none"
                style={{ borderColor: colors.light }}
              />
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVerifyOpen(false)}
                  className="px-4 py-2 rounded-xl border"
                  style={{ borderColor: colors.light, color: colors.text }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => void submitVerify()}
                  disabled={!approvedByInput.trim()}
                  className="px-4 py-2 rounded-xl text-white disabled:opacity-60"
                  style={{ background: "#16a34a" }}
                >
                  Simpan Verifikasi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* ================== Small UI Helpers ================== */

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  let bg = "#e5e7eb";
  let fg = "#374151";
  if (s === "success") {
    bg = "#dcfce7";
    fg = "#166534";
  } else if (s === "pending") {
    bg = "#fef9c3";
    fg = "#854d0e";
  } else if (s === "failed") {
    bg = "#fee2e2";
    fg = "#991b1b";
  }
  return (
    <span className="px-2 py-1 text-xs font-bold rounded-lg" style={{ background: bg, color: fg }}>
      {status}
    </span>
  );
}

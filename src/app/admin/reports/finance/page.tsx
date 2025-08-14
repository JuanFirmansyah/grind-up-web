"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { X } from "lucide-react";
import * as XLSX from "xlsx";

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

export default function ReportFinancePage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<Payment[]>([]);

  const skeletonCount = 6;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "payments"));
      const data: Payment[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        data.push({
          id: docSnap.id,
          userId: d.userId,
          packageName: d.packageName || "-",
          price: d.price,
          method: d.method,
          status: d.status || "-",
          proofUrl: d.proofUrl || "",
          createdAt: d.createdAt?.toDate?.() || new Date(),
          approvedBy: d.approvedBy || "-",
          approvedAt: d.approvedAt?.toDate?.(),
          expiresAt: d.expiresAt?.toDate?.(),
        });
      });
      setPayments(data.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime()));
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    setFiltered(
      payments.filter((p) =>
        (p.userId + p.packageName + p.method + p.status + p.approvedBy)
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    );
  }, [payments, search]);

  async function verifyPayment(id: string) {
    const approvedBy = prompt("Masukkan nama admin yang memverifikasi:");
    if (!approvedBy) return;

    await updateDoc(doc(db, "payments", id), {
      status: "success",
      approvedBy,
      approvedAt: Timestamp.now(),
    });

    const updatedPayments = payments.map((p) =>
      p.id === id
        ? { ...p, status: "success", approvedBy, approvedAt: new Date() }
        : p
    );
    setPayments(updatedPayments);
  }

  function exportToExcel() {
    const dataExport = filtered.map((item, i) => ({
      No: i + 1,
      UID: item.userId,
      Paket: item.packageName,
      Harga: item.price,
      Metode: item.method,
      Status: item.status,
      Dibuat: item.createdAt ? format(new Date(item.createdAt), "dd MMM yyyy HH:mm") : "-",
      Disetujui: item.approvedBy || "-",
      TanggalDisetujui: item.approvedAt ? format(new Date(item.approvedAt), "dd MMM yyyy HH:mm") : "-",
      Expired: item.expiresAt ? format(new Date(item.expiresAt), "dd MMM yyyy") : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    XLSX.writeFile(workbook, `Laporan_Pembayaran_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative">
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

      <div className="flex-1 p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-gray-800 drop-shadow-sm">
          Laporan Keuangan / Pembayaran Member
        </h1>
        <div className="mb-6 flex flex-wrap gap-2 items-center justify-between">
          <input
            type="text"
            className="input input-bordered w-full md:w-1/3"
            placeholder="Cari UID/paket/metode/status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="bg-[#97CCDD] hover:bg-[#1CB5E0] text-white px-4 py-2 rounded-lg font-semibold shadow transition"
            >
              Export Excel
            </button>
            <div className="text-gray-500 text-sm">
              Total transaksi: <b>{payments.length}</b>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto bg-white border rounded-xl shadow-lg">
          <table className="w-full table-auto">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl">
              <tr>
                <th className="p-4 text-left">UID</th>
                <th className="p-4 text-left">Paket</th>
                <th className="p-4 text-left">Harga</th>
                <th className="p-4 text-left">Metode</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Approved By</th>
                <th className="p-4 text-left">Bukti</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: skeletonCount }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    Tidak ada data pembayaran.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="border-b hover:bg-blue-50/30"
                  >
                    <td className="p-4">{p.userId}</td>
                    <td className="p-4">{p.packageName}</td>
                    <td className="p-4 font-bold text-green-700">
                      {typeof p.price === "number" ? `Rp${p.price.toLocaleString()}` : "-"}
                    </td>
                    <td className="p-4">{p.method}</td>
                    <td className="p-4">{p.status}</td>
                    <td className="p-4">{p.approvedBy}</td>
                    <td className="p-4">
                      {p.proofUrl ? (
                        <button
                          onClick={() => setModalImg(p.proofUrl!)}
                          className="underline text-blue-600 hover:text-blue-800 font-medium"
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
                          onClick={() => verifyPayment(p.id)}
                          className="text-sm px-3 py-1 rounded-lg bg-green-500 text-white hover:bg-green-600"
                        >
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

      <AnimatePresence>
        {modalImg && (
          <motion.div
            key="modal-img"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
            onClick={() => setModalImg(null)}
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
                onClick={() => setModalImg(null)}
                className="absolute top-2 right-2 text-gray-600 hover:text-black"
              >
                <X className="w-6 h-6" />
              </button>
              <Image
                src={modalImg}
                alt="Bukti Pembayaran"
                width={380}
                height={300}
                className="rounded-xl w-full h-auto object-contain max-h-[75vh] mx-auto"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

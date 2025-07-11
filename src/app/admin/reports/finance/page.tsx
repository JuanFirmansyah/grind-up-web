"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
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
  memberId: string;
  name: string;
  payMonth: number;
  nominal: number;
  paidAt: Date;
  expiredAt: string;
  admin: string;
  imageURL?: string;
  packageName?: string; // Jika di Firestore ada, silakan aktifkan/isi!
  status?: string;      // Jika di Firestore ada, silakan aktifkan/isi!
}

export default function ReportFinancePage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<Payment[]>([]);

  // SKELETON count
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
          memberId: d.memberId,
          name: d.name,
          payMonth: d.payMonth,
          nominal: d.nominal,
          paidAt: d.paidAt?.toDate ? d.paidAt.toDate() : new Date(),
          expiredAt: d.expiredAt,
          admin: d.admin || "-",
          imageURL: d.imageURL || "",
          packageName: d.packageName || "-", // <-- opsional, aman walau tidak ada
          status: d.status || "-",           // <-- opsional, aman walau tidak ada
        });
      });
      setPayments(data.sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime()));
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    setFiltered(
      payments.filter((p) =>
        (p.name + p.memberId + p.nominal + p.admin)
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    );
  }, [payments, search]);

  // EXPORT EXCEL
  function exportToExcel() {
    // Export hanya data yang di-filter, kalau mau semua pakai: payments
    const dataExport = filtered.map((item, i) => ({
      No: i + 1,
      Nama: item.name,
      Paket: item.packageName || "-",
      Nominal: item.nominal,
      Tanggal: item.paidAt ? format(new Date(item.paidAt), "dd MMM yyyy HH:mm") : "-",
      Bulan: item.payMonth,
      Expired: item.expiredAt ? format(new Date(item.expiredAt), "dd MMM yyyy") : "-",
      Admin: item.admin,
      Status: item.status || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");

    XLSX.writeFile(workbook, `Laporan_Pembayaran_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative">
      {/* SIDEBAR & TOPBAR */}
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

      {/* CONTENT */}
      <div className="flex-1 p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-gray-800 drop-shadow-sm">
          Laporan Keuangan / Pembayaran Member
        </h1>
        <div className="mb-6 flex flex-wrap gap-2 items-center justify-between">
          <input
            type="text"
            className="input input-bordered w-full md:w-1/3"
            placeholder="Cari nama/member/nilai/admin"
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
                <th className="p-4 font-semibold text-left">Nama Member</th>
                <th className="p-4 font-semibold text-left">Tanggal Bayar</th>
                <th className="p-4 font-semibold text-left">Nominal</th>
                <th className="p-4 font-semibold text-left">Bulan</th>
                <th className="p-4 font-semibold text-left">Expired Baru</th>
                <th className="p-4 font-semibold text-left">Admin</th>
                <th className="p-4 font-semibold text-left">Bukti Bayar</th>
                <th className="p-4 font-semibold text-left">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: skeletonCount }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="p-4">
                          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0 ? (
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
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="border-b last:border-b-0 hover:bg-blue-50/30"
                      >
                        <td className="p-4">{p.name}</td>
                        <td className="p-4">
                          {format(new Date(p.paidAt), "dd MMM yyyy HH:mm")}
                        </td>
                        <td className="p-4 font-bold text-green-700">
                          Rp{p.nominal.toLocaleString()}
                        </td>
                        <td className="p-4">{p.payMonth} Bulan</td>
                        <td className="p-4">{format(new Date(p.expiredAt), "dd MMM yyyy")}</td>
                        <td className="p-4">{p.admin}</td>
                        <td className="p-4">
                          {p.imageURL ? (
                            <button
                              onClick={() => setModalImg(p.imageURL!)}
                              className="underline text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Lihat
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <a
                            href={`/admin/invoice/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-[#97CCDD] font-bold hover:text-blue-700 transition"
                          >
                            Invoice
                          </a>
                        </td>
                      </motion.tr>
                    ))
                  )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL Bukti Pembayaran */}
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

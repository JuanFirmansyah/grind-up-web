// src/app/admin/reports/attendance/page.tsx

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket Membership", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
];

interface Attendance {
  id: string;
  memberId?: string;
  name?: string;
  checkInAt?: string | number; // Date string/timestamp
  checkOutAt?: string | number;
  className?: string;
}

export default function AttendanceReportPage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(""); // yyyy-mm-dd
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    async function fetchAttendance() {
      setLoading(true);
      const snap = await getDocs(collection(db, "attendance"));
      const data: Attendance[] = [];
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setAttendances(data);
      setLoading(false);
    }
    fetchAttendance();
  }, []);

  // --- Filter Logic ---
  const filtered = attendances.filter(a => {
    // Search by name
    const q = search.toLowerCase();
    const match = a.name?.toLowerCase().includes(q) || a.memberId?.includes(q);
    // Filter by date
    let dateOk = true;
    if (date && a.checkInAt) {
      const dt = new Date(a.checkInAt);
      dateOk = dt.toISOString().slice(0, 10) === date;
    }
    return match && dateOk;
  });

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-blue-50">
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />

      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Laporan Kehadiran</h1>
        {/* --- Search & Filter --- */}
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Cari nama/member ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/3"
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-48"
          />
        </div>
        {/* --- Table --- */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-lg border border-blue-100">
            <table className="min-w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-blue-50">
                  <th className="p-3 text-left">Nama</th>
                  <th className="p-3 text-left">Tanggal & Jam Masuk</th>
                  <th className="p-3 text-left">Kelas</th>
                  <th className="p-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">
                      Tidak ada data kehadiran.
                    </td>
                  </tr>
                )}
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="p-3">{a.name || "-"}</td>
                    <td className="p-3">{a.checkInAt ? formatDateTime(a.checkInAt) : "-"}</td>
                    <td className="p-3">{a.className || "-"}</td>
                    <td className="p-3">
                      {/* Tambah tombol aksi detail/edit kalau perlu */}
                      {/* <button className="px-2 py-1 rounded bg-blue-500 text-white text-xs">Detail</button> */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

// Utility format tanggal & jam
function formatDateTime(dt?: string | number) {
  if (!dt) return "-";
  const date = new Date(dt);
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

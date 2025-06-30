"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { CheckCircle, XCircle } from "lucide-react";

// --- NAV ITEMS ---
const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
];

// --- DATA TYPES ---
interface Attendance {
  id: string;
  memberName: string;
  className: string;
  date: string;
  status: string; // "present" | "absent" | dst
}

export default function AttendanceReportPage() {
  const [data, setData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // --- FETCH DATA ---
  useEffect(() => {
    async function fetchAttendance() {
      setLoading(true);
      const snap = await getDocs(collection(db, "attendances")); // <-- ganti nama collection jika perlu
      const arr: Attendance[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        arr.push({
          id: doc.id,
          memberName: d.memberName || "-",
          className: d.className || "-",
          date: d.date || "",
          status: d.status || "absent",
        });
      });
      setData(arr);
      setLoading(false);
    }
    fetchAttendance();
  }, []);

  // --- FILTERING ---
  const filtered = data.filter((a) => {
    // Search by member or class
    const q = search.toLowerCase();
    const byName = a.memberName.toLowerCase().includes(q) || a.className.toLowerCase().includes(q);
    // Date
    const byDate = dateFilter ? a.date.startsWith(dateFilter) : true;
    // Status
    let byStatus = true;
    if (statusFilter !== "all") byStatus = a.status === statusFilter;
    return byName && byDate && byStatus;
  });

  // --- RENDER ---
  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-blue-50">
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />

      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Laporan Kehadiran</h1>
        {/* Filter/Search */}
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Cari nama member / kelas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/3"
          />
          <input
            type="date"
            className="border px-2 py-2 rounded w-full md:w-48"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
          <select
            className="border px-2 py-2 rounded w-full md:w-48"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Semua Status</option>
            <option value="present">Hadir</option>
            <option value="absent">Tidak Hadir</option>
          </select>
        </div>
        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-lg border border-blue-100">
            <table className="min-w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-blue-50">
                  <th className="p-3 text-left">Tanggal</th>
                  <th className="p-3 text-left">Nama Member</th>
                  <th className="p-3 text-left">Nama Kelas</th>
                  <th className="p-3 text-left">Status</th>
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
                    <td className="p-3">{formatDate(a.date)}</td>
                    <td className="p-3">{a.memberName}</td>
                    <td className="p-3">{a.className}</td>
                    <td className="p-3">
                      {a.status === "present" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-600 rounded text-xs">
                          <CheckCircle className="w-4 h-4" /> Hadir
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-500 rounded text-xs">
                          <XCircle className="w-4 h-4" /> Tidak Hadir
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs p-3 text-gray-400">
              Filter berdasarkan tanggal, nama, status hadir/tidak hadir.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// --- Utility ---
function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

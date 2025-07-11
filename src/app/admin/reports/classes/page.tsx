// src/app/admin/reports/class/page.tsx

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { Eye } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket Membership", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
];

// Ganti category -> level
interface ClassReport {
  id: string;
  className?: string;
  level?: string;
  coach?: string;
  schedule?: string;
  participantCount?: number;
}

export default function ClassReportPage() {
  const [classes, setClasses] = useState<ClassReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // Daftar level (kalau mau dinamis, bisa ambil dari data, di sini hardcode dulu)
  const levels = ["all", "Beginner", "Intermediate", "Advanced", "All Level"];

  useEffect(() => {
    async function fetchClasses() {
      setLoading(true);
      const snap = await getDocs(collection(db, "classes"));
      const data: ClassReport[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        data.push({
          id: doc.id,
          className: d.className || "-",
          level: d.level || "All Level",
          coach: d.coach || "-",
          schedule: d.schedule || "-",
          participantCount: d.participantCount || 0,
        });
      });
      setClasses(data);
      setLoading(false);
    }
    fetchClasses();
  }, []);

  const filtered = classes.filter(cls => {
    const q = search.toLowerCase();
    const match = cls.className?.toLowerCase().includes(q);
    const matchLevel = levelFilter === "all" || (cls.level && cls.level === levelFilter);
    return match && matchLevel;
  });

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-blue-50">
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />

      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Laporan Kelas</h1>
        {/* --- Search & Filter --- */}
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Cari nama kelas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/3"
          />
          <select
            className="border px-2 py-2 rounded w-full md:w-48"
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
          >
            {levels.map(lvl => (
              <option key={lvl} value={lvl}>{lvl === "all" ? "Semua Level" : lvl}</option>
            ))}
          </select>
        </div>
        {/* --- Table --- */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-blue-100 rounded animate-pulse w-full mb-2" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-lg border border-blue-100">
            <table className="min-w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-blue-50">
                  <th className="p-3 text-left">Nama Kelas</th>
                  <th className="p-3 text-left">Level</th>
                  <th className="p-3 text-left">Pelatih</th>
                  <th className="p-3 text-left">Jadwal</th>
                  <th className="p-3 text-left">Peserta</th>
                  <th className="p-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-400">
                      Tidak ada data kelas.
                    </td>
                  </tr>
                )}
                {filtered.map(cls => (
                  <tr key={cls.id}>
                    <td className="p-3">{cls.className}</td>
                    <td className="p-3">{cls.level}</td>
                    <td className="p-3">{cls.coach}</td>
                    <td className="p-3">{cls.schedule}</td>
                    <td className="p-3">{cls.participantCount}</td>
                    <td className="p-3">
                      <button
                        onClick={() => alert("Fitur detail belum dibuat!")}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-blue-500 hover:bg-blue-700 text-white text-xs"
                      >
                        <Eye className="w-4 h-4" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs p-3 text-gray-400">
              Tampilkan daftar kelas beserta level, pelatih, jadwal, dan jumlah peserta. Tersedia filter level & search.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

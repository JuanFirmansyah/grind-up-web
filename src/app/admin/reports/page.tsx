// src/app/admin/reports/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
];

const reportMenus = [
  {
    title: "Laporan Member",
    desc: "Statistik pertumbuhan, aktivitas, dan status member.",
    href: "/admin/reports/members",
  },
  {
    title: "Laporan Kelas",
    desc: "Data kehadiran dan popularitas kelas.",
    href: "/admin/reports/classes",
  },
  {
    title: "Laporan Keuangan",
    desc: "Rekap pemasukan dari membership dan kelas.",
    href: "/admin/reports/finance",
  },
  {
    title: "Laporan Personal Trainer",
    desc: "Sesi dan pendapatan pelatih pribadi.",
    href: "/admin/reports/personal-trainer",
  },
  {
    title: "Laporan Fasilitas",
    desc: "Statistik penggunaan gym/fasilitas.",
    href: "/admin/reports/facilities",
  },
];

export default function ReportsMenuPage() {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-blue-50">
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />

      <div className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Menu Laporan</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportMenus.map((menu) => (
            <div
              key={menu.href}
              className="p-6 bg-white rounded-2xl shadow-lg border border-blue-100 hover:shadow-xl hover:bg-blue-50 cursor-pointer flex flex-col gap-2 transition"
              onClick={() => router.push(menu.href)}
            >
              <span className="text-xl font-semibold text-blue-700">{menu.title}</span>
              <span className="text-gray-500">{menu.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

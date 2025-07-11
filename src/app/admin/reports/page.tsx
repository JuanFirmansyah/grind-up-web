"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import {
  Users,
  BarChart3,
  CreditCard,
  Briefcase,
  Building2,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket Membership", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
];

const reportMenus = [
  {
    title: "Laporan Member",
    desc: "Statistik pertumbuhan, aktivitas, dan status member.",
    href: "/admin/reports/members",
    icon: Users,
  },
  {
    title: "Laporan Kelas",
    desc: "Data kehadiran dan popularitas kelas.",
    href: "/admin/reports/classes",
    icon: BarChart3,
  },
  {
    title: "Laporan Keuangan",
    desc: "Rekap pemasukan dari membership dan kelas.",
    href: "/admin/reports/finance",
    icon: CreditCard,
  },
  {
    title: "Laporan Personal Trainer",
    desc: "Sesi dan pendapatan pelatih pribadi.",
    href: "/admin/reports/personal-trainer",
    icon: Briefcase,
  },
  {
    title: "Laporan Fasilitas",
    desc: "Statistik penggunaan gym/fasilitas.",
    href: "/admin/reports/facilities",
    icon: Building2,
  },
];

export default function ReportsMenuPage() {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-blue-50">
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
      />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />

      <div className="flex-1 p-4 md:p-8">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-3xl font-bold mb-10 text-gray-900"
        >
          Menu Laporan
        </motion.h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {reportMenus.map((menu, i) => (
            <motion.div
              key={menu.href}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 90 }}
              whileHover={{
                scale: 1.045,
                boxShadow: "0px 6px 28px 0px #90c9ee35",
                backgroundColor: "#e9f5fc",
              }}
              onClick={() => router.push(menu.href)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") router.push(menu.href);
              }}
              className="group p-7 bg-white rounded-2xl shadow-lg border border-blue-100 cursor-pointer flex flex-col gap-4 outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <span className="bg-blue-100 rounded-xl p-3">
                  <menu.icon className="w-8 h-8 text-blue-600 group-hover:text-blue-800 transition" />
                </span>
                <span className="text-xl font-semibold text-blue-800">{menu.title}</span>
              </div>
              <span className="text-gray-500 mt-1">{menu.desc}</span>
              <span className="mt-2 ml-auto flex items-center gap-2 text-blue-600 group-hover:gap-3 transition-all font-medium text-sm">
                Lihat Detail
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}

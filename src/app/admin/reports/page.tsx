// src/app/admin/reports/page.tsx
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

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Absensi", href: "/admin/attendance" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket Membership", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
  { label: "Galeri", href: "/admin/gallery" },
];

const reportMenus = [
  {
    title: "Laporan Member",
    desc: "Statistik pertumbuhan, aktivitas, dan status member.",
    href: "/admin/reports/members",
    icon: Users,
    badge: "Populer",
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
    badge: "Keuangan",
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
    <main
      className="min-h-screen flex flex-col md:flex-row relative"
      style={{
        background:
          `linear-gradient(135deg, ${colors.light}20 0%, #ffffff 35%, ${colors.base}20 100%)`,
      }}
    >
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
      />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />

      <div className="flex-1 p-4 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8"
        >
          <div
            className="rounded-2xl px-5 py-4 shadow-md border"
            style={{
              background: `linear-gradient(90deg, ${colors.darker} 0%, ${colors.dark} 100%)`,
              color: colors.textLight,
              borderColor: colors.light,
            }}
          >
            <h1 className="text-2xl md:text-3xl font-extrabold">Menu Laporan</h1>
            <p className="opacity-90 mt-1 text-sm md:text-base">
              Pilih kategori laporan untuk melihat detail statistik & rekap.
            </p>
          </div>
        </motion.div>

        {/* Grid menu cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {reportMenus.map((menu, i) => (
            <motion.button
              key={menu.href}
              type="button"
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 90, damping: 14 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => router.push(menu.href)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") router.push(menu.href);
              }}
              className="group text-left cursor-pointer outline-none focus-visible:ring-2 rounded-2xl"
              style={{ focusRingColor: colors.base } as unknown as React.CSSProperties}
            >
              <div
                className="p-6 rounded-2xl shadow-lg border transition-all duration-200 h-full flex flex-col gap-4"
                style={{
                  background: "#ffffff",
                  borderColor: colors.light,
                }}
              >
                <div className="flex items-center gap-4">
                  <span
                    className="rounded-xl p-3 shrink-0"
                    style={{ background: `${colors.base}30` }}
                  >
                    <menu.icon
                      className="w-8 h-8 transition-colors"
                      style={{ color: colors.darker }}
                    />
                  </span>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-lg md:text-xl font-semibold"
                        style={{ color: colors.text }}
                      >
                        {menu.title}
                      </span>
                      {menu.badge && (
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide"
                          style={{
                            background: colors.accent,
                            color: colors.textLight,
                          }}
                        >
                          {menu.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
                      {menu.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between">
                  <div
                    className="h-1 rounded-full w-2/3 transition-all"
                    style={{
                      background: `linear-gradient(90deg, ${colors.base}, ${colors.light})`,
                    }}
                  />
                  <span
                    className="inline-flex items-center gap-2 text-sm font-medium transition-all"
                    style={{ color: colors.darker }}
                  >
                    Lihat Detail
                    <svg
                      className="w-5 h-5 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Tabel contoh (consistency preview) */}
        <div className="mt-10">
          <div
            className="rounded-t-2xl px-5 py-3 text-sm font-semibold"
            style={{
              background: `linear-gradient(90deg, ${colors.darker}, ${colors.dark})`,
              color: colors.textLight,
            }}
          >
            Ringkasan Singkat (Preview Style Tabel)
          </div>
          <div
            className="overflow-x-auto rounded-b-2xl border bg-white shadow-sm"
            style={{ borderColor: colors.light }}
          >
            <table className="w-full table-auto">
              <thead style={{ background: `${colors.base}25` }}>
                <tr>
                  <th className="p-3 text-left text-sm" style={{ color: colors.text }}>
                    Kategori
                  </th>
                  <th className="p-3 text-left text-sm" style={{ color: colors.text }}>
                    Keterangan
                  </th>
                  <th className="p-3 text-left text-sm" style={{ color: colors.text }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportMenus.map((m) => (
                  <tr key={`row-${m.href}`} className="border-t" style={{ borderColor: colors.light }}>
                    <td className="p-3 font-semibold" style={{ color: colors.darker }}>
                      {m.title}
                    </td>
                    <td className="p-3 text-sm text-gray-600">{m.desc}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => router.push(m.href)}
                        className="px-3 py-1.5 rounded-lg text-white text-sm shadow-sm hover:shadow transition"
                        style={{ background: colors.darker }}
                      >
                        Buka
                      </button>
                    </td>
                  </tr>
                ))}
                {reportMenus.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={3}>
                      Belum ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}

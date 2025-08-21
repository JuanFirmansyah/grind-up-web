// src\app\admin\classes\page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminSidebar } from "@/components/AdminSidebar";
import RegulerTab from "./tabs/RegulerTab";
import SpecialTab from "./tabs/SpecialTab";

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

type TabKey = "class" | "special";

export default function AdminClassesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("class");
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  const handleAdd = () => {
    if (activeTab === "class") router.push("/admin/classes/form");
    else if (activeTab === "special") router.push("/admin/classes/form?type=special");
  };

  const AddButtonLabel: Record<TabKey, string> = {
    class: "Tambah Kelas",
    special: "Tambah Special",
  };

  return (
    <main
      className="min-h-screen flex flex-col md:flex-row relative"
      style={{
        background: `linear-gradient(135deg, ${colors.light}20 0%, #ffffff 35%, ${colors.base}20 100%)`,
      }}
    >
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />

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
            <h1 className="text-2xl md:text-3xl font-extrabold">Manajemen Kelas</h1>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl shadow-md transition text-white hover:opacity-95"
              style={{ background: colors.complementary }}
              aria-label={AddButtonLabel[activeTab]}
              title={AddButtonLabel[activeTab]}
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{AddButtonLabel[activeTab]}</span>
            </button>
          </div>
          <p className="opacity-90 mt-1 text-sm md:text-base">
            Kelola Studio Class & Special Class. Akses member diatur dari menu <b>Paket Membership</b> (berdasarkan TAG).
          </p>
        </div>

        {/* Tabs */}
        <div
          className="sticky top-0 z-10 -mt-2 mb-6 pb-2 backdrop-blur supports-[backdrop-filter]:bg-white/70"
          style={{ borderBottom: `1px solid ${colors.light}` }}
        >
          <div className="flex flex-wrap gap-2">
            <TabButton
              active={activeTab === "class"}
              onClick={() => setActiveTab("class")}
              label="Studio Class"
              activeColor={colors.base}
              textColor={colors.text}
            />
            <TabButton
              active={activeTab === "special"}
              onClick={() => setActiveTab("special")}
              label="Special Class"
              activeColor={colors.accent}
              textColor={colors.text}
            />
          </div>
        </div>

        {/* Content */}
        <section aria-live="polite">
          {activeTab === "class" && <RegulerTab />}
          {activeTab === "special" && <SpecialTab />}
        </section>
      </div>
    </main>
  );
}

/* ================== Components ================== */

function TabButton({
  active,
  onClick,
  label,
  activeColor,
  textColor,
  darkText = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  activeColor: string;
  textColor: string;
  darkText?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "px-4 py-2 rounded-full font-semibold shadow transition-all duration-150 outline-none",
        "focus-visible:ring-2",
        active ? "scale-[1.02]" : "hover:scale-[1.01]",
      ].join(" ")}
      style={{
        background: active ? activeColor : "#ffffff",
        color: active ? (darkText ? colors.textLight : "#ffffff") : textColor,
        border: `1px solid ${active ? activeColor : colors.light}`,
      }}
    >
      {label}
    </button>
  );
}

// src/app/admin/classes/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Users } from "lucide-react";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminSidebar } from "@/components/AdminSidebar";
import ClassTable from "./components/ClassTable";
import ClassFilters from "./components/ClassFilters";

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

type TabKey = "regular" | "special";
type ViewMode = "table" | "grid";

export default function AdminClassesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("regular");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  const handleAdd = () => {
    router.push(`/admin/classes/form?type=${activeTab}`);
  };

  const AddButtonLabel: Record<TabKey, string> = {
    regular: "Tambah Kelas Regular",
    special: "Tambah Special Class",
  };

  const TabDescription: Record<TabKey, string> = {
    regular: "Kelas studio reguler dengan jadwal tetap. Member dapat booking berdasarkan paket membership mereka.",
    special: "Kelas khusus dengan tema spesial, workshop, atau event tertentu. Memiliki aturan akses khusus.",
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
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">Manajemen Kelas</h1>
              <p className="opacity-90 mt-1 text-sm md:text-base">
                Kelola Studio Class & Special Class. Akses member diatur dari menu <b>Paket Membership</b> (berdasarkan TAG).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl shadow-md transition text-white hover:opacity-95 whitespace-nowrap"
              style={{ background: colors.complementary }}
              aria-label={AddButtonLabel[activeTab]}
              title={AddButtonLabel[activeTab]}
            >
              <Plus className="w-5 h-5" />
              <span>{AddButtonLabel[activeTab]}</span>
            </button>
          </div>
        </div>

        {/* Tabs & Controls */}
        <div className="space-y-4 mb-6">
          {/* Tabs */}
          <div
            className="sticky top-0 z-10 -mt-2 pb-2 backdrop-blur supports-[backdrop-filter]:bg-white/70"
            style={{ borderBottom: `1px solid ${colors.light}` }}
          >
            <div className="flex flex-wrap gap-2 mb-4">
              <TabButton
                active={activeTab === "regular"}
                onClick={() => setActiveTab("regular")}
                label={
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Studio Class</span>
                  </div>
                }
                activeColor={colors.base}
                textColor={colors.text}
              />
              <TabButton
                active={activeTab === "special"}
                onClick={() => setActiveTab("special")}
                label={
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Special Class</span>
                  </div>
                }
                activeColor={colors.accent}
                textColor={colors.text}
              />
            </div>

            {/* Tab Description */}
            <p className="text-sm text-gray-600 mb-4">
              {TabDescription[activeTab]}
            </p>

            {/* View Controls & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "table" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Tabel
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "grid" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Grid
                </button>
              </div>

              {/* Filters */}
              <ClassFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <section aria-live="polite">
          <ClassTable
            type={activeTab}
            viewMode={viewMode}
            searchTerm={searchTerm}
            dateFilter={dateFilter}
          />
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
}: {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
  activeColor: string;
  textColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "px-4 py-3 rounded-xl font-semibold shadow transition-all duration-150 outline-none min-w-[140px]",
        "focus-visible:ring-2 focus-visible:ring-offset-2",
        active ? "scale-[1.02] shadow-md" : "hover:scale-[1.01] hover:shadow-sm",
      ].join(" ")}
      style={{
        background: active ? activeColor : "#ffffff",
        color: active ? "#ffffff" : textColor,
        border: `2px solid ${active ? activeColor : colors.light}`,
      }}
    >
      {label}
    </button>
  );
}
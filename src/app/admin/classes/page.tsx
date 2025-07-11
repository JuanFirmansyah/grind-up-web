// src/app/admin/classes/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminSidebar } from "@/components/AdminSidebar";
import RegulerTab from "./tabs/RegulerTab";
import BundlingTab from "./tabs/BundlingTab";
import SpecialTab from "./tabs/SpecialTab";


const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket Membership", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
];

export default function AdminClassesPage() {
  const [activeTab, setActiveTab] = useState<"reguler" | "special" | "bundling">("reguler");
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-blue-100">
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Manajemen Kelas</h1>
          {activeTab === "reguler" && (
            <button
              onClick={() => router.push("/admin/classes/form")}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl shadow-md hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Tambah Kelas</span>
            </button>
          )}
          {activeTab === "special" && (
            <button
              onClick={() => router.push("/admin/classes/form?type=special")}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 text-white px-5 py-3 rounded-xl shadow-md hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Tambah Special</span>
            </button>
          )}
          {activeTab === "bundling" && (
            <button
              onClick={() => router.push("/admin/classes/bundling-form")}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-5 py-3 rounded-xl shadow-md hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Tambah Paket</span>
            </button>
          )}
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("reguler")}
            className={`px-4 py-2 rounded-full font-semibold shadow transition-all duration-200 ${activeTab === "reguler" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-100"}`}
          >
            Reguler
          </button>
          <button
            onClick={() => setActiveTab("special")}
            className={`px-4 py-2 rounded-full font-semibold shadow transition-all duration-200 ${activeTab === "special" ? "bg-pink-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-100"}`}
          >
            Special Class
          </button>
          <button
            onClick={() => setActiveTab("bundling")}
            className={`px-4 py-2 rounded-full font-semibold shadow transition-all duration-200 ${activeTab === "bundling" ? "bg-purple-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-100"}`}
          >
            Paket Bundling
          </button>
        </div>

        {activeTab === "reguler" && <RegulerTab />}
        {activeTab === "special" && <SpecialTab />}
        {activeTab === "bundling" && <BundlingTab />}

      </div>
    </main>
  );
}

// src/app/admin/classes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminSidebar } from "@/components/AdminSidebar";
import RegulerTab from "./tabs/RegulerTab";
import BundlingTab from "./tabs/BundlingTab";

interface GymClass {
  id: string;
  className: string;
  date: string;
  time: string;
  coach: string;
  slots: number;
  type: string;
}

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
];

export default function AdminClassesPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"reguler" | "bundling">("reguler");


  const fetchClasses = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, "classes"));
    const data: GymClass[] = [];
    querySnapshot.forEach((docSnap) => {
      data.push({ id: docSnap.id, ...docSnap.data() } as GymClass);
    });
    setClasses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus kelas ini?")) {
      await deleteDoc(doc(db, "classes", id));
      fetchClasses();
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-blue-100">
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Manajemen Kelas</h1>
          <button
            onClick={() => router.push("/admin/classes/form")}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl shadow-md hover:scale-105 transition-transform"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Tambah Kelas</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl p-6 bg-gray-200 animate-pulse h-48 shadow-inner"
                ></div>
              ))
            : classes.map((cls, index) => (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="rounded-2xl p-6 bg-white border border-gray-200 shadow-md hover:shadow-xl transition-all group relative overflow-hidden"
                >
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-100 rounded-full blur-xl opacity-20"></div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-1 group-hover:text-blue-700 transition">
                    {cls.className}
                  </h2>
                  <p className="text-sm text-gray-600">Coach: <span className="font-medium text-gray-800">{cls.coach}</span></p>
                  <p className="text-sm text-gray-600">{cls.date} | {cls.time}</p>
                  <p className="text-sm text-gray-600">Slots: {cls.slots}</p>
                  <p className="text-sm text-gray-500 italic">Tipe: {cls.type}</p>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => router.push(`/admin/classes/form?id=${cls.id}`)}
                      className="p-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-full hover:scale-110 transition"
                      aria-label="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cls.id)}
                      className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full hover:scale-110 transition"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
        </div>

        <div className="p-6">
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setActiveTab("reguler")}
          className={`px-4 py-2 rounded ${activeTab === "reguler" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Reguler
        </button>
        <button
          onClick={() => setActiveTab("bundling")}
          className={`px-4 py-2 rounded ${activeTab === "bundling" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Paket Bundling
        </button>
      </div>

      {activeTab === "reguler" && <RegulerTab />}
      {activeTab === "bundling" && <BundlingTab />}
    </div>
      </div>
    </main>
  );
}

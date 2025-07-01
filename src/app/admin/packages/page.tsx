// src/app/admin/packages/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  tags: string[];
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchPackages = async () => {
      const snapshot = await getDocs(collection(db, "packages"));
      const data: Package[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Package[];
      setPackages(data);
    };

    fetchPackages();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
        ]}
      />
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
        ]}
      />

      <div className="p-6">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Manajemen Paket</h1>
          <button
            onClick={() => router.push("/admin/packages/form")}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl shadow"
          >
            <Plus className="w-4 h-4" /> Tambah Paket
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-xl shadow p-5 border hover:shadow-md transition"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-1">{pkg.name}</h2>
              <p className="text-gray-600 mb-2">{pkg.description}</p>
              <p className="text-indigo-700 font-semibold mb-3">Rp {pkg.price.toLocaleString()}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {pkg.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/admin/packages/form?id=${pkg.id}`)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white p-2 rounded-full"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => alert("Hapus belum diimplementasikan")}
                  className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

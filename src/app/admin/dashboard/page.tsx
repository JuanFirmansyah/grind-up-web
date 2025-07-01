// src/app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminTopbar } from "@/components/AdminTopbar";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalMembers: 0,
    upcomingClasses: 0,
    attendanceToday: 0,
  });
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await new Promise((res) => setTimeout(res, 1000));
        setStats({
          totalMembers: 120,
          upcomingClasses: 5,
          attendanceToday: 48,
        });
      } catch {
        setError("Gagal memuat data dashboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const Content = () => (
    <section className="flex-1 p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Total Member" value={stats.totalMembers} color="blue" />
        <Card title="Kelas Akan Datang" value={stats.upcomingClasses} color="green" />
        <Card title="Absensi Hari Ini" value={stats.attendanceToday} color="purple" />
      </div>
    </section>
  );

  if (loading) {
    return (
      <main className="flex">
        <AdminSidebar navItems={navItems} onLogout={handleLogout} showLogout />
        <section className="flex-1 p-6 animate-pulse space-y-6">
          <div className="h-10 w-1/3 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex">
        <AdminSidebar navItems={navItems} onLogout={handleLogout} showLogout />
        <section className="flex-1 flex flex-col items-center justify-center text-red-600">
          <p className="text-xl font-semibold animate-bounce">{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => router.refresh()}
          >
            Coba Lagi
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white">
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
        onLogout={handleLogout}
        showLogout
      />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} onLogout={handleLogout} showLogout />
      <Content />
    </main>
  );
}

function Card({ title, value, color }: { title: string; value: number | undefined; color: string }) {
  return (
    <div
      className={`p-6 rounded-xl shadow-md border-t-4 border-${color}-500 bg-${color}-50 text-${color}-700 transition-all hover:scale-[1.02]`}
    >
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

// src/app/admin/reports/member/page.tsx

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { PhoneCall, Clock } from "lucide-react";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";

// Navigation items, bisa copy dari project-mu
const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket Membership", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
];

// Define a type for Member
interface Member {
  id: string;
  name?: string;
  phone?: string;
  expiredAt?: string | number;
  role?: string;
  // Add other fields as needed
}

export default function MemberReportPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      const snap = await getDocs(collection(db, "members"));
      const data: Member[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.role === "member") {
          data.push({ id: doc.id, ...d });
        }
      });
      setMembers(data);
      setLoading(false);
    }
    fetchMembers();
  }, []);

  // --- Filter Function ---
  const filtered = members.filter((m) => {
    // Search by name or phone
    const q = search.toLowerCase();
    const match = m.name?.toLowerCase().includes(q) || m.phone?.includes(q);
    // Status
    const isExp = !!(m.expiredAt && new Date(m.expiredAt) < new Date());
    const days = m.expiredAt ? daysUntil(m.expiredAt) : null;
    const expSoon = days !== null && days <= 7 && days >= 0;
    let statusOk = true;
    if (statusFilter === "active") statusOk = !isExp;
    if (statusFilter === "expired") statusOk = isExp;
    if (statusFilter === "expiring") statusOk = expSoon && !isExp;
    return match && statusOk;
  });

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-blue-50">
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />

      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Laporan Member</h1>
        {/* --- Search & Filter --- */}
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Cari nama / nomor HP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/3"
          />
          <select
            className="border px-2 py-2 rounded w-full md:w-48"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="expiring">Akan Expired (&le; 7 hari)</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        {/* --- Table --- */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-lg border border-blue-100">
            <table className="min-w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-blue-50">
                  <th className="p-3 text-left">Nama</th>
                  <th className="p-3 text-left">HP</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Expired</th>
                  <th className="p-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-400">
                      Tidak ada data member.
                    </td>
                  </tr>
                )}
                {filtered.map((m) => {
                  const isExp = m.expiredAt && new Date(m.expiredAt) < new Date();
                  const days = m.expiredAt ? daysUntil(m.expiredAt) : null;
                  const expSoon = days !== null && days <= 7 && days >= 0;
                  return (
                    <tr key={m.id} className={expSoon ? "bg-yellow-50" : ""}>
                      <td className="p-3">{m.name}</td>
                      <td className="p-3">{m.phone || "-"}</td>
                      <td className="p-3">
                        {isExp ? (
                          <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-500">Expired</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-600">Aktif</span>
                        )}
                      </td>
                      <td className="p-3">
                        {m.expiredAt ? (
                          <span>
                            {formatDate(m.expiredAt)}
                            {expSoon && (
                              <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-700 rounded text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {days} hari lagi
                              </span>
                            )}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3">
                        {m.phone && (
                          <a
                            href={`https://wa.me/${m.phone.replace(/^0/, "62")}?text=Halo%20${encodeURIComponent(
                              m.name || ""
                            )}%2C%20masa%20aktif%20member%20gym%20Anda%20akan%20segera%20berakhir.%20Yuk%20perpanjang%20sekarang!`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded bg-green-500 hover:bg-green-600 text-white text-xs`}
                          >
                            <PhoneCall className="w-4 h-4" />
                            WhatsApp
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-xs p-3 text-gray-400">
              <b>Kuning</b>: masa aktif habis &le; 7 hari | <b>Expired</b>: masa aktif telah habis
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Utility function untuk format tanggal dan sisa hari
function formatDate(dateStr?: string | number): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function daysUntil(expiredAt: string | number) {
  const now = new Date();
  const exp = new Date(expiredAt);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

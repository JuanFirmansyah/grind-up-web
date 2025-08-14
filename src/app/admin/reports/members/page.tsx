// src/app/admin/reports/member/page.tsx

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { PhoneCall, Clock } from "lucide-react";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";

// Navigation items
const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket Membership", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
];

// ===== Types =====
type MaybeTimestamp = string | number | Date | Timestamp | null | undefined;

interface MemberDoc {
  name?: string;
  phone?: string;
  expiresAt?: MaybeTimestamp; // ✅ ganti field
  role?: string;
  // tambahkan field lain jika perlu
}

interface Member {
  id: string;
  name?: string;
  phone?: string;
  expiresAt?: MaybeTimestamp;
  role?: string;
}

// ===== Utils tanggal =====
function toDateValue(v: MaybeTimestamp): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDate(v?: MaybeTimestamp): string {
  const d = toDateValue(v ?? null);
  return d ? d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}

function daysUntil(v: MaybeTimestamp): number | null {
  const end = toDateValue(v);
  if (!end) return null;
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
      snap.forEach((docSnap) => {
        const d = docSnap.data() as MemberDoc;
        if (d.role === "member") {
          data.push({
            id: docSnap.id,
            name: d.name,
            phone: d.phone,
            role: d.role,
            expiresAt: d.expiresAt ?? null, // ✅ gunakan expiresAt
          });
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
    const match =
      (m.name?.toLowerCase().includes(q) ?? false) ||
      (m.phone?.includes(q) ?? false);

    // Status
    const isExpired = (() => {
      const end = toDateValue(m.expiresAt ?? null);
      return end ? end < new Date() : false;
    })();

    const dleft = daysUntil(m.expiresAt ?? null);
    const expSoon = dleft !== null && dleft <= 7 && dleft >= 0;

    let statusOk = true;
    if (statusFilter === "active") statusOk = !isExpired;
    if (statusFilter === "expired") statusOk = isExpired;
    if (statusFilter === "expiring") statusOk = expSoon && !isExpired;

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
                  const endDate = toDateValue(m.expiresAt ?? null);
                  const isExpired = endDate ? endDate < new Date() : false;
                  const dleft = daysUntil(m.expiresAt ?? null);
                  const expSoon = dleft !== null && dleft <= 7 && dleft >= 0;

                  return (
                    <tr key={m.id} className={expSoon ? "bg-yellow-50" : ""}>
                      <td className="p-3">{m.name}</td>
                      <td className="p-3">{m.phone || "-"}</td>
                      <td className="p-3">
                        {isExpired ? (
                          <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-500">Expired</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-600">Aktif</span>
                        )}
                      </td>
                      <td className="p-3">
                        {m.expiresAt ? (
                          <span>
                            {formatDate(m.expiresAt)}
                            {expSoon && (
                              <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-700 rounded text-xs inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {dleft} hari lagi
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
                            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-green-500 hover:bg-green-600 text-white text-xs"
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

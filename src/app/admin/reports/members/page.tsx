// src/app/admin/reports/member/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, type Timestamp, type DocumentData } from "firebase/firestore";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { motion } from "framer-motion";
import { PhoneCall, Clock, Search, Filter, Eye, SortAsc, DownloadCloud, Clipboard } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

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

// Navigation items
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

/* ================== Types ================== */
type MaybeTimestamp = string | number | Date | Timestamp | null | undefined;

interface UserRaw extends DocumentData {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: "aktif" | "non-aktif";
  isVerified?: boolean;
  createdAt?: MaybeTimestamp;
  expiresAt?: MaybeTimestamp; // standar baru
  expiredAt?: MaybeTimestamp; // fallback lama
  memberType?: string; // id paket
  photoURL?: string | null;
}

interface MemberRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "aktif" | "non-aktif";
  isVerified: boolean;
  createdAt?: MaybeTimestamp;
  expiresAt?: MaybeTimestamp;
  memberType?: string; // id paket
  packageName?: string; // resolved
}

/* ================== Utils Tanggal ================== */
function toDateValue(v: MaybeTimestamp): Date | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if ((v as Timestamp)?.toDate) return (v as Timestamp).toDate();
  if (typeof v === "number" || typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDate(v: MaybeTimestamp, locale = "id-ID"): string {
  const d = toDateValue(v);
  return d
    ? d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
    : "-";
}

function daysUntil(v: MaybeTimestamp): number | null {
  const endDate = toDateValue(v);
  if (!endDate) return null;
  const now = new Date();
  return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

type StatusFilter = "all" | "active" | "expiring" | "expired";
type VerifyFilter = "all" | "verified" | "unverified";
type SortMode = "name_asc" | "expiry_asc";

type WaTemplateKey = "expiring" | "expired" | "welcome" | "thanks" | "custom";

const WA_TEMPLATES: Record<WaTemplateKey, string> = {
  expiring:
    "Halo {name}, masa aktif membership Anda akan segera berakhir dalam {days} hari. Yuk perpanjang sekarang agar tetap konsisten latihan! 💪",
  expired:
    "Halo {name}, masa aktif membership Anda telah berakhir. Ayo aktifkan kembali membership Anda dan mulai latihan lagi! 💪",
  welcome:
    "Halo {name}, selamat bergabung di Grind Up Fitness! Semoga latihannya menyenangkan dan konsisten ya! 🙌",
  thanks:
    "Halo {name}, terima kasih atas kepercayaannya. Semoga latihannya makin semangat! 🙌",
  custom: "",
};

export default function MemberReportPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);

  // controls
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [verifyFilter, setVerifyFilter] = useState<VerifyFilter>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name_asc");

  // WhatsApp template (global)
  const [waTemplate, setWaTemplate] = useState<WaTemplateKey>("expiring");
  const [waCustom, setWaCustom] = useState<string>("");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Fetch packages (id -> name)
      const pkgSnap = await getDocs(collection(db, "membership_packages"));
      const pkgMap: Record<string, string> = {};
      pkgSnap.forEach((d) => {
        const name = (d.data()?.name as string) || "";
        if (name) pkgMap[d.id] = name;
      });

      // Fetch users, filter role member
      const userSnap = await getDocs(collection(db, "users"));
      const rows: MemberRow[] = [];
      userSnap.forEach((docSnap) => {
        const d = docSnap.data() as UserRaw;
        if ((d.role || "").toLowerCase() === "member") {
          const expires = d.expiresAt ?? d.expiredAt ?? null;
          const typeId = d.memberType ?? "";
          rows.push({
            id: docSnap.id,
            name: d.name || "-",
            email: d.email || "-",
            phone: d.phone || "-",
            role: d.role || "member",
            status: (d.status as "aktif" | "non-aktif") || "non-aktif",
            isVerified: Boolean(d.isVerified),
            createdAt: d.createdAt ?? null,
            expiresAt: expires,
            memberType: typeId,
            packageName: typeId ? pkgMap[typeId] : undefined,
          });
        }
      });

      setMembers(rows);
      setLoading(false);
    };

    void fetchAll();
  }, []);

  // derive packages list for filter
  const packageOptions = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.packageName) set.add(m.packageName);
    });
    return ["all", ...Array.from(set)];
  }, [members]);

  // filtering + sorting
  const filteredSorted = useMemo(() => {
    const term = search.trim().toLowerCase();

    const base = members.filter((m) => {
      const matchSearch =
        !term ||
        m.name.toLowerCase().includes(term) ||
        (m.email || "").toLowerCase().includes(term) ||
        (m.phone || "").toLowerCase().includes(term) ||
        (m.packageName || "").toLowerCase().includes(term);

      const endDate = toDateValue(m.expiresAt);
      const dleft = daysUntil(m.expiresAt);
      const isExpired = endDate ? endDate < new Date() : false;
      const expSoon = dleft !== null && dleft <= 7 && dleft >= 0;
      const isActive = !isExpired;

      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? isActive
          : statusFilter === "expiring"
          ? expSoon && isActive
          : isExpired;

      const matchVerify =
        verifyFilter === "all"
          ? true
          : verifyFilter === "verified"
          ? m.isVerified
          : !m.isVerified;

      const matchPackage =
        packageFilter === "all" ? true : (m.packageName || "") === packageFilter;

      return matchSearch && matchStatus && matchVerify && matchPackage;
    });

    const sorted = [...base].sort((a, b) => {
      if (sortMode === "name_asc") {
        return a.name.localeCompare(b.name, "id", { sensitivity: "base" });
      }
      // expiry_asc: yang paling dekat habis dulu, null di belakang
      const ad = toDateValue(a.expiresAt);
      const bd = toDateValue(b.expiresAt);
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return ad.getTime() - bd.getTime();
    });

    return sorted;
  }, [members, search, statusFilter, verifyFilter, packageFilter, sortMode]);

  // pagination derive
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const paginated = filteredSorted.slice((page - 1) * pageSize, page * pageSize);

  // stats
  const stat = useMemo(() => {
    let total = 0;
    let active = 0;
    let expiring = 0;
    let expired = 0;

    members.forEach((m) => {
      total += 1;
      const d = toDateValue(m.expiresAt);
      const left = daysUntil(m.expiresAt);
      const isExp = d ? d < new Date() : false;
      if (isExp) expired += 1;
      else {
        active += 1;
        if (left !== null && left <= 7 && left >= 0) expiring += 1;
      }
    });

    return { total, active, expiring, expired };
  }, [members]);

  function buildWaMessage(member: MemberRow): string {
    const left = daysUntil(member.expiresAt) ?? 0;
    const name = member.name || "Member";
    const template = waTemplate === "custom" ? waCustom : WA_TEMPLATES[waTemplate];
    return template.replaceAll("{name}", name).replaceAll("{days}", String(left)).trim();
  }

  function exportToExcel() {
    const rows = filteredSorted.map((m, i) => {
      const left = daysUntil(m.expiresAt);
      return {
        No: i + 1,
        Nama: m.name,
        Email: m.email,
        HP: m.phone,
        Paket: m.packageName || "-",
        Status: m.status,
        Verifikasi: m.isVerified ? "Terverifikasi" : "Belum",
        Daftar: formatDate(m.createdAt),
        Expired: formatDate(m.expiresAt),
        "Sisa Hari": left ?? "-",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Member");
    const fname = `Laporan_Member_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}.xlsx`;
    XLSX.writeFile(wb, fname);
  }

  async function copyTemplateToClipboard() {
    const demo: MemberRow | undefined = filteredSorted[0];
    const sampleText =
      demo ? buildWaMessage(demo) : waTemplate === "custom" ? waCustom : WA_TEMPLATES[waTemplate];
    try {
      await navigator.clipboard.writeText(sampleText);
    } catch {
      // noop
    }
  }

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
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-6"
        >
          <div
            className="rounded-2xl px-5 py-4 shadow-md border flex flex-col gap-3"
            style={{
              background: `linear-gradient(90deg, ${colors.darker} 0%, ${colors.dark} 100%)`,
              color: colors.textLight,
              borderColor: colors.light,
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold">Laporan Member</h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportToExcel}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl shadow-md transition text-white hover:opacity-95"
                  style={{ background: colors.complementary }}
                  aria-label="Export Excel"
                  title="Export Excel"
                >
                  <DownloadCloud className="w-5 h-5" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>
            <p className="opacity-90 text-sm md:text-base">
              Pantau status masa aktif, verifikasi, paket, dan info kontak member (role: <b>member</b>).
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total Member" value={stat.total} chip="Semua" chipColor={colors.base} />
          <StatCard label="Aktif" value={stat.active} chip="Aktif" chipColor="#22c55e" />
          <StatCard label="Akan Expired (≤7 hari)" value={stat.expiring} chip="Segera" chipColor="#f59e0b" />
          <StatCard label="Expired" value={stat.expired} chip="Expired" chipColor="#ef4444" />
        </div>

        {/* Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 w-full xl:max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama / email / HP / paket"
                className="w-full pl-9 pr-3 py-2 rounded-xl border shadow-sm focus:outline-none"
                style={{ borderColor: colors.light }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
              <Filter className="w-4 h-4" /> Filter:
            </span>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="border rounded-xl px-3 py-2"
              style={{ borderColor: colors.light }}
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="expiring">Akan Expired (≤7 hari)</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={verifyFilter}
              onChange={(e) => {
                setVerifyFilter(e.target.value as VerifyFilter);
                setPage(1);
              }}
              className="border rounded-xl px-3 py-2"
              style={{ borderColor: colors.light }}
            >
              <option value="all">Semua Verifikasi</option>
              <option value="verified">Terverifikasi</option>
              <option value="unverified">Belum Verifikasi</option>
            </select>

            <select
              value={packageFilter}
              onChange={(e) => {
                setPackageFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded-xl px-3 py-2"
              style={{ borderColor: colors.light }}
            >
              {packageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "Semua Paket" : opt}
                </option>
              ))}
            </select>

            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
              <SortAsc className="w-4 h-4" /> Sort:
            </span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="border rounded-xl px-3 py-2"
              style={{ borderColor: colors.light }}
            >
              <option value="name_asc">Nama (A → Z)</option>
              <option value="expiry_asc">Expired Terdekat</option>
            </select>
          </div>
        </div>

        {/* WhatsApp Templates (global) */}
        <div
          className="mb-4 rounded-2xl border bg-white p-3 shadow-sm flex flex-col gap-2"
          style={{ borderColor: colors.light }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-700">Template WhatsApp:</span>
            <select
              value={waTemplate}
              onChange={(e) => setWaTemplate(e.target.value as WaTemplateKey)}
              className="border rounded-xl px-3 py-2"
              style={{ borderColor: colors.light }}
            >
              <option value="expiring">Reminder: Akan Expired</option>
              <option value="expired">Reminder: Sudah Expired</option>
              <option value="welcome">Welcome</option>
              <option value="thanks">Terima kasih</option>
              <option value="custom">Custom</option>
            </select>
            <button
              type="button"
              onClick={() => void copyTemplateToClipboard()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white text-sm"
              style={{ background: colors.darker }}
              title="Salin contoh template ke clipboard"
              aria-label="Salin contoh template"
            >
              <Clipboard className="w-4 h-4" />
              Salin Template
            </button>
          </div>
          {waTemplate === "custom" && (
            <textarea
              value={waCustom}
              onChange={(e) => setWaCustom(e.target.value)}
              placeholder="Tulis template custom. Gunakan {name} dan {days} bila perlu."
              rows={2}
              className="w-full border px-3 py-2 rounded-xl focus:outline-none"
              style={{ borderColor: colors.light }}
            />
          )}
          <div className="text-xs text-gray-500">
            Variabel yang bisa dipakai: <code>{`{name}`}</code>, <code>{`{days}`}</code> (sisa hari menuju expired).
            Link WhatsApp di tabel akan memakai template yang kamu pilih ini.
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm" style={{ borderColor: colors.light }}>
          <table className="w-full table-auto">
            <thead
              style={{
                background: `linear-gradient(90deg, ${colors.darker}, ${colors.dark})`,
                color: colors.textLight,
              }}
            >
              <tr>
                <th className="p-4 text-left">Nama</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">HP</th>
                <th className="p-4 text-left">Paket</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Verifikasi</th>
                <th className="p-4 text-left">Daftar</th>
                <th className="p-4 text-left">Expired</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={`sk-${i}-${j}`} className="p-4">
                        <div className="h-5 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={9}>
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginated.map((m, idx) => {
                  const endDate = toDateValue(m.expiresAt);
                  const createdDate = toDateValue(m.createdAt);
                  const left = daysUntil(m.expiresAt);
                  const isExpired = endDate ? endDate < new Date() : false;
                  const expSoon = left !== null && left <= 7 && left >= 0;

                  const waText = buildWaMessage(m);
                  const waNumber = (m.phone || "").replace(/\s+/g, "").replace(/^0/, "62");
                  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;

                  return (
                    <motion.tr
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.01 }}
                      className="border-t hover:bg-gray-50"
                      style={{ borderColor: colors.light }}
                    >
                      <td className="p-4 font-semibold" style={{ color: colors.text }}>
                        {m.name}
                      </td>
                      <td className="p-4 text-gray-700">{m.email}</td>
                      <td className="p-4 text-gray-700">{m.phone}</td>
                      <td className="p-4">
                        {m.packageName ? (
                          <span
                            className="px-2 py-1 text-xs font-bold rounded-lg"
                            style={{ background: `${colors.base}25`, color: colors.darker }}
                          >
                            {m.packageName}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className="px-2 py-1 text-xs font-bold rounded-lg capitalize"
                          style={{
                            background: m.status === "aktif" ? "#dcfce7" : "#fee2e2",
                            color: m.status === "aktif" ? "#166534" : "#991b1b",
                          }}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className="px-2 py-1 text-xs font-bold rounded-lg"
                          style={{
                            background: m.isVerified ? "#dbeafe" : "#e5e7eb",
                            color: m.isVerified ? "#1e40af" : "#374151",
                          }}
                        >
                          {m.isVerified ? "Terverifikasi" : "Belum"}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-700">{formatDate(createdDate)}</td>
                      <td className="p-4">
                        {endDate ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-800">{formatDate(endDate)}</span>
                            {expSoon && (
                              <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded text-xs inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {left}h
                              </span>
                            )}
                            {isExpired && (
                              <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded text-xs">Expired</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {m.phone && m.phone !== "-" && (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm"
                              style={{ background: "#16a34a" }}
                              aria-label="Kirim WhatsApp"
                              title="Kirim WhatsApp"
                            >
                              <PhoneCall className="w-4 h-4" />
                              WhatsApp
                            </a>
                          )}
                          <Link
                            href={`/member/${m.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm"
                            style={{ background: colors.complementary }}
                            aria-label="Lihat Profil"
                            title="Lihat Profil"
                          >
                            <Eye className="w-4 h-4" />
                            Profil
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Menampilkan {paginated.length} dari {filteredSorted.length} member • Halaman {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
              style={{ borderColor: colors.light }}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
              style={{ borderColor: colors.light }}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ================== Small UI Components ================== */

function StatCard({
  label,
  value,
  chip,
  chipColor,
}: {
  label: string;
  value: number;
  chip: string;
  chipColor: string;
}) {
  return (
    <div className="rounded-2xl p-4 shadow-sm border bg-white" style={{ borderColor: colors.light }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-2xl font-extrabold" style={{ color: colors.text }}>
            {value}
          </div>
        </div>
        <span className="px-2 py-1 text-xs font-bold rounded-lg" style={{ background: chipColor, color: colors.textLight }}>
          {chip}
        </span>
      </div>
    </div>
  );
}

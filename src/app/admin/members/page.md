// src/app/admin/members/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminTopbar } from "@/components/AdminTopbar";
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  X,
  QrCode,
  DollarSign,
  Eye,
  UploadCloud,
  SortAsc,
  TimerReset,
  FileText,
  Download,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

/* ================== Color Palette ================== */
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

/* ============ Date helpers (tanpa any) ============ */
type DateLike =
  | Timestamp
  | { seconds: number; nanoseconds?: number }
  | string
  | number
  | Date
  | null
  | undefined;

function isTimestampLike(v: unknown): v is { seconds: number; nanoseconds?: number } {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.seconds === "number";
}
function hasToDate(v: unknown): v is { toDate: () => Date } {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.toDate === "function";
}
function toJSDate(v: DateLike): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (v instanceof Timestamp) return v.toDate();
  if (isTimestampLike(v)) {
    const ms = v.seconds * 1000 + ((v.nanoseconds ?? 0) / 1e6);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (hasToDate(v)) {
    const d = (v as { toDate: () => Date }).toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  return null;
}
function formatDate(v: DateLike, fmt = "dd MMM yyyy"): string {
  const d = toJSDate(v);
  return d ? format(d, fmt) : "-";
}

/* ================== Types ================== */
interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "aktif" | "non-aktif";
  activityScore?: number;
  createdAt?: DateLike;
  lastLogin?: DateLike;
  isVerified: boolean;
  deleted?: boolean;
  photoURL?: string | null;
  qrData?: string | null;
  expiresAt?: DateLike;
  memberType?: string; // id paket
}

interface UserRaw {
  name: string;
  email: string;
  phone: string;
  status: "aktif" | "non-aktif";
  activityScore?: number;
  createdAt?: DateLike;
  lastLogin?: DateLike;
  isVerified: boolean;
  deleted?: boolean;
  photoURL?: string | null;
  qrData?: string | null;
  expiresAt?: DateLike;
  expiredAt?: DateLike; // fallback lama
  memberType?: string;
}

interface MembershipPackageDoc {
  name?: string;
}
type PackageMap = Record<string, string>;

/* ================== Component ================== */
export default function AdminMembersPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [qrMemberName, setQrMemberName] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [packageMap, setPackageMap] = useState<PackageMap>({});
  const [sortMode, setSortMode] = useState<"name_asc" | "expiry_asc">("name_asc");
  const [onlyExpiringSoon, setOnlyExpiringSoon] = useState(false);
  const pageSize = 10;

  // State pembayaran
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payMonth, setPayMonth] = useState(1);
  const [payNominal, setPayNominal] = useState("");
  const [payFile, setPayFile] = useState<File | null>(null);
  const [payFilePreview, setPayFilePreview] = useState<string | null>(null);
  const [payFileError, setPayFileError] = useState<string>("");
  const [payNotes, setPayNotes] = useState<string>("");

  // Refs for QR export
  const qrCardRef = useRef<HTMLDivElement | null>(null);
  const [qrDownloading, setQrDownloading] = useState(false);

  const router = useRouter();

  /* ========== Fetch package map ========== */
  useEffect(() => {
    const fetchPackages = async () => {
      const q = await getDocs(collection(db, "membership_packages"));
      const map: PackageMap = {};
      q.forEach((docSnap) => {
        const d = docSnap.data() as MembershipPackageDoc;
        if (d?.name) map[docSnap.id] = d.name;
      });
      setPackageMap(map);
    };
    fetchPackages().catch(() => undefined);
  }, []);

  /* ========== Fetch members ========== */
  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "users"));
      const data: Member[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data() as UserRaw;
        data.push({
          id: docSnap.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          status: d.status,
          activityScore: d.activityScore,
          createdAt: d.createdAt ?? null,
          lastLogin: d.lastLogin ?? null,
          isVerified: d.isVerified,
          deleted: d.deleted || false,
          photoURL: d.photoURL ?? null,
          qrData: d.qrData ?? null,
          expiresAt: d.expiresAt ?? d.expiredAt ?? null, // standar baca
          memberType: d.memberType ?? "",
        });
      });
      setMembers(data);
      setLoading(false);
    };
    fetchMembers().catch(() => setLoading(false));
  }, []);

  /* ========== Helpers ========== */
  function isVisitType(member: Member): boolean {
    const label =
      (member.memberType && packageMap[member.memberType]?.toLowerCase()) ||
      member.memberType?.toLowerCase() ||
      "";
    return label.includes("visit");
  }

  function formatRupiah(angka: string): string {
    if (!angka) return "";
    return angka.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  /* ========== CRUD soft delete/restore ========== */
  const handleDelete = async (id: string) => {
    await updateDoc(doc(db, "users", id), { deleted: true });
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true } : m)));
  };

  const handleRestore = async (id: string) => {
    await updateDoc(doc(db, "users", id), { deleted: false });
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: false } : m)));
  };

  /* ========== Filters & Sorting ========== */
  const filteredSortedMembers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const now = new Date();

    const base = members.filter((m) => {
      const matchesSearch =
        (m.name || "").toLowerCase().includes(term) ||
        (m.email || "").toLowerCase().includes(term) ||
        (m.phone || "").toLowerCase().includes(term);
      const matchesStatus = statusFilter ? m.status === statusFilter : true;
      const matchesDeleted = showDeleted ? m.deleted : !m.deleted;

      const exp = toJSDate(m.expiresAt);
      const expiringSoon = exp ? Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 7 : false;
      const matchesSoon = onlyExpiringSoon ? expiringSoon : true;

      return matchesSearch && matchesStatus && matchesDeleted && matchesSoon;
    });

    const sorted = [...base].sort((a, b) => {
      if (sortMode === "name_asc") {
        return (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" });
      }
      // expiry_asc
      const ad = toJSDate(a.expiresAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bd = toJSDate(b.expiresAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      return ad - bd;
    });

    return sorted;
  }, [members, searchTerm, statusFilter, showDeleted, sortMode, onlyExpiringSoon]);

  const totalPages = Math.ceil(filteredSortedMembers.length / pageSize);
  const paginatedMembers = filteredSortedMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  /* ========== QR Modal handlers ========== */
  const openQRModal = (value: string, memberName: string) => {
    setQrValue(value);
    setQrMemberName(memberName);
  };

  const handleDownloadQRPNG = async (): Promise<void> => {
    if (!qrCardRef.current) return;
    setQrDownloading(true);
    try {
      const dataUrl = await toPng(qrCardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${qrMemberName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "member"}-qr.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // noop
    } finally {
      setQrDownloading(false);
    }
  };

  const handleDownloadQRPDF = async (): Promise<void> => {
    if (!qrCardRef.current) return;
    setQrDownloading(true);
    try {
      const el = qrCardRef.current;
      const w = el.offsetWidth || 360;
      const h = el.offsetHeight || 420;

      const dataUrl = await toPng(el, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: h >= w ? "portrait" : "landscape",
        unit: "px",
        format: [w, h],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      pdf.save(`${qrMemberName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "member"}-qr.pdf`);
    } catch {
      // noop
    } finally {
      setQrDownloading(false);
    }
  };

  /* ========== Modal Pembayaran ========== */
  const openPayModal = (member: Member) => {
    setSelectedMember(member);
    setShowPayModal(true);
    setPayMonth(1);
    setPayNominal("");
    setPayFile(null);
    setPayFilePreview(null);
    setPayFileError("");
    setPayNotes("");
  };

  const closePayModal = () => {
    setShowPayModal(false);
    setSelectedMember(null);
    setPayMonth(1);
    setPayNominal("");
    setPayFile(null);
    setPayFilePreview(null);
    setPayFileError("");
    setPayNotes("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPayFileError("");
    if (!file) {
      setPayFile(null);
      setPayFilePreview(null);
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setPayFile(null);
      setPayFilePreview(null);
      setPayFileError("Hanya file JPG/PNG maksimal 3MB yang diizinkan.");
      return;
    }
    setPayFile(file);
    setPayFilePreview(URL.createObjectURL(file));
  };

  const handlePay = async () => {
    if (!selectedMember) return;
    if (!payFile) {
      setPayFileError("Bukti pembayaran wajib diupload.");
      return;
    }
    setPayLoading(true);
    try {
      // Hitung expiry baru
      let newExpiry: Date;
      if (isVisitType(selectedMember)) {
        newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 1);
        newExpiry.setHours(23, 59, 59, 999);
      } else {
        const lastExpiry = toJSDate(selectedMember.expiresAt) ?? new Date();
        const now = new Date();
        const startDate = lastExpiry > now ? lastExpiry : now;
        newExpiry = new Date(startDate);
        newExpiry.setMonth(newExpiry.getMonth() + Number(payMonth));
      }

      // Upload bukti
      const fileName = `payments/${selectedMember.id}-${Date.now()}.jpg`;
      const fileRef = ref(storage, fileName);
      await uploadBytes(fileRef, payFile);
      const fileURL = await getDownloadURL(fileRef);

      // Update user expiry
      const ts = Timestamp.fromDate(newExpiry);
      await updateDoc(doc(db, "users", selectedMember.id), {
        expiresAt: ts,
        status: "aktif",
      });

      // Siapkan data pembayaran (field mapping BARU)
      const priceNumber = Number(payNominal.replace(/\./g, "")) || 0;
      const created = Timestamp.now();

      const paymentDoc: DocumentData = {
        userId: selectedMember.id,
        name: selectedMember.name,
        price: priceNumber,
        months: isVisitType(selectedMember) ? 0 : payMonth,
        created, // pengganti paidAt
        updatedAt: created,
        approvedAt: null, // di-approve nanti
        approvedBy: "",
        proofUrl: fileURL, // pengganti imageUrl
        method: "manual",
        status: "success",
        expiresAt: ts,
        packageId: selectedMember.memberType ?? "",
        packageName: selectedMember.memberType && packageMap[selectedMember.memberType] ? packageMap[selectedMember.memberType] : "",
        notes: payNotes || "",
        admin: "admin",
      };

      await addDoc(collection(db, "payments"), paymentDoc);

      // Sync state
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, expiresAt: ts, status: "aktif" } : m
        )
      );

      closePayModal();
      alert("Pembayaran berhasil disimpan!");
    } catch {
      alert("Gagal menyimpan pembayaran!");
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white relative">
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Paket Membership", href: "/admin/packages" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
          { label: "Galeri", href: "/admin/gallery" },
        ]}
      />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Paket Membership", href: "/admin/packages" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
          { label: "Galeri", href: "/admin/gallery" },
        ]}
      />

      <div className="flex-1 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-3xl font-extrabold" style={{ color: colors.text }}>Manajemen Member</h1>
          <button
            onClick={() => router.push("/admin/members/form")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl shadow-md transition text-white"
            style={{ background: colors.darker }}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Tambah Member</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-6">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Cari nama, email, atau nomor telepon"
              className="w-full sm:flex-1 border rounded-xl px-4 py-2"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <select
              className="w-full sm:w-52 border rounded-xl px-4 py-2"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="non-aktif">Tidak Aktif</option>
            </select>

            <select
              className="w-full sm:w-56 border rounded-xl px-4 py-2"
              value={sortMode}
              onChange={(e) => {
                setSortMode(e.target.value as "name_asc" | "expiry_asc");
                setCurrentPage(1);
              }}
            >
              <option value="name_asc">Urut Nama (A → Z)</option>
              <option value="expiry_asc">Expired Paling Cepat</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyExpiringSoon}
              onChange={() => {
                setOnlyExpiringSoon((v) => !v);
                setCurrentPage(1);
              }}
            />
            <span className="inline-flex items-center gap-1">
              <TimerReset className="w-4 h-4" />
              Tampilkan yang segera expired (≤ 7 hari)
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={() => {
                setShowDeleted(!showDeleted);
                setCurrentPage(1);
              }}
            />
            Tampilkan yang dihapus
          </label>
        </div>

        {/* pagination summary */}
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm text-gray-600">
            Menampilkan {paginatedMembers.length} dari {filteredSortedMembers.length} member
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border disabled:opacity-50"
              style={{ borderColor: colors.light }}
            >
              Sebelumnya
            </button>
            <span className="text-sm text-gray-700 inline-flex items-center gap-1">
              <SortAsc className="w-4 h-4" /> Halaman {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages || 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 rounded border disabled:opacity-50"
              style={{ borderColor: colors.light }}
            >
              Selanjutnya
            </button>
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm mt-4" style={{ borderColor: colors.light }}>
          <table className="w-full table-auto">
            <thead style={{ background: `linear-gradient(90deg, ${colors.darker}, ${colors.dark})`, color: colors.textLight }}>
              <tr>
                <th className="p-4 text-left">Nama</th>
                <th className="p-4 text-left">Nomor HP</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Tipe Member</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Terakhir Login</th>
                <th className="p-4 text-left">Verifikasi</th>
                <th className="p-4 text-left">Foto</th>
                <th className="p-4 text-left">Expired</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={`sk-${i}-${j}`} className="p-4">
                        <div className="h-5 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                paginatedMembers.map((member, index) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.4, ease: "easeOut" }}
                    className={`border-b hover:bg-gray-50 ${member.deleted ? "opacity-50" : ""}`}
                    style={{ borderColor: colors.light }}
                  >
                    <td className="p-4 font-semibold" style={{ color: colors.text }}>{member.name}</td>
                    <td className="p-4 text-gray-700">{member.phone || "-"}</td>
                    <td className="p-4 text-gray-700">{member.email}</td>
                    <td className="p-4 font-semibold" style={{ color: colors.darker }}>
                      {member.memberType
                        ? packageMap[member.memberType]
                          ? packageMap[member.memberType]
                          : <span className="text-amber-600">Paket tidak ditemukan (mungkin terhapus)</span>
                        : <span className="text-gray-400 italic">Belum dipilih</span>}
                    </td>
                    <td className={`p-4 font-medium capitalize ${member.status === "aktif" ? "text-green-600" : "text-red-500"}`}>
                      {member.status}
                    </td>
                    <td className="p-4 text-sm">{formatDate(member.lastLogin)}</td>
                    <td className="p-4">{member.isVerified ? "✅" : "❌"}</td>
                    <td className="p-4">
                      {member.photoURL ? (
                        <Image
                          src={member.photoURL}
                          alt={member.name}
                          width={40}
                          height={40}
                          onClick={() => setModalImage(member.photoURL as string)}
                          className="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-110 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-500">?</div>
                      )}
                    </td>
                    <td className="p-4 text-sm">{formatDate(member.expiresAt)}</td>
                    <td className="p-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => router.push(`/member/${member.id}`)}
                        className="p-2 rounded-full text-white hover:scale-110 transition"
                        style={{ background: colors.darker }}
                        aria-label="Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/admin/members/form?id=${member.id}`)}
                        className="p-2 rounded-full text-white hover:scale-110 transition"
                        style={{ background: colors.complementary }}
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!member.deleted ? (
                        <>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="p-2 rounded-full text-white hover:scale-110 transition"
                            style={{ background: "#ef4444" }}
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openPayModal(member)}
                            className="p-2 rounded-full text-white hover:scale-110 transition"
                            style={{ background: "#16a34a" }}
                            aria-label="Bayar/Perpanjang"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestore(member.id)}
                          className="p-2 rounded-full text-white hover:scale-110 transition"
                          style={{ background: "#9ca3af" }}
                          aria-label="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      {member.qrData && (
                        <button
                          onClick={() => openQRModal(member.qrData as string, member.name)}
                          className="p-2 rounded-full text-white hover:scale-110 transition"
                          style={{ background: colors.base }}
                          aria-label="QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Pembayaran */}
      <AnimatePresence>
        {showPayModal && selectedMember && (
          <motion.div
            key="modal-pay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"
            onClick={closePayModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white p-6 rounded-2xl shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closePayModal}
                className="absolute top-3 right-3 text-gray-400 hover:text-black"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>
                Perpanjang / Pembayaran Member
              </h2>
              <div className="mb-4 text-sm">
                <div className="mb-1"><b>Nama:</b> {selectedMember.name}</div>
                <div className="mb-1"><b>Email:</b> {selectedMember.email}</div>
                <div className="mb-1">
                  <b>Status:</b>{" "}
                  <span className={selectedMember.status === "aktif" ? "text-green-600" : "text-red-500"}>
                    {selectedMember.status}
                  </span>
                </div>
                <div className="mb-1"><b>Expired Saat Ini:</b> {formatDate(selectedMember.expiresAt)}</div>
                <div className="mb-1">
                  <b>Tipe Member:</b>{" "}
                  {selectedMember.memberType && packageMap[selectedMember.memberType] ? (
                    packageMap[selectedMember.memberType]
                  ) : (
                    <span className="text-gray-400 italic">Belum dipilih</span>
                  )}
                </div>
              </div>

              {isVisitType(selectedMember) ? (
                <div
                  className="mb-3 px-3 py-2 rounded border text-yellow-800 font-semibold text-center"
                  style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}
                >
                  <b>Paket Visit:</b> Masa aktif <b>1 hari</b> sejak pembayaran.
                  <br />
                  <span className="text-xs text-gray-500">(expired otomatis hari berikutnya jam 23:59)</span>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="block mb-1 font-semibold">Perpanjang Berapa Bulan?</label>
                  <select
                    value={payMonth}
                    onChange={(e) => setPayMonth(Number(e.target.value))}
                    className="border px-3 py-2 rounded w-full"
                  >
                    <option value={1}>1 Bulan</option>
                    <option value={3}>3 Bulan</option>
                    <option value={6}>6 Bulan</option>
                    <option value={12}>12 Bulan</option>
                  </select>
                </div>
              )}

              <div className="mb-3">
                <label className="block mb-1 font-semibold">Nominal Pembayaran (Rp)</label>
                <input
                  type="text"
                  className="border px-3 py-2 rounded w-full"
                  value={payNominal}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPayNominal(formatRupiah(val));
                  }}
                  placeholder="Contoh: 200.000"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>

              <div className="mb-3">
                <label className="block mb-1 font-semibold">Catatan (opsional)</label>
                <textarea
                  className="border px-3 py-2 rounded w-full"
                  rows={2}
                  placeholder="Contoh: bayar cash, promo, dsb."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="mb-1 font-semibold flex items-center gap-2">
                  <UploadCloud className="w-5 h-5" /> Bukti Pembayaran (jpg/png, max 3MB)
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleFileChange}
                  className="w-full border rounded px-3 py-2"
                />
                {payFilePreview && (
                  <div className="mt-2">
                    <Image
                      src={payFilePreview}
                      alt="Preview Bukti"
                      width={200}
                      height={120}
                      className="rounded-lg object-cover mx-auto"
                    />
                  </div>
                )}
                {payFileError && <div className="mt-2 text-red-500 text-sm">{payFileError}</div>}
              </div>

              <button
                onClick={handlePay}
                className="w-full text-white py-3 rounded-lg mt-2 font-bold flex items-center gap-2 justify-center"
                style={{ background: "#16a34a" }}
                disabled={payLoading || !payNominal || !payFile}
              >
                {payLoading ? "Menyimpan..." : (<><DollarSign className="w-5 h-5" /> Simpan & Perpanjang</>)}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* MODAL: Preview Foto */}
        {modalImage && (
          <motion.div
            key="modal-img"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"
            onClick={() => setModalImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white p-4 rounded-xl shadow-lg max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setModalImage(null)}
                className="absolute top-2 right-2 text-gray-600 hover:text-black"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
              <Image
                src={modalImage}
                alt="Preview"
                width={400}
                height={400}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            </motion.div>
          </motion.div>
        )}

        {/* MODAL QR (dengan download PNG/PDF) */}
        {qrValue && (
          <motion.div
            key="qr"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"
            onClick={() => setQrValue(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bar atas */}
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ background: colors.base, color: colors.text }}
              >
                <div className="font-bold">{qrMemberName}</div>
                <button
                  onClick={() => setQrValue(null)}
                  className="p-1 rounded hover:bg-white/30"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Kartu QR untuk diexport */}
              <div ref={qrCardRef} className="p-6">
                <div className="rounded-2xl border shadow-md p-5 bg-white relative overflow-hidden" style={{ borderColor: colors.light }}>
                  {/* Ribbon */}
                  <div
                    className="absolute -right-10 -top-3 rotate-45 text-xs font-bold px-12 py-1"
                    style={{ background: colors.accent, color: colors.textLight }}
                  >
                    QR MEMBER
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="mb-3 font-extrabold text-xl" style={{ color: colors.text }}>
                      Grind Up Fitness
                    </div>
                    <div className="bg-white p-2 rounded-lg border mb-2" style={{ borderColor: colors.base }}>
                      <QRCode value={qrValue} size={180} />
                    </div>
                    <div className="text-xs text-gray-500">Scan untuk buka profil member</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 pb-5 flex items-center justify-end gap-2">
                <button
                  onClick={handleDownloadQRPNG}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white"
                  style={{ background: colors.darker }}
                  disabled={qrDownloading}
                >
                  <Download className="w-4 h-4" />
                  {qrDownloading ? "Menyiapkan..." : "PNG"}
                </button>
                <button
                  onClick={handleDownloadQRPDF}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white"
                  style={{ background: colors.complementary }}
                  disabled={qrDownloading}
                >
                  <FileText className="w-4 h-4" />
                  {qrDownloading ? "Menyiapkan..." : "PDF"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

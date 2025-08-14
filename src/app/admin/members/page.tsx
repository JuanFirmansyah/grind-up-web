"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import dynamic from "next/dynamic";

const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

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
  /** standarisasi */
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
  /** data lama/baru (fallback saat baca) */
  expiresAt?: DateLike;
  expiredAt?: DateLike;
  memberType?: string;
}

interface MembershipPackageDoc { name?: string }
interface PackageMap { [key: string]: string }

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

  const router = useRouter();

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
    fetchPackages();
  }, []);

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
          /** baca standar: expiresAt || expiredAt (untuk data lama) */
          expiresAt: d.expiresAt ?? d.expiredAt ?? null,
          memberType: d.memberType ?? "",
        });
      });
      setMembers(data);
      setLoading(false);
    };
    fetchMembers();
  }, []);

  const handleDelete = async (id: string) => {
    await updateDoc(doc(db, "users", id), { deleted: true });
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, deleted: true } : m))
    );
  };

  const handleRestore = async (id: string) => {
    await updateDoc(doc(db, "users", id), { deleted: false });
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, deleted: false } : m))
    );
  };

  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (m.name || "").toLowerCase().includes(term) ||
      (m.email || "").toLowerCase().includes(term) ||
      (m.phone || "").toLowerCase().includes(term);
    const matchesStatus = statusFilter ? m.status === statusFilter : true;
    const matchesDeleted = showDeleted ? m.deleted : !m.deleted;
    return matchesSearch && matchesStatus && matchesDeleted;
  });

  const totalPages = Math.ceil(filteredMembers.length / pageSize);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Tombol QR
  const openQRModal = (value: string, memberName: string) => {
    setQrValue(value);
    setQrMemberName(memberName);
  };

  // Helper: apakah member visit
  function isVisitType(member: Member) {
    const label =
      (member.memberType && packageMap[member.memberType]?.toLowerCase()) ||
      member.memberType?.toLowerCase() ||
      "";
    return label.includes("visit");
  }

  function formatRupiah(angka: string) {
    if (!angka) return "";
    return angka.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  // --- Modal Pembayaran ---
  const openPayModal = (member: Member) => {
    setSelectedMember(member);
    setShowPayModal(true);
    setPayMonth(1);
    setPayNominal("");
    setPayFile(null);
    setPayFilePreview(null);
    setPayFileError("");
  };

  const closePayModal = () => {
    setShowPayModal(false);
    setSelectedMember(null);
    setPayMonth(1);
    setPayNominal("");
    setPayFile(null);
    setPayFilePreview(null);
    setPayFileError("");
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

      // TULIS field standar: expiresAt (Timestamp)
      const ts = Timestamp.fromDate(newExpiry);
      await updateDoc(doc(db, "users", selectedMember.id), {
        expiresAt: ts,
        status: "aktif",
      });

      await addDoc(collection(db, "payments"), {
        userId: selectedMember.id,
        name: selectedMember.name,
        payMonth: isVisitType(selectedMember) ? 0 : payMonth,
        nominal: Number(payNominal.replace(/\./g, "")) || 0,
        paidAt: Timestamp.now(),
        expiresAt: ts,
        admin: "admin",
        method: "manual",
        status: "success",
        imageURL: fileURL,
      });

      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id
            ? { ...m, expiresAt: ts, status: "aktif" }
            : m
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Manajemen Member</h1>
          <button
            onClick={() => router.push("/admin/members/form")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl shadow-md transition"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Tambah Member</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <input
            type="text"
            placeholder="Cari nama, email, atau nomor telepon"
            className="input input-bordered w-full md:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="select select-bordered w-full md:w-1/4"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="non-aktif">Tidak Aktif</option>
          </select>
          <label className="flex items-center gap-2 text-gray-600">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={() => setShowDeleted(!showDeleted)}
            />
            Tampilkan yang dihapus
          </label>
        </div>

        {/* pagination controls */}
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-600">
            Menampilkan {paginatedMembers.length} dari {filteredMembers.length} member
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-sm text-gray-700">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm mt-4">
          <table className="w-full table-auto">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
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
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
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
                  >
                    <td className="p-4 font-semibold text-gray-800">{member.name}</td>
                    <td className="p-4 text-gray-700">{member.phone || "-"}</td>
                    <td className="p-4 text-gray-700">{member.email}</td>
                    <td className="p-4 text-blue-800 font-semibold">
                      {member.memberType && packageMap[member.memberType]
                        ? packageMap[member.memberType]
                        : <span className="text-gray-400 italic">Belum dipilih</span>}
                    </td>
                    <td className={`p-4 font-medium capitalize ${member.status === "aktif" ? "text-green-600" : "text-red-500"}`}>{member.status}</td>

                    {/* tanggal kebal tipe */}
                    <td className="p-4 text-sm">{formatDate(member.lastLogin)}</td>

                    <td className="p-4">{member.isVerified ? "✅" : "❌"}</td>
                    <td className="p-4">
                      {member.photoURL ? (
                        <Image
                          src={member.photoURL}
                          alt={member.name}
                          width={40}
                          height={40}
                          onClick={() => setModalImage(member.photoURL!)}
                          className="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-110 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-500">?</div>
                      )}
                    </td>

                    {/* kolom expired (standar: expiresAt) */}
                    <td className="p-4 text-sm">{formatDate(member.expiresAt)}</td>

                    <td className="p-4 flex gap-2">
                      <button
                        onClick={() => router.push(`/member/${member.id}`)}
                        className="p-2 bg-blue-500 text-white rounded-full hover:scale-110 transition"
                        aria-label="Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/admin/members/form?id=${member.id}`)}
                        className="p-2 bg-yellow-400 text-white rounded-full hover:scale-110 transition"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!member.deleted ? (
                        <>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openPayModal(member)}
                            className="p-2 bg-green-600 text-white rounded-full hover:scale-110 transition"
                            aria-label="Bayar/Perpanjang"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestore(member.id)}
                          className="p-2 bg-gray-400 text-white rounded-full hover:scale-110 transition"
                          aria-label="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      {member.qrData && (
                        <button
                          onClick={() => openQRModal(member.qrData!, member.name)}
                          className="p-2 bg-blue-500 text-white rounded-full hover:scale-110 transition"
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
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
            onClick={closePayModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={closePayModal}
                className="absolute top-3 right-3 text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold mb-4">Perpanjang / Pembayaran Member</h2>
              <div className="mb-4">
                <div className="mb-2"><b>Nama:</b> {selectedMember.name}</div>
                <div className="mb-2"><b>Email:</b> {selectedMember.email}</div>
                <div className="mb-2">
                  <b>Status:</b>{" "}
                  <span className={selectedMember.status === "aktif" ? "text-green-600" : "text-red-500"}>
                    {selectedMember.status}
                  </span>
                </div>
                <div className="mb-2"><b>Expired Saat Ini:</b> {formatDate(selectedMember.expiresAt)}</div>
                <div className="mb-2">
                  <b>Tipe Member:</b>{" "}
                  {selectedMember.memberType && packageMap[selectedMember.memberType]
                    ? packageMap[selectedMember.memberType]
                    : <span className="text-gray-400 italic">Belum dipilih</span>}
                </div>
              </div>

              {isVisitType(selectedMember) ? (
                <div className="mb-3 px-3 py-2 rounded bg-yellow-50 border border-yellow-300 text-yellow-800 font-semibold text-center">
                  <b>Paket Visit:</b> Masa aktif <b>1 hari</b> sejak pembayaran.
                  <br /><span className="text-xs text-gray-500">(expired otomatis hari berikutnya jam 23:59)</span>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="block mb-1 font-semibold">Perpanjang Berapa Bulan?</label>
                  <select
                    value={payMonth}
                    onChange={e => setPayMonth(Number(e.target.value))}
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
                  onChange={e => {
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
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg mt-2 font-bold flex items-center gap-2 justify-center"
                disabled={payLoading || !payNominal || !payFile}
              >
                {payLoading ? "Menyimpan..." : <><DollarSign className="w-5 h-5" /> Simpan & Perpanjang</>}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* MODAL: Preview Foto */}
        {modalImage && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
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

        {/* MODAL QR */}
        {qrValue && (
          <motion.div
            key="qr"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
            onClick={() => setQrValue(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white p-8 rounded-xl shadow-xl max-w-sm w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setQrValue(null)}
                className="absolute top-2 right-2 text-gray-600 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="mb-4 text-lg font-semibold">{qrMemberName}</div>
              <div className="mx-auto mb-2 bg-white rounded-lg p-2 w-fit">
                <QRCode value={qrValue} size={180} className="mx-auto rounded" />
              </div>
              <div className="text-xs text-gray-400 mb-2">Scan untuk buka profil member</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

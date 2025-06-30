// src/app/admin/members/page.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminTopbar } from "@/components/AdminTopbar";
import { Plus, Pencil, Trash2, RotateCcw, X, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import formatDistanceToNow from "date-fns/formatDistanceToNow";

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string; 
  status: "aktif" | "non-aktif";
  activityScore: number;
  createdAt: string;
  lastLogin: string;
  role: "member" | "coach" | "admin";
  isVerified: boolean;
  deleted?: boolean;
  photoURL?: string;
  qrCode?: string;
}

export default function AdminMembersPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const router = useRouter();

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "members"));
      const data: Member[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        data.push({
          id: docSnap.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          status: d.status,
          activityScore: d.activityScore,
          createdAt: d.createdAt,
          lastLogin: d.lastLogin,
          role: d.role,
          isVerified: d.isVerified,
          deleted: d.deleted || false,
          photoURL: d.photoURL || null,
          qrCode: d.qrCode || null,
        });
      });
      setMembers(data);
      setLoading(false);
    };
    fetchMembers();
  }, []);

  const handleDelete = async (id: string) => {
    await updateDoc(doc(db, "members", id), { deleted: true });
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true } : m)));
  };

  const handleRestore = async (id: string) => {
    await updateDoc(doc(db, "members", id), { deleted: false });
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: false } : m)));
  };

  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      (m.phone && m.phone.toLowerCase().includes(term));
    const matchesStatus = statusFilter ? m.status === statusFilter : true;
    const matchesDeleted = showDeleted ? m.deleted : !m.deleted;
    return matchesSearch && matchesStatus && matchesDeleted;
  });

  const totalPages = Math.ceil(filteredMembers.length / pageSize);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleDownloadQR = () => {
    if (!qrImage) return;
    const a = document.createElement("a");
    a.href = qrImage;
    a.download = "qr-member.png";
    a.click();
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white relative">
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Paket", href: "/admin/packages" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Paket", href: "/admin/packages" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
        ]}
      />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Paket", href: "/admin/packages" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Paket", href: "/admin/packages" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
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

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full table-auto">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th className="p-4 text-left">Nama</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Skor Aktivitas</th>
                <th className="p-4 text-left">Terakhir Login</th>
                <th className="p-4 text-left">Role</th>
                <th className="p-4 text-left">Verifikasi</th>
                <th className="p-4 text-left">Foto</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                filteredMembers.map((member, index) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.4, ease: "easeOut" }}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-4 font-semibold text-gray-800">{member.name}</td>
                    <td className="p-4 text-gray-700">{member.email}</td>
                    <td className={`p-4 font-medium capitalize ${member.status === "aktif" ? "text-green-600" : "text-red-500"}`}>{member.status}</td>
                    <td className="p-4 text-gray-700">{member.activityScore}</td>
                    <td className="p-4 text-gray-500 text-sm">{formatDistanceToNow(new Date(member.lastLogin), { addSuffix: true })}</td>
                    <td className="p-4 text-blue-700 uppercase text-sm font-semibold">{member.role}</td>
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
                    <td className="p-4 flex gap-2">
                      <button
                        onClick={() => router.push(`/admin/members/form?id=${member.id}`)}
                        className="p-2 bg-yellow-400 text-white rounded-full hover:scale-110 transition"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!member.deleted ? (
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(member.id)}
                          className="p-2 bg-gray-400 text-white rounded-full hover:scale-110 transition"
                          aria-label="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      {member.qrCode && (
                        <button
                          onClick={() => setQrImage(member.qrCode!)}
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

      <AnimatePresence>
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

        {qrImage && (
          <motion.div
            key="qr"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
            onClick={() => setQrImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setQrImage(null)}
                className="absolute top-2 right-2 text-gray-600 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
              <Image
                src={qrImage}
                alt="QR Code"
                width={256}
                height={256}
                className="mx-auto rounded-lg"
              />
              <button
                onClick={handleDownloadQR}
                className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
              >
                Download QR</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

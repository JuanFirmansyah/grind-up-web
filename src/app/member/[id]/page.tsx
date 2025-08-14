// src/app/member/[id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  Timestamp,
  collection,
  type CollectionReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import QRCode from "react-qr-code";
import { format, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";           // ✅ Export PNG
import jsPDF from "jspdf";                        // ✅ Export PDF
import { Download, FileText } from "lucide-react";// ✅ Ikon modern

const LOGO_URL = "/grindup-logo.png";
const DEFAULT_PHOTO = "/default.jpg";

type MaybeTimestamp = Date | number | string | Timestamp | null | undefined;

interface UserDoc {
  name?: string;
  photoURL?: string;
  role?: string;
  status?: string;
  isVerified?: boolean;
  createdAt?: MaybeTimestamp;
  qrData?: string;      // sesuai DB terbaru
  profileURL?: string;  // fallback lama (opsional)
  expiresAt?: MaybeTimestamp;
  memberType?: string;
}

interface PackageDoc {
  name?: string;
}

interface MemberData {
  name: string;
  photoURL?: string;
  role: string;
  status: string;
  isVerified: boolean;
  createdAt: MaybeTimestamp;
  qrData?: string;
  profileURL?: string;
  expiresAt?: MaybeTimestamp;
  memberType?: string;
}

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

// Utility buat nama file yang aman
function safeFilename(s: string, fallback = "member-card") {
  const base = (s || fallback)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return base || fallback;
}

export default function MemberProfilePage() {
  const { id: userId } = useParams();
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [packageName, setPackageName] = useState<string>("");

  // ✅ ref untuk elemen kartu yang akan di-download
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (typeof userId !== "string") return;

        // ✅ Ketik collection lalu buat doc dari situ (menghindari error generic)
        const usersCol = collection(db, "users") as CollectionReference<UserDoc>;
        const userRef = doc(usersCol, userId);
        const snap = await getDoc(userRef);
        if (!snap.exists()) return;

        const d = snap.data();

        setData({
          name: d.name ?? "",
          photoURL: d.photoURL ?? "",
          role: d.role ?? "",
          status: d.status ?? "",
          isVerified: d.isVerified ?? false,
          createdAt: d.createdAt ?? null,
          qrData: d.qrData ?? "",
          profileURL: d.profileURL ?? "",
          expiresAt: d.expiresAt ?? null,
          memberType: d.memberType ?? "",
        });

        // Ambil nama paket (ketik collection juga)
        if (d.memberType) {
          const pkgCol = collection(db, "membership_packages") as CollectionReference<PackageDoc>;
          const pkgRef = doc(pkgCol, d.memberType);
          const pkgSnap = await getDoc(pkgRef);
          setPackageName(pkgSnap.exists() ? (pkgSnap.data().name ?? "") : "");
        } else {
          setPackageName("");
        }
      } catch (e) {
        console.error("Error fetching member/package data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  // Nilai QR yang dipakai
  const getQrValue = (): string => {
    if (!data) return "";
    if (data.qrData && data.qrData.trim().length > 0) return data.qrData.trim();
    if (data.profileURL && data.profileURL.trim().length > 0) return data.profileURL.trim();
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://grindupfitness.com";
    return typeof userId === "string" ? `${base}/member/${userId}` : "";
  };

  const getMembershipStatusColor = () => {
    const end = toDateValue(data?.expiresAt ?? null);
    if (!end) return "text-gray-500";
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return "text-red-600 font-bold animate-pulse";
    if (diff <= 7) return "text-yellow-500 font-semibold animate-pulse";
    return "text-green-600 font-medium";
  };

  const getActiveRange = () => {
    const end = toDateValue(data?.expiresAt ?? null);
    if (!end) return "-";
    const start = subMonths(end, 1);
    return `${format(start, "dd MMM yy", { locale: localeId })} - ${format(end, "dd MMM yy", { locale: localeId })}`;
  };

  // ✅ Handler download kartu sebagai PNG
  const handleDownloadPNG = async () => {
    if (!cardRef.current || !data) return;
    setDownloading(true);
    try {
      // Supaya hasil tajam & bersih
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      const filename = `${safeFilename(data.name || "member")}-member-card.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Gagal generate PNG:", err);
      alert("Maaf, terjadi kendala saat menyiapkan file. Coba lagi ya.");
    } finally {
      setDownloading(false);
    }
  };

  // ✅ Handler download kartu sebagai PDF
  const handleDownloadPDF = async () => {
    if (!cardRef.current || !data) return;
    setDownloading(true);
    try {
      const el = cardRef.current;
      const w = el.offsetWidth || 800;
      const h = el.offsetHeight || 400;

      const dataUrl = await toPng(el, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      // Buat PDF dengan ukuran sama persis elemen agar 1:1
      const pdf = new jsPDF({
        orientation: h >= w ? "portrait" : "landscape",
        unit: "px",
        format: [w, h],
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      const filename = `${safeFilename(data.name || "member")}-member-card.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("Gagal generate PDF:", err);
      alert("Maaf, terjadi kendala saat menyiapkan PDF.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 animate-pulse">
        Memuat...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-semibold">
        Data member tidak ditemukan.
      </div>
    );
  }

  const createdAtDate = toDateValue(data.createdAt);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#97CCDD] via-white to-slate-100 flex items-center justify-center py-10">
      <motion.div
        ref={cardRef} // ✅ penting: ini yang di-export
        initial={{ opacity: 0, y: 80, rotate: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        transition={{ duration: 0.7, type: "spring", stiffness: 90, damping: 16 }}
        className="w-full max-w-4xl bg-white shadow-2xl border-4 border-[#97CCDD] rounded-2xl overflow-hidden relative group"
        style={{ minHeight: 320 }}
      >
        {/* ✅ Tombol Download (modern, non-kampungan) */}
        <div className="absolute z-20 top-3 right-3 flex gap-2">
          <button
            onClick={handleDownloadPNG}
            aria-label="Download kartu member (PNG)"
            title="Download kartu member (PNG)"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2
                       bg-white/70 backdrop-blur-md border border-white/60 shadow-md
                       text-gray-700 hover:bg-white hover:shadow-lg active:scale-95
                       transition-all duration-150"
          >
            <Download className="h-5 w-5" />
            <span className="text-sm font-semibold hidden sm:inline">
              {downloading ? "Menyiapkan..." : "PNG"}
            </span>
          </button>

          <button
            onClick={handleDownloadPDF}
            aria-label="Download kartu member (PDF)"
            title="Download kartu member (PDF)"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2
                       bg-white/70 backdrop-blur-md border border-white/60 shadow-md
                       text-gray-700 hover:bg-white hover:shadow-lg active:scale-95
                       transition-all duration-150"
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm font-semibold hidden sm:inline">
              {downloading ? "Menyiapkan..." : "PDF"}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_150px_1fr] h-full">
          {/* Panel kiri */}
          <div className="flex flex-col items-center justify-center bg-[#97CCDD] h-full min-h-[260px] py-8 px-6 md:rounded-l-2xl">
            <div className="bg-white rounded-full p-2 shadow-lg border-2 border-white w-28 h-28 flex items-center justify-center mb-3">
              <Image src={LOGO_URL} alt="Logo Gym" width={90} height={90} className="rounded-full object-contain w-20 h-20" priority />
            </div>
            <div className="text-[#156477] font-black text-2xl text-center leading-tight mt-2 drop-shadow tracking-wide select-none">
              GRIND UP<br />FITNESS
            </div>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="h-1 bg-gradient-to-r from-[#1CB5E0] to-[#97CCDD] w-2/3 rounded-full mt-4 mb-2 origin-left"
            />
          </div>

          {/* Panel tengah: Foto & QR */}
          <div className="flex flex-col items-center justify-center gap-3 py-7 px-3 bg-white">
            <Image
              src={data.photoURL && data.photoURL.length > 5 ? data.photoURL : DEFAULT_PHOTO}
              alt={data.name}
              width={80}
              height={80}
              className="rounded-xl h-20 w-20 object-cover border-4 border-[#97CCDD] shadow-md bg-white"
              priority
            />
            <div className="bg-white p-1 rounded-lg border-2 border-dashed border-[#97CCDD] shadow-sm">
              <QRCode value={getQrValue()} size={70} />
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5">QR Profil</span>
          </div>

          {/* Panel kanan: Detail */}
          <div className="flex flex-col justify-center py-8 px-5 md:px-10">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl md:text-3xl font-black text-gray-800">{data.name}</h1>
              {packageName && (
                <span className="px-2 py-1 bg-[#FFD700] text-xs font-bold text-gray-800 rounded-lg shadow-sm uppercase ml-1">
                  {packageName}
                </span>
              )}
              <span className="px-2 py-1 bg-[#97CCDD] text-xs font-bold text-white rounded-lg shadow-sm uppercase ml-1">
                {data.role || "Member"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-bold ${data.status === "aktif" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {data.status === "aktif" ? "AKTIF" : "TIDAK AKTIF"}
              </span>
              <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold ${data.isVerified ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                {data.isVerified ? "Terverifikasi" : "Belum Verifikasi"}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700 text-sm mb-3">
              <div>
                <span className="font-semibold mr-1">Daftar:</span>
                {createdAtDate ? format(createdAtDate, "dd MMMM yyyy", { locale: localeId }) : "-"}
              </div>
              <div>
                <span className="font-semibold mr-1">Masa Aktif:</span>
                <span className={getMembershipStatusColor()}>{getActiveRange()}</span>
              </div>
            </div>

            <div>
              <a
                href={`https://wa.me/6285654444777?text=Halo%20Admin,%20saya%20lihat%20profil%20member%20dengan%20nama%20${encodeURIComponent(
                  data.name
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#1CB5E0] hover:bg-[#156477] text-white font-bold py-2 px-5 rounded-xl shadow-lg transition-all duration-200 active:scale-95 ring-2 ring-[#97CCDD]/30"
              >
                <svg className="w-5 h-5" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                  <path d="M16 .01a15.92 15.92 0 0 0-13.47 24.93L0 32l7.23-2.35A15.91 15.91 0 1 0 16 .01zm7.36 23.39c-.31.88-1.6 1.62-2.2 1.72-.58.09-1.3.13-2.09-.13-.48-.15-1.09-.36-1.88-.7-3.31-1.43-5.47-4.75-5.63-4.97-.16-.22-1.34-1.78-1.34-3.38s.85-2.38 1.15-2.7c.28-.3.62-.38.82-.38.21 0 .41.01.59.01.18 0 .44-.07.69.52.25.59.85 2.05.93 2.2.08.15.13.32.03.52-.09.21-.13.33-.25.51-.13.18-.26.4-.37.54-.13.17-.26.35-.11.68.15.33.66 1.09 1.41 1.77 1.08.96 1.99 1.25 2.34 1.39.36.15.56.13.76-.08.21-.22.86-.96 1.09-1.29.23-.33.45-.27.77-.16.32.11 2.04.96 2.39 1.13.35.18.58.27.67.42.1.14.1.81-.21 1.7z" />
                </svg>
                Hubungi Admin WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* animasi glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 0.2, scale: 1.12 }}
          transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="absolute z-0 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-[50px] w-5/6 h-5/6 bg-[#97CCDD] blur-3xl"
        />
      </motion.div>
    </main>
  );
}

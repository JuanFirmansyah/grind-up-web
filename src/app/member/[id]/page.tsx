"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import QRCode from "react-qr-code";
import { format, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { motion } from "framer-motion";

interface MemberData {
  name: string;
  photoURL?: string;
  role: string;
  status: string;
  isVerified: boolean;
  createdAt: string | number | Date;
  profileURL?: string;
  expiredAt?: string | number;
}

export default function MemberProfilePage() {
  const { id: memberId } = useParams();
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (typeof memberId === "string") {
          const docSnap = await getDoc(doc(db, "members", memberId));
          if (docSnap.exists()) {
            const docData = docSnap.data();
            setData({
              name: docData.name || "",
              photoURL: docData.photoURL || "",
              role: docData.role || "",
              status: docData.status || "",
              isVerified: docData.isVerified || false,
              createdAt: docData.createdAt || "",
              profileURL: docData.profileURL || "",
              expiredAt: docData.expiredAt || "",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching member data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [memberId]);

  const getMembershipStatusColor = () => {
    if (!data?.expiredAt) return "text-gray-500";
    const today = new Date();
    const end = new Date(data.expiredAt as string);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff <= 0) return "text-red-600 font-bold animate-pulse";
    if (diff <= 7) return "text-yellow-500 font-semibold animate-pulse";
    return "text-green-600 font-medium";
  };

  // Optional: tampilkan range jika memang ingin (asumsi perpanjang per bulan)
  const getActiveRange = () => {
    if (!data?.expiredAt) return "-";
    const end = new Date(data.expiredAt as string);
    const start = subMonths(end, 1);
    return `${format(start, "dd MMM yy", { locale: localeId })} - ${format(end, "dd MMM yy", { locale: localeId })}`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 animate-pulse">Memuat...</div>;
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-red-500 font-semibold">Data member tidak ditemukan.</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 p-6 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white shadow-2xl rounded-3xl overflow-hidden"
      >
        <div className="p-6 text-center">
          <Image
            src={data.photoURL || "/no-photo.png"}
            alt={data.name}
            width={100}
            height={100}
            className="mx-auto rounded-full h-24 w-24 object-cover border-4 border-blue-500 shadow-lg"
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-800 tracking-wide">{data.name}</h1>
          <p className="text-sm text-gray-500 capitalize italic">{data.role}</p>

          <div className="mt-6 space-y-3 text-left text-sm text-gray-700 divide-y divide-gray-200">
            <div className="flex justify-between pt-2">
              <span className="font-medium">Status</span>
              <span className={data.status === "aktif" ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>{data.status}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="font-medium">Verifikasi</span>
              <span>{data.isVerified ? "✔️ Terverifikasi" : "❌ Belum"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="font-medium">Daftar Sejak</span>
              <span>{format(new Date(data.createdAt), "dd MMMM yyyy", { locale: localeId })}</span>
            </div>
            {data.expiredAt && (
              <div className="flex justify-between pt-2">
                <span className="font-medium">Masa Aktif</span>
                <span className={getMembershipStatusColor()}>
                  {/* Ganti getActiveRange jika ingin range, atau cuma expiredAt */}
                  {getActiveRange()}
                </span>
              </div>
            )}
          </div>

          <div className="pt-6">
            <div className="inline-block bg-white p-2 shadow-md rounded-xl">
              <QRCode value={data.profileURL || ""} size={128} className="mx-auto rounded" />
            </div>
            <p className="mt-2 text-xs text-gray-400">Scan QR untuk buka profil ini</p>
          </div>

          <a
            href={`https://wa.me/6285340621139?text=Halo%20Admin,%20saya%20lihat%20profil%20member%20dengan%20nama%20${encodeURIComponent(data.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition shadow-sm"
          >
            Hubungi Admin via WhatsApp
          </a>
        </div>
      </motion.div>
    </main>
  );
}

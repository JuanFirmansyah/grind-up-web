// src\app\admin\personal-trainer\[id]\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Award,
  Users,
  Dumbbell,
  BadgeCheck,
  Pencil,
  UserCheck,
  User,
} from "lucide-react";

// Asset
const LOGO_URL = "/grindup-logo.jpeg";
const DEFAULT_PHOTO = "/user-default.png";

interface Trainer {
  name: string;
  email: string;
  photoUrl?: string;
  clubLocation?: string;
  experience?: string;
  maxSlot?: number;
  specialties?: string[];
  certifications?: string[];
  sessionPackages?: { name: string; price: string }[];
}

export default function PersonalTrainerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetchTrainer = async () => {
      try {
        const docSnap = await getDoc(doc(db, "users", id));
        if (docSnap.exists()) {
          setTrainer(docSnap.data() as Trainer);
        } else {
          setTrainer(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTrainer();
  }, [id]);

  // Ambil jumlah member dengan coachId == id ini
  useEffect(() => {
    if (!id) return;
    const fetchClientCount = async () => {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "member"), where("coachId", "==", id))
      );
      setTotalClients(snap.size);
    };
    fetchClientCount();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500">
        <p>Coach tidak ditemukan.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
      </div>
    );
  }

  // Sisa slot
  const sisaSlot =
    typeof trainer.maxSlot === "number"
      ? Math.max(trainer.maxSlot - totalClients, 0)
      : 0;

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-[#F5FAFE] via-white to-[#B4D8E5] p-4 md:p-10">
      {/* Logo Grind Up */}
      <div className="flex items-center gap-3 mb-6">
        <Image
          src={LOGO_URL}
          alt="Grind Up Gym Logo"
          width={42}
          height={42}
          className="rounded-full shadow border border-[#97CCDD]"
        />
        <span className="font-black text-xl text-[#156477] tracking-wider drop-shadow-sm">
          Grind Up Gym
        </span>
      </div>

      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-7 relative group transition-all">
        {/* Kembali */}
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute -top-8 left-0 flex items-center gap-2 text-blue-600 hover:underline font-semibold"
        >
          <ArrowLeft className="w-5 h-5" /> Kembali
        </button>
        <div className="flex flex-col items-center">
          {/* Foto Coach */}
          <div className="relative mb-4">
            <Image
              src={trainer.photoUrl && trainer.photoUrl.length > 5 ? trainer.photoUrl : DEFAULT_PHOTO}
              alt={trainer.name}
              width={120}
              height={120}
              className="w-28 h-28 rounded-full object-cover border-4 border-blue-200 shadow-lg"
              priority
              unoptimized={!!trainer.photoUrl && !trainer.photoUrl.startsWith("/")}
            />
            {!trainer.photoUrl && (
              <span className="absolute inset-0 flex items-center justify-center text-blue-200 text-5xl">
                <User />
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-1 tracking-wide">
            {trainer.name}
          </h1>
          <p className="text-blue-600 text-sm font-semibold mb-2">{trainer.email}</p>
        </div>

        {/* Info Detail */}
        <div className="mt-5 space-y-4 text-base text-gray-700">
          {trainer.clubLocation && (
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <span>
                <span className="font-medium text-gray-900">Lokasi Klub:</span>{" "}
                {trainer.clubLocation}
              </span>
            </div>
          )}
          {trainer.experience && (
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              <span>
                <span className="font-medium text-gray-900">Pengalaman:</span> {trainer.experience}
              </span>
            </div>
          )}

          {/* Slot info */}
          <div className="flex flex-wrap gap-5 items-center">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1CB5E0]" />
              <span>
                <span className="font-medium text-gray-900">Klien Aktif:</span>{" "}
                <span className="font-bold text-[#1CB5E0]">{totalClients}</span>
                {typeof trainer.maxSlot === "number" && (
                  <span className="text-gray-600 font-semibold ml-1">
                    /{trainer.maxSlot}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-500" />
              <span>
                <span className="font-medium text-gray-900">Sisa Slot:</span>{" "}
                <span className="text-green-700 font-bold">{sisaSlot}</span>
              </span>
            </div>
          </div>

          {/* Spesialisasi */}
          {(Array.isArray(trainer.specialties) && trainer.specialties.length > 0) && (
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-pink-400" />
              <span>
                <span className="font-medium text-gray-900">Spesialisasi:</span>{" "}
                {trainer.specialties?.join(", ")}
              </span>
            </div>
          )}
          {/* Sertifikasi */}
          {(Array.isArray(trainer.certifications) && trainer.certifications.length > 0) && (
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-blue-600" />
              <span>
                <span className="font-medium text-gray-900">Sertifikasi:</span>{" "}
                {trainer.certifications?.join(", ")}
              </span>
            </div>
          )}
          {/* Paket Sesi */}
          {(Array.isArray(trainer.sessionPackages) && trainer.sessionPackages.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">Paket Sesi:</span>
              </div>
              <ul className="list-disc ml-7 space-y-1 text-[15px]">
                {trainer.sessionPackages?.map((pkg, i) => (
                  <li key={`${pkg.name}-${i}`} className="flex gap-2 items-center">
                    <span className="font-semibold text-blue-700">{pkg.name}</span>
                    <span className="text-gray-600 font-light">—</span>
                    <span className="text-green-600 font-semibold">Rp{Number(pkg.price).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Edit Button */}
        <div className="flex justify-end mt-9">
          <button
            onClick={() => router.push(`/admin/personal-trainer/edit/${id}`)}
            className="px-5 py-2 rounded-xl bg-yellow-400 text-white font-semibold flex items-center gap-2 shadow hover:bg-yellow-500 transition-all active:scale-95"
          >
            <Pencil className="w-5 h-5" /> Edit
          </button>
        </div>
      </div>
    </main>
  );
}

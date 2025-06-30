// src\app\admin\personal-trainer\[id]\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Award,
  Users,
  Dumbbell,
  BadgeCheck,
  Pencil,
} from "lucide-react";

interface Trainer {
  name: string;
  email: string;
  photoUrl?: string;
  clubLocation?: string;
  experience?: string;
  clientsCount?: number;
  specialties?: string[];
  certifications?: string[];
  sessionPackages?: { name: string; price: string }[];
}

export default function PersonalTrainerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchTrainer = async () => {
      try {
        const docSnap = await getDoc(doc(db, "members", id));
        if (docSnap.exists()) {
          setTrainer(docSnap.data() as Trainer);
        } else {
          setTrainer(null);
        }
      } catch (error) {
        console.error("Error fetching trainer:", error);
        setTrainer(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainer();
  }, [id]);

  if (loading) {
    return <p className="p-6 animate-pulse text-gray-500">Loading...</p>;
  }

  if (!trainer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500">
        <p>Personal Trainer tidak ditemukan.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-white to-blue-50 p-6 md:p-10">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 relative">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute -top-5 left-0 flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-5 h-5" /> Kembali
        </button>
        <div className="flex flex-col items-center">
          <Image
            src={trainer.photoUrl || "/user-default.png"}
            alt={trainer.name}
            width={120}
            height={120}
            className="w-28 h-28 rounded-full object-cover mb-4 border-4 border-blue-200"
            priority
            unoptimized={!!trainer.photoUrl && !trainer.photoUrl.startsWith("/")}
          />
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{trainer.name}</h1>
          <p className="text-gray-600 text-sm">{trainer.email}</p>
        </div>

        <div className="mt-6 space-y-4">
          {trainer.clubLocation && (
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-5 h-5" />
              <span>
                Lokasi Klub: <span className="font-medium">{trainer.clubLocation}</span>
              </span>
            </div>
          )}
          {trainer.experience && (
            <div className="flex items-center gap-2 text-gray-700">
              <Award className="w-5 h-5" />
              <span>Pengalaman: {trainer.experience}</span>
            </div>
          )}
          {typeof trainer.clientsCount === "number" && (
            <div className="flex items-center gap-2 text-gray-700">
              <Users className="w-5 h-5" />
              <span>Jumlah Klien: {trainer.clientsCount} orang</span>
            </div>
          )}
          {trainer.specialties?.length && (
            <div className="flex items-center gap-2 text-gray-700">
              <Dumbbell className="w-5 h-5" />
              <span>Spesialisasi: {trainer.specialties.join(", ")}</span>
            </div>
          )}
          {trainer.certifications?.length && (
            <div className="flex items-center gap-2 text-gray-700">
              <BadgeCheck className="w-5 h-5" />
              <span>Sertifikasi: {trainer.certifications.join(", ")}</span>
            </div>
          )}
          {trainer.sessionPackages?.length && (
            <div className="flex flex-col text-gray-700">
              <span className="font-medium mb-1">Paket Sesi:</span>
              <ul className="list-disc ml-7">
                {trainer.sessionPackages.map((pkg, i) => (
                  <li key={`${pkg.name}-${i}`}>{pkg.name} — Rp{pkg.price}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={() => router.push(`/admin/personal-trainer/edit/${id}`)}
            className="px-5 py-2 rounded-lg bg-yellow-400 text-white flex items-center gap-2 shadow hover:bg-yellow-500 transition"
          >
            <Pencil className="w-4 h-4" /> Edit
          </button>
        </div>
      </div>
    </main>
  );
}
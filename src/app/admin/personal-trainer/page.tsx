// src/app/admin/personal-trainer/page.tsx

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { Pencil, Eye } from "lucide-react";
import Image from "next/image";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
];

interface SessionPackage {
  name: string;
  price: string;
  note?: string;
}

interface PersonalTrainer {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  clubLocation?: string;
  experience?: string;
  clientsCount?: number;
  specialties?: string[];
  certifications?: string[];
  sessionPackages?: SessionPackage[];
}

export default function PersonalTrainerPage() {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [trainers, setTrainers] = useState<PersonalTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTrainers = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "members"));
      const data: PersonalTrainer[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.role === "coach") {
          data.push({
            id: docSnap.id,
            name: d.name || "-",
            email: d.email || "-",
            photoUrl: d.photoUrl,
            clubLocation: d.clubLocation,
            experience: d.experience,
            clientsCount: d.clientCount, // field di edit sesuai Firestore
            specialties: d.specialties,
            certifications: d.certifications,
            sessionPackages: d.sessionPackages,
          });
        }
      });
      setTrainers(data);
      setLoading(false);
    };
    fetchTrainers();
  }, []);

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-blue-50">
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />

      <div className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Pelatih Pribadi</h1>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-16 h-16 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainers.length === 0 && (
              <div className="col-span-full text-gray-400 text-center text-lg">Belum ada pelatih pribadi.</div>
            )}
            {trainers.map((trainer) => (
              <div
                key={trainer.id}
                className="rounded-2xl bg-white p-6 shadow border border-gray-200 flex flex-col items-center group hover:shadow-lg transition relative"
              >
                <Image
                  src={trainer.photoUrl || "/user-default.png"}
                  alt={trainer.name}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-blue-200"
                  priority={false}
                  unoptimized={!!trainer.photoUrl && !trainer.photoUrl.startsWith("/")}
                />
                <h2 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">{trainer.name}</h2>
                <p className="text-gray-500 text-sm mb-1">{trainer.email}</p>
                {trainer.clubLocation && (
                  <p className="text-xs text-gray-600 mb-1">Lokasi Klub: <span className="font-semibold">{trainer.clubLocation}</span></p>
                )}
                {trainer.experience && (
                  <p className="text-xs text-gray-600 mb-1">Pengalaman: {trainer.experience}</p>
                )}
                {typeof trainer.clientsCount === "number" && (
                  <p className="text-xs text-gray-600 mb-1">Klien: {trainer.clientsCount} orang</p>
                )}
                {trainer.specialties && trainer.specialties.length > 0 && (
                  <p className="text-xs text-gray-600 mb-1">Spesialisasi: {trainer.specialties.join(", ")}</p>
                )}
                {trainer.certifications && trainer.certifications.length > 0 && (
                  <p className="text-xs text-gray-600 mb-1">Sertifikasi: {trainer.certifications.join(", ")}</p>
                )}
                {trainer.sessionPackages && trainer.sessionPackages.length > 0 && (
                  <div className="w-full text-xs text-gray-700 mb-2 mt-1">
                    <div className="font-semibold">Paket Sesi:</div>
                    <ul className="list-disc ml-4">
                      {trainer.sessionPackages.map((pkg, idx) => (
                        <li key={idx}>
                          {pkg.name} &mdash; Rp{pkg.price}
                          {pkg.note && ` (${pkg.note})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => router.push(`/admin/personal-trainer/${trainer.id}`)}
                    className="flex items-center gap-1 px-4 py-2 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 transition"
                  >
                    <Eye className="w-4 h-4" /> Detail
                  </button>
                  <button
                    onClick={() => router.push(`/admin/personal-trainer/edit/${trainer.id}`)}
                    className="flex items-center gap-1 px-4 py-2 rounded-full bg-yellow-400 text-white shadow hover:bg-yellow-500 transition"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

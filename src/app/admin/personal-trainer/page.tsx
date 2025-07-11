"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { Pencil, Eye, Phone, Users, UserCheck } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket Membership", href: "/admin/packages" },
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
  whatsapp?: string;
  clubLocation?: string;
  experience?: string;
  maxSlot?: number;
  specialties?: string[];
  certifications?: string[];
  sessionPackages?: SessionPackage[];
  status?: string;
  joinAt?: string;
}

const DEFAULT_AVATAR = "/user-default.png";

export default function PersonalTrainerPage() {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [trainers, setTrainers] = useState<PersonalTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState<{ [coachId: string]: number }>({});
  const router = useRouter();

  // Fetch trainers
  useEffect(() => {
    const fetchTrainers = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "users"));
      const data: PersonalTrainer[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.role === "coach") {
          data.push({
            id: docSnap.id,
            name: d.name || "-",
            email: d.email || "-",
            photoUrl: d.photoUrl,
            whatsapp: d.whatsapp,
            clubLocation: d.clubLocation,
            experience: d.experience,
            maxSlot: typeof d.maxSlot === "number" ? d.maxSlot : 10,
            specialties: Array.isArray(d.specialties) ? d.specialties : [],
            certifications: Array.isArray(d.certifications) ? d.certifications : [],
            sessionPackages: Array.isArray(d.sessionPackages) ? d.sessionPackages : [],
            status: d.status || "aktif",
            joinAt: d.createdAt ? ("" + d.createdAt).substring(0, 10) : "",
          });
        }
      });
      setTrainers(data);
      setLoading(false);

      // Sekaligus hitung jumlah klien dari member
      data.forEach(async (coach) => {
        const memberSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "member"), where("coachId", "==", coach.id))
        );
        setMemberCount((prev) => ({
          ...prev,
          [coach.id]: memberSnap.size,
        }));
      });
    };
    fetchTrainers();
  }, []);

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-white to-[#97CCDD]/30">
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-7 flex-wrap gap-2">
          <h1 className="text-3xl font-black text-gray-900 drop-shadow">Coach</h1>
          <button
            onClick={() => router.push("/admin/personal-trainer/add")}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1CB5E0] text-white font-semibold shadow hover:bg-[#156477] transition-all active:scale-95"
          >
            <span className="text-xl font-bold">+</span> Tambah Coach
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-16 h-16 border-4 border-[#97CCDD] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {trainers.length === 0 && (
              <div className="col-span-full text-gray-400 text-center text-lg">Belum ada pelatih pribadi.</div>
            )}
            {trainers.map((trainer, idx) => {
              const totalClients = memberCount[trainer.id] || 0;
              const slotTersisa = typeof trainer.maxSlot === "number"
                ? Math.max(trainer.maxSlot - totalClients, 0)
                : 0;

              return (
                <motion.div
                  key={trainer.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: idx * 0.07 }}
                  className="rounded-2xl bg-white p-7 shadow-xl border border-[#97CCDD] flex flex-col items-center group hover:scale-105 transition-all relative"
                >
                  <div className="relative">
                    <Image
                      src={trainer.photoUrl && trainer.photoUrl.length > 7 ? trainer.photoUrl : DEFAULT_AVATAR}
                      alt={trainer.name}
                      width={92}
                      height={92}
                      className="w-24 h-24 rounded-full object-cover border-4 border-[#97CCDD] mb-3 bg-white"
                    />
                    <span
                      className={`absolute bottom-1 right-2 w-4 h-4 rounded-full border-2 ${trainer.status === "aktif"
                        ? "bg-green-400 border-white"
                        : "bg-gray-300 border-gray-100"
                        }`}
                      title={trainer.status === "aktif" ? "Aktif" : "Nonaktif"}
                    ></span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 group-hover:text-[#156477]">{trainer.name}</h2>
                  <div className="text-gray-500 text-xs mb-1">{trainer.email}</div>
                  {trainer.whatsapp && (
                    <a
                      href={`https://wa.me/${trainer.whatsapp.replace(/^\+/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#1CB5E0] font-semibold hover:underline mb-1"
                    >
                      <Phone className="w-4 h-4" /> {trainer.whatsapp}
                    </a>
                  )}
                  {trainer.clubLocation && (
                    <div className="text-xs text-gray-600 mb-1">Lokasi Klub: <span className="font-semibold">{trainer.clubLocation}</span></div>
                  )}
                  {trainer.experience && (
                    <div className="text-xs text-gray-600 mb-1">Pengalaman: {trainer.experience}</div>
                  )}
                  <div className="flex gap-2 my-2 items-center">
                    <div className="text-xs text-gray-700 flex items-center gap-1">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>Klien Aktif:</span>
                      <span className="font-bold text-[#1CB5E0]">{totalClients}</span>
                      <span className="mx-1">/</span>
                      <span className="text-gray-700 font-bold">{trainer.maxSlot}</span>
                    </div>
                    <div className="text-xs flex items-center gap-1">
                      <UserCheck className="w-4 h-4 text-green-400" />
                      <span className="text-green-700 font-bold">
                        Sisa: {slotTersisa}
                      </span>
                    </div>
                  </div>
                  {trainer.specialties && trainer.specialties.length > 0 && (
                    <div className="text-xs text-gray-600 mb-1">Spesialisasi: <span className="font-medium">{trainer.specialties.join(", ")}</span></div>
                  )}
                  {trainer.certifications && trainer.certifications.length > 0 && (
                    <div className="text-xs text-gray-600 mb-1">Sertifikasi: <span className="font-medium">{trainer.certifications.join(", ")}</span></div>
                  )}
                  {trainer.sessionPackages && trainer.sessionPackages.length > 0 && (
                    <div className="w-full text-xs text-gray-700 mb-2 mt-1">
                      <div className="font-semibold">Paket Sesi:</div>
                      <ul className="list-disc ml-5">
                        {trainer.sessionPackages.map((pkg, i) => (
                          <li key={i}>
                            <span className="font-semibold">{pkg.name}</span>{" "}
                            <span className="text-[#1CB5E0]">Rp{Number(pkg.price).toLocaleString()}</span>
                            {pkg.note && ` (${pkg.note})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {trainer.joinAt && (
                    <div className="text-[10px] text-gray-400 mt-2">Bergabung: {trainer.joinAt}</div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => router.push(`/admin/personal-trainer/${trainer.id}`)}
                      className="flex items-center gap-1 px-4 py-2 rounded-full bg-[#1CB5E0] text-white shadow hover:bg-[#156477] transition"
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
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

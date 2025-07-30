// src\app\admin\classes\tabs\FunctionalTab.tsx

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Calendar, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface FunctionalClass {
  id: string;
  description: string;
  period?: string;
  price?: number;
  slot?: number;
  imageUrl?: string;
}

export default function FunctionalTab() {
  const [classes, setClasses] = useState<FunctionalClass[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchClasses = async () => {
    setLoading(true);
    const q = query(collection(db, "classes"), where("type", "==", "functional"));
    const snap = await getDocs(q);
    const data: FunctionalClass[] = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      data.push({
        id: docSnap.id,
        description: d.description || "",
        period: d.period || "",
        price: typeof d.price === "number" ? d.price : undefined,
        slot: typeof d.slot === "number" ? d.slot : undefined,
        imageUrl: d.imageUrl || "",
      });
    });
    setClasses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus paket Functional ini?")) return;
    try {
      await deleteDoc(doc(db, "classes", id));
      fetchClasses();
    } catch {
      alert("Gagal hapus paket.");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-green-700 flex items-center gap-2">
          <Repeat2 className="w-6 h-6 text-green-500" /> Paket Functional
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl p-6 bg-gray-200 animate-pulse h-48" />
            ))
          : classes.length === 0
          ? <div className="text-center col-span-full text-gray-400 py-12">Belum ada paket Functional</div>
          : classes.map((cls, index) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="rounded-2xl p-6 bg-white border border-green-300 shadow-md hover:shadow-xl transition-all group flex flex-col"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Repeat2 className="w-6 h-6 text-green-500" />
                  <h3 className="text-xl font-semibold text-gray-800 group-hover:text-green-700 transition">
                    Paket Functional
                  </h3>
                </div>
                {cls.imageUrl && (
                  <Image
                    src={cls.imageUrl}
                    alt="Gambar Functional"
                    width={340}
                    height={120}
                    className="rounded-xl shadow mb-3 object-cover w-full"
                  />
                )}
                <p className="text-base text-gray-600 mb-3">{cls.description}</p>
                <div className="flex flex-col gap-2 mb-4">
                  {cls.period && (
                    <span className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-green-500" /> Periode: <b className="ml-1 text-green-700">{cls.period}</b>
                    </span>
                  )}
                  {typeof cls.slot === "number" && (
                    <span className="flex items-center gap-2 text-sm text-gray-700">
                      Slot: <b className="ml-1 text-blue-700">{cls.slot}</b>
                    </span>
                  )}
                  {typeof cls.price === "number" && (
                    <span className="flex items-center gap-2 text-sm text-gray-700">
                      Harga: <b className="ml-1 text-pink-600">Rp{cls.price.toLocaleString()}</b>
                    </span>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-auto">
                  <button
                    onClick={() => router.push(`/admin/classes/functional-form?id=${cls.id}`)}
                    className="p-2 bg-green-500 text-white rounded-full hover:scale-110 transition"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cls.id)}
                    className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
      </div>
    </div>
  );
}

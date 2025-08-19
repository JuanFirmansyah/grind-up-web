// src/app/admin/classes/tabs/RegulerTab.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface GymClass {
  id: string;
  className: string;
  date: string;
  time: string;
  coach: string;
  slots: number;
  type: string;
}

export default function RegulerTab() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchClasses = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "classes"));
    const data: GymClass[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.type === "regular") {
        data.push({ id: docSnap.id, ...d } as GymClass);
      }
    });
    setClasses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading
        ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-6 bg-gray-200 animate-pulse h-48" />
          ))
        : classes.map((cls, index) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-2xl p-6 bg-white border border-gray-200 shadow-md hover:shadow-xl transition-all group"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-1 group-hover:text-blue-700 transition">
                {cls.className}
              </h2>
              <p className="text-sm text-gray-600">Coach: <span className="font-medium text-gray-800">{cls.coach}</span></p>
              <p className="text-sm text-gray-600">{cls.date} | {cls.time}</p>
              <p className="text-sm text-gray-600">Slots: {cls.slots}</p>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => router.push(`/admin/classes/form?id=${cls.id}`)}
                  className="p-2 bg-yellow-400 text-white rounded-full hover:scale-110 transition"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
    </div>
  );
}

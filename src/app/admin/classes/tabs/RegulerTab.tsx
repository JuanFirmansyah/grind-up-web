// src/app/admin/classes/tabs/RegulerTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, deleteDoc, doc, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

/* ====== Style tokens ====== */
const ui = {
  brand: "#97CCDD",
  brandDark: "#4A9EBB",
};

/* ====== Types ====== */
type Tag = "regular" | "functional" | "special";
type FireTs = { seconds: number; nanoseconds: number };

interface GymClassRow {
  id: string;
  className: string;
  coach: string;
  slots: number;
  type: "regular" | "special";
  tag?: Tag;
  // Display helpers
  startAtMs: number | null; // dari startAt Timestamp ATAU dari date+time string
  displayDate: string;      // "21 Aug 2025"
  displayTime: string;      // "15:00"
}

/* ====== Time utils (tanpa bergantung ISO dari Firestore) ====== */
function toMillis(v: unknown): number | null {
  if (!v) return null;
  if (typeof v === "object" && v !== null && "seconds" in v) {
    const ts = v as FireTs;
    return ts.seconds * 1000;
  }
  if (typeof v === "number") return v >= 1e12 ? v : v * 1000;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  if (v instanceof Date) return v.getTime();
  return null;
}

function fromDateTimeStrings(dateStr?: unknown, timeStr?: unknown): number | null {
  if (typeof dateStr !== "string" || typeof timeStr !== "string") return null;
  const t = Date.parse(`${dateStr}T${timeStr}:00`); // hanya untuk fallback string
  return Number.isNaN(t) ? null : t;
}

function formatDate(ms: number | null): [string, string] {
  if (!ms) return ["-", "-"];
  const d = new Date(ms);
  // Format ringkas lokal Indonesia
  const date = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
  return [date, time];
}

export default function RegulerTab() {
  const [classes, setClasses] = useState<GymClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "classes"));

      const rows: GymClassRow[] = [];
      snap.forEach((docSnap) => {
        const raw = docSnap.data() as DocumentData;

        // Ambil waktu kelas: utamakan startAt (Timestamp), fallback date+time (string)
        const startAtMs =
          toMillis(raw.startAt) ??
          fromDateTimeStrings(raw.date, raw.time);

        const [displayDate, displayTime] = formatDate(startAtMs);

        const typeStr = typeof raw.type === "string" ? raw.type : "regular";

        if (typeStr === "regular") {
          rows.push({
            id: docSnap.id,
            className: typeof raw.className === "string" ? raw.className : "(Tanpa nama)",
            coach: typeof raw.coach === "string" ? raw.coach : "-",
            slots: typeof raw.slots === "number" ? raw.slots : 0,
            type: "regular",
            tag: typeof raw.tag === "string" ? (raw.tag as Tag) : undefined,
            startAtMs,
            displayDate,
            displayTime,
          });
        }
      });

      // urutkan dari yang terdekat
      rows.sort((a, b) => {
        const am = a.startAtMs ?? 0;
        const bm = b.startAtMs ?? 0;
        return am - bm;
      });

      setClasses(rows);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

  const onDelete = useMemo(
    () => async (id: string) => {
      if (typeof window !== "undefined") {
        const ok = window.confirm("Hapus kelas ini?");
        if (!ok) return;
      }
      await deleteDoc(doc(db, "classes", id));
      // Optimistic update
      setClasses((prev) => prev.filter((c) => c.id !== id));
    },
    []
  );

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
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="rounded-2xl p-6 bg-white border border-gray-200 shadow-md hover:shadow-xl transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-800 group-hover:text-sky-700 transition">
                  {cls.className}
                </h2>
                {cls.tag && (
                  <span
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ background: `${ui.brand}26`, color: ui.brandDark }}
                  >
                    {cls.tag}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600">
                Coach: <span className="font-medium text-gray-800">{cls.coach}</span>
              </p>
              <p className="text-sm text-gray-600">
                {cls.displayDate} • {cls.displayTime}
              </p>
              <p className="text-sm text-gray-600">Slots: {cls.slots}</p>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => router.push(`/admin/classes/form?id=${cls.id}`)}
                  className="p-2 bg-yellow-400 text-white rounded-full hover:scale-110 transition"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(cls.id)}
                  className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
    </div>
  );
}

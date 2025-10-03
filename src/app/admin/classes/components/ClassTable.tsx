// src/app/admin/classes/components/ClassTable.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, Users, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmptyState, LoadingSkeleton, StatCard } from "./utils";
import TableView from "./TableView";
import GridView from "./GridView";

interface ClassTableProps {
  type: "regular" | "special";
  viewMode: "table" | "grid";
  searchTerm: string;
  dateFilter: string;
}

type GymClass = {
  id: string;
  className: string;
  coach: string;
  slots: number;
  bookedCount: number;
  date: string;
  time: string;
  duration: number;
  level: string;
  tags: string[];
  imageUrl?: string;
};

export default function ClassTable({ type, viewMode, searchTerm, dateFilter }: ClassTableProps) {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Pindahkan fetchClasses ke useCallback untuk menghindari infinite loop
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "classes"));
    const data: GymClass[] = [];

    snapshot.forEach((docSnap) => {
      const raw = docSnap.data();
      
      // Determine type based on tags or dedicated type field
      const classTags = raw.tags || [];
      const isSpecial = classTags.includes("special") || raw.type === "special";
      
      if ((type === "special" && isSpecial) || (type === "regular" && !isSpecial)) {
        data.push({
          id: docSnap.id,
          className: raw.className || "Unnamed Class",
          coach: raw.coach || "Unknown Coach",
          slots: raw.slots || 0,
          bookedCount: raw.bookedCount || 0,
          date: raw.date || "",
          time: raw.time || "",
          duration: raw.duration || 60,
          level: raw.level || "Beginner",
          tags: raw.tags || [],
          imageUrl: raw.imageUrl,
        });
      }
    });

    // Sort by date and time
    data.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time);
    });

    setClasses(data);
    setLoading(false);
  }, [type]); // type sebagai dependency

  // Filter classes
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      const matchesSearch = cls.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cls.coach.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = !dateFilter || cls.date === dateFilter;
      return matchesSearch && matchesDate;
    });
  }, [classes, searchTerm, dateFilter]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]); // Sekarang fetchClasses stabil karena menggunakan useCallback

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kelas ini?")) return;
    
    try {
      await deleteDoc(doc(db, "classes", id));
      setClasses(prev => prev.filter(cls => cls.id !== id));
    } catch {
      alert("Gagal menghapus kelas");
    }
  };

  if (loading) {
    return <LoadingSkeleton viewMode={viewMode} />;
  }

  if (filteredClasses.length === 0) {
    return <EmptyState type={type} searchTerm={searchTerm} />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Total Kelas"
          value={filteredClasses.length}
          color="blue"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Slot"
          value={filteredClasses.reduce((sum, cls) => sum + cls.slots, 0)}
          color="green"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Rata-rata Durasi"
          value={`${Math.round(filteredClasses.reduce((sum, cls) => sum + cls.duration, 0) / filteredClasses.length)} menit`}
          color="purple"
        />
      </div>

      {/* Content based on view mode */}
      {viewMode === "table" ? (
        <TableView classes={filteredClasses} onEdit={id => router.push(`/admin/classes/form?id=${id}`)} onDelete={handleDelete} />
      ) : (
        <GridView classes={filteredClasses} onEdit={id => router.push(`/admin/classes/form?id=${id}`)} onDelete={handleDelete} />
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminTopbar } from "@/components/AdminTopbar";
import { signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/id";
import Image from "next/image";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket Membership", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
  { label: "Galeri", href: "/admin/gallery" },
];

type CoachType = {
  name: string;
  email: string;
  phone: string;
  clubLocation?: string;
  clientCount?: number;
  maxSlot?: number;
  experience?: string;
  specialties?: string[];
  certifications?: string[];
  photoUrl?: string;
  status?: string;
  sessionPackages?: { name: string; price: string; note?: string }[];
  role: string;
};

type ClassType = {
  id: string;
  date: string;
  name: string;
  time: string;
  coach: string;
  coachPhoto?: string;
  desc?: string;
  memberCount?: number;
  room?: string;
  calories?: number;
  level?: string;
};

const today = new Date();
const getDateString = (date: Date) => dayjs(date).format("YYYY-MM-DD");

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalMembers: 0,
    upcomingClasses: 0,
    attendanceToday: 0,
  });
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // Data kelas dan coach
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [coaches, setCoaches] = useState<Record<string, CoachType>>({});

  // Calendar states
  const [selectedDate, setSelectedDate] = useState(getDateString(today));
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);

  // Date range for calendar (next 7 days)
  const calendarDates = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(today.getDate() + i);
    return getDateString(date);
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // Stats: Members
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "in", ["member", "coach"])));
        setStats(prev => ({ ...prev, totalMembers: usersSnap.size }));

        // Stats: Absensi Hari Ini (0/placeholder, sesuaikan collection attendances kalau sudah ready)
        setStats(prev => ({ ...prev, attendanceToday: 0 }));

        // Fetch classes in the calendar range
        const classesSnap = await getDocs(collection(db, "classes"));
        const classesData: ClassType[] = [];
        classesSnap.forEach((doc) => {
          const d = doc.data();
          classesData.push({
            id: doc.id,
            ...d,
            date: dayjs(d.date?.toDate ? d.date.toDate() : d.date).format("YYYY-MM-DD"),
          } as ClassType);
        });
        setClasses(classesData);

        // Kelas akan datang (semua yang date >= hari ini)
        setStats(prev => ({
          ...prev,
          upcomingClasses: classesData.filter(c => c.date >= getDateString(today)).length,
        }));

        // Fetch all coaches
        const coachSnap = await getDocs(query(collection(db, "users"), where("role", "==", "coach")));
        const coachMap: Record<string, CoachType> = {};
        coachSnap.forEach((doc) => {
          const coachData = doc.data() as CoachType;
          coachMap[coachData.name] = coachData;
        });
        setCoaches(coachMap);

      } catch {
        setError("Gagal memuat data dashboard.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []); // today tidak perlu di deps, karena selalu dari Date()

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const Content = () => (
    <section className="flex-1 p-6 space-y-8 overflow-x-hidden">
      <h1 className="text-3xl font-bold mb-2">Dashboard Admin</h1>
      <div className="flex gap-6 mb-4 flex-wrap">
        <Card title="Total Member" value={stats.totalMembers} color="blue" icon="users" />
        <Card title="Kelas Akan Datang" value={stats.upcomingClasses} color="green" icon="calendar" />
        <Card title="Absensi Hari Ini" value={stats.attendanceToday} color="purple" icon="check" />
      </div>
      {/* Kalender Kelas */}
      <ClassCalendar
        dates={calendarDates}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        classes={classes}
        coaches={coaches}
        onShowDetail={setSelectedClass}
      />

      {/* Modal detail kelas */}
      <AnimatePresence>
        {selectedClass && (
          <ClassDetailModal
            data={selectedClass}
            coach={coaches[selectedClass.coach] || {}}
            onClose={() => setSelectedClass(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );

  if (loading) {
    return (
      <main className="flex">
        <AdminSidebar navItems={navItems} onLogout={handleLogout} showLogout />
        <section className="flex-1 p-6 animate-pulse space-y-6">
          <div className="h-10 w-1/3 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex">
        <AdminSidebar navItems={navItems} onLogout={handleLogout} showLogout />
        <section className="flex-1 flex flex-col items-center justify-center text-red-600">
          <p className="text-xl font-semibold animate-bounce">{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => router.refresh()}
          >
            Coba Lagi
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white">
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
        onLogout={handleLogout}
        showLogout
      />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} onLogout={handleLogout} showLogout />
      <Content />
    </main>
  );
}

// Icon helper
function getIcon(name: string, color: string) {
  if (name === "users")
    return <svg className={`w-8 h-8 text-${color}-500`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-4a4 4 0 00-4 4v2h5m-6-8a4 4 0 110-8 4 4 0 010 8zm6 4a4 4 0 01-4-4"></path></svg>;
  if (name === "calendar")
    return <svg className={`w-8 h-8 text-${color}-500`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="M8 2v4m8-4v4m-8 4h8" /></svg>;
  if (name === "check")
    return <svg className={`w-8 h-8 text-${color}-500`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
  return null;
}

// Stat card component
function Card({ title, value, color, icon }: { title: string; value: number | undefined; color: string; icon: string }) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 2px 32px 0 #97CCDD22" }}
      className={`flex items-center gap-4 p-6 rounded-xl shadow-md border-t-4 border-${color}-500 bg-${color}-50 text-${color}-700 transition-all hover:scale-[1.02] min-w-[240px]`}
    >
      <div>{getIcon(icon, color)}</div>
      <div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </motion.div>
  );
}

// Komponen Kalender Kelas
function ClassCalendar({
  dates,
  selectedDate,
  onSelectDate,
  classes,
  coaches,
  onShowDetail,
}: {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  classes: ClassType[];
  coaches: Record<string, CoachType>;
  onShowDetail: (cls: ClassType) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Kalender Kelas Mingguan</h2>
      <div className="flex gap-2 mb-6 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-blue-200">
        {dates.map((date) => {
          const d = dayjs(date).locale("id");
          const labelDay = d.format("ddd");
          const labelDate = d.format("DD MMM");
          return (
            <motion.button
              key={date}
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.07, boxShadow: "0 2px 24px 0 #97CCDD44" }}
              className={`flex flex-col items-center justify-center px-4 py-3 min-w-[95px] rounded-xl border-2 transition-all font-bold
                ${selectedDate === date ? "bg-[#97CCDD] text-blue-900 border-blue-700" : "bg-white border-gray-200 text-gray-700"}
                hover:bg-[#97CCDD]/80 hover:text-white
              `}
              onClick={() => onSelectDate(date)}
            >
              <span className="text-sm">{labelDay}</span>
              <span className="text-2xl">{labelDate.split(" ")[0]}</span>
              <span className="text-xs">{labelDate.split(" ")[1]}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {classes.filter(cls => cls.date === selectedDate).length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 font-semibold">
            Tidak ada kelas di tanggal ini.
          </div>
        )}
        {classes.filter(cls => cls.date === selectedDate).map((cls) => {
          const coach = coaches[cls.coach] || {};
          return (
            <motion.div
              key={cls.id}
              layout
              whileHover={{ y: -4, boxShadow: "0 8px 32px 0 #97CCDD55" }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-3 cursor-pointer border border-[#97CCDD] hover:bg-[#E9F7FC]"
              onClick={() => onShowDetail(cls)}
            >
              <div className="flex items-center gap-3">
                <Image
                  src={coach.photoUrl || "/default-coach.png"}
                  alt={cls.coach ? `Foto Coach ${cls.coach}` : "Foto Coach"}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full border-2 border-[#97CCDD] object-cover"
                />
                <div>
                  <div className="font-bold text-lg">{cls.name}</div>
                  <div className="text-sm text-gray-500">Coach: {cls.coach}</div>
                </div>
              </div>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>{cls.time}</span>
                <span>Ruangan: {cls.room}</span>
              </div>
              <div className="flex gap-3 flex-wrap text-xs mt-1">
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{cls.level}</span>
                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{cls.calories} kcal</span>
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{cls.memberCount || 0} Peserta</span>
              </div>
              <div className="text-gray-500 text-xs mt-1 line-clamp-2">{cls.desc}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Modal detail kelas
function ClassDetailModal({
  data,
  coach,
  onClose,
}: {
  data: ClassType;
  coach: CoachType;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-md relative"
        initial={{ scale: 0.92, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
      >
        <button className="absolute right-4 top-4 text-gray-400 hover:text-red-400 text-2xl"
          onClick={onClose} aria-label="Tutup">&times;</button>
        <div className="flex items-center gap-4 mb-3">
          <Image
            src={coach.photoUrl || "/default-coach.png"}
            alt={data.coach ? `Foto Coach ${data.coach}` : "Foto Coach"}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full border-2 border-[#97CCDD] object-cover"
          />
          <div>
            <div className="text-lg font-bold">{data.name}</div>
            <div className="text-sm text-gray-500">Coach: {data.coach}</div>
            {coach.email && <div className="text-xs text-gray-400">{coach.email}</div>}
          </div>
        </div>
        <div className="mb-2 text-sm text-gray-700">{data.desc}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm my-3">
          <div><b>Waktu:</b><br />{data.time}</div>
          <div><b>Ruangan:</b><br />{data.room}</div>
          <div><b>Level:</b><br />{data.level}</div>
          <div><b>Kalori Burn:</b><br />{data.calories} kcal</div>
          <div><b>Peserta:</b><br />{data.memberCount || 0} Orang</div>
        </div>
        <div className="border-t pt-4 mt-4">
          <div className="font-semibold text-gray-700 mb-2">Profil Coach:</div>
          <div className="text-xs text-gray-500 mb-1">Email: {coach.email}</div>
          <div className="text-xs text-gray-500 mb-1">Pengalaman: {coach.experience}</div>
          <div className="text-xs text-gray-500 mb-1">No HP: {coach.phone}</div>
          <div className="text-xs text-gray-500">Spesialisasi: {(coach.specialties || []).join(", ")}</div>
        </div>
        <button
          className="mt-6 w-full bg-[#97CCDD] hover:bg-blue-400 text-white font-bold py-2 rounded-xl transition-all"
          onClick={onClose}
        >
          Tutup
        </button>
      </motion.div>
    </motion.div>
  );
}

// src/app/admin/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminTopbar } from "@/components/AdminTopbar";
import { signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  type Timestamp,
  doc,
  setDoc,
  updateDoc,
  increment,
  type DocumentData,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/id";
import Image from "next/image";
import { CreditCard } from "lucide-react";

/* ============ Palet warna konsisten ============ */
const colors = {
  base: "#97CCDD",
  light: "#C1E3ED",
  dark: "#6FB5CC",
  darker: "#4A9EBB",
  complementary: "#DDC497",
  text: "#2D3748",
  textLight: "#F8FAFC",
};

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Absensi", href: "/admin/attendance" },
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
  date: string; // "YYYY-MM-DD"
  name: string;
  time: string;
  coach: string;
  coachPhoto?: string;
  desc?: string;
  memberCount?: number; // (tidak dipakai utk slot)
  room?: string;
  calories?: number;
  level?: string;
  slots?: number;          // total slot
  bookedCount?: number;    // jumlah sudah hadir/tercatat
};

type MaybeTs = Date | string | number | Timestamp | null | undefined;
function toDateValue(v: MaybeTs): Date | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if ((v as Timestamp)?.toDate) return (v as Timestamp).toDate();
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

const today = new Date();
const fmtDateId = (d: Date) => dayjs(d).locale("id").format("YYYY-MM-DD");

type PendingBreakdown = { qris: number; cash: number; transfer: number; other: number };
type PaymentDoc = { approvedAt?: MaybeTs; status?: string; method?: string };

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalMembers: 0,
    upcomingClasses: 0,
    attendanceToday: 0,
    expiringSoon: 0,
    expired: 0,
    pendingPayments: 0,
    pendingPaymentsBy: { qris: 0, cash: 0, transfer: 0, other: 0 } as PendingBreakdown,
  });

  // Data kelas & coach
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [coaches, setCoaches] = useState<Record<string, CoachType>>({});

  // Calendar states
  const [selectedDate, setSelectedDate] = useState(fmtDateId(today));

  // Popups
  const [selectedClassDetail, setSelectedClassDetail] = useState<ClassType | null>(null);
  const [attendanceTarget, setAttendanceTarget] = useState<ClassType | null>(null);

  // Date range for calendar (next 7 days)
  const calendarDates = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(today.getDate() + i);
        return fmtDateId(d);
      }),
    []
  );

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // ========= Members =========
        const usersSnap = await getDocs(collection(db, "users"));
        let totalMembers = 0;
        let expiringSoon = 0;
        let expired = 0;

        usersSnap.forEach((docSnap) => {
          const d = docSnap.data() as { role?: string; expiresAt?: MaybeTs; expiredAt?: MaybeTs };
          const role = (d.role || "").toLowerCase();
          if (role === "member") {
            totalMembers += 1;
            const expRaw = d.expiresAt ?? d.expiredAt ?? null;
            const expDate = toDateValue(expRaw);
            if (expDate) {
              const now = new Date();
              const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays < 0) expired += 1;
              else if (diffDays <= 7) expiringSoon += 1;
            }
          }
        });

        // ========= Classes =========
        const classesSnap = await getDocs(collection(db, "classes"));
        const classesData: ClassType[] = [];
        classesSnap.forEach((docSnap) => {
          const d = docSnap.data() as DocumentData;
          const dateObj = toDateValue(d.date);
          classesData.push({
            id: docSnap.id,
            name: (d.name || d.className || "Tanpa Nama") as string,
            time: (d.time || "-") as string,
            coach: (d.coach || "-") as string,
            date: dateObj ? fmtDateId(dateObj) : fmtDateId(today),
            desc: (d.desc || d.description || "") as string,
            memberCount: (d.memberCount ?? 0) as number,
            room: (d.room || "-") as string,
            calories: (d.calories ?? d.calorieBurn ?? 0) as number,
            level: (d.level || "-") as string,
            slots: (d.slots ?? 0) as number,
            bookedCount: (d.bookedCount ?? 0) as number, // dipakai utk slot tersisa
          });
        });

        const upcomingClasses = classesData.filter((c) => c.date >= fmtDateId(today)).length;

        // ========= Coaches =========
        const coachSnap = await getDocs(query(collection(db, "users"), where("role", "==", "coach")));
        const coachMap: Record<string, CoachType> = {};
        coachSnap.forEach((docSnap) => {
          const c = docSnap.data() as CoachType;
          if (c?.name) coachMap[c.name] = c;
        });

        // ========= Payments (pending + breakdown) =========
        const paymentsSnap = await getDocs(collection(db, "payments"));
        let pendingPayments = 0;
        const pendingBy: PendingBreakdown = { qris: 0, cash: 0, transfer: 0, other: 0 };

        paymentsSnap.forEach((docSnap) => {
          const p = docSnap.data() as PaymentDoc;
          const isApproved = Boolean(toDateValue(p.approvedAt));
          const status = (p.status || "").toLowerCase();
          const failed =
            status === "rejected" || status === "cancelled" || status === "failed" || status === "expired";

          if (!isApproved && !failed) {
            pendingPayments += 1;
            const method = (p.method || "").toLowerCase();
            if (method === "qris") pendingBy.qris += 1;
            else if (method === "cash") pendingBy.cash += 1;
            else if (method === "transfer" || method === "bank_transfer") pendingBy.transfer += 1;
            else pendingBy.other += 1;
          }
        });

        setStats({
          totalMembers,
          upcomingClasses,
          attendanceToday: 0,
          expiringSoon,
          expired,
          pendingPayments,
          pendingPaymentsBy: pendingBy,
        });

        setClasses(classesData);
        setCoaches(coachMap);
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // helper untuk sync bookedCount lokal saat absensi berubah
  const adjustBookedCount = (classId: string, delta: number) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, bookedCount: Math.max(0, (c.bookedCount ?? 0) + delta) } : c))
    );
  };

  return (
    <main
      className="min-h-screen flex flex-col md:flex-row relative"
      style={{ background: `linear-gradient(135deg, ${colors.light}20 0%, #ffffff 35%, ${colors.base}20 100%)` }}
    >
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
        onLogout={handleLogout}
        showLogout
      />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} onLogout={handleLogout} showLogout />

      {loading ? (
        <section className="flex-1 p-6 md:p-8 space-y-6">
          <div className="h-10 w-1/3 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="h-8 w-1/4 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </section>
      ) : (
        <section className="flex-1 p-6 md:p-8 space-y-6 overflow-x-hidden">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div
              className="rounded-2xl px-5 py-4 shadow-md border"
              style={{
                background: `linear-gradient(90deg, ${colors.darker} 0%, ${colors.dark} 100%)`,
                color: colors.textLight,
                borderColor: colors.light,
              }}
            >
              <h1 className="text-2xl md:text-3xl font-extrabold">Dashboard Admin</h1>
              <p className="opacity-90 mt-1 text-sm md:text-base">Ringkasan aktivitas, monitoring member & jadwal kelas hari ini.</p>
            </div>
          </motion.div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Total Member" value={stats.totalMembers} chip="Semua" chipColor={colors.base} />
            <StatCard label="Kelas Akan Datang" value={stats.upcomingClasses} chip="Kelas" chipColor="#22c55e" />
            <StatCard label="Absensi Hari Ini" value={stats.attendanceToday} chip="Absensi" chipColor="#a855f7" />
            <ClickableStatCard
              label="Belum Terverifikasi"
              value={stats.pendingPayments}
              chip="Finance"
              chipColor={colors.dark}
              onClick={() => router.push("/admin/reports/finance")}
              title="Lihat & verifikasi pembayaran"
              icon={<CreditCard className="h-6 w-6 text-gray-400" />}
              subtitle={`QRIS ${stats.pendingPaymentsBy.qris} • Cash ${stats.pendingPaymentsBy.cash} • Transfer ${stats.pendingPaymentsBy.transfer}${
                stats.pendingPaymentsBy.other ? ` • Lainnya ${stats.pendingPaymentsBy.other}` : ""
              }`}
            />
          </div>

          {/* Monitoring Member */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ClickableStatCard
              label="Akan Expired (≤7 hari)"
              value={stats.expiringSoon}
              chip="Segera"
              chipColor="#f59e0b"
              onClick={() => router.push("/admin/members")}
              title="Lihat daftar member yang akan expired (≤7 hari)"
            />
            <ClickableStatCard
              label="Sudah Expired"
              value={stats.expired}
              chip="Expired"
              chipColor="#ef4444"
              onClick={() => router.push("/admin/members")}
              title="Lihat daftar member yang sudah expired"
            />
          </div>

          {/* Kalender Kelas */}
          <ClassCalendar
            dates={calendarDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            classes={classes}
            coaches={coaches}
            onShowDetail={setSelectedClassDetail}
            onShowAttendance={setAttendanceTarget}
          />

          {/* Modal detail kelas */}
          <AnimatePresence>
            {selectedClassDetail && (
              <ClassDetailModal
                data={selectedClassDetail}
                coach={coaches[selectedClassDetail.coach] || ({} as CoachType)}
                onClose={() => setSelectedClassDetail(null)}
              />
            )}
          </AnimatePresence>

          {/* Modal Absensi */}
          <AnimatePresence>
            {attendanceTarget && (
              <AttendanceModal
                cls={attendanceTarget}
                onClose={() => setAttendanceTarget(null)}
                onChanged={adjustBookedCount}
              />
            )}
          </AnimatePresence>
        </section>
      )}
    </main>
  );
}

/* ============ Small UI Components ============ */

function StatCard({
  label,
  value,
  chip,
  chipColor,
}: {
  label: string;
  value: number;
  chip: string;
  chipColor: string;
}) {
  return (
    <motion.div whileHover={{ y: -2, boxShadow: "0 2px 32px 0 #97CCDD22" }} className="rounded-2xl p-4 shadow-sm border bg-white" style={{ borderColor: colors.light }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-3xl font-extrabold" style={{ color: colors.text }}>{value}</div>
        </div>
        <span className="px-2 py-1 text-xs font-bold rounded-lg" style={{ background: chipColor, color: colors.textLight }}>
          {chip}
        </span>
      </div>
    </motion.div>
  );
}

function ClickableStatCard({
  label,
  value,
  chip,
  chipColor,
  onClick,
  title,
  icon,
  subtitle,
}: {
  label: string;
  value: number;
  chip: string;
  chipColor: string;
  onClick: () => void;
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2, boxShadow: "0 2px 32px 0 #97CCDD22" }}
      onClick={onClick}
      title={title}
      className="w-full text-left rounded-2xl p-4 shadow-sm border bg-white transition"
      style={{ borderColor: colors.light }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-3xl font-extrabold" style={{ color: colors.text }}>{value}</div>
          {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2">
          {icon}
          <span className="px-2 py-1 text-xs font-bold rounded-lg" style={{ background: chipColor, color: colors.textLight }}>
            {chip}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/* ============ Komponen Kalender Kelas ============ */
function ClassCalendar({
  dates,
  selectedDate,
  onSelectDate,
  classes,
  coaches,
  onShowDetail,
  onShowAttendance,
}: {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  classes: ClassType[];
  coaches: Record<string, CoachType>;
  onShowDetail: (cls: ClassType) => void;
  onShowAttendance: (cls: ClassType) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-2" style={{ color: colors.text }}>Kalender Kelas Mingguan</h2>
      <div className="flex gap-2 mb-6 overflow-x-auto py-2">
        {dates.map((date) => {
          const d = dayjs(date).locale("id");
          const dayLabel = d.format("ddd");
          const num = d.format("DD");
          const mon = d.format("MMM");
          const active = selectedDate === date;
          return (
            <motion.button
              key={date}
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.03, boxShadow: "0 2px 24px 0 #97CCDD44" }}
              className="flex flex-col items-center justify-center px-4 py-3 min-w-[95px] rounded-xl border-2 transition font-bold"
              style={{
                borderColor: active ? colors.darker : "#e5e7eb",
                background: active ? colors.base : "#ffffff",
                color: active ? "#0f172a" : "#374151",
              }}
              onClick={() => onSelectDate(date)}
            >
              <span className="text-sm">{dayLabel}</span>
              <span className="text-2xl">{num}</span>
              <span className="text-xs">{mon}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {classes.filter((c) => c.date === selectedDate).length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 font-semibold">Tidak ada kelas di tanggal ini.</div>
        )}
        {classes
          .filter((c) => c.date === selectedDate)
          .map((cls) => {
            const coach = coaches[cls.coach] || ({} as CoachType);
            const total = cls.slots ?? 0;
            const booked = cls.bookedCount ?? 0;
            const available = Math.max(0, total - booked);

            return (
              <motion.div
                key={cls.id}
                layout
                whileHover={{ y: -4, boxShadow: "0 8px 32px 0 #97CCDD55" }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-3 border"
                style={{ borderColor: colors.base }}
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={coach.photoUrl || "/default-coach.png"}
                    alt={cls.coach ? `Foto Coach ${cls.coach}` : "Foto Coach"}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border-2 object-cover"
                    style={{ borderColor: colors.base }}
                  />
                  <div className="flex-1">
                    <div className="font-bold text-lg" style={{ color: colors.text }}>{cls.name}</div>
                    <div className="text-sm text-gray-500">Coach: {cls.coach}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold">Slot Tersisa</div>
                    <div className="px-2 py-0.5 rounded-md inline-block mt-1"
                      style={{ background: available > 0 ? "#dcfce7" : "#fee2e2", color: available > 0 ? "#166534" : "#991b1b" }}>
                      {available}/{total}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-gray-600">
                  <span>{cls.time}</span>
                  <span>Ruangan: {cls.room}</span>
                </div>
                <div className="flex gap-3 flex-wrap text-xs mt-1">
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{cls.level}</span>
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{cls.calories ?? 0} kcal</span>
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{cls.memberCount || 0} Peserta</span>
                </div>
                <div className="text-gray-500 text-xs mt-1 line-clamp-2">{cls.desc}</div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: colors.light }}
                    onClick={() => onShowDetail(cls)}
                  >
                    Detail
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg text-white text-sm"
                    style={{ background: colors.darker }}
                    onClick={() => onShowAttendance(cls)}
                    title="Absensi"
                  >
                    Absensi
                  </button>
                </div>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}

/* ============ Modal detail kelas ============ */
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
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal>
      <motion.div
        className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-md relative"
        initial={{ scale: 0.92, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
      >
        <button className="absolute right-4 top-4 text-gray-400 hover:text-red-400 text-2xl" onClick={onClose} aria-label="Tutup">
          &times;
        </button>
        <div className="flex items-center gap-4 mb-3">
          <Image
            src={coach.photoUrl || "/default-coach.png"}
            alt={data.coach ? `Foto Coach ${data.coach}` : "Foto Coach"}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full border-2 object-cover"
            style={{ borderColor: colors.base }}
          />
          <div>
            <div className="text-lg font-bold" style={{ color: colors.text }}>{data.name}</div>
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
          {coach.email && <div className="text-xs text-gray-500 mb-1">Email: {coach.email}</div>}
          {coach.experience && <div className="text-xs text-gray-500 mb-1">Pengalaman: {coach.experience}</div>}
          {coach.phone && <div className="text-xs text-gray-500 mb-1">No HP: {coach.phone}</div>}
          {(coach.specialties?.length ?? 0) > 0 && (
            <div className="text-xs text-gray-500">Spesialisasi: {(coach.specialties || []).join(", ")}</div>
          )}
        </div>
        <button className="mt-6 w-full text-white font-bold py-2 rounded-xl transition-all" style={{ background: colors.base }} onClick={onClose}>
          Tutup
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ============ Modal Absensi ============ */
type UserLite = { id: string; name?: string; email?: string; phone?: string };

function AttendanceModal({
  cls,
  onClose,
  onChanged,
}: {
  cls: ClassType;
  onClose: () => void;
  onChanged: (classId: string, delta: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<UserLite[]>([]);
  const [search, setSearch] = useState("");
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const classRef = doc(db, "classes", cls.id);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [usersSnap, attendanceSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "classes", cls.id, "attendance")),
      ]);

      const users: UserLite[] = [];
      usersSnap.forEach((d) => {
        const u = d.data() as DocumentData;
        if ((u.role || "member").toLowerCase() === "member" && !u.deleted) {
          users.push({
            id: d.id,
            name: typeof u.name === "string" ? u.name : undefined,
            email: typeof u.email === "string" ? u.email : undefined,
            phone: typeof u.phone === "string" ? u.phone : undefined,
          });
        }
      });

      const att: Record<string, boolean> = {};
      attendanceSnap.forEach((d) => {
        const a = d.data() as { present?: boolean };
        if (typeof a.present === "boolean" && a.present) att[d.id] = true;
      });

      setMembers(users);
      setPresent(att);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [cls.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        (m.phone || "").toLowerCase().includes(q)
    );
  }, [members, search]);

  const available = Math.max(0, (cls.slots ?? 0) - (cls.bookedCount ?? 0));

  const markPresent = async (user: UserLite, newVal: boolean) => {
    setSaving(user.id);
    try {
      const attRef = doc(db, "classes", cls.id, "attendance", user.id);
      if (newVal) {
        await setDoc(attRef, { present: true, name: user.name || "-", email: user.email || "", phone: user.phone || "", ts: Date.now() }, { merge: true });
        await updateDoc(classRef, { bookedCount: increment(1) });
        onChanged(cls.id, +1);
      } else {
        await setDoc(attRef, { present: false, ts: Date.now() }, { merge: true });
        await updateDoc(classRef, { bookedCount: increment(-1) });
        onChanged(cls.id, -1);
      }
      setPresent((p) => ({ ...p, [user.id]: newVal }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal
      onClick={onClose}>
      <motion.div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative"
        initial={{ scale: 0.94, y: 28, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 28, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute right-4 top-3 text-gray-400 hover:text-black text-xl" onClick={onClose} aria-label="Tutup">×</button>

        <h3 className="text-lg font-bold mb-1" style={{ color: colors.text }}>
          Absensi • {cls.name}
        </h3>
        <div className="text-sm text-gray-600 mb-3">
          <b>Tanggal:</b> {cls.date} • <b>Jam:</b> {cls.time} • <b>Coach:</b> {cls.coach}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-sm">
            <b>Slot Tersisa:</b>{" "}
            <span className="px-2 py-0.5 rounded" style={{ background: available > 0 ? "#dcfce7" : "#fee2e2", color: available > 0 ? "#166534" : "#991b1b" }}>
              {Math.max(0, (cls.slots ?? 0) - Object.values(present).filter(Boolean).length - Math.max(0, (cls.bookedCount ?? 0) - Object.values(present).filter(Boolean).length))}/{cls.slots ?? 0}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            *Menandai hadir menyesuaikan <i>bookedCount</i> di dokumen kelas.
          </div>
        </div>

        {/* Tabs sederhana: cari member + daftar hadir */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kolom kiri: cari member untuk absen */}
          <div className="border rounded-xl p-3" style={{ borderColor: colors.light }}>
            <div className="font-semibold mb-2">Tandai Hadir</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / email / HP"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
              style={{ borderColor: colors.light }}
            />
            <div className="max-h-[40vh] overflow-auto">
              {loading ? (
                <div className="text-sm text-gray-500 p-2">Memuat data…</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-gray-500 p-2">Tidak ada hasil.</div>
              ) : (
                filtered.map((m) => {
                  const isPresent = !!present[m.id];
                  const disabled = saving === m.id;
                  const canAdd = !isPresent && (cls.slots ?? 0) - (cls.bookedCount ?? 0) > 0;

                  return (
                    <div key={m.id} className="flex items-center justify-between border-t py-2 text-sm" style={{ borderColor: colors.light }}>
                      <div>
                        <div className="font-medium">{m.name || "-"}</div>
                        <div className="text-xs text-gray-500">{m.email || ""}{m.phone ? ` • ${m.phone}` : ""}</div>
                      </div>
                      <button
                        type="button"
                        disabled={disabled || (!isPresent && !canAdd)}
                        onClick={() => markPresent(m, !isPresent)}
                        className={`px-3 py-1 rounded-lg text-white text-xs ${isPresent ? "bg-green-600" : "bg-sky-700"} disabled:opacity-60`}
                        title={isPresent ? "Batalkan hadir" : "Tandai hadir"}
                      >
                        {disabled ? "..." : isPresent ? "Hadir ✓" : "Tandai"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Kolom kanan: daftar yang sudah hadir */}
          <PresentList classId={cls.id} present={present} setPresent={setPresent} onChanged={(delta) => onChanged(cls.id, delta)} />
        </div>

        <div className="text-right mt-4">
          <button className="px-4 py-2 rounded-lg border" style={{ borderColor: colors.light }} onClick={onClose}>Tutup</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PresentList({
  classId,
  setPresent,
  onChanged,
}: {
  classId: string;
  present: Record<string, boolean>;
  setPresent: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onChanged: (delta: number) => void;
}) {
  const [rows, setRows] = useState<{ id: string; name?: string; email?: string; phone?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const classRef = doc(db, "classes", classId);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "classes", classId, "attendance"));
      const r: { id: string; name?: string; email?: string; phone?: string }[] = [];
      const flags: Record<string, boolean> = {};
      snap.forEach((d) => {
        const a = d.data() as { present?: boolean; name?: string; email?: string; phone?: string };
        if (a.present) {
          r.push({ id: d.id, name: a.name, email: a.email, phone: a.phone });
          flags[d.id] = true;
        }
      });
      setRows(r);
      setPresent((p) => ({ ...p, ...flags }));
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [classId, setPresent]);

  const cancelPresent = async (uid: string) => {
    const attRef = doc(db, "classes", classId, "attendance", uid);
    await setDoc(attRef, { present: false, ts: Date.now() }, { merge: true });
    await updateDoc(classRef, { bookedCount: increment(-1) });
    onChanged(-1);
    setRows((prev) => prev.filter((x) => x.id !== uid));
    setPresent((p) => ({ ...p, [uid]: false }));
  };

  return (
    <div className="border rounded-xl p-3" style={{ borderColor: colors.light }}>
      <div className="font-semibold mb-2">Sudah Hadir ({rows.length})</div>
      <div className="max-h-[40vh] overflow-auto">
        {loading ? (
          <div className="text-sm text-gray-500 p-2">Memuat data…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-500 p-2">Belum ada yang hadir.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-t py-2 text-sm" style={{ borderColor: colors.light }}>
              <div>
                <div className="font-medium">{r.name || "-"}</div>
                <div className="text-xs text-gray-500">{r.email || ""}{r.phone ? ` • ${r.phone}` : ""}</div>
              </div>
              <button
                type="button"
                onClick={() => cancelPresent(r.id)}
                className="px-3 py-1 rounded-lg text-xs border"
                style={{ borderColor: colors.light }}
                title="Batalkan kehadiran"
              >
                Batalkan
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

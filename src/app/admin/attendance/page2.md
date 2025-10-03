// src\app\admin\attendance\page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Keyboard, BarChart3, RefreshCcw, Download } from "lucide-react";
import KioskScanPanel from "@/components/attendance/KioskScanPanel";
import ManualCheckIn from "@/components/attendance/ManualCheckIn";

import { db } from "@/lib/firebase";
import {
  doc,
  runTransaction,
  serverTimestamp,
  increment,
  collection,
  query,
  where,
  getDoc,
  getDocs,
  Timestamp,
  type FirestoreDataConverter,
  type DocumentData,
} from "firebase/firestore";

/* =====================
   Zona waktu: Asia/Makassar (WITA)
   ===================== */
const TZ = "Asia/Makassar";

function dateIsoTZ(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function ymdTZ(d: Date = new Date()): string {
  return dateIsoTZ(d).replaceAll("-", "");
}

function hourTZ(d: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const hh = parts.find((p) => p.type === "hour")?.value;
  return hh ? parseInt(hh, 10) : d.getHours();
}

function timeHMtz(d?: Date): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/* =====================
   Types & interfaces
   ===================== */
// interface DailyDoc {
//   dateKey?: string; // "YYYYMMDD"
//   count?: number;
//   byHour?: Record<string, number>;
//   updatedAt?: Timestamp;
// }

interface GuestInfo {
  name?: string;
  email?: string;
  phone?: string;
  note?: string;
}

interface CheckinDoc {
  gymId?: string;
  userId?: string; // "GUEST" untuk tamu
  dateKey?: string; // "YYYY-MM-DD"
  byHour?: number; // 0..23
  source?: string; // "kiosk" | "manual" | "manual_guest"
  createdAt?: Timestamp;
  guest?: GuestInfo; // data tamu bila ada
}

interface UserBrief {
  name?: string;
  email?: string;
  phone?: string;
  memberCode?: string;
}

interface CheckInResultOK {
  ok: true;
  duplicate: boolean;
}

interface CheckInResultError {
  ok: false;
  reason: "unknown" | "membership_inactive";
}

type CheckInResult = CheckInResultOK | CheckInResultError;

interface CheckInParams {
  userId: string;
  gymId?: string;
}

interface MembershipStatus {
  active: boolean;
  expiryDate?: Date;
}

/* =====================
   Check-in member (transaction)
   ===================== */
async function doCheckInClient(params: CheckInParams): Promise<CheckInResult> {
  const { userId, gymId = "default" } = params;

  // Periksa status keanggotaan sebelum check-in
  try {
    const membershipStatus = await checkMembershipStatus(userId);
    if (!membershipStatus.active) {
      return { ok: false, reason: "membership_inactive" };
    }
  } catch (error) {
    console.error("Error checking membership status:", error);
    return { ok: false, reason: "unknown" };
  }

  const now = new Date();
  const ymd = ymdTZ(now);
  const hour = hourTZ(now);

  const gymRef = doc(db, "gyms", gymId);
  const checkinRef = doc(db, "gyms", gymId, "checkins", `${ymd}_${userId}`);
  const dailyRef = doc(db, "gyms", gymId, "daily_attendance", ymd);

  try {
    const result = await runTransaction(db, async (tx) => {
      const existed = await tx.get(checkinRef);
      if (existed.exists()) return { duplicate: true as const };

      tx.set(gymRef, { lastActivityAt: serverTimestamp() }, { merge: true });

      tx.set(checkinRef, {
        gymId,
        userId,
        dateKey: dateIsoTZ(now),
        byHour: hour,
        source: "kiosk",
        createdAt: serverTimestamp(),
      });

      tx.set(
        dailyRef,
        {
          dateKey: ymd,
          updatedAt: serverTimestamp(),
          count: increment(1),
          [`byHour.${String(hour).padStart(2, "0")}`]: increment(1),
        },
        { merge: true }
      );

      return { duplicate: false as const };
    });

    return { ok: true, duplicate: result.duplicate };
  } catch (e) {
    console.error("Check-in error:", e);
    return { ok: false, reason: "unknown" };
  }
}

/* =====================
   Check membership status
   ===================== */
async function checkMembershipStatus(userId: string): Promise<MembershipStatus> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { active: false };
    }
    
    const userData = userSnap.data() as { 
      membershipActive?: boolean; 
      membershipExpiry?: Timestamp;
      status?: string;
    };
    
    // Cek berdasarkan beberapa kemungkinan field
    if (userData.membershipActive !== undefined) {
      return { active: userData.membershipActive };
    }
    
    if (userData.status === "active") {
      return { active: true };
    }
    
    if (userData.membershipExpiry) {
      const expiryDate = userData.membershipExpiry.toDate();
      return { active: expiryDate > new Date(), expiryDate };
    }
    
    return { active: false };
  } catch (error) {
    console.error("Error checking membership:", error);
    return { active: false };
  }
}

/* =====================
   Firestore converters
   ===================== */
// const dailyConverter: FirestoreDataConverter<DailyDoc> = {
//   toFirestore: (d: DailyDoc): DocumentData => d,
//   fromFirestore: (snap, options) => {
//     const data = snap.data(options);
//     const byHourObj = typeof data.byHour === "object" && data.byHour !== null ? data.byHour as Record<string, unknown> : {};
//     const byHour: Record<string, number> = {};
    
//     for (const k of Object.keys(byHourObj)) {
//       const v = byHourObj[k];
//       if (typeof v === "number") byHour[k] = v;
//     }
    
//     return {
//       dateKey: typeof data.dateKey === "string" ? data.dateKey : undefined,
//       count: typeof data.count === "number" ? data.count : undefined,
//       byHour,
//       updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
//     };
//   },
// };

const checkinConverter: FirestoreDataConverter<CheckinDoc> = {
  toFirestore: (d: CheckinDoc): DocumentData => d,
  fromFirestore: (snap, options) => {
    const data = snap.data(options);
    const gRaw = data.guest && typeof data.guest === "object" ? data.guest as Record<string, unknown> : undefined;
    
    const guest: GuestInfo | undefined = gRaw ? {
      name: typeof gRaw.name === "string" ? gRaw.name : undefined,
      email: typeof gRaw.email === "string" ? gRaw.email : undefined,
      phone: typeof gRaw.phone === "string" ? gRaw.phone : undefined,
      note: typeof gRaw.note === "string" ? gRaw.note : undefined,
    } : undefined;

    return {
      gymId: typeof data.gymId === "string" ? data.gymId : undefined,
      userId: typeof data.userId === "string" ? data.userId : undefined,
      dateKey: typeof data.dateKey === "string" ? data.dateKey : undefined,
      byHour: typeof data.byHour === "number" ? data.byHour : undefined,
      source: typeof data.source === "string" ? data.source : undefined,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
      guest,
    };
  },
};

/* =====================
   UI types
   ===================== */
interface DailySummary {
  dateKey: string;
  count: number;
  byHour: Record<string, number>;
}

interface CheckinRow {
  id: string;
  userId: string;
  byHour?: number;
  createdAt?: Date;
  name?: string;
  phone?: string;
  memberCode?: string;
}

type TimePeriod = "daily" | "weekly" | "monthly";

/* =====================
   Helper functions
   ===================== */
function aggregateByHour(items: { byHour?: number; createdAt?: Date }[]): Record<string, number> {
  const agg: Record<string, number> = {};
  
  for (const r of items) {
    const hh = typeof r.byHour === "number" ? r.byHour : r.createdAt ? hourTZ(r.createdAt) : undefined;
    if (typeof hh === "number") {
      const key = String(hh).padStart(2, "0");
      agg[key] = (agg[key] ?? 0) + 1;
    }
  }
  
  return agg;
}

async function fetchUsersBrief(ids: string[]): Promise<Record<string, UserBrief>> {
  const uids = Array.from(new Set(ids.filter(Boolean)));
  const map: Record<string, UserBrief> = {};
  
  await Promise.all(
    uids.map(async (uid) => {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        const d = snap.data();
        map[uid] = {
          name: typeof d.name === "string" ? d.name : undefined,
          email: typeof d.email === "string" ? d.email : undefined,
          phone: typeof d.phone === "string" ? d.phone : undefined,
          memberCode: typeof d.memberCode === "string" ? d.memberCode : undefined,
        };
      }
    })
  );
  
  return map;
}

function getDateRange(timePeriod: TimePeriod, baseDate: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(baseDate);
  const end = new Date(baseDate);
  
  switch (timePeriod) {
    case "daily":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "weekly":
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case "monthly":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
  }
  
  return { start, end };
}

/* =====================
   Main Page Component
   ===================== */
export default function AttendancePage() {
  const [tab, setTab] = useState<"scan" | "manual" | "daily">("scan");
  const gymId = "default";

  const tabs = useMemo(
    () =>
      [
        { key: "scan" as const, label: "Scan", icon: <Camera className="w-4 h-4" /> },
        { key: "manual" as const, label: "Manual", icon: <Keyboard className="w-4 h-4" /> },
        { key: "daily" as const, label: "Harian", icon: <BarChart3 className="w-4 h-4" /> },
      ],
    []
  );

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-2">Absensi</h1>
      <p className="text-sm text-neutral-500 mb-4">Scan QR (kiosk), input manual/visitor, dan lihat ringkasan harian.</p>

      <div className="flex items-center gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition
              ${tab === t.key ? "bg-[#97CCDD] text-white border-transparent" : "bg-white hover:bg-neutral-50 border-neutral-200"}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border bg-white p-3 md:p-4">
        {tab === "scan" && <KioskScanPanel gymId={gymId} onCheckIn={doCheckInClient} />}
        {tab === "manual" && <ManualCheckIn gymId={gymId} onCheckIn={doCheckInClient} />}
        {tab === "daily" && <DailyAttendancePanel gymId={gymId} />}
      </div>
    </div>
  );
}

/* ==========================
   DailyAttendancePanel Component
   ========================== */
function DailyAttendancePanel({ gymId }: { gymId: string }) {
  const [dateIso, setDateIso] = useState<string>(dateIsoTZ(new Date()));
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("daily");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [rows, setRows] = useState<CheckinRow[]>([]);
  const [rev, setRev] = useState(0);

  // const ymd = dateIso.replaceAll("-", "");
  const dateISO = dateIso;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Untuk periode mingguan/bulanan, kita perlu mengambil data dari beberapa hari
        const { start, end } = getDateRange(timePeriod, new Date(dateISO));
        
        // Buat array semua tanggal dalam rentang
        const datesInRange: string[] = [];
        const currentDate = new Date(start);
        
        while (currentDate <= end) {
          datesInRange.push(dateIsoTZ(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Ambil data untuk semua tanggal dalam rentang
        const allCheckins: CheckinRow[] = [];
        const needUsers: string[] = [];
        
        for (const date of datesInRange) {
          // const dateYmd = date.replaceAll("-", "");
          
          // Daftar checkins (baca guest & member)
          const checkinsCol = collection(db, "gyms", gymId, "checkins").withConverter(checkinConverter);
          const q1 = query(checkinsCol, where("dateKey", "==", date));
          const snap = await getDocs(q1);

          snap.forEach((docSnap) => {
            const v = docSnap.data();
            const row: CheckinRow = {
              id: docSnap.id,
              userId: String(v.userId ?? ""),
              byHour: v.byHour,
              createdAt: v.createdAt ? v.createdAt.toDate() : undefined,
              name: v.guest?.name,
              phone: v.guest?.phone,
            };
            allCheckins.push(row);
            if (row.userId && row.userId !== "GUEST" && (!row.name || !row.phone)) {
              needUsers.push(row.userId);
            }
          });
        }

        // join info users utk member
        if (needUsers.length) {
          const map = await fetchUsersBrief(needUsers);
          for (const it of allCheckins) {
            if (it.userId !== "GUEST") {
              const info = map[it.userId];
              if (info) {
                if (!it.name && info.name) it.name = info.name;
                if (!it.phone && info.phone) it.phone = info.phone;
                if (info.memberCode) it.memberCode = info.memberCode;
              }
            }
          }
        }

        // byHour final
        const finalByHour = aggregateByHour(allCheckins);
        const finalCount = allCheckins.length;

        // urut terbaru
        allCheckins.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

        if (!cancelled) {
          setSummary({ dateKey: dateISO, count: finalCount, byHour: finalByHour });
          setRows(allCheckins);
        }
      } catch (e) {
        console.error("Load daily error:", e);
        if (!cancelled) {
          setSummary(null);
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [gymId, dateISO, timePeriod, rev]);

  const total = summary?.count ?? 0;
  const byHour = summary?.byHour ?? {};

  const handleExportPDF = () => {
    const periodLabel = timePeriod === "daily" ? "Harian" : timePeriod === "weekly" ? "Mingguan" : "Bulanan";
    const title = `Absensi ${periodLabel} - ${dateISO} - Gym ${gymId}`;
    const win = window.open("", "printWin");
    if (!win) return;

    const style = `
      <style>
        * { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
        h1 { font-size: 20px; margin: 0 0 8px; }
        h2 { font-size: 14px; margin: 16px 0 8px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; }
        .meta { margin-bottom: 12px; font-size: 12px; color: #374151; }
        .bar { height: 10px; background: #cfeaf2; display: inline-block; vertical-align: middle; }
        .hourRow { white-space: nowrap; }
      </style>
    `;

    const hourlyRows = Array.from({ length: 24 }, (_, h) => {
      const key = String(h).padStart(2, "0");
      const val = byHour[key] ?? 0;
      const width = Math.min(240, val * 14);
      return `<tr>
        <td class="hourRow">${key}:00</td>
        <td>${val}</td>
        <td><div class="bar" style="width:${width}px;"></div></td>
      </tr>`;
    }).join("");

    const checkinRows = rows
      .map((r, i) => {
        const t = timeHMtz(r.createdAt);
        const nm = r.name ? r.name : "";
        const phone = r.phone ? r.phone : "";
        const memberCode = r.memberCode ? r.memberCode : r.userId;
        return `<tr>
          <td>${i + 1}</td>
          <td>${t}</td>
          <td>${memberCode}</td>
          <td>${nm}</td>
          <td>${phone}</td>
        </tr>`;
      })
      .join("");

    const html = `
      <html>
      <head><title>${title}</title>${style}</head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Total hadir: <b>${total}</b></div>
        <div class="meta">Periode: <b>${periodLabel}</b></div>

        <h2>Distribusi per Jam</h2>
        <table>
          <thead><tr><th>Jam</th><th>Jumlah</th><th>Visual</th></tr></thead>
          <tbody>${hourlyRows}</tbody>
        </table>

        <h2 style="margin-top:16px;">Daftar Hadir (${rows.length})</h2>
        <table>
          <thead><tr><th>#</th><th>Waktu (WITA)</th><th>Kode Member</th><th>Nama</th><th>Telepon</th></tr></thead>
          <tbody>${checkinRows}</tbody>
        </table>

        <script>
          window.onload = function() { window.print(); setTimeout(() => window.close(), 300); }
        </script>
      </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  const reload = () => setRev((x) => x + 1);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-600">Tanggal:</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2 text-sm"
            value={dateISO}
            onChange={(e) => e.target.value && setDateIso(e.target.value)}
          />
          
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
          </select>
          
          <button onClick={reload} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border hover:bg-neutral-50" title="Muat ulang">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-[#97CCDD] text-white hover:brightness-110 disabled:opacity-60"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4">
          <div className="text-sm text-neutral-500">Tanggal</div>
          <div className="text-lg font-semibold">{dateISO}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-neutral-500">Gym</div>
          <div className="text-lg font-semibold">{gymId}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-neutral-500">Total Hadir</div>
          <div className="text-2xl font-bold">{loading ? "…" : summary?.count ?? 0}</div>
        </div>
      </div>

      {/* Distribusi per Jam */}
      <div className="rounded-xl border p-4">
        <div className="text-sm font-semibold mb-3">Distribusi per Jam</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {Array.from({ length: 24 }, (_, h) => {
            const key = String(h).padStart(2, "0");
            const val = byHour[key] ?? 0;
            return (
              <div key={key} className="border rounded-lg p-2 text-center">
                <div className="text-xs text-neutral-500">{key}:00</div>
                <div className="text-lg font-semibold">{val}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabel daftar hadir */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Daftar Hadir ({rows.length})</div>
          {loading && <div className="text-xs text-neutral-500">Memuat…</div>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-sm">
            <thead>
              <tr className="bg-neutral-50">
                <th className="text-left p-2 border">#</th>
                <th className="text-left p-2 border">Waktu (WITA)</th>
                <th className="text-left p-2 border">Kode Member</th>
                <th className="text-left p-2 border">Nama</th>
                <th className="text-left p-2 border">Telepon</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-neutral-500">
                    Tidak ada data untuk periode ini.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="p-2 border">{i + 1}</td>
                    <td className="p-2 border">{timeHMtz(r.createdAt)}</td>
                    <td className="p-2 border font-mono">{r.memberCode || r.userId}</td>
                    <td className="p-2 border">{r.name ?? "-"}</td>
                    <td className="p-2 border">{r.phone ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
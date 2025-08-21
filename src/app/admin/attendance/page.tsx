"use client";

import { useState, useMemo } from "react";
import { Camera, Keyboard, BarChart3 } from "lucide-react";
import KioskScanPanel from "@/components/attendance/KioskScanPanel";
import ManualCheckIn from "@/components/attendance/ManualCheckIn";
import { db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc, increment } from "firebase/firestore";

// === util tanggal WIB ===
function nowWIB(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}
function ymdWIB(d = nowWIB()): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
function dateKeyISO(d = nowWIB()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// === aksi check-in (tanpa Cloud Function) ===
async function doCheckInClient(params: { userId: string; gymId?: string }) {
  const { userId, gymId = "default" } = params;
  const now = nowWIB();
  const ymd = ymdWIB(now);
  const hour = now.getHours();
  const checkinRef = doc(db, "gyms", gymId, "checkins", `${ymd}_${userId}`);
  const dailyRef = doc(db, "gyms", gymId, "daily_attendance", ymd);

  try {
    await setDoc(
      checkinRef,
      {
        gymId,
        userId,
        dateKey: dateKeyISO(now),
        ts: serverTimestamp(),
        byHour: hour,
        source: "kiosk",
        membershipActive: true,
      },
      { merge: false }
    );

    // agregat harian (opsional)
    await setDoc(
      dailyRef,
      {
        dateKey: ymd,
        count: increment(1),
        [`byHour.${String(hour).padStart(2, "0")}`]: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { ok: true as const };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ALREADY_EXISTS")) return { ok: true as const, duplicate: true as const };
    if (msg.includes("membership")) return { ok: false as const, reason: "membership_inactive" as const };
    return { ok: false as const, reason: "unknown" as const };
  }
}

export default function AttendancePage() {
  const [tab, setTab] = useState<"scan" | "manual" | "daily">("scan");
  const gymId = "default";

  const tabs = useMemo(
    () =>
      [
        { key: "scan", label: "Scan", icon: <Camera className="w-4 h-4" /> },
        { key: "manual", label: "Manual", icon: <Keyboard className="w-4 h-4" /> },
        { key: "daily", label: "Harian", icon: <BarChart3 className="w-4 h-4" /> },
      ] as const,
    []
  );

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-2">Absensi</h1>
      <p className="text-sm text-neutral-500 mb-4">Scan QR (kiosk), input manual/visitor, dan lihat ringkasan harian.</p>

      {/* Tabs */}
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

      {/* Panels */}
      <div className="rounded-2xl border bg-white p-3 md:p-4">
        {tab === "scan" && <KioskScanPanel gymId={gymId} onCheckIn={({ userId }) => doCheckInClient({ userId, gymId })} />}

        {tab === "manual" && <ManualCheckIn gymId={gymId} onCheckIn={({ userId }) => doCheckInClient({ userId, gymId })} />}

        {tab === "daily" && (
          <div className="text-sm text-neutral-600">
            Ringkasan & daftar hadir hari ini (tambah chart + export PDF di langkah berikutnya).
          </div>
        )}
      </div>
    </div>
  );
}

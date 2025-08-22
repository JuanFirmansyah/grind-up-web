"use client";

import { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp, increment } from "firebase/firestore";

// Hasil check-in member yang dikirim balik parent (kiosk/transaction)
type CheckInResultOK =
  | { ok: true; duplicate?: boolean }
  | { ok: false; reason: "membership_inactive" | "unknown" };

// ===== Timezone util (Makassar/WITA) =====
const TZ = "Asia/Makassar";

function dateIsoTZ(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // YYYY-MM-DD
}
function ymdTZ(d: Date = new Date()): string {
  return dateIsoTZ(d).replaceAll("-", ""); // YYYYMMDD
}
function hourTZ(d: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(d)
  ); // 0..23
}

// ID pendek untuk dokumen guest
function tinyId(len = 6): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function ManualCheckIn({
  gymId = "default",
  onCheckIn, // untuk MEMBER (UID)
}: {
  gymId?: string;
  onCheckIn: (params: { userId: string; gymId?: string }) => Promise<CheckInResultOK>;
}) {
  const [tab, setTab] = useState<"member" | "visitor">("member");

  // ====== Member (by UID) state ======
  const [uid, setUid] = useState("");
  const [memberStatus, setMemberStatus] = useState<"idle" | "ok" | "dup" | "inactive" | "err">("idle");
  const [memberMsg, setMemberMsg] = useState("");

  // ====== Visitor state ======
  const [vName, setVName] = useState("");
  const [vEmail, setVEmail] = useState("");
  const [vPhone, setVPhone] = useState("");
  const [vNote, setVNote] = useState("");
  const [vBusy, setVBusy] = useState(false);
  const [vStatus, setVStatus] = useState<"idle" | "ok" | "err">("idle");
  const [vMsg, setVMsg] = useState("");

  // ====== Submit: Member by UID (pakai prop onCheckIn) ======
  async function handleSubmitMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const userId = uid.trim();
    if (!userId) return;

    const res = await onCheckIn({ userId, gymId });
    if (res.ok && res.duplicate) {
      setMemberStatus("dup");
      setMemberMsg("Sudah check-in hari ini");
    } else if (res.ok) {
      setMemberStatus("ok");
      setMemberMsg("Check-in berhasil");
      setUid("");
    } else if (res.reason === "membership_inactive") {
      setMemberStatus("inactive");
      setMemberMsg("Membership tidak aktif");
    } else {
      setMemberStatus("err");
      setMemberMsg("Gagal check-in");
    }
    setTimeout(() => {
      setMemberStatus("idle");
      setMemberMsg("");
    }, 1800);
  }

  // ====== Submit: Visitor (langsung tulis Firestore dengan nested guest) ======
  async function handleSubmitVisitor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vName.trim()) {
      setVStatus("err");
      setVMsg("Nama wajib diisi.");
      setTimeout(() => {
        setVStatus("idle");
        setVMsg("");
      }, 1500);
      return;
    }

    setVBusy(true);
    try {
      const now = new Date();
      const ymd = ymdTZ(now);
      const hour = hourTZ(now);

      const checkinId = `${ymd}_GUEST_${tinyId(6)}`;
      const gymRef = doc(db, "gyms", gymId);
      const checkinRef = doc(db, "gyms", gymId, "checkins", checkinId);
      const dailyRef = doc(db, "gyms", gymId, "daily_attendance", ymd);

      await runTransaction(db, async (tx) => {
        // parent gym (opsional)
        tx.set(gymRef, { lastActivityAt: serverTimestamp() }, { merge: true });

        // dokumen check-in visitor
        tx.set(checkinRef, {
          gymId,
          userId: "GUEST",
          dateKey: dateIsoTZ(now),
          byHour: hour,
          source: "manual_guest",
          createdAt: serverTimestamp(),
          guest: {
            name: vName.trim(),
            email: vEmail.trim() || null,
            phone: vPhone.trim() || null,
            note: vNote.trim() || null,
          },
        });

        // agregat harian
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
      });

      setVStatus("ok");
      setVMsg("Visitor dicatat.");
      setVName("");
      setVEmail("");
      setVPhone("");
      setVNote("");
    } catch (err: unknown) {
      console.error("visitor check-in error:", err);
      setVStatus("err");
      setVMsg("Gagal menyimpan visitor.");
    } finally {
      setVBusy(false);
      setTimeout(() => {
        setVStatus("idle");
        setVMsg("");
      }, 1800);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab("member")}
          className={`px-3 py-1.5 rounded-lg border text-sm ${
            tab === "member" ? "bg-black text-white border-black" : "bg-white hover:bg-neutral-50"
          }`}
        >
          Member (UID)
        </button>
        <button
          type="button"
          onClick={() => setTab("visitor")}
          className={`px-3 py-1.5 rounded-lg border text-sm ${
            tab === "visitor" ? "bg-black text-white border-black" : "bg-white hover:bg-neutral-50"
          }`}
        >
          Visitor / Drop-in
        </button>
      </div>

      {tab === "member" ? (
        <>
          <h3 className="font-semibold mb-3">Manual Check-in Member</h3>
          <form onSubmit={handleSubmitMember} className="flex items-center gap-2">
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="Masukkan UID (docId users)"
              className="flex-1 border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#97CCDD]"
            />
            <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#97CCDD] text-white hover:brightness-110">
              <Check className="w-4 h-4" /> Check-in
            </button>
          </form>

          {memberStatus !== "idle" && (
            <div
              className={`mt-2 text-sm ${
                memberStatus === "ok"
                  ? "text-green-600"
                  : memberStatus === "dup"
                  ? "text-amber-600"
                  : memberStatus === "inactive"
                  ? "text-red-600"
                  : "text-neutral-600"
              }`}
            >
              {memberMsg}
            </div>
          )}
          <p className="text-xs text-neutral-500 mt-3">
            Catatan: input di sini adalah <b>docId</b> pada koleksi <code>users</code>.
          </p>
        </>
      ) : (
        <>
          <h3 className="font-semibold mb-3">Catat Visitor / Drop-in</h3>
          <form onSubmit={handleSubmitVisitor} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nama *</label>
                <input
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  required
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#97CCDD]"
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={vEmail}
                  onChange={(e) => setVEmail(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#97CCDD]"
                  placeholder="opsional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telepon</label>
                <input
                  value={vPhone}
                  onChange={(e) => setVPhone(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#97CCDD]"
                  placeholder="opsional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan</label>
                <input
                  value={vNote}
                  onChange={(e) => setVNote(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#97CCDD]"
                  placeholder="opsional"
                />
              </div>
            </div>

            <button type="submit" disabled={vBusy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60">
              <UserPlus className="w-4 h-4" />
              Simpan Visitor
            </button>
          </form>

          {vStatus !== "idle" && (
            <div className={`mt-2 text-sm ${vStatus === "ok" ? "text-green-600" : "text-red-600"}`}>{vMsg}</div>
          )}

          <p className="text-xs text-neutral-500 mt-3">
            Visitor disimpan ke <code>gyms/{gymId}/checkins</code> dengan <code>source:&quot;manual_guest&quot;</code> dan ikut menambah agregat harian.
          </p>
        </>
      )}
    </div>
  );
}

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RefreshCcw } from "lucide-react";

// Firestore client
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";

type ScanStatus = "idle" | "success" | "duplicate" | "inactive" | "error";
type CheckInResult =
  | { ok: true; duplicate?: boolean }
  | { ok: false; reason: "membership_inactive" | "unknown" };

/* ============ helpers ============ */
type WithRawValue = { rawValue?: unknown };
const isWithRawValue = (v: unknown): v is WithRawValue =>
  typeof v === "object" && v !== null && "rawValue" in v;

function extractCode(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string") return first;
    if (isWithRawValue(first) && typeof first.rawValue === "string") return String(first.rawValue);
    return "";
  }
  if (isWithRawValue(value) && typeof value.rawValue === "string") return String(value.rawValue);
  return "";
}

const CANDIDATE_KEYS = ["uid","userId","memberId","id","u","code","member","member_id","qr","qrid"] as const;
const UIDISH = /^[A-Za-z0-9_-]{20,40}$/;

function parseUserToken(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Prioritaskan pola QR kamu: https://www.grindupfitness.com/member/<docId>
  if ((s.startsWith("http://") || s.startsWith("https://"))) {
    try {
      const u = new URL(s);
      if (u.hostname.includes("grindupfitness.com") && u.pathname.includes("/member/")) {
        const segs = u.pathname.split("/").filter(Boolean);
        return segs[segs.length - 1] ?? null; // docId users
      }
      for (const k of CANDIDATE_KEYS) {
        const v = u.searchParams.get(k);
        if (v && v.trim()) return v.trim();
      }
      const segs = u.pathname.split("/").filter(Boolean);
      if (segs.length) return segs[segs.length - 1].trim();
    } catch {}
  }

  // JSON
  if (s.startsWith("{")) {
    try {
      const obj = JSON.parse(s) as Record<string, unknown>;
      for (const k of CANDIDATE_KEYS) {
        const v = obj[k as string];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    } catch {}
  }

  // String polos
  return s;
}

/** Resolve token (docId/authUID/memberCode) → docId di koleksi users */
async function resolveToUserDocId(token: string): Promise<string | null> {
  const t = token.trim();
  if (!t) return null;

  // 1) docId langsung
  const tryDoc = await getDoc(doc(db, "users", t));
  if (tryDoc.exists()) return tryDoc.id;

  // 2) kemungkinan Auth UID (field `uid`)
  if (UIDISH.test(t)) {
    const q1 = query(collection(db, "users"), where("uid", "==", t), limit(1));
    const s1 = await getDocs(q1);
    if (!s1.empty) return s1.docs[0].id;
  }

  // 3) kemungkinan memberCode
  const q2 = query(collection(db, "users"), where("memberCode", "==", t), limit(1));
  const s2 = await getDocs(q2);
  if (!s2.empty) return s2.docs[0].id;

  // 4) mapping opsional di member_codes/{code} -> { userId }
  const mapSnap = await getDoc(doc(db, "member_codes", t));
  if (mapSnap.exists()) {
    const d = mapSnap.data() as { userId?: unknown };
    if (typeof d.userId === "string") return d.userId;
  }

  return null;
}

/* ============ component ============ */
export default function KioskScanPanel({
  gymId = "default",
  onCheckIn,
}: {
  gymId?: string;
  onCheckIn: (params: { userId: string; gymId?: string }) => Promise<CheckInResult>;
}) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const cooldownRef = useRef<number>(0);
  const lastCodeRef = useRef<string>("");

  const videoConstraints: MediaTrackConstraints = useMemo(
    () => ({ facingMode: { ideal: "environment" } }),
    []
  );

  const resetUI = () => { setStatus("idle"); setMessage(""); };

  const handleDetected = useCallback(
    async (scanned: unknown) => {
      const now = Date.now();
      const raw = extractCode(scanned);
      if (!raw) return;

      // cooldown & anti-duplicate
      if (now - cooldownRef.current < 1200 || raw === lastCodeRef.current) return;
      cooldownRef.current = now;
      lastCodeRef.current = raw;

      const token = parseUserToken(raw);
      if (!token) { setStatus("error"); setMessage("QR kosong/tidak terbaca"); setTimeout(resetUI, 1200); return; }

      const userDocId = await resolveToUserDocId(token);
      if (!userDocId) { setStatus("error"); setMessage("QR tidak valid / user tidak ditemukan"); setTimeout(resetUI, 1300); return; }

      try {
        const res = await onCheckIn({ userId: userDocId, gymId });
        if (res.ok && res.duplicate)      { setStatus("duplicate"); setMessage("Sudah check-in hari ini"); }
        else if (res.ok)                  { setStatus("success");   setMessage("Check-in berhasil"); }
        else if (res.reason === "membership_inactive") { setStatus("inactive"); setMessage("Membership tidak aktif"); }
        else                              { setStatus("error");     setMessage("Gagal check-in"); }
      } catch {
        setStatus("error"); setMessage("Kesalahan sistem");
      } finally {
        setTimeout(resetUI, 1500);
      }
    },
    [gymId, onCheckIn]
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          <h3 className="text-base font-semibold">Kiosk Scan</h3>
          <span className="text-sm text-neutral-500">Gym: {gymId}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEnabled((v) => !v)} className="px-3 py-1.5 rounded-xl border text-sm hover:bg-neutral-50">
            <div className="flex items-center gap-2">
              <RefreshCcw className="w-4 h-4" />
              <span>{enabled ? "Matikan Kamera" : "Aktifkan Kamera"}</span>
            </div>
          </button>
        </div>
      </div>

      {/* camera + viewfinder */}
      <div className="relative aspect-video rounded-2xl overflow-hidden shadow-sm border bg-black">
        {enabled ? (
          <>
            <Scanner onScan={handleDetected} onError={() => {}} constraints={videoConstraints} />
            {/* overlay viewfinder */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] max-w-[480px] aspect-square rounded-3xl border-2 border-white/90 shadow-[0_0_0_20000px_rgba(0,0,0,0.6)]" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] max-w-[480px] aspect-square">
                <div className="absolute -top-2 -left-2 w-10 h-10 border-t-4 border-l-4 border-[#97CCDD] rounded-tl-2xl" />
                <div className="absolute -top-2 -right-2 w-10 h-10 border-t-4 border-r-4 border-[#97CCDD] rounded-tr-2xl" />
                <div className="absolute -bottom-2 -left-2 w-10 h-10 border-b-4 border-l-4 border-[#97CCDD] rounded-bl-2xl" />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 border-b-4 border-r-4 border-[#97CCDD] rounded-br-2xl" />
              </div>
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 w-[55%] max-w-[440px] h-0.5 bg-white/90"
                initial={{ y: "-40%" }} animate={{ y: "40%" }}
                transition={{ duration: 1.6, repeat: Infinity, repeatType: "reverse" }}
              />
            </div>
          </>
        ) : (
          <div className="w-full h-full grid place-items-center text-white/80">
            <div className="text-center">
              <Camera className="w-10 h-10 mx-auto mb-2" />
              <p>Aktifkan kamera untuk mulai scan QR</p>
            </div>
          </div>
        )}

        {/* status toast */}
        <AnimatePresence>
          {status !== "idle" && (
            <motion.div
              initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
              className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-medium
                ${status === "success" ? "bg-green-600 text-white" :
                  status === "duplicate" ? "bg-amber-500 text-black" :
                  status === "inactive" ? "bg-red-600 text-white" :
                  "bg-neutral-700 text-white"}`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-xs text-neutral-500 mt-2">Tip: arahkan QR ke tengah bingkai. Scanner membaca otomatis.</p>
    </div>
  );
}

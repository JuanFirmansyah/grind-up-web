"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RefreshCcw } from "lucide-react";

// Sesuaikan dengan types dari attendance page
type ScanStatus = "idle" | "success";

interface CheckInResultOK {
  ok: true;
  duplicate: boolean;
}

interface CheckInResultError {
  ok: false;
  reason: "unknown" | "membership_inactive";
}

type CheckInResult = CheckInResultOK | CheckInResultError;

// interface CheckInParams {
//   userId: string;
//   gymId?: string;
// }

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

const CANDIDATE_KEYS = ["uid", "userId", "memberId", "id", "u", "code", "member", "member_id", "qr", "qrid"] as const;
const UIDISH = /^[A-Za-z0-9_-]{20,40}$/;

/** dukung url / json / string polos */
function parseUserToken(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      const u = new URL(s);
      if (u.hostname.includes("grindupfitness.com") && u.pathname.includes("/member/")) {
        const segs = u.pathname.split("/").filter(Boolean);
        return segs[segs.length - 1] ?? null;
      }
      for (const k of CANDIDATE_KEYS) {
        const v = u.searchParams.get(k);
        if (v && v.trim()) return v.trim();
      }
      const segs = u.pathname.split("/").filter(Boolean);
      if (segs.length) return segs[segs.length - 1].trim();
    } catch {}
  }

  if (s.startsWith("{")) {
    try {
      const obj = JSON.parse(s) as Record<string, unknown>;
      for (const k of CANDIDATE_KEYS) {
        const v = obj[k as string];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    } catch {}
  }

  return s;
}

/** Resolve token (docId/authUID/memberCode) → docId di koleksi users */
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";

async function resolveToUserDocId(token: string): Promise<string | null> {
  const t = token.trim();
  if (!t) return null;

  // Coba langsung sebagai document ID di users collection
  const tryDoc = await getDoc(doc(db, "users", t));
  if (tryDoc.exists()) return tryDoc.id;

  // Coba cari berdasarkan uid (Firebase Auth UID)
  if (UIDISH.test(t)) {
    const q1 = query(collection(db, "users"), where("uid", "==", t), limit(1));
    const s1 = await getDocs(q1);
    if (!s1.empty) return s1.docs[0].id;
  }

  // Coba cari berdasarkan memberCode (sesuai attendance page)
  const q2 = query(collection(db, "users"), where("memberCode", "==", t), limit(1));
  const s2 = await getDocs(q2);
  if (!s2.empty) return s2.docs[0].id;

  // Coba cari di member_codes mapping table
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

  const resetUI = () => {
    setStatus("idle");
    setMessage("");
  };

  const handleDetected = useCallback(
    async (scanned: unknown) => {
      const now = Date.now();
      const raw = extractCode(scanned);
      if (!raw) return;

      // cooldown & anti-duplicate
      if (now - cooldownRef.current < 1200 || raw === lastCodeRef.current) return;
      cooldownRef.current = now;
      lastCodeRef.current = raw;

      console.log("QR Raw Data:", raw); // Debug

      const token = parseUserToken(raw);
      if (!token) {
        console.log("Token parsing failed"); // Debug
        return;
      }

      console.log("Parsed Token:", token); // Debug

      const userDocId = await resolveToUserDocId(token);
      if (!userDocId) {
        console.log("User not found for token:", token); // Debug
        return;
      }

      console.log("Resolved User ID:", userDocId); // Debug

      try {
        const res = await onCheckIn({ userId: userDocId, gymId });
        console.log("Check-in Result:", res); // Debug
        
        // HANYA tampilkan alert jika check-in berhasil (bukan duplicate)
        if (res.ok && !res.duplicate) {
          setStatus("success");
          setMessage("Check-in berhasil");
          setTimeout(resetUI, 1500);
        }
        // Untuk kasus lainnya (duplicate, inactive, error) tidak tampilkan alert sama sekali
      } catch (error) {
        console.error("Check-in error:", error); // Debug
        // Tidak tampilkan alert untuk error sistem
      }
    },
    [gymId, onCheckIn]
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          <h3 className="text-base font-semibold">Kiosk Scan</h3>
          <span className="text-sm text-neutral-500">Gym: {gymId}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEnabled((v) => !v)}
            className="px-3 py-1.5 rounded-xl border text-sm hover:bg-neutral-50"
          >
            <div className="flex items-center gap-2">
              <RefreshCcw className="w-4 h-4" />
              <span>{enabled ? "Matikan Kamera" : "Aktifkan Kamera"}</span>
            </div>
          </button>
        </div>
      </div>

      <div className="relative aspect-video rounded-2xl overflow-hidden shadow-sm border bg-black">
        {enabled ? (
          <>
            <Scanner 
              onScan={handleDetected} 
              onError={(error) => console.error("Scanner error:", error)} 
              constraints={videoConstraints} 
            />
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
                initial={{ y: "-40%" }}
                animate={{ y: "40%" }}
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

        {/* HANYA tampilkan alert untuk status success */}
        <AnimatePresence>
          {status === "success" && (
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-medium bg-green-600 text-white"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-xs text-neutral-500 mt-2">
        Tip: arahkan QR ke tengah bingkai. Scanner membaca otomatis.
      </p>
    </div>
  );
}
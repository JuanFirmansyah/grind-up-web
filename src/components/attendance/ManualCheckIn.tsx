"use client";

import { useState } from "react";
import { Check, UserPlus } from "lucide-react";

type CheckInResultOK =
  | { ok: true; duplicate?: boolean }
  | { ok: false; reason: "membership_inactive" | "unknown" };

export default function ManualCheckIn({
  gymId = "default",
  onCheckIn,
}: {
  gymId?: string;
  onCheckIn: (params: { userId: string; gymId?: string }) => Promise<CheckInResultOK>;
}) {
  const [uid, setUid] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "dup" | "inactive" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const userId = uid.trim();
    if (!userId) return;
    const res = await onCheckIn({ userId, gymId });
    if (res.ok && res.duplicate) {
      setStatus("dup");
      setMsg("Sudah check-in hari ini");
    } else if (res.ok) {
      setStatus("ok");
      setMsg("Check-in berhasil");
    } else if (res.reason === "membership_inactive") {
      setStatus("inactive");
      setMsg("Membership tidak aktif");
    } else {
      setStatus("err");
      setMsg("Gagal check-in");
    }
    setTimeout(() => {
      setStatus("idle");
      setMsg("");
    }, 1500);
  }

  return (
    <div className="max-w-xl">
      <h3 className="font-semibold mb-3">Manual Check-in</h3>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder="Masukkan UID Member"
          className="flex-1 border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#97CCDD]"
        />
        <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#97CCDD] text-white hover:brightness-110">
          <Check className="w-4 h-4" /> Check-in
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-neutral-50"
          onClick={() => alert("Form Visitor/Drop-in: TODO")}
        >
          <UserPlus className="w-4 h-4" /> Visitor
        </button>
      </form>

      {status !== "idle" && (
        <div
          className={`mt-2 text-sm ${
            status === "ok" ? "text-green-600" : status === "dup" ? "text-amber-600" : status === "inactive" ? "text-red-600" : "text-neutral-600"
          }`}
        >
          {msg}
        </div>
      )}
      <p className="text-xs text-neutral-500 mt-3">Catatan: pencarian by nama/email bisa ditambahkan nanti (list + pilih → check-in).</p>
    </div>
  );
}

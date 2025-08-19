// src/app/admin/classes/form/ClassForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Calendar, Clock, UserRound, Boxes,
  Type as TypeIcon, Sparkles, Signal, FileText, Timer, Flame, ImagePlus,
  ArrowLeft, Save, CheckCircle2, XCircle, ShieldCheck
} from "lucide-react";

import { signOut } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import {
  collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, type CollectionReference
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";

/* ====================== Types ====================== */
type Coach = { id: string; name: string; email: string };
type Tag = "regular" | "functional" | "special";
type AccessMode = "by_tags" | "whitelist";

type FormState = {
  className: string;
  customClassName: string;
  date: string;
  time: string;
  coach: string;
  slots: string;
  description: string;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  calorieBurn: string;
  imageUrl: string;

  // NEW:
  tags: Tag[];
  accessMode: AccessMode;
  allowedPackageIds: string[];
  allowDropIn: boolean;
  dropInPrice: string;
};

type ClassDoc = {
  className: string;
  date: string;  // YYYY-MM-DD
  time: string;  // HH:mm
  coach: string;
  slots: number;
  description: string;
  duration: number; // menit
  level: "Beginner" | "Intermediate" | "Advanced";
  calorieBurn: number | null;
  imageUrl: string;

  // NEW:
  tags: Tag[];
  accessMode: AccessMode;
  allowedPackageIds?: string[];
  allowDropIn?: boolean;
  dropInPrice?: number | null;

  // Counter:
  bookedCount?: number;
};

type PackageLite = { id: string; name: string };

const CLASS_NAMES = ["Yoga", "Zumba", "Aerobik", "Pilates", "Poundfit", "Functional", "Lainnya"] as const;

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket Membership", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
  { label: "Galeri", href: "/admin/gallery" },
  { label: "Pengaturan", href: "/admin/settings" }
];

const BRAND = {
  primary: "#97CCDD",
  bg: "bg-gradient-to-b from-white to-slate-50",
  card: "rounded-2xl shadow-lg bg-white",
  ring: "focus:ring-2 focus:ring-[#97CCDD] focus:outline-none"
};

/* ====================== Component ====================== */
export default function ClassForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("id");

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [packages, setPackages] = useState<PackageLite[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(classId));
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    className: "",
    customClassName: "",
    date: "",
    time: "",
    coach: "",
    slots: "",
    description: "",
    duration: "",
    level: "Beginner",
    calorieBurn: "",
    imageUrl: "",
    // NEW:
    tags: [],
    accessMode: "by_tags",
    allowedPackageIds: [],
    allowDropIn: false,
    dropInPrice: "",
  });

  const headerTitle = useMemo(() => (classId ? "Edit Kelas" : "Tambah Kelas"), [classId]);
  const classesCol = collection(db, "classes") as CollectionReference<ClassDoc>;

  /* ====================== Effects ====================== */
  useEffect(() => {
    // coach list
    (async () => {
      const q = query(collection(db, "users"), where("role", "==", "coach"));
      const snapshot = await getDocs(q);
      const data: Coach[] = snapshot.docs.map((d) => {
        const v = d.data();
        return {
          id: d.id,
          name: (v.name as string) || (v.fullName as string) || "No Name",
          email: (v.email as string) || ""
        };
      });
      setCoaches(data);
    })();

    // packages for whitelist  (FIX: nama koleksi)
    (async () => {
      const ps = await getDocs(collection(db, "membership_packages"));
      const arr: PackageLite[] = ps.docs.map((d) => ({ id: d.id, name: (d.data().name as string) || "-" }));
      setPackages(arr);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!classId) {
        setInitialLoading(false);
        return;
      }
      try {
        const docRef = doc(classesCol, classId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as ClassDoc;
          setForm({
            className: data.className || "",
            customClassName: "",
            date: data.date || "",
            time: data.time || "",
            coach: data.coach || "",
            slots: String(data.slots ?? ""),
            description: data.description || "",
            duration: String(data.duration ?? ""),
            level: data.level || "Beginner",
            calorieBurn: data.calorieBurn != null ? String(data.calorieBurn) : "",
            imageUrl: data.imageUrl || "",
            // NEW:
            tags: data.tags ?? [],
            accessMode: data.accessMode ?? "by_tags",
            allowedPackageIds: data.allowedPackageIds ?? [],
            allowDropIn: Boolean(data.allowDropIn),
            dropInPrice: data.dropInPrice != null ? String(data.dropInPrice) : "",
          });
          setImagePreview(data.imageUrl || null);
        }
      } catch {
        setNotice({ kind: "error", text: "Gagal memuat data kelas." });
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [classId, classesCol]);

  /* ====================== Handlers ====================== */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClassNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      className: value,
      customClassName: value === "Lainnya" ? prev.customClassName : ""
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      if (img.width <= img.height) {
        setImageError("Gambar harus landscape (width > height).");
        setImageFile(null);
        setImagePreview(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
        URL.revokeObjectURL(url);
        return;
      }
      setImageFile(file);
      setImagePreview(url);
    };
  };

  const toInt = (v: string) => parseInt(v, 10);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);

    const realClassName = form.className === "Lainnya" ? form.customClassName.trim() : form.className;
    const slotsNum = toInt(form.slots);
    const durationNum = toInt(form.duration);
    const calorieNum = toInt(form.calorieBurn);

    // ==== VALIDASI WAJIB ISI ====
    if (!realClassName) return fail("Nama kelas wajib diisi.");
    if (!form.date) return fail("Tanggal wajib diisi.");
    if (!form.time) return fail("Jam wajib diisi.");
    if (!form.coach) return fail("Coach wajib dipilih.");
    if (Number.isNaN(slotsNum) || slotsNum < 1) return fail("Kapasitas harus angka >= 1.");
    if (!form.description.trim()) return fail("Deskripsi wajib diisi.");
    if (Number.isNaN(durationNum) || durationNum < 1) return fail("Durasi harus angka >= 1.");
    if (Number.isNaN(calorieNum) || calorieNum < 0) return fail("Kalori burn wajib angka (>= 0).");

    // akses: pilih salah satu sesuai mode
    if (form.accessMode === "by_tags" && form.tags.length === 0) {
      return fail("Pilih minimal 1 Tag kelas.");
    }
    if (form.accessMode === "whitelist" && form.allowedPackageIds.length === 0) {
      return fail("Pilih paket yang diizinkan (whitelist).");
    }

    // drop-in: bila diizinkan, wajib > 0
    if (form.allowDropIn) {
      const price = Number(form.dropInPrice || 0);
      if (!Number.isFinite(price) || price <= 0) {
        return fail("Harga drop-in wajib diisi dan harus > 0.");
      }
    }

    // gambar wajib ada (existing atau upload baru)
    if (!imageFile && !form.imageUrl) {
      return fail("Gambar kelas wajib diunggah (landscape).");
    }

    // ==== Upload image jika ada file baru ====
    let uploadedImageUrl = form.imageUrl;
    if (imageFile) {
      try {
        const imagePath = `class-images/${Date.now()}_${imageFile.name}`;
        const storageRef = ref(storage, imagePath);
        await uploadBytes(storageRef, imageFile);
        uploadedImageUrl = await getDownloadURL(storageRef);
      } catch {
        return fail("Gagal mengunggah gambar.");
      }
    }

    const payload: ClassDoc = {
      className: realClassName,
      date: form.date,
      time: form.time,
      coach: form.coach,
      slots: slotsNum,
      description: form.description,
      duration: durationNum,
      level: form.level,
      calorieBurn: calorieNum,
      imageUrl: uploadedImageUrl,
      // NEW
      tags: form.accessMode === "by_tags" ? form.tags : (form.tags.length ? form.tags : []),
      accessMode: form.accessMode,
      allowedPackageIds: form.accessMode === "whitelist" ? form.allowedPackageIds : [],
      allowDropIn: form.allowDropIn,
      dropInPrice: form.allowDropIn ? Number(form.dropInPrice) : null,
      bookedCount: classId ? undefined : 0,
    };

    try {
      if (classId) {
        await updateDoc(doc(classesCol, classId), payload);
      } else {
        await addDoc(classesCol, payload);
      }
      setNotice({ kind: "success", text: "Kelas berhasil disimpan." });
      setTimeout(() => router.push("/admin/classes"), 600);
    } catch {
      setNotice({ kind: "error", text: "Gagal menyimpan kelas. Coba lagi." });
    } finally {
      setLoading(false);
    }
  };

  function fail(msg: string) {
    setNotice({ kind: "error", text: msg });
    setLoading(false);
    return;
  }

  const inputBase = "w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm placeholder-gray-400 " + BRAND.ring;
  const labelBase = "block font-semibold mb-1 text-gray-700 flex items-center gap-2";

  function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode; }) {
    return (
      <div>
        <label className={labelBase}>{icon}<span>{label}</span></label>
        {children}
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className={`min-h-screen ${BRAND.bg}`}>
      <AdminTopbar onOpen={openMobile} showLogout onLogout={handleLogout} />
      <AdminMobileDrawer isOpen={mobileOpen} navItems={NAV_ITEMS} onClose={closeMobile} />
      <div className="flex">
        <AdminSidebar navItems={NAV_ITEMS} showLogout onLogout={handleLogout} />

        <main className="flex-1 p-4 sm:p-6 md:p-10">
          <div className="mb-6 flex items-center justify-between">
            <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-black transition-colors" aria-label="Kembali">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{headerTitle}</h1>
          </div>

          {notice && (
            <div role="status" className={`mb-4 flex items-start gap-3 rounded-xl p-3 ${notice.kind === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {notice.kind === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5" /> : <XCircle className="mt-0.5 h-5 w-5" />}
              <div className="flex-1 text-sm">{notice.text}</div>
              <button type="button" onClick={() => setNotice(null)} className="ml-2 text-xs underline decoration-dotted" aria-label="Tutup notifikasi">Tutup</button>
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className={`max-w-4xl mx-auto ${BRAND.card} p-5 sm:p-8`}>
            {initialLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-40 rounded bg-slate-200" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="h-10 rounded bg-slate-200" />
                  <div className="h-10 rounded bg-slate-200" />
                  <div className="h-10 rounded bg-slate-200" />
                  <div className="h-10 rounded bg-slate-200" />
                  <div className="h-24 rounded bg-slate-200 md:col-span-2" />
                  <div className="h-28 rounded bg-slate-200 md:col-span-2" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nama/Jenis Kelas */}
                <div className="md:col-span-2">
                  <label className={labelBase}><TypeIcon className="h-5 w-5 text-slate-600" /><span>Nama/Jenis Kelas</span></label>
                  <select name="className" value={form.className} onChange={handleClassNameChange} required className={inputBase} aria-label="Pilih kelas">
                    <option value="">Pilih Kelas</option>
                    {CLASS_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  {form.className === "Lainnya" && (
                    <input type="text" name="customClassName" placeholder="Nama kelas custom…" value={form.customClassName} onChange={(e) => setForm((prev) => ({ ...prev, customClassName: e.target.value }))} className={`${inputBase} mt-2`} required aria-label="Nama kelas custom" />
                  )}
                </div>

                {/* Tanggal, Jam */}
                <Field icon={<Calendar className="h-5 w-5 text-slate-600" />} label="Tanggal">
                  <input type="date" name="date" value={form.date} onChange={handleChange} required className={inputBase} />
                </Field>
                <Field icon={<Clock className="h-5 w-5 text-slate-600" />} label="Jam">
                  <input type="time" name="time" value={form.time} onChange={handleChange} required className={inputBase} />
                </Field>

                {/* Coach, Slot */}
                <Field icon={<UserRound className="h-5 w-5 text-slate-600" />} label="Coach">
                  <select name="coach" value={form.coach} onChange={handleChange} required className={inputBase} aria-label="Pilih coach">
                    <option value="">Pilih Coach</option>
                    {coaches.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </Field>
                <Field icon={<Boxes className="h-5 w-5 text-slate-600" />} label="Kapasitas Slot">
                  <input type="number" name="slots" value={form.slots} onChange={handleChange} inputMode="numeric" min={1} className={inputBase} placeholder="cth: 20" required />
                </Field>

                {/* Level, Deskripsi */}
                <Field icon={<Signal className="h-5 w-5 text-slate-600" />} label="Level">
                  <select name="level" value={form.level} onChange={handleChange} className={inputBase} aria-label="Pilih level" required>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <label className={labelBase}><FileText className="h-5 w-5 text-slate-600" /><span>Deskripsi</span></label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={inputBase} placeholder="Deskripsi singkat kelas…" required />
                </div>

                {/* Durasi, Kalori */}
                <Field icon={<Timer className="h-5 w-5 text-slate-600" />} label="Durasi (menit)">
                  <input type="number" name="duration" value={form.duration} onChange={handleChange} inputMode="numeric" min={1} className={inputBase} placeholder="cth: 60" required />
                </Field>
                <Field icon={<Flame className="h-5 w-5 text-slate-600" />} label="Kalori Burn">
                  <input type="number" name="calorieBurn" value={form.calorieBurn} onChange={handleChange} inputMode="numeric" min={0} className={inputBase} placeholder="cth: 300" required />
                </Field>

                {/* === NEW: TAGS === */}
                <div className="md:col-span-2">
                  <label className={labelBase}><Sparkles className="h-5 w-5 text-slate-600" /><span>Tag Kelas</span></label>
                  <div className="flex gap-3 flex-wrap">
                    {(["regular","functional","special"] as Tag[]).map((t) => (
                      <label key={t} className="flex items-center gap-2 px-3 py-1 rounded border bg-gray-50 shadow-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.tags.includes(t)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm((prev) => ({
                              ...prev,
                              tags: checked ? [...prev.tags, t] : prev.tags.filter((x) => x !== t),
                            }));
                          }}
                          className="accent-green-600"
                        />
                        <span className="capitalize">{t}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">* Wajib pilih minimal 1 TAG jika mode akses “By Tags”.</p>
                </div>

                {/* === NEW: Access Mode === */}
                <div className="md:col-span-2">
                  <label className={labelBase}><ShieldCheck className="h-5 w-5 text-slate-600" /><span>Mode Akses</span></label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="accessMode" checked={form.accessMode === "by_tags"} onChange={() => setForm((p) => ({ ...p, accessMode: "by_tags" }))} />
                      <span>By Tags (Direkomendasikan)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="accessMode" checked={form.accessMode === "whitelist"} onChange={() => setForm((p) => ({ ...p, accessMode: "whitelist" }))} />
                      <span>Whitelist Paket</span>
                    </label>
                  </div>
                </div>

                {/* === NEW: Whitelist Paket === */}
                {form.accessMode === "whitelist" && (
                  <div className="md:col-span-2">
                    <label className={labelBase}><TypeIcon className="h-5 w-5 text-slate-600" /><span>Paket yang Diizinkan</span></label>
                    <select multiple className={inputBase} value={form.allowedPackageIds} onChange={(e) => {
                      const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                      setForm((prev) => ({ ...prev, allowedPackageIds: vals }));
                    }} required>
                      {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Tahan CTRL/⌘ untuk pilih banyak.</p>
                  </div>
                )}

                {/* === NEW: Drop-In (Visit) === */}
                <div className="md:col-span-2">
                  <label className={labelBase}><Flame className="h-5 w-5 text-slate-600" /><span>Drop-In (Bayar per Kelas)</span></label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={form.allowDropIn} onChange={(e) => setForm((p) => ({ ...p, allowDropIn: e.target.checked }))} />
                      <span>Izinkan</span>
                    </label>
                    {form.allowDropIn && (
                      <input
                        type="number"
                        min={1}
                        placeholder="Harga drop-in (Rp)"
                        className={inputBase}
                        value={form.dropInPrice}
                        onChange={(e) => setForm((p) => ({ ...p, dropInPrice: e.target.value }))}
                        required
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    * Member dengan paket yang meng‑include TAG/whitelist kelas TIDAK bayar lagi. Drop‑in hanya untuk non‑eligible.
                  </p>
                </div>

                {/* Upload Gambar */}
                <div className="md:col-span-2">
                  <label className={labelBase}><ImagePlus className="h-5 w-5 text-slate-600" /><span>Upload Gambar (wajib landscape)</span></label>
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm" aria-label="Unggah gambar kelas" />
                  {imageError && <div className="text-red-600 text-xs mt-1">{imageError}</div>}
                  {(imagePreview || form.imageUrl) && (
                    <div className="mt-3">
                      <Image src={imagePreview || form.imageUrl} alt="Preview" width={700} height={260} className="rounded-xl object-cover ring-1 ring-slate-200" unoptimized priority />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">* Gambar wajib ada dan harus landscape (width &gt; height).</p>
                </div>

                {/* Actions */}
                <div className="md:col-span-2">
                  <button type="submit" disabled={loading} className="w-full inline-flex justify-center items-center gap-2 bg-[#97CCDD] text-slate-900 font-semibold py-3 rounded-xl shadow hover:opacity-90 transition disabled:opacity-60" aria-busy={loading}>
                    {loading ? (<><Save className="h-5 w-5 animate-spin" />Menyimpan…</>) : (<><CheckCircle2 className="h-5 w-5" />Simpan Kelas</>)}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

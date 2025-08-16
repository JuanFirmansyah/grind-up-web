// src/app/admin/classes/form/ClassForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  UserRound,
  Boxes,
  Type as TypeIcon,
  Sparkles,
  Signal,
  FileText,
  Timer,
  Flame,
  ImagePlus,
  ArrowLeft,
  Save,
  CheckCircle2,
  XCircle
} from "lucide-react";

import { signOut } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  type DocumentData
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Layout components dari Grind Up App 10
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";

/* ====================== Types ====================== */
type Coach = { id: string; name: string; email: string };

type FormState = {
  className: string;
  customClassName: string;
  date: string;
  time: string;
  coach: string;
  slots: string; // string untuk kontrol input, parse saat submit
  type: "regular" | "special";
  description: string;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  calorieBurn: string;
  imageUrl: string;
};

const CLASS_NAMES = [
  "Yoga",
  "Zumba",
  "Aerobik",
  "Pilates",
  "Poundfit",
  "Functional",
  "Lainnya"
] as const;

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
  const typeParam = searchParams.get("type");

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(classId));
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // mobile drawer state + handlers (untuk memenuhi props)
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
    type: "regular",
    description: "",
    duration: "",
    level: "Beginner",
    calorieBurn: "",
    imageUrl: ""
  });

  const headerTitle = useMemo(() => (classId ? "Edit Kelas" : "Tambah Kelas"), [classId]);

  /* ====================== Effects ====================== */
  useEffect(() => {
    // preselect special jika ?type=special dan bukan edit
    if (!classId && typeParam === "special") {
      setForm((prev) => ({ ...prev, type: "special" }));
    }
  }, [classId, typeParam]);

  useEffect(() => {
    const fetchCoaches = async () => {
      const q = query(collection(db, "users"), where("role", "==", "coach"));
      const snapshot = await getDocs(q);
      const data: Coach[] = snapshot.docs.map((d) => {
        const v = d.data() as DocumentData;
        return {
          id: d.id,
          name: (v.name as string) || (v.fullName as string) || "No Name",
          email: (v.email as string) || ""
        };
      });
      setCoaches(data);
    };
    void fetchCoaches();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!classId) return;
      try {
        const docSnap = await getDoc(doc(db, "classes", classId));
        if (docSnap.exists()) {
          const data = docSnap.data() as DocumentData;
          setForm({
            className: (data.className as string) || "",
            customClassName: "",
            date: (data.date as string) || "",
            time: (data.time as string) || "",
            coach: (data.coach as string) || "",
            slots:
              data.slots !== undefined && data.slots !== null
                ? String(data.slots as number)
                : "",
            type: ((data.type as FormState["type"]) || "regular"),
            description: (data.description as string) || "",
            duration:
              data.duration !== undefined && data.duration !== null
                ? String(data.duration as number)
                : "",
            level: ((data.level as FormState["level"]) || "Beginner"),
            calorieBurn:
              data.calorieBurn !== undefined && data.calorieBurn !== null
                ? String(data.calorieBurn as number)
                : "",
            imageUrl: (data.imageUrl as string) || ""
          });
          setImagePreview(((data.imageUrl as string) || null) ?? null);
        }
      } catch {
        setNotice({ kind: "error", text: "Gagal memuat data kelas." });
      } finally {
        setInitialLoading(false);
      }
    };
    void fetchData();
  }, [classId]);

  /* ====================== Handlers ====================== */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
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

  // Validasi gambar landscape
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

  const closeNotice = () => setNotice(null);
  const toInt = (v: string) => parseInt(v, 10);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);

    const realClassName =
      form.className === "Lainnya" ? form.customClassName.trim() : form.className;

    const slotsNum = toInt(form.slots);
    const durationNum = toInt(form.duration);
    const calorieNum = form.calorieBurn ? toInt(form.calorieBurn) : undefined;

    if (
      !realClassName ||
      !form.date ||
      !form.time ||
      !form.coach ||
      Number.isNaN(slotsNum) ||
      Number.isNaN(durationNum) ||
      !form.level
    ) {
      setNotice({ kind: "error", text: "Semua field wajib diisi dengan benar." });
      setLoading(false);
      return;
    }

    if (form.className === "Lainnya" && !form.customClassName.trim()) {
      setNotice({ kind: "error", text: "Silakan isi nama kelas custom." });
      setLoading(false);
      return;
    }

    if (imageFile && imageError) {
      setNotice({ kind: "error", text: imageError });
      setLoading(false);
      return;
    }

    // Upload image jika ada
    let uploadedImageUrl = form.imageUrl;
    if (imageFile) {
      try {
        const imagePath = `class-images/${Date.now()}_${imageFile.name}`;
        const storageRef = ref(storage, imagePath);
        await uploadBytes(storageRef, imageFile);
        uploadedImageUrl = await getDownloadURL(storageRef);
      } catch {
        setNotice({ kind: "error", text: "Gagal mengunggah gambar." });
        setLoading(false);
        return;
      }
    }

    const payload: Record<string, unknown> = {
      ...form,
      className: realClassName,
      slots: slotsNum,
      duration: durationNum,
      level: form.level,
      calorieBurn:
        typeof calorieNum === "number" && !Number.isNaN(calorieNum) ? calorieNum : null,
      imageUrl: uploadedImageUrl
    };

    try {
      if (classId) {
        await updateDoc(doc(db, "classes", classId), payload);
      } else {
        await addDoc(collection(db, "classes"), payload);
      }
      setNotice({ kind: "success", text: "Kelas berhasil disimpan." });
      setTimeout(() => {
        router.push("/admin/classes");
      }, 600);
    } catch {
      setNotice({ kind: "error", text: "Gagal menyimpan kelas. Coba lagi." });
    } finally {
      setLoading(false);
    }
  };

  /* ====================== UI Helpers ====================== */
  const inputBase =
    "w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm placeholder-gray-400 " +
    BRAND.ring;

  const labelBase = "block font-semibold mb-1 text-gray-700 flex items-center gap-2";

  function Field({
    icon,
    label,
    children
  }: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
  }) {
    return (
      <div>
        <label className={labelBase}>
          {icon}
          <span>{label}</span>
        </label>
        {children}
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  /* ====================== Render ====================== */
  return (
    <div className={`min-h-screen ${BRAND.bg}`}>
      {/* Topbar & responsive nav */}
      <AdminTopbar
        onOpen={openMobile}
        showLogout
        onLogout={handleLogout}
      />
      <AdminMobileDrawer
        isOpen={mobileOpen}
        navItems={NAV_ITEMS}
        onClose={closeMobile}
      />
      <div className="flex">
        <AdminSidebar navItems={NAV_ITEMS} showLogout onLogout={handleLogout} />

        <main className="flex-1 p-4 sm:p-6 md:p-10">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-black transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{headerTitle}</h1>
          </div>

          {/* Notice */}
          {notice && (
            <div
              role="status"
              className={`mb-4 flex items-start gap-3 rounded-xl p-3 ${
                notice.kind === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {notice.kind === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5" />
              )}
              <div className="flex-1 text-sm">{notice.text}</div>
              <button
                type="button"
                onClick={closeNotice}
                className="ml-2 text-xs underline decoration-dotted"
                aria-label="Tutup notifikasi"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`max-w-4xl mx-auto ${BRAND.card} p-5 sm:p-8`}
          >
            {/* Skeleton saat preloading edit */}
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
                {/* Kelas & custom */}
                <div className="md:col-span-2">
                  <label className={labelBase}>
                    <TypeIcon className="h-5 w-5 text-slate-600" />
                    <span>Nama/Jenis Kelas</span>
                  </label>
                  <select
                    name="className"
                    value={form.className}
                    onChange={handleClassNameChange}
                    required
                    className={inputBase}
                    aria-label="Pilih kelas"
                  >
                    <option value="">Pilih Kelas</option>
                    {CLASS_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {form.className === "Lainnya" && (
                    <input
                      type="text"
                      name="customClassName"
                      placeholder="Nama kelas custom…"
                      value={form.customClassName}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, customClassName: e.target.value }))
                      }
                      className={`${inputBase} mt-2`}
                      required
                      aria-label="Nama kelas custom"
                    />
                  )}
                </div>

                {/* Tanggal, Jam */}
                <Field icon={<Calendar className="h-5 w-5 text-slate-600" />} label="Tanggal">
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                    className={inputBase}
                  />
                </Field>

                <Field icon={<Clock className="h-5 w-5 text-slate-600" />} label="Jam">
                  <input
                    type="time"
                    name="time"
                    value={form.time}
                    onChange={handleChange}
                    required
                    className={inputBase}
                  />
                </Field>

                {/* Coach, Slot */}
                <Field icon={<UserRound className="h-5 w-5 text-slate-600" />} label="Coach">
                  <select
                    name="coach"
                    value={form.coach}
                    onChange={handleChange}
                    required
                    className={inputBase}
                    aria-label="Pilih coach"
                  >
                    <option value="">Pilih Coach</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field icon={<Boxes className="h-5 w-5 text-slate-600" />} label="Kapasitas Slot">
                  <input
                    type="number"
                    name="slots"
                    value={form.slots}
                    onChange={handleChange}
                    inputMode="numeric"
                    min={1}
                    className={inputBase}
                    placeholder="cth: 20"
                  />
                </Field>

                {/* Tipe, Level */}
                <Field icon={<Sparkles className="h-5 w-5 text-slate-600" />} label="Tipe Kelas">
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className={inputBase}
                    aria-label="Pilih tipe kelas"
                  >
                    <option value="regular">Reguler</option>
                    <option value="special">Special Class</option>
                  </select>
                </Field>

                <Field icon={<Signal className="h-5 w-5 text-slate-600" />} label="Level">
                  <select
                    name="level"
                    value={form.level}
                    onChange={handleChange}
                    className={inputBase}
                    aria-label="Pilih level"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </Field>

                {/* Deskripsi */}
                <div className="md:col-span-2">
                  <label className={labelBase}>
                    <FileText className="h-5 w-5 text-slate-600" />
                    <span>Deskripsi</span>
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    className={inputBase}
                    placeholder="Deskripsi singkat kelas…"
                  />
                </div>

                {/* Durasi, Kalori */}
                <Field icon={<Timer className="h-5 w-5 text-slate-600" />} label="Durasi (menit)">
                  <input
                    type="number"
                    name="duration"
                    value={form.duration}
                    onChange={handleChange}
                    inputMode="numeric"
                    min={1}
                    className={inputBase}
                    placeholder="cth: 60"
                  />
                </Field>

                <Field icon={<Flame className="h-5 w-5 text-slate-600" />} label="Kalori Burn">
                  <input
                    type="number"
                    name="calorieBurn"
                    value={form.calorieBurn}
                    onChange={handleChange}
                    inputMode="numeric"
                    min={0}
                    className={inputBase}
                    placeholder="opsional, cth: 300"
                  />
                </Field>

                {/* Upload Gambar */}
                <div className="md:col-span-2">
                  <label className={labelBase}>
                    <ImagePlus className="h-5 w-5 text-slate-600" />
                    <span>Upload Gambar (wajib landscape)</span>
                  </label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-sm"
                    aria-label="Unggah gambar kelas"
                  />
                  {imageError && <div className="text-red-600 text-xs mt-1">{imageError}</div>}
                  {imagePreview && (
                    <div className="mt-3">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        width={700}
                        height={260}
                        className="rounded-xl object-cover ring-1 ring-slate-200"
                        unoptimized
                        priority
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    * Gambar harus landscape (width &gt; height).
                  </p>
                </div>

                {/* Actions */}
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center gap-2 bg-[#97CCDD] text-slate-900 font-semibold py-3 rounded-xl shadow hover:opacity-90 transition disabled:opacity-60"
                    aria-busy={loading}
                  >
                    {loading ? (
                      <>
                        <Save className="h-5 w-5 animate-spin" />
                        Menyimpan…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Simpan Kelas
                      </>
                    )}
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

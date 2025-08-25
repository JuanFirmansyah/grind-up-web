// src/app/admin/members/form/MemberFormInner.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminTopbar } from "@/components/AdminTopbar";
import { signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { db, storage, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  type WithFieldValue,
  type UpdateData,
  runTransaction,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Calendar,
  Ruler,
  Scale,
  Droplet,
  ShieldCheck,
  BadgeInfo,
  Image as ImgIcon,
  Info,
} from "lucide-react";
// imports Firestore: tambahkan type berikut
import type { CollectionReference, DocumentReference } from "firebase/firestore";

type ChangeEvt =
  | React.ChangeEvent<HTMLInputElement>
  | React.ChangeEvent<HTMLSelectElement>
  | React.ChangeEvent<HTMLTextAreaElement>;

/* ================== Brand colors ================== */
const brand = {
  from: "#6FB5CC",
  to: "#4A9EBB",
  text: "#2D3748",
  lightBorder: "#C1E3ED",
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

/* ====================== Types ====================== */
type MembershipOption = { value: string; label: string };

interface FormState {
  name: string;
  email: string;
  phone: string;
  status: "aktif" | "non-aktif";
  createdAt: string;
  lastLogin: string;
  isVerified: boolean;
  age: string;
  gender: "" | "Laki-laki" | "Perempuan";
  height: string;
  weight: string;
  diseaseHistory: string;
  goal: string;
  experience: string;
  bloodType: string;
  memberType: string;
}

interface UserDoc {
  uid: string;
  role: "member";
  name: string;
  email: string;
  phone: string;
  status: "aktif" | "non-aktif";
  isVerified: boolean;
  age: string;
  gender: "" | "Laki-laki" | "Perempuan";
  height: string;
  weight: string;
  diseaseHistory: string;
  goal: string;
  experience: string;
  bloodType: string;
  memberType: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  lastLogin: Timestamp | ReturnType<typeof serverTimestamp>;
  photoURL?: string;
  qrData?: string;
  memberCode?: string; // <-- NEW
}

interface MembershipPackage {
  name?: string;
}

interface CounterDoc {
  max: number;
}

/* ============== Typed Collections ============== */
const usersCol = collection(db, "users") as CollectionReference<UserDoc>;
const membershipsCol = collection(db, "membership_packages") as CollectionReference<MembershipPackage>;

/* ============== Member Code helpers ============== */
const MEMBER_FIELD = "memberCode";
const CODE_PREFIX = "M-";
const CODE_PAD = 3;
const COUNTER_PATH = "counters/members";

// Counter path typed
const counterRefGlobal = doc(db, COUNTER_PATH) as DocumentReference<CounterDoc>;

function parseCodeNumber(s?: string | null): number | null {
  if (!s) return null;
  const m = String(s).trim().match(/^M-(\d+)$/i);
  return m ? parseInt(m[1], 10) : null;
}
function formatCode(n: number): string {
  return `${CODE_PREFIX}${String(n).padStart(CODE_PAD, "0")}`;
}

// Cari maksimum code saat ini dari koleksi users (fallback inisialisasi)
async function getMaxCodeFromUsers(): Promise<number> {
  const snap = await getDocs(usersCol);
  let max = 0;
  snap.forEach((d) => {
    const n = parseCodeNumber(d.data().memberCode ?? null);
    if (Number.isInteger(n) && (n as number) > max) max = n as number;
  });
  return max;
}


// Baca "calon" berikutnya (untuk ditampilkan sebagai preview di form) — TIDAK melakukan reservasi
async function peekNextMemberCode(): Promise<{ nextNum: number; nextCode: string }> {
  const c = await getDoc(counterRefGlobal);
  let max = 0;
  if (c.exists() && Number.isInteger(c.data()?.max)) {
    max = c.data()!.max; // aman karena dicek di atas
  } else {
    max = await getMaxCodeFromUsers();
  }
  const next = max + 1;
  return { nextNum: next, nextCode: formatCode(next) };
}


// Reservasi angka berikutnya SECARA ATOMIK (anti-duplikat)
async function reserveNextMemberCode(): Promise<{ num: number; code: string }> {
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRefGlobal);
    let currentMax = 0;

    if (snap.exists()) {
      const data = snap.data(); // CounterDoc | undefined
      currentMax = Number.isInteger(data?.max) ? (data!.max as number) : 0;
    } else {
      // Inisialisasi dari users (sekali saja)
      currentMax = await getMaxCodeFromUsers();
      tx.set(counterRefGlobal, { max: currentMax });
    }

    const next = currentMax + 1;
    tx.update(counterRefGlobal, { max: next });

    return { num: next, code: formatCode(next) };
  });
}


export default function MemberFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    status: "aktif",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    isVerified: false,
    age: "",
    gender: "",
    height: "",
    weight: "",
    diseaseHistory: "",
    goal: "",
    experience: "",
    bloodType: "",
    memberType: "",
  });

  const [originalEmail, setOriginalEmail] = useState<string>("");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(!!userId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [membershipOptions, setMembershipOptions] = useState<MembershipOption[]>([]);

  // NEW: preview memberCode berikutnya (untuk mode tambah)
  const [nextCodePreview, setNextCodePreview] = useState<string>("");

  /* ============ Helpers ============ */
  const toISO = (v: unknown) => {
    if (v instanceof Timestamp) return v.toDate().toISOString();
    if (typeof v === "string") return v;
    return new Date().toISOString();
  };

  const diseaseLen = useMemo(() => form.diseaseHistory.length, [form.diseaseHistory]);
  const goalLen = useMemo(() => form.goal.length, [form.goal]);
  const expLen = useMemo(() => form.experience.length, [form.experience]);

  /* ============ Fetch membership packages ============ */
  useEffect(() => {
    (async () => {
      const snap = await getDocs(membershipsCol);
      const items: MembershipOption[] = snap.docs.map((d) => {
        const data = d.data();
        const label = typeof data.name === "string" && data.name.trim() ? data.name : d.id;
        return { value: d.id, label };
      });
      setMembershipOptions(items);
    })();
  }, []);

  /* ============ If editing, fetch user ============ */
  useEffect(() => {
    (async () => {
      if (!userId) {
        setInitialLoading(false);
        // show preview next code for create mode
        try {
          const { nextCode } = await peekNextMemberCode();
          setNextCodePreview(nextCode);
        } catch {
          setNextCodePreview("");
        }
        return;
      }
      try {
        const docSnap = await getDoc(doc(usersCol, userId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setForm((prev) => ({
            ...prev,
            name: data.name,
            email: data.email,
            phone: data.phone,
            status: data.status,
            isVerified: data.isVerified,
            age: data.age,
            gender: data.gender,
            height: data.height,
            weight: data.weight,
            diseaseHistory: data.diseaseHistory,
            goal: data.goal,
            experience: data.experience,
            bloodType: data.bloodType,
            memberType: data.memberType,
            createdAt: toISO(data.createdAt),
            lastLogin: toISO(data.lastLogin),
          }));
          setOriginalEmail(data.email || "");
        }
      } catch {
        alert("Gagal memuat data member.");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [userId]);

  /* ============ Handlers ============ */
  const handleChange: (e: ChangeEvt) => void = (e) => {
    const { name, value, type } = e.target as HTMLInputElement;
    let val = value;

    if (name === "name") val = val.replace(/\b\w/g, (c) => c.toUpperCase());
    if (name === "bloodType") val = val.toUpperCase().replace(/[^ABO]/g, "");
    if (["height", "weight", "age"].includes(name) && !/^\d*$/.test(val)) return;
    if (name === "height" && val && parseInt(val) > 300) return;
    if (name === "weight" && val && parseInt(val) > 300) return;
    if (name === "age" && val && parseInt(val) > 120) return;
    if (["diseaseHistory", "goal", "experience"].includes(name) && val.length > 250) return;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : val,
    }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Nama wajib diisi";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errors.email = "Email tidak valid";
    if (!form.phone.trim() || form.phone.length < 8) errors.phone = "No telepon tidak valid";
    if (!form.gender) errors.gender = "Pilih jenis kelamin";
    if (!form.age) errors.age = "Umur wajib diisi";
    if (!form.weight) errors.weight = "Berat badan wajib diisi";
    if (!form.height) errors.height = "Tinggi badan wajib diisi";
    if (!form.memberType) errors.memberType = "Tipe member wajib dipilih";
    if (!userId && (!password || password.length < 6)) {
      errors.password = "Password minimal 6 karakter";
    }
    return errors;
  };

  const formatPhoneNumber = (phone: string) => {
    let formatted = phone.trim();
    if (formatted.startsWith("08")) formatted = "+62" + formatted.slice(1);
    else if (formatted.startsWith("+62")) {
      // ok
    } else if (formatted.startsWith("62")) formatted = "+" + formatted;
    return formatted;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setFileError("");

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (selectedFile && selectedFile.size > 2 * 1024 * 1024) {
      setFileError("Ukuran gambar maksimal 2MB");
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(form.phone);
      let currentUserId: string | null = userId;

      if (!currentUserId) {
        // ==== CREATE ====
        // 1) Auth user
        try {
          const cred = await createUserWithEmailAndPassword(auth, form.email, password);
          currentUserId = cred.user.uid;
        } catch (err: unknown) {
          const code = typeof err === "object" && err && "code" in err ? (err as { code?: string }).code : "";
          if (code === "auth/email-already-in-use") {
            setFormErrors((p) => ({ ...p, email: "Email sudah terdaftar." }));
            setLoading(false);
            return;
          }
          throw err;
        }

        // 2) Reservasi memberCode secara atomik
        const { code: reservedCode } = await reserveNextMemberCode();

        // 3) Safety: pastikan belum ada user lain yg kebetulan punya code yg sama (harusnya gak mungkin krn tx)
        const dupe = await getDocs(query(usersCol, where(MEMBER_FIELD, "==", reservedCode)));
        if (!dupe.empty) {
          // fallback darurat: reservasi lagi
          const { code: reservedCode2 } = await reserveNextMemberCode();
          // (opsional) log ke console
          console.warn("MemberCode duplikat terdeteksi, memakai kode cadangan:", reservedCode2);
          // pakai yang kedua
          const userRef2 = doc(usersCol, currentUserId!);
          const createPayload2: WithFieldValue<UserDoc> = {
            uid: currentUserId!,
            role: "member",
            name: form.name,
            email: form.email,
            phone: formattedPhone,
            status: form.status,
            isVerified: form.isVerified,
            age: form.age,
            gender: form.gender,
            height: form.height,
            weight: form.weight,
            diseaseHistory: form.diseaseHistory,
            goal: form.goal,
            experience: form.experience,
            bloodType: form.bloodType,
            memberType: form.memberType,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            memberCode: reservedCode2,
          };
          await setDoc(userRef2, createPayload2);
          await updateDoc(userRef2, { qrData: `https://grindupfitness.com/member/${currentUserId}` } as UpdateData<UserDoc>);
          if (selectedFile) {
            const photoRef = ref(storage, `members/${currentUserId}.jpg`);
            await uploadBytes(photoRef, selectedFile);
            const photoURL = await getDownloadURL(photoRef);
            await updateDoc(userRef2, { photoURL } as UpdateData<UserDoc>);
          }
        } else {
          // 4) Buat dokumen user dengan memberCode
          const userRef = doc(usersCol, currentUserId!);
          const createPayload: WithFieldValue<UserDoc> = {
            uid: currentUserId!,
            role: "member",
            name: form.name,
            email: form.email,
            phone: formattedPhone,
            status: form.status,
            isVerified: form.isVerified,
            age: form.age,
            gender: form.gender,
            height: form.height,
            weight: form.weight,
            diseaseHistory: form.diseaseHistory,
            goal: form.goal,
            experience: form.experience,
            bloodType: form.bloodType,
            memberType: form.memberType,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            memberCode: reservedCode, // <— SIMPAN DI SINI
          };
          await setDoc(userRef, createPayload);

          await updateDoc(userRef, {
            qrData: `https://grindupfitness.com/member/${currentUserId}`,
          } as UpdateData<UserDoc>);

          if (selectedFile) {
            const photoRef = ref(storage, `members/${currentUserId}.jpg`);
            await uploadBytes(photoRef, selectedFile);
            const photoURL = await getDownloadURL(photoRef);
            await updateDoc(userRef, { photoURL } as UpdateData<UserDoc>);
          }
        }
      } else {
        // ==== UPDATE (Firestore only) ====
        const userRef = doc(usersCol, currentUserId);
        const updatePayload: UpdateData<UserDoc> = {
          name: form.name,
          email: form.email,
          phone: formattedPhone,
          status: form.status,
          isVerified: form.isVerified,
          age: form.age,
          gender: form.gender,
          height: form.height,
          weight: form.weight,
          diseaseHistory: form.diseaseHistory,
          goal: form.goal,
          experience: form.experience,
          bloodType: form.bloodType,
          memberType: form.memberType,
          lastLogin: serverTimestamp(),
        };
        await updateDoc(userRef, updatePayload);

        if (selectedFile) {
          const photoRef = ref(storage, `members/${currentUserId}.jpg`);
          await uploadBytes(photoRef, selectedFile);
          const photoURL = await getDownloadURL(photoRef);
          await updateDoc(userRef, { photoURL } as UpdateData<UserDoc>);
        }
      }

      alert("Member berhasil disimpan!");
      router.push("/admin/members");
    } catch (err) {
      alert(err instanceof Error ? `Terjadi kesalahan: ${err.message}` : "Terjadi kesalahan yang tidak diketahui.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setFileError("");
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setFileError("Format harus JPG/PNG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError("Ukuran gambar maksimal 2MB");
      return;
    }
    setSelectedFile(file);
    setPreviewURL(URL.createObjectURL(file));
  };

  const emailChanged = !!userId && originalEmail && originalEmail !== form.email;

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  /* ====================== UI ====================== */
  if (initialLoading) {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: `linear-gradient(135deg, ${brand.from}20 0%, #ffffff 35%, ${brand.to}20 100%)` }}
    >
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} onLogout={handleLogout} showLogout />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} onLogout={handleLogout} showLogout />

      <section className="flex-1 p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-2xl mx-auto rounded-2xl shadow-lg bg-white p-6 md:p-10 space-y-6 border"
          style={{ borderColor: brand.lightBorder }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg"
              style={{ background: `${brand.from}20`, color: brand.to }}
              title="Kembali"
            >
              ← Kembali
            </button>
            <h1 className="text-2xl font-extrabold" style={{ color: brand.text }}>
              {userId ? "Edit Member" : "Tambah Member"}
            </h1>
          </div>

          {emailChanged && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF3C7", color: "#92400E" }}>
              <div className="flex items-start gap-2">
                <BadgeInfo className="w-5 h-5 mt-0.5" />
                <p>
                  Email diubah dari <b>{originalEmail}</b> ke <b>{form.email}</b>. Ini hanya memperbarui <b>Firestore</b>. Untuk login
                  dengan email baru, sinkronkan juga di <b>Firebase Authentication</b>.
                </p>
              </div>
            </div>
          )}

          {/* NEW: Preview member code untuk mode Tambah */}
          {!userId && (
            <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-2 border" style={{ borderColor: brand.lightBorder }}>
              <Info className="w-4 h-4 mt-0.5 text-gray-500" />
              <div>
                <div className="font-semibold">Member Code otomatis</div>
                <div className="text-gray-700">
                  Nomor berikutnya: <b>{nextCodePreview || "memuat..."}</b>. Kode akan dikunci saat Anda menekan <b>Simpan Member</b>.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nama" name="name" value={form.name} onChange={handleChange} placeholder="Nama lengkap" icon={<User className="w-4 h-4" />} error={formErrors.name} />
              <Field type="email" label="Email" name="email" value={form.email} onChange={handleChange} placeholder="email@domain.com" icon={<Mail className="w-4 h-4" />} error={formErrors.email} help="Email ini digunakan untuk login aplikasi." />
              {!userId && <PasswordField value={password} onChange={(v) => setPassword(v)} show={showPassword} setShow={setShowPassword} error={formErrors.password} />}
              <Field label="Telepon" name="phone" value={form.phone} onChange={handleChange} placeholder="contoh: 08123456789" icon={<Phone className="w-4 h-4" />} error={formErrors.phone} help="Akan otomatis diformat ke +62 saat disimpan." />
              <SelectField label="Jenis Kelamin" name="gender" value={form.gender} onChange={handleChange} options={[{ value: "", label: "Pilih" }, { value: "Laki-laki", label: "Laki-laki" }, { value: "Perempuan", label: "Perempuan" }]} error={formErrors.gender} />
              <Field label="Umur" name="age" value={form.age} onChange={handleChange} placeholder="contoh: 25" icon={<Calendar className="w-4 h-4" />} error={formErrors.age} />
              <Field label="Berat Badan (kg)" name="weight" value={form.weight} onChange={handleChange} placeholder="contoh: 70" icon={<Scale className="w-4 h-4" />} error={formErrors.weight} />
              <Field label="Tinggi Badan (cm)" name="height" value={form.height} onChange={handleChange} placeholder="contoh: 170" icon={<Ruler className="w-4 h-4" />} error={formErrors.height} />
              <Field label="Golongan Darah" name="bloodType" value={form.bloodType} onChange={handleChange} placeholder="A / B / AB / O" icon={<Droplet className="w-4 h-4" />} />
              <SelectField label="Tipe Member" name="memberType" value={form.memberType} onChange={handleChange} options={[{ value: "", label: "Pilih Tipe Member" }, ...membershipOptions]} error={formErrors.memberType} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Status" name="status" value={form.status} onChange={handleChange} options={[{ value: "aktif", label: "Aktif" }, { value: "non-aktif", label: "Non-Aktif" }]} />
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" name="isVerified" checked={form.isVerified} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-blue-600" id="verified" />
                <label htmlFor="verified" className="text-sm text-gray-700 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Terverifikasi
                </label>
              </div>
            </div>

            <TextareaWithCounter label="Riwayat Penyakit (opsional)" name="diseaseHistory" value={form.diseaseHistory} onChange={handleChange} count={diseaseLen} />
            <TextareaWithCounter label="Tujuan Bergabung (opsional)" name="goal" value={form.goal} onChange={handleChange} count={goalLen} />
            <TextareaWithCounter label="Pengalaman Sebelumnya (opsional)" name="experience" value={form.experience} onChange={handleChange} count={expLen} />

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Foto Member</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border bg-white hover:bg-gray-50">
                  <ImgIcon className="w-4 h-4" />
                  <span>Pilih Foto (JPG/PNG, ≤2MB)</span>
                  <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="hidden" />
                </label>
                {fileError && <span className="text-xs text-red-500">{fileError}</span>}
              </div>
              {previewURL && <Image src={previewURL} alt="Preview" className="mt-2 h-32 w-32 rounded-lg object-cover border" width={128} height={128} style={{ borderColor: brand.lightBorder }} />}
            </div>

            <button type="submit" disabled={loading} className="w-full text-white py-3 rounded-xl shadow transition disabled:opacity-60" style={{ background: `linear-gradient(90deg, ${brand.from} 0%, ${brand.to} 100%)` }}>
              {loading ? "Menyimpan..." : userId ? "Simpan Perubahan" : "Simpan Member"}
            </button>
          </form>
        </motion.div>
      </section>
    </main>
  );
}

/* ================== Small UI pieces ================== */

function Field(props: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvt) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  error?: string;
  help?: string;
}) {
  const { label, name, value, onChange, placeholder, type = "text", icon, error, help } = props;
  return (
    <div>
      <label className="block mb-1 font-semibold">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full border rounded-lg px-3 ${icon ? "pl-9" : "pl-3"} py-2 ${error ? "border-red-500" : "border-gray-300"}`}
        />
      </div>
      {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function SelectField(props: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvt) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  const { label, name, value, onChange, options, error } = props;
  return (
    <div>
      <label className="block mb-1 font-semibold">{label}</label>
      <select name={name} value={value} onChange={onChange} className={`w-full border px-4 py-2 rounded-lg ${error ? "border-red-500" : "border-gray-300"}`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function TextareaWithCounter(props: { label: string; name: string; value: string; onChange: (e: ChangeEvt) => void; count: number }) {
  const { label, name, value, onChange, count } = props;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block mb-1 font-semibold">{label}</label>
        <span className="text-xs text-gray-500">{count}/250</span>
      </div>
      <textarea name={name} value={value} onChange={onChange} rows={2} className="w-full border px-4 py-2 rounded-lg border-gray-300" />
    </div>
  );
}

function PasswordField(props: { value: string; onChange: (v: string) => void; show: boolean; setShow: (v: boolean) => void; error?: string }) {
  const { value, onChange, show, setShow, error } = props;
  return (
    <div>
      <label className="block mb-1 font-semibold">Password</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Minimal 6 karakter"
          className={`w-full border px-4 py-2 pr-10 rounded-lg ${error ? "border-red-500" : "border-gray-300"}`}
        />
        <button type="button" className="absolute inset-y-0 right-0 px-3" onClick={() => setShow(!show)} aria-label="Toggle password">
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

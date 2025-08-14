// src\app\admin\members\form\MemberFormInner.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  type CollectionReference,
  type WithFieldValue,
  type UpdateData,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion } from "framer-motion";
import Image from "next/image";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";

/* ====================== Types ====================== */
type MembershipOption = { value: string; label: string };

interface FormState {
  name: string;
  email: string;
  phone: string;
  status: "aktif" | "non-aktif";
  createdAt: string; // tampil di UI
  lastLogin: string; // tampil di UI
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
  // data profil
  name: string;
  email: string;
  phone: string; // disimpan dalam format +62...
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
  // meta
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  lastLogin: Timestamp | ReturnType<typeof serverTimestamp>;
  // opsional
  photoURL?: string;
  qrData?: string;
}

interface MembershipPackage {
  name?: string;
}

/* ============== Typed Collections / Refs ============== */
const usersCol = collection(db, "users") as CollectionReference<UserDoc>;
const membershipsCol = collection(
  db,
  "membership_packages"
) as CollectionReference<MembershipPackage>;

/* ====================== Component ====================== */
export default function MemberFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(!!userId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [membershipOptions, setMembershipOptions] = useState<MembershipOption[]>(
    []
  );

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
    async function fetchMembershipTypes() {
      const snap = await getDocs(membershipsCol);
      const items: MembershipOption[] = snap.docs.map((d) => {
        const data = d.data();
        const label =
          typeof data.name === "string" && data.name.trim() ? data.name : d.id;
        return { value: d.id, label };
      });
      setMembershipOptions(items);
    }
    fetchMembershipTypes();
  }, []);

  /* ============ If editing, fetch user ============ */
  useEffect(() => {
    const fetchMember = async () => {
      if (!userId) return;
      try {
        const userRef = doc(usersCol, userId);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data(); // UserDoc
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
        }
      } catch {
        alert("Gagal memuat data member.");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchMember();
  }, [userId]);

  /* ============ Handlers ============ */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
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
    if (formatted.startsWith("08")) {
      formatted = "+62" + formatted.slice(1);
    } else if (formatted.startsWith("+62")) {
      // ok
    } else if (formatted.startsWith("62")) {
      formatted = "+" + formatted;
    }
    return formatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setFileError("");

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      window.scrollTo(0, 0);
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
        // Create Auth user
        try {
          const cred = await createUserWithEmailAndPassword(auth, form.email, password);
          currentUserId = cred.user.uid;
        } catch (err: unknown) {
          const msg =
            typeof err === "object" && err && "code" in err
              ? (err as { code?: string }).code
              : "";
          if (msg === "auth/email-already-in-use") {
            setFormErrors((p) => ({ ...p, email: "Email sudah terdaftar." }));
            setLoading(false);
            return;
          }
          throw err;
        }

        // Build payload for create (createdAt & lastLogin = serverTimestamp)
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
        };

        const userRef = doc(usersCol, currentUserId!);
        await setDoc(userRef, createPayload);

        // QR data
        const qrData = `https://grindupfitness.com/member/${currentUserId}`;
        await updateDoc(userRef, { qrData } as UpdateData<UserDoc>);

        // Photo upload
        if (selectedFile) {
          const photoRef = ref(storage, `members/${currentUserId}.jpg`);
          await uploadBytes(photoRef, selectedFile);
          const photoURL = await getDownloadURL(photoRef);
          await updateDoc(userRef, { photoURL } as UpdateData<UserDoc>);
        }
      } else {
        // Update existing (only lastLogin updated to serverTimestamp)
        const userRef = doc(usersCol, currentUserId);

        const updatePayload: UpdateData<UserDoc> = {
          // jangan kirim createdAt supaya tidak overwrite
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
      alert(
        err instanceof Error
          ? `Terjadi kesalahan: ${err.message}`
          : "Terjadi kesalahan yang tidak diketahui."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  if (initialLoading) {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </main>
    );
  }

  /* ====================== UI ====================== */
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto rounded-2xl shadow-lg bg-white p-6 md:p-10 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <span className="text-lg">←</span> Kembali
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {userId ? "Edit Member" : "Tambah Member"}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grid utama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama */}
            <div>
              <label className="block mb-1 font-semibold">Nama</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`w-full border px-4 py-2 rounded-lg ${formErrors.name && "border-red-500"}`}
              />
              {formErrors.name && <p className="text-red-500 text-xs">{formErrors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block mb-1 font-semibold">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={`w-full border px-4 py-2 rounded-lg ${formErrors.email && "border-red-500"}`}
              />
              {formErrors.email && <p className="text-red-500 text-xs">{formErrors.email}</p>}
            </div>

            {/* Password (hanya tambah) */}
            {!userId && (
              <div>
                <label className="block mb-1 font-semibold">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className={`w-full border px-4 py-2 pr-10 rounded-lg ${formErrors.password && "border-red-500"}`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-red-500 text-xs">{formErrors.password}</p>}
              </div>
            )}

            {/* Telepon */}
            <div>
              <label className="block mb-1 font-semibold">Telepon</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={`w-full border px-4 py-2 rounded-lg ${formErrors.phone && "border-red-500"}`}
              />
              {formErrors.phone && <p className="text-red-500 text-xs">{formErrors.phone}</p>}
            </div>

            {/* Gender */}
            <div>
              <label className="block mb-1 font-semibold">Jenis Kelamin</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={`w-full border px-4 py-2 rounded-lg ${formErrors.gender && "border-red-500"}`}
              >
                <option value="">Pilih</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
              {formErrors.gender && <p className="text-red-500 text-xs">{formErrors.gender}</p>}
            </div>

            {/* Umur */}
            <div>
              <label className="block mb-1 font-semibold">Umur</label>
              <input
                name="age"
                value={form.age}
                onChange={handleChange}
                className={`w-full border px-4 py-2 rounded-lg ${formErrors.age && "border-red-500"}`}
              />
              {formErrors.age && <p className="text-red-500 text-xs">{formErrors.age}</p>}
            </div>

            {/* Berat */}
            <div>
              <label className="block mb-1 font-semibold">Berat Badan (kg)</label>
              <input
                name="weight"
                value={form.weight}
                onChange={handleChange}
                className={`w-full border px-4 py-2 rounded-lg ${formErrors.weight && "border-red-500"}`}
              />
              {formErrors.weight && <p className="text-red-500 text-xs">{formErrors.weight}</p>}
            </div>

            {/* Tinggi */}
            <div>
              <label className="block mb-1 font-semibold">Tinggi Badan (cm)</label>
              <input
                name="height"
                value={form.height}
                onChange={handleChange}
                className={`w-full border px-4 py-2 rounded-lg ${formErrors.height && "border-red-500"}`}
              />
              {formErrors.height && <p className="text-red-500 text-xs">{formErrors.height}</p>}
            </div>

            {/* Golongan darah */}
            <div>
              <label className="block mb-1 font-semibold">Golongan Darah</label>
              <input
                name="bloodType"
                value={form.bloodType}
                onChange={handleChange}
                className="w-full border px-4 py-2 rounded-lg"
              />
            </div>

            {/* Tipe Member */}
            <div>
              <label className="block mb-1 font-semibold">Tipe Member</label>
              <select
                name="memberType"
                value={form.memberType}
                onChange={handleChange}
                className={`w-full border px-4 py-2 rounded-lg ${formErrors.memberType && "border-red-500"}`}
                required
              >
                <option value="">Pilih Tipe Member</option>
                {membershipOptions.map((type) => (
                  <option value={type.value} key={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {formErrors.memberType && <p className="text-red-500 text-xs">{formErrors.memberType}</p>}
            </div>
          </div>

          {/* Status & Verifikasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border px-4 py-2 rounded-lg"
              >
                <option value="aktif">Aktif</option>
                <option value="non-aktif">Non-Aktif</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                name="isVerified"
                checked={form.isVerified}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <label className="text-sm text-gray-700">Terverifikasi</label>
            </div>
          </div>

          {/* Riwayat Penyakit */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block mb-1 font-semibold">Riwayat Penyakit (opsional)</label>
              <span className="text-xs text-gray-500">{diseaseLen}/250</span>
            </div>
            <textarea
              name="diseaseHistory"
              value={form.diseaseHistory}
              onChange={handleChange}
              rows={2}
              className="w-full border px-4 py-2 rounded-lg"
            />
          </div>

          {/* Tujuan Bergabung */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block mb-1 font-semibold">Tujuan Bergabung (opsional)</label>
              <span className="text-xs text-gray-500">{goalLen}/250</span>
            </div>
            <textarea
              name="goal"
              value={form.goal}
              onChange={handleChange}
              rows={2}
              className="w-full border px-4 py-2 rounded-lg"
            />
          </div>

          {/* Pengalaman Sebelumnya */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block mb-1 font-semibold">Pengalaman Sebelumnya (opsional)</label>
              <span className="text-xs text-gray-500">{expLen}/250</span>
            </div>
            <textarea
              name="experience"
              value={form.experience}
              onChange={handleChange}
              rows={2}
              className="w-full border px-4 py-2 rounded-lg"
            />
          </div>

          {/* Foto */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Foto Member</label>
            <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
            {fileError && <p className="text-red-500 text-xs">{fileError}</p>}
            {previewURL && (
              <Image
                src={previewURL}
                alt="Preview"
                className="mt-2 h-32 rounded-lg object-cover"
                width={128}
                height={128}
                style={{ objectFit: "cover" }}
              />
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg shadow hover:bg-blue-700 transition"
          >
            {loading ? "Menyimpan..." : userId ? "Simpan Perubahan" : "Simpan Member"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}

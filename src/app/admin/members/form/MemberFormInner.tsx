"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { motion } from "framer-motion";
import Image from "next/image";

// Daftar tipe member dengan label + sesuai kebutuhan
const MEMBER_TYPES = [
  { value: "visit", label: "Visit" },
  { value: "gym_studio", label: "Gym + Studio" },
  { value: "gym_studio_functional", label: "Gym + Studio + Functional" },
  { value: "gym_functional", label: "Gym + Functional" },
  { value: "functional", label: "Functional" },
];

export default function MemberFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get("id");

  const [form, setForm] = useState({
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
    memberType: "", // Tambahan: Tipe Member
    // role akan selalu "member" (default/hardcoded)
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!memberId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    const fetchMember = async () => {
      if (!memberId) return;
      try {
        const docSnap = await getDoc(doc(db, "users", memberId));
        if (docSnap.exists()) {
          setForm((prev) => ({ ...prev, ...docSnap.data() }));
        }
      } catch {
        alert("Gagal memuat data member.");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchMember();
  }, [memberId]);

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

  // Form validation
  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!form.name.trim()) errors.name = "Nama wajib diisi";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errors.email = "Email tidak valid";
    if (!form.phone.trim() || form.phone.length < 8) errors.phone = "No telepon tidak valid";
    if (!form.gender) errors.gender = "Pilih jenis kelamin";
    if (!form.age) errors.age = "Umur wajib diisi";
    if (!form.weight) errors.weight = "Berat badan wajib diisi";
    if (!form.height) errors.height = "Tinggi badan wajib diisi";
    if (!form.memberType) errors.memberType = "Tipe member wajib dipilih";
    return errors;
  };

  const formatPhoneNumber = (phone: string) => {
    let formatted = phone.trim();
    if (formatted.startsWith("08")) {
      formatted = "+62" + formatted.slice(1);
    } else if (formatted.startsWith("+62")) {
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
      // Hardcode role
      const payload = { ...form, role: "member", phone: formatPhoneNumber(form.phone) };
      let docRef;
      let currentMemberId = memberId;

      if (memberId) {
        docRef = doc(db, "users", memberId);
        await updateDoc(docRef, payload);
      } else {
        docRef = await addDoc(collection(db, "users"), payload);
        currentMemberId = docRef.id;
      }

      // --- Set qrData: link ke profile member
      const qrData = `https://grindupfitness.com/member/${currentMemberId}`;
      await updateDoc(docRef, { qrData });

      // --- Upload photo jika ada
      if (selectedFile) {
        const photoRef = ref(storage, `members/${currentMemberId}.jpg`);
        await uploadBytes(photoRef, selectedFile);
        const photoURL = await getDownloadURL(photoRef);
        await updateDoc(docRef, { photoURL });
      }

      alert("Member berhasil disimpan!");
      router.push("/admin/members");
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        typeof (err as { code?: string }).code === "string" &&
        (err as { code: string }).code.includes("storage/")
      ) {
        setFileError("Gagal upload gambar: " + (err as { message?: string }).message);
      } else if (typeof err === "object" && err !== null && "message" in err) {
        alert("Terjadi kesalahan saat menyimpan member: " + ((err as { message?: string }).message || ""));
      } else {
        alert("Terjadi kesalahan saat menyimpan member.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    const file = e.target.files?.[0];
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto rounded-2xl shadow-lg bg-white p-6 md:p-10 space-y-6"
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <span className="text-lg">←</span> Kembali
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {memberId ? "Edit Member" : "Tambah Member"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Nama</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required className={`w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.name && "border-red-500"}`} />
              {formErrors.name && <p className="text-red-500 text-xs">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required className={`w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.email && "border-red-500"}`} />
              {formErrors.email && <p className="text-red-500 text-xs">{formErrors.email}</p>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Telepon</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Contoh: 085340621139" required className={`w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.phone && "border-red-500"}`} />
              {formErrors.phone && <p className="text-red-500 text-xs">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Jenis Kelamin</label>
              <select name="gender" value={form.gender} onChange={handleChange} className={`w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.gender && "border-red-500"}`}>
                <option value="">Pilih</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
              {formErrors.gender && <p className="text-red-500 text-xs">{formErrors.gender}</p>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Umur</label>
              <input type="number" name="age" value={form.age} onChange={handleChange} placeholder="contoh: 25" className={`w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.age && "border-red-500"}`} />
              {formErrors.age && <p className="text-red-500 text-xs">{formErrors.age}</p>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Berat Badan (kg)</label>
              <input type="number" name="weight" value={form.weight} onChange={handleChange} placeholder="contoh: 60" className={`w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.weight && "border-red-500"}`} />
              {formErrors.weight && <p className="text-red-500 text-xs">{formErrors.weight}</p>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Tinggi Badan (cm)</label>
              <input type="number" name="height" value={form.height} onChange={handleChange} placeholder="contoh: 170" className={`w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.height && "border-red-500"}`} />
              {formErrors.height && <p className="text-red-500 text-xs">{formErrors.height}</p>}
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Golongan Darah</label>
              <input type="text" name="bloodType" value={form.bloodType} onChange={handleChange} placeholder="contoh: O / A / B / AB" className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {/* Tambahan: Dropdown Tipe Member */}
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Tipe Member</label>
              <select
                name="memberType"
                value={form.memberType}
                onChange={handleChange}
                className={`w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.memberType && "border-red-500"}`}
                required
              >
                <option value="">Pilih Tipe Member</option>
                {MEMBER_TYPES.map((type) => (
                  <option value={type.value} key={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {formErrors.memberType && <p className="text-red-500 text-xs">{formErrors.memberType}</p>}
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold text-gray-700">Riwayat Penyakit (opsional)</label>
            <textarea name="diseaseHistory" value={form.diseaseHistory} onChange={handleChange} rows={2} className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="aktif">Aktif</option>
                <option value="non-aktif">Non-Aktif</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" name="isVerified" checked={form.isVerified} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <label className="text-sm text-gray-700">Terverifikasi</label>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold text-gray-700">Tujuan Bergabung (opsional)</label>
            <textarea name="goal" value={form.goal} onChange={handleChange} rows={2} className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block mb-1 font-semibold text-gray-700">Pengalaman Sebelumnya (opsional)</label>
            <textarea name="experience" value={form.experience} onChange={handleChange} rows={2} className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Foto Member</label>
            <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="file-input file-input-bordered w-full" />
            {fileError && <p className="text-red-500 text-xs">{fileError}</p>}
            {previewURL && (
              <Image src={previewURL} alt="Preview" className="mt-2 h-32 rounded-lg object-cover" width={128} height={128} style={{ objectFit: "cover" }} />
            )}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg shadow hover:bg-blue-700 transition">
            {loading ? "Menyimpan..." : memberId ? "Simpan Perubahan" : "Simpan Member"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}

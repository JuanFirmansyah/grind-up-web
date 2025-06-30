// src/app/admin/members/form/page.tsx
"use client";
export const dynamic = "force-dynamic";


import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { motion } from "framer-motion";
import Image from "next/image";
import QRCode from "qrcode";

export default function MemberForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get("id");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "aktif",
    activityScore: 0,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    role: "member",
    isVerified: false,
    startDate: "",
    endDate: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    diseaseHistory: "",
    goal: "",
    experience: "",
    bloodType: ""
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!memberId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);

  useEffect(() => {
    const fetchMember = async () => {
      if (!memberId) return;
      try {
        const docSnap = await getDoc(doc(db, "members", memberId));
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

    if (name === "name") {
      val = val.replace(/\b\w/g, (c) => c.toUpperCase());
    }

    if (name === "bloodType") {
      val = val.toUpperCase().replace(/[^ABO]/g, "");
    }

    if (["height", "weight", "age"].includes(name)) {
      if (!/^\d*$/.test(val)) return;
    }

    if (name === "height" && val) {
      const num = parseInt(val);
      if (num > 300) return;
    }

    if (name === "weight" && val) {
      const num = parseInt(val);
      if (num > 300) return;
    }

    if (name === "age" && val) {
      const num = parseInt(val);
      if (num > 120) return;
    }

    if (["diseaseHistory", "goal", "experience"].includes(name)) {
      if (val.length > 250) return;
    }

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : name === "activityScore"
          ? parseInt(val)
          : val
    }));
  };

  const isFormValid = () => {
    const requiredFields = ["name", "email", "phone", "startDate", "endDate"];
    return (
      requiredFields.every((field) => form[field as keyof typeof form]) &&
      new Date(form.endDate) >= new Date(form.startDate)
    );
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
    if (!isFormValid()) return;
    setLoading(true);
    try {
      const payload = { ...form, phone: formatPhoneNumber(form.phone) };
      let docRef;

      if (memberId) {
        docRef = doc(db, "members", memberId);
        await updateDoc(docRef, payload);
      } else {
        docRef = await addDoc(collection(db, "members"), payload);
        const newMemberId = docRef.id;
        const profileURL = `http://localhost:3000/member/${newMemberId}`;
        await updateDoc(docRef, { profileURL });
        const qrDataURL = await QRCode.toDataURL(profileURL);
        await updateDoc(docRef, { qrCode: qrDataURL });
      }

      if (selectedFile) {
        const photoRef = ref(storage, `members/${memberId || docRef.id}.jpg`);
        await uploadBytes(photoRef, selectedFile);
        const photoURL = await getDownloadURL(photoRef);
        await updateDoc(docRef, { photoURL });
      }

      router.push("/admin/members");
    } catch (err) {
      console.error("Gagal simpan member:", err);
      alert("Terjadi kesalahan saat menyimpan member.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      alert("Hanya file .jpg/.png di bawah 2MB yang diperbolehkan.");
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
              <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Telepon</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Contoh: 085340621139" required className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Jenis Kelamin</label>
              <select name="gender" value={form.gender} onChange={handleChange} className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Pilih</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Umur</label>
              <input type="number" name="age" value={form.age} onChange={handleChange} placeholder="contoh: 25" className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Berat Badan (kg)</label>
              <input type="number" name="weight" value={form.weight} onChange={handleChange} placeholder="contoh: 60" className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Tinggi Badan (cm)</label>
              <input type="number" name="height" value={form.height} onChange={handleChange} placeholder="contoh: 170" className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Golongan Darah</label>
              <input type="text" name="bloodType" value={form.bloodType} onChange={handleChange} placeholder="contoh: O / A / B / AB" className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold text-gray-700">Riwayat Penyakit (opsional)</label>
            <textarea name="diseaseHistory" value={form.diseaseHistory} onChange={handleChange} rows={2} className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Mulai Aktif</label>
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Berakhir Aktif</label>
              <input type="date" name="endDate" value={form.endDate} onChange={handleChange} className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="aktif">Aktif</option>
                <option value="non-aktif">Non-Aktif</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Role</label>
              <select name="role" value={form.role} onChange={handleChange} className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="member">Member</option>
                <option value="coach">Coach</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Skor Aktivitas</label>
              <input type="number" name="activityScore" value={form.activityScore} onChange={handleChange} className="w-full border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

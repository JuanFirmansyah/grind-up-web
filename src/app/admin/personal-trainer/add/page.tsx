// src\app\admin\personal-trainer\add\page.tsx

"use client";

import { useState, ChangeEvent, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { PlusCircle, CheckCircle, Trash2 } from "lucide-react";
import Image from "next/image";

interface SessionPackage {
  name: string;
  price: string;
  note: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  clubLocation: string;
  clientCount: string;
  maxSlot: string;
  experience: string;
  specialties: string;
  certifications: string;
  photoUrl: string;
  status: string;
  sessionPackages: SessionPackage[];
}

const DEFAULT_FORM: FormState = {
  name: "",
  email: "",
  phone: "+62",
  clubLocation: "",
  clientCount: "0",
  maxSlot: "10",
  experience: "",
  specialties: "",
  certifications: "",
  photoUrl: "",
  status: "aktif",
  sessionPackages: [{ name: "", price: "", note: "" }],
};

export default function AddCoachPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ [k: string]: string }>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const waRef = useRef<HTMLInputElement>(null);

  // Handle photo upload to Firebase Storage
  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("File harus berupa gambar!");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError("Ukuran gambar maksimal 3MB.");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `coach_photos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm(prev => ({ ...prev, photoUrl: url }));
    } catch (err) {
      setUploadError("Gagal upload gambar. Coba lagi.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setError(null);
    setFieldError({});
    const { name, value } = e.target;
    if (name === "phone") {
      let wa = value.startsWith("+62") ? value : "+62" + value.replace(/^\+*/, "").replace(/^62/, "");
      wa = "+62" + wa.slice(3).replace(/\D/g, "");
      setForm((prev) => ({ ...prev, phone: wa }));
    } else if (name === "clientCount" || name === "maxSlot") {
      setForm((prev) => ({ ...prev, [name]: value.replace(/\D/g, "") }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePkgChange = (idx: number, key: keyof SessionPackage, value: string) => {
    setForm((prev) => ({
      ...prev,
      sessionPackages: prev.sessionPackages.map((pkg, i) =>
        i === idx ? { ...pkg, [key]: value } : pkg
      ),
    }));
  };

  const handleAddPkg = () => {
    setForm((prev) => ({
      ...prev,
      sessionPackages: [...prev.sessionPackages, { name: "", price: "", note: "" }],
    }));
  };

  const handleRemovePkg = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      sessionPackages: prev.sessionPackages.filter((_, i) => i !== idx),
    }));
  };

  const validate = async () => {
    const errors: { [k: string]: string } = {};
    if (!form.name.trim()) errors.name = "Nama wajib diisi";
    if (!form.email.trim()) errors.email = "Email wajib diisi";
    if (!form.phone.trim() || form.phone === "+62") errors.phone = "Nomor phone wajib diisi";
    if (!form.phone.startsWith("+62")) {
      errors.phone = "Nomor WA harus diawali +62";
    } else if (!/^(\+62)[0-9]{9,}$/.test(form.phone)) {
      errors.phone = "Nomor WA harus valid (contoh: +6281234567890)";
    }
    if (!form.maxSlot || Number(form.maxSlot) < 1) errors.maxSlot = "Slot minimal 1";
    if (!form.photoUrl) errors.photoUrl = "Foto coach wajib di-upload!";
    if (!errors.email) {
      const q = query(collection(db, "users"), where("email", "==", form.email.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) errors.email = "Email sudah digunakan. Gunakan email lain!";
    }
    return errors;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldError({});
    setSaving(true);

    try {
      const errors = await validate();
      if (Object.keys(errors).length > 0) {
        setFieldError(errors);
        if (errors.phone && waRef.current) waRef.current.focus();
        setSaving(false);
        return;
      }

      await addDoc(collection(db, "users"), {
        ...form,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        role: "coach",
        clientCount: form.clientCount ? Number(form.clientCount) : 0,
        maxSlot: form.maxSlot ? Number(form.maxSlot) : 10,
        specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
        certifications: form.certifications.split(",").map((s) => s.trim()).filter(Boolean),
        sessionPackages: form.sessionPackages.filter(
          (pkg) => pkg.name.trim() !== "" || pkg.price.trim() !== "" || pkg.note.trim() !== ""
        ),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        photoUrl: form.photoUrl,
        status: form.status,
      });

      alert("Coach berhasil ditambahkan!");
      router.push("/admin/personal-trainer");
    } catch (err) {
      setError("Gagal menambah coach. Coba lagi.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50 p-4 md:p-10">
      <div className="max-w-3xl mx-auto bg-white p-6 md:p-10 rounded-xl shadow-xl space-y-7">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            ← Kembali
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Tambah Coach</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo Upload */}
          <div>
            <label className="font-semibold mb-1 block">Foto (Upload)*</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              disabled={uploading}
            />
            {uploading && <p className="text-xs text-blue-500">Mengupload gambar...</p>}
            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
            {fieldError.photoUrl && <p className="text-xs text-red-500">{fieldError.photoUrl}</p>}
            {form.photoUrl && (
              <div className="mt-2 flex items-center gap-4">
                <Image
                  src={form.photoUrl}
                  alt={form.name || "Foto Coach"}
                  width={100}
                  height={100}
                  className="rounded-xl object-cover shadow-md border"
                />
                <button
                  type="button"
                  className="ml-2 text-sm bg-red-100 text-red-500 px-2 py-1 rounded hover:bg-red-200"
                  onClick={() => setForm(prev => ({ ...prev, photoUrl: "" }))}
                  disabled={uploading}
                >
                  Hapus Foto
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Format: JPG/PNG. Maksimal 3MB. Foto terbaik: square ratio 1:1.
            </p>
          </div>

          <div className="flex-1 space-y-3 w-full">
            <div>
              <label className="font-semibold mb-1 block">Nama*</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className={`w-full border ${fieldError.name ? "border-red-400" : "border-gray-300"} rounded-lg px-3 py-2`}
              />
              {fieldError.name && <p className="text-xs text-red-500 mt-1">{fieldError.name}</p>}
            </div>
            <div>
              <label className="font-semibold mb-1 block">Email*</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="off"
                className={`w-full border ${fieldError.email ? "border-red-400" : "border-gray-300"} rounded-lg px-3 py-2`}
                placeholder="coach@email.com"
              />
              {fieldError.email && <p className="text-xs text-red-500 mt-1">{fieldError.email}</p>}
            </div>
            <div>
              <label className="font-semibold mb-1 block">Nomor phone*</label>
              <input
                ref={waRef}
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                autoComplete="off"
                minLength={13}
                maxLength={16}
                className={`w-full border ${fieldError.phone ? "border-red-400" : "border-gray-300"} rounded-lg px-3 py-2`}
                placeholder="contoh: +6281234567890"
                inputMode="numeric"
                pattern="\+62[0-9]{9,13}"
              />
              <span className="text-xs text-gray-500">Hanya angka setelah <b>+62</b>, contoh: +6281234567890</span>
              {fieldError.phone && <p className="text-xs text-red-500 mt-1">{fieldError.phone}</p>}
            </div>
            <div>
              <label className="font-semibold mb-1 block">Lokasi Klub</label>
              <input
                type="text"
                name="clubLocation"
                value={form.clubLocation}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="font-semibold mb-1 block">Jumlah Klien (current)</label>
                <input
                  type="number"
                  name="clientCount"
                  value={form.clientCount}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  min={0}
                  readOnly
                  style={{ background: "#f9fafb", cursor: "not-allowed" }}
                />
              </div>
              <div className="flex-1">
                <label className="font-semibold mb-1 block">Max Slot*</label>
                <input
                  type="number"
                  name="maxSlot"
                  value={form.maxSlot}
                  onChange={handleChange}
                  min={1}
                  max={99}
                  required
                  className={`w-full border ${fieldError.maxSlot ? "border-red-400" : "border-gray-300"} rounded-lg px-3 py-2`}
                  placeholder="Max klien aktif"
                />
                {fieldError.maxSlot && <p className="text-xs text-red-500 mt-1">{fieldError.maxSlot}</p>}
              </div>
              <div className="flex-1">
                <label className="font-semibold mb-1 block">Sisa Slot</label>
                <input
                  type="number"
                  value={Math.max(Number(form.maxSlot) - Number(form.clientCount || 0), 0)}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                  style={{ cursor: "not-allowed" }}
                  tabIndex={-1}
                />
              </div>
            </div>
            <div>
              <label className="font-semibold mb-1 block">Pengalaman</label>
              <input
                type="text"
                name="experience"
                value={form.experience}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="contoh: 3 tahun"
              />
            </div>
            <div>
              <label className="font-semibold mb-1 block">
                Spesialisasi <span className="text-xs">(pisahkan dengan koma)</span>
              </label>
              <input
                type="text"
                name="specialties"
                value={form.specialties}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="contoh: Fat Loss, HIIT"
              />
            </div>
            <div>
              <label className="font-semibold mb-1 block">
                Sertifikasi <span className="text-xs">(pisahkan dengan koma)</span>
              </label>
              <input
                type="text"
                name="certifications"
                value={form.certifications}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="font-semibold mb-1 block">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>
          {/* Session Packages */}
          <div>
            <label className="font-semibold mb-2 block">Paket Sesi</label>
            <div className="space-y-2">
              {form.sessionPackages.map((pkg, idx) => (
                <div
                  key={idx}
                  className="flex flex-col md:flex-row gap-2 items-center bg-slate-50 rounded-xl px-2 py-2 border border-slate-200 shadow-sm"
                >
                  <input
                    type="text"
                    placeholder="Nama Paket"
                    value={pkg.name}
                    onChange={e => handlePkgChange(idx, "name", e.target.value)}
                    className="flex-1 border px-2 py-1 rounded"
                  />
                  <input
                    type="number"
                    placeholder="Harga"
                    value={pkg.price}
                    onChange={e => handlePkgChange(idx, "price", e.target.value)}
                    className="w-28 border px-2 py-1 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Keterangan (opsional)"
                    value={pkg.note}
                    onChange={e => handlePkgChange(idx, "note", e.target.value)}
                    className="w-36 border px-2 py-1 rounded"
                  />
                  {form.sessionPackages.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove Paket"
                      onClick={() => handleRemovePkg(idx)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-700 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPkg}
                className="flex items-center gap-2 px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-700 mt-2"
              >
                <PlusCircle className="w-5 h-5" />
                Tambah Paket Sesi
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Kolom <b>Keterangan</b> untuk promo, bonus sesi, dsb (boleh dikosongkan).
            </p>
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg shadow hover:bg-blue-700 transition flex justify-center items-center gap-2"
          >
            {saving ? (
              <>
                <CheckCircle className="animate-spin w-5 h-5" /> Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" /> Simpan Coach
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

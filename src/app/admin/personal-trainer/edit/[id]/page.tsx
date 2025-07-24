"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { CheckCircle, PlusCircle, Trash2 } from "lucide-react";
import Image from "next/image";

interface SessionPackage {
  name: string;
  price: string;
  note: string;
}

interface TrainerForm {
  name: string;
  clubLocation: string;
  clientCount: string;
  experience: string;
  specialties: string;
  certifications: string;
  photoUrl: string;
  phone: string;
  status: string;
  maxSlot: string;
  sessionPackages: SessionPackage[];
}

const DEFAULT_PHOTO = "/user-default.png";

export default function EditPersonalTrainerPage() {
  const router = useRouter();
  const params = useParams();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [form, setForm] = useState<TrainerForm>({
    name: "",
    clubLocation: "",
    clientCount: "",
    experience: "",
    specialties: "",
    certifications: "",
    photoUrl: "",
    phone: "",
    status: "aktif",
    maxSlot: "10",
    sessionPackages: [{ name: "", price: "", note: "" }],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<{ [k: string]: string }>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // --- Ambil data awal
  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      try {
        const docSnap = await getDoc(doc(db, "users", id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setForm({
            name: data.name || "",
            clubLocation: data.clubLocation || "",
            clientCount: typeof data.clientCount === "number" ? data.clientCount.toString() : "",
            experience: data.experience || "",
            specialties: Array.isArray(data.specialties)
              ? data.specialties.join(", ")
              : data.specialties || "",
            certifications: Array.isArray(data.certifications)
              ? data.certifications.join(", ")
              : data.certifications || "",
            photoUrl: data.photoUrl || "",
            phone: data.phone || "",
            status: data.status || "aktif",
            maxSlot: typeof data.maxSlot === "number" ? data.maxSlot.toString() : "10",
            sessionPackages:
              Array.isArray(data.sessionPackages) && data.sessionPackages.length > 0
                ? data.sessionPackages
                : [{ name: "", price: "", note: "" }],
          });
        }
      } catch {
        alert("Gagal memuat data pelatih.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // --- Handler input
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  // --- Handler upload foto ke storage
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

  // --- Session package changes
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

  // --- Validasi
  const validate = () => {
    const errors: { [k: string]: string } = {};
    if (!form.name.trim()) errors.name = "Nama wajib diisi";
    if (!form.phone.trim() || form.phone === "+62") errors.phone = "Nomor WhatsApp wajib diisi";
    if (!form.phone.startsWith("+62")) {
      errors.phone = "Nomor WA harus dimulai dengan +62 (kode negara Indonesia)";
    } else if (!/^(\+62)[0-9]{9,}$/.test(form.phone)) {
      errors.phone = "Nomor WA harus valid (contoh: +6281234567890)";
    }
    if (form.maxSlot && (isNaN(Number(form.maxSlot)) || Number(form.maxSlot) < 1)) {
      errors.maxSlot = "Slot maksimal minimal 1";
    }
    if (!form.photoUrl) errors.photoUrl = "Foto coach wajib di-upload!";
    return errors;
  };

  // --- Submit
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldError({});
    setSaving(true);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldError(errors);
      setSaving(false);
      return;
    }

    try {
      await updateDoc(doc(db, "users", id), {
        name: form.name,
        clubLocation: form.clubLocation,
        clientCount: form.clientCount ? Number(form.clientCount) : 0,
        experience: form.experience,
        specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
        certifications: form.certifications.split(",").map((s) => s.trim()).filter(Boolean),
        photoUrl: form.photoUrl,
        phone: form.phone.trim(),
        status: form.status,
        maxSlot: form.maxSlot ? Number(form.maxSlot) : 10,
        sessionPackages: form.sessionPackages.filter(
          (pkg) => pkg.name.trim() !== "" || pkg.price.trim() !== "" || pkg.note.trim() !== ""
        ),
        updatedAt: new Date().toISOString(),
      });
      alert("Data coach berhasil diupdate!");
      router.push("/admin/personal-trainer");
    } catch {
      alert("Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6 animate-pulse text-gray-500">Memuat data...</p>;
  }

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
          <h1 className="text-2xl font-bold text-gray-800">Edit Coach</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Foto */}
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
                  src={form.photoUrl || DEFAULT_PHOTO}
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
              <label className="font-semibold mb-1 block">Nomor WhatsApp*</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                autoComplete="off"
                className={`w-full border ${fieldError.phone ? "border-red-400" : "border-gray-300"} rounded-lg px-3 py-2`}
                placeholder="contoh: +6281234567890"
              />
              <span className="text-xs text-gray-500">Harus awali <b>+62</b> (kode negara Indonesia), hanya angka sesudahnya.</span>
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
            <div>
              <label className="font-semibold mb-1 block">Jumlah Klien</label>
              <input
                type="number"
                name="clientCount"
                value={form.clientCount}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="font-semibold mb-1 block">Maksimal Slot Klien</label>
              <input
                type="number"
                name="maxSlot"
                min={1}
                value={form.maxSlot}
                onChange={handleChange}
                required
                className={`w-full border ${fieldError.maxSlot ? "border-red-400" : "border-gray-300"} rounded-lg px-3 py-2`}
                placeholder="Contoh: 10"
              />
              {fieldError.maxSlot && <p className="text-xs text-red-500 mt-1">{fieldError.maxSlot}</p>}
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
                <CheckCircle className="w-5 h-5" /> Simpan Data
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

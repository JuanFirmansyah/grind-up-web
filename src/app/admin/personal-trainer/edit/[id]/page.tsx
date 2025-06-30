// src/app/admin/personal-trainer/[id]/edit/page.tsx

"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
  specialties: string; // Comma separated for input
  certifications: string; // Comma separated for input
  photoUrl: string;
  sessionPackages: SessionPackage[];
}

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
    sessionPackages: [
      { name: "", price: "", note: "" },
      { name: "", price: "", note: "" },
      { name: "", price: "", note: "" }
    ]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      try {
        const docSnap = await getDoc(doc(db, "members", id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setForm({
            name: data.name || "",
            clubLocation: data.clubLocation || "",
            clientCount: data.clientCount?.toString() || "",
            experience: data.experience || "",
            specialties: Array.isArray(data.specialties)
              ? data.specialties.join(", ")
              : data.specialties || "",
            certifications: Array.isArray(data.certifications)
              ? data.certifications.join(", ")
              : data.certifications || "",
            photoUrl: data.photoUrl || "",
            sessionPackages:
              Array.isArray(data.sessionPackages) && data.sessionPackages.length > 0
                ? data.sessionPackages
                : [
                    { name: "", price: "", note: "" },
                    { name: "", price: "", note: "" },
                    { name: "", price: "", note: "" }
                  ]
          });
        }
      } catch (err) {
        console.error(err);
        alert("Gagal memuat data pelatih.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePkgChange = (idx: number, key: keyof SessionPackage, value: string) => {
    setForm(prev => ({
      ...prev,
      sessionPackages: prev.sessionPackages.map((pkg, i) =>
        i === idx ? { ...pkg, [key]: value } : pkg
      )
    }));
  };

  const handleAddPkg = () => {
    setForm(prev => ({
      ...prev,
      sessionPackages: [...prev.sessionPackages, { name: "", price: "", note: "" }]
    }));
  };
  const handleRemovePkg = (idx: number) => {
    setForm(prev => ({
      ...prev,
      sessionPackages: prev.sessionPackages.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, "members", id), {
        name: form.name,
        clubLocation: form.clubLocation,
        clientCount: form.clientCount ? Number(form.clientCount) : 0,
        experience: form.experience,
        specialties: form.specialties.split(",").map(s => s.trim()).filter(Boolean),
        certifications: form.certifications.split(",").map(s => s.trim()).filter(Boolean),
        photoUrl: form.photoUrl,
        sessionPackages: form.sessionPackages.filter(
          pkg => pkg.name.trim() !== "" || pkg.price.trim() !== "" || pkg.note.trim() !== ""
        )
      });
      alert("Data pelatih berhasil diupdate!");
      router.push("/admin/personal-trainer");
    } catch (err) {
      console.error(err);
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
          <h1 className="text-2xl font-bold text-gray-800">Edit Pelatih Pribadi</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {form.photoUrl && (
              <Image
                src={form.photoUrl}
                alt={form.name}
                width={100}
                height={100}
                className="rounded-xl object-cover shadow-md"
                priority
              />
            )}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="font-semibold mb-1 block">Nama</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
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
                <label className="font-semibold mb-1 block">Foto (URL)</label>
                <input
                  type="text"
                  name="photoUrl"
                  value={form.photoUrl}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Paste image URL"
                />
              </div>
            </div>
          </div>

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

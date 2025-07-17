// src\app\admin\classes\functional-form\page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { addDoc, updateDoc, doc, getDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { CheckCircle } from "lucide-react";
import Image from "next/image";

function formatRupiah(value: string) {
  // Remove non-digit, kecuali koma
  const cleaned = value.replace(/\D/g, "");
  if (!cleaned) return "";
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function FunctionalForm() {
  const router = useRouter();
  const params = useSearchParams();
  const classId = params.get("id");

  const [form, setForm] = useState({
    description: "",
    period: "Bulanan",
    price: "",
    slot: "",
    imageUrl: ""
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!classId);

  // Fetch data jika edit
  useEffect(() => {
    const fetchData = async () => {
      if (!classId) return;
      const docSnap = await getDoc(doc(db, "classes", classId));
      if (docSnap.exists()) {
        const d = docSnap.data();
        setForm({
          description: d.description || "",
          period: d.period || "Bulanan",
          price: d.price ? formatRupiah(d.price.toString()) : "",
          slot: d.slot ? d.slot.toString() : "",
          imageUrl: d.imageUrl || "",
        });
      }
      setInitialLoading(false);
    };
    fetchData();
  }, [classId]);

  // Upload image
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setImageFile(e.target.files[0]);
    if (e.target.files && e.target.files[0]) {
      setForm((prev) => ({ ...prev, imageUrl: URL.createObjectURL(e.target.files![0]) }));
    }
  };

  // Handle input price, UX format rupiah
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Remove non-digit
    value = value.replace(/\D/g, "");
    // Format as rupiah
    const formatted = formatRupiah(value);
    setForm(prev => ({ ...prev, price: formatted }));
  };

  // Simpan data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    let finalImageUrl = form.imageUrl;
    if (imageFile) {
      const imgRef = ref(storage, `functional_classes/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imgRef, imageFile);
      finalImageUrl = await getDownloadURL(imgRef);
    }

    const payload = {
      ...form,
      // Hapus titik sebelum simpan
      price: Number(form.price.replace(/\./g, "")),
      slot: Number(form.slot),
      imageUrl: finalImageUrl,
      type: "functional",
    };

    try {
      if (classId) {
        await updateDoc(doc(db, "classes", classId), payload);
      } else {
        await addDoc(collection(db, "classes"), payload);
      }
      alert("Paket Functional berhasil disimpan!");
      router.push("/admin/classes");
    } catch {
      alert("Gagal simpan data.");
    } finally {
      setUploading(false);
    }
  };

  if (initialLoading) {
    return <div className="p-6 animate-pulse text-gray-500">Memuat data...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 p-6 md:p-10">
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <h1 className="text-2xl font-bold mb-2">{classId ? "Edit" : "Tambah"} Paket Functional</h1>
        
        <div>
          <label className="block font-semibold mb-1 text-gray-700">Deskripsi</label>
          <textarea
            className="w-full border px-4 py-2 rounded-lg shadow-sm"
            name="description"
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1 text-gray-700">Periode</label>
          <select
            className="w-full border px-4 py-2 rounded-lg shadow-sm"
            name="period"
            value={form.period}
            onChange={e => setForm(prev => ({ ...prev, period: e.target.value }))}
            required
          >
            <option value="Bulanan">Bulanan</option>
            <option value="Tahunan">Tahunan</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1 text-gray-700">Harga (Rp)</label>
          <input
            type="text"
            className="w-full border px-4 py-2 rounded-lg shadow-sm"
            name="price"
            value={form.price}
            onChange={handlePriceChange}
            required
            placeholder="Misal: 1.500.000"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1 text-gray-700">Slot</label>
          <input
            type="number"
            className="w-full border px-4 py-2 rounded-lg shadow-sm"
            name="slot"
            value={form.slot}
            onChange={e => setForm(prev => ({ ...prev, slot: e.target.value.replace(/\D/, "") }))}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1 text-gray-700">Upload Gambar</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {form.imageUrl && (
            <Image
              src={form.imageUrl}
              alt="Preview"
              width={240}
              height={140}
              className="rounded-xl mt-2 object-cover"
            />
          )}
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-green-600 text-white py-3 rounded-lg shadow hover:bg-green-700 transition flex justify-center items-center gap-2"
        >
          {uploading ? (
            <>
              <CheckCircle className="animate-spin w-5 h-5" /> Menyimpan...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" /> Simpan Paket
            </>
          )}
        </button>
      </form>
    </main>
  );
}

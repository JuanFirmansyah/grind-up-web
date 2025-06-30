// src/app/admin/classes/bundling-form/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ArrowLeft } from "lucide-react";

export default function BundlingFormPage() {
  const [form, setForm] = useState({
    packageName: "",
    description: "",
    price: "",
    includedClasses: "",
    imageFile: null as File | null,
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, imageFile: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = "";
      let imagePath = ""; // <-- tambahkan ini!

      if (form.imageFile) {
        imagePath = `bundling-images/${Date.now()}-${form.imageFile.name}`; // <-- path image di storage
        const storageRef = ref(storage, imagePath);
        await uploadBytes(storageRef, form.imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "bundling_packages"), {
        packageName: form.packageName,
        description: form.description,
        price: form.price,
        includedClasses: form.includedClasses,
        imageUrl,
        imagePath, // <-- field yang akan tersimpan di firestore
      });

      router.push("/admin/classes");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan paket bundling.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50 p-6 md:p-10">
      <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:underline mb-4"
        >
          <ArrowLeft className="w-5 h-5" /> Kembali
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Tambah Paket Bundling</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium mb-1">Nama Paket</label>
            <input
              type="text"
              name="packageName"
              value={form.packageName}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Deskripsi</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Harga Paket (Rp)</label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Kelas yang Termasuk (dipisah koma)</label>
            <input
              type="text"
              name="includedClasses"
              value={form.includedClasses}
              onChange={handleChange}
              placeholder="Yoga, Zumba, HIIT"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Gambar Paket (opsional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {loading ? "Menyimpan..." : "Simpan Paket"}
          </button>
        </form>
      </div>
    </main>
  );
}

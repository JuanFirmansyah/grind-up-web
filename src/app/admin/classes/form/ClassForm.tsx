// src\app\admin\classes\form\ClassForm.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import Image from "next/image";

export default function ClassForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("id");

  const [coaches, setCoaches] = useState<{ id: string; name: string; email: string }[]>([]);
  const classNames = [
    "Yoga",
    "Zumba",
    "Aerobik",
    "Pilates",
    "Poundfit",
    "Functional",
    "Lainnya",
  ];
  const [form, setForm] = useState({
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
    imageUrl: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!classId);

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCoaches = async () => {
      const q = query(collection(db, "users"), where("role", "==", "coach"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().fullName || "No Name",
        email: doc.data().email || "",
      }));
      setCoaches(data);
    };
    fetchCoaches();
  }, []);

  const typeParam = searchParams.get("type");
  useEffect(() => {
    if (!classId && typeParam === "special") {
      setForm((prev) => ({ ...prev, type: "special" }));
    }
  }, [classId, typeParam]);

  useEffect(() => {
    const fetchData = async () => {
      if (!classId) return;
      try {
        const docSnap = await getDoc(doc(db, "classes", classId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setForm({
            className: data.className || "",
            customClassName: "",
            date: data.date || "",
            time: data.time || "",
            coach: data.coach || "",
            slots: data.slots !== undefined ? data.slots.toString() : "",
            type: data.type || "regular",
            description: data.description || "",
            duration: data.duration !== undefined ? data.duration.toString() : "",
            level: data.level || "Beginner",
            calorieBurn: data.calorieBurn !== undefined ? data.calorieBurn.toString() : "",
            imageUrl: data.imageUrl || "",
          });
          setImagePreview(data.imageUrl || null);
        }
      } catch {
        alert("Gagal memuat data kelas.");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchData();
  }, [classId]);

    const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validasi gambar lebar (landscape)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new window.Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width <= img.height) {
        setImageError("Gambar harus landscape/lebar (width > height).");
        setImageFile(null);
        setImagePreview(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
        return;
      }
      setImageFile(file);
      setImagePreview(img.src);
    };
  };

  // Handle nama kelas dinamis
  const handleClassNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm(prev => ({
      ...prev,
      className: e.target.value,
      customClassName: e.target.value === "Lainnya" ? prev.customClassName : "",
    }));
  };

  // Simpan data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const realClassName = form.className === "Lainnya" ? form.customClassName : form.className;

    if (
      !realClassName || !form.date || !form.time || !form.coach ||
      isNaN(Number(form.slots)) || !form.duration || !form.level
    ) {
      alert("Semua field wajib diisi.");
      setLoading(false);
      return;
    }

    if (form.className === "Lainnya" && !form.customClassName.trim()) {
      alert("Silakan isi nama kelas custom!");
      setLoading(false);
      return;
    }

    // Validasi gambar
    if (imageFile && imageError) {
      alert(imageError);
      setLoading(false);
      return;
    }

    let uploadedImageUrl = form.imageUrl;
    if (imageFile) {
      try {
        const imagePath = `class-images/${Date.now()}_${imageFile.name}`;
        const storageRef = ref(storage, imagePath);
        await uploadBytes(storageRef, imageFile);
        uploadedImageUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error("Upload error:", err);
        alert("Gagal upload gambar.");
        setLoading(false);
        return;
      }
    }

    const payload = {
      ...form,
      className: realClassName,
      slots: parseInt(form.slots),
      duration: Number(form.duration),
      calorieBurn: form.calorieBurn ? Number(form.calorieBurn) : undefined,
      imageUrl: uploadedImageUrl,
    };

    try {
      if (classId) {
        await updateDoc(doc(db, "classes", classId), payload);
      } else {
        await addDoc(collection(db, "classes"), payload);
      }
      alert("Kelas berhasil disimpan!");
      router.push("/admin/classes");
    } catch (error) {
      console.error("Error saving class:", error);
      alert("Gagal menyimpan kelas. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <p className="p-6 animate-pulse text-gray-500">Memuat data...</p>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto rounded-2xl shadow-lg bg-white p-6 md:p-10 space-y-6"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <span className="text-lg">←</span> Kembali
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {classId ? "Edit Kelas" : "Tambah Kelas"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kelas & custom */}
          <div className="md:col-span-2">
            <label className="block font-semibold mb-1 text-gray-700">Nama/Jenis Kelas</label>
            <select
              name="className"
              value={form.className}
              onChange={handleClassNameChange}
              required
              className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm"
            >
              <option value="">Pilih Kelas</option>
              {classNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {form.className === "Lainnya" && (
              <input
                type="text"
                name="customClassName"
                placeholder="Nama kelas custom..."
                value={form.customClassName}
                onChange={e => setForm(prev => ({ ...prev, customClassName: e.target.value }))}
                className="w-full border mt-2 border-gray-300 px-4 py-2 rounded-lg shadow-sm"
                required
              />
            )}
          </div>

          {/* Tanggal, Jam */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700">Tanggal</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm" />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700">Jam</label>
            <input type="time" name="time" value={form.time} onChange={handleChange} required className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm" />
          </div>

          {/* Coach, Slot */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700">Coach</label>
            <select name="coach" value={form.coach} onChange={handleChange} required className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm">
              <option value="">Pilih Coach</option>
              {coaches.map(coach => (
                <option key={coach.id} value={coach.name}>{coach.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700">Kapasitas Slot</label>
            <input type="number" name="slots" value={form.slots || ""} onChange={handleChange} required className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm" />
          </div>

          {/* Tipe, Level */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700">Tipe Kelas</label>
            <select name="type" value={form.type} onChange={handleChange} className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm">
              <option value="regular">Reguler</option>
              <option value="special">Special Class</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700">Level</label>
            <select name="level" value={form.level} onChange={handleChange} className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm">
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          {/* Deskripsi */}
          <div className="md:col-span-2">
            <label className="block font-semibold mb-1 text-gray-700">Deskripsi</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm" />
          </div>

          {/* Durasi, Kalori */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700">Durasi (menit)</label>
            <input type="number" name="duration" value={form.duration} onChange={handleChange} className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm" />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-700">Kalori Burn</label>
            <input type="number" name="calorieBurn" value={form.calorieBurn} onChange={handleChange} className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm" />
          </div>

          {/* Upload Gambar */}
          <div className="md:col-span-2">
            <label className="block font-semibold mb-1 text-gray-700">Upload Gambar</label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full"
            />
            {imageError && <div className="text-red-600 text-xs mt-1">{imageError}</div>}
            {imagePreview && (
              <div className="mt-2">
                <Image src={imagePreview} alt="Preview" width={350} height={130} className="rounded-lg object-cover" />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">* Gambar harus landscape/lebar, max ukuran file sesuai storage.</p>
          </div>

          <div className="md:col-span-2">
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg shadow hover:bg-blue-700 transition flex justify-center items-center gap-2">
              {loading ? (
                <>
                  <CheckCircle className="animate-spin w-5 h-5" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" /> Simpan Kelas
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </main>
  );
}

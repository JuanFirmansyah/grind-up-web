// src/app/admin/gallery/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Trash2, EyeOff, Eye, Upload, Image as ImageIcon, X } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";

interface GalleryItem {
  id: string;
  imageUrl: string;
  caption: string;
  type: "class" | "event" | "promo" | "hero";
  isActive: boolean;
  createdAt: Timestamp;
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [form, setForm] = useState({
    caption: "",
    type: "class" as GalleryItem["type"],
    imageFile: null as File | null,
  });
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | GalleryItem["type"]>("all");

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

  const brandColor = "#97CCDD";
  // const brandBg = `bg-[${brandColor}]`;
  // const brandHover = `hover:bg-[#86bccc]`;
  // const brandText = `text-[${brandColor}]`;
  const brandRing = `focus:ring-[${brandColor}] focus:border-[${brandColor}]`;

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "gallery"));
      const data: GalleryItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (docSnap.id) {
          data.push({
            id: docSnap.id,
            ...d,
            caption: d.caption || "",
            type: d.type || "class",
            isActive: d.isActive !== undefined ? d.isActive : true,
            createdAt: d.createdAt || Timestamp.now(),
            imageUrl: d.imageUrl || ""
          } as GalleryItem);
        }
      });
      setItems(data);
    } catch (error) {
      console.error("Error fetching gallery:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new window.Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width <= img.height) {
        alert("Gambar harus horizontal (landscape)");
        return;
      }
      setForm((prev) => ({ ...prev, imageFile: file }));
      setPreviewUrl(img.src);
    };
  };

  const handleUpload = async () => {
    if (!form.imageFile) {
      alert("Pilih gambar terlebih dahulu");
      return;
    }
    setUploading(true);
    try {
      const path = `gallery/${Date.now()}-${form.imageFile.name}`;
      const imgRef = ref(storage, path);
      await uploadBytes(imgRef, form.imageFile);
      const url = await getDownloadURL(imgRef);

      await addDoc(collection(db, "gallery"), {
        imageUrl: url,
        caption: form.caption || "Untitled",
        type: form.type,
        isActive: true,
        createdAt: Timestamp.now(),
      });

      setForm({ caption: "", type: "class", imageFile: null });
      setPreviewUrl(null);
      await fetchGallery();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Gagal mengunggah gambar");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!confirm("Yakin ingin menghapus gambar ini?")) return;
    try {
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(console.error);
      }
      await deleteDoc(doc(db, "gallery", id));
      await fetchGallery();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Gagal menghapus gambar");
    }
  };

  const toggleVisibility = async (id: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, "gallery", id), { isActive: !isActive });
      await fetchGallery();
    } catch (error) {
      console.error("Toggle visibility error:", error);
    }
  };

  const filteredItems = filterType === "all" ? items : items.filter((i) => i.type === filterType);

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <AdminMobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} navItems={navItems} />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar navItems={navItems} />

      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Galeri</h1>
            <div className="flex gap-2 flex-wrap">
              {(["all", "class", "event", "promo", "hero"] as const).map((type) => (
                <button
                  key={`filter-${type}`}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium transition-all duration-200 ${
                    filterType === type
                      ? "bg-[#97CCDD] text-white shadow-md"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {type === "all" ? "Semua" : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#97CCDD]" />
              Unggah Gambar Baru
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border border-gray-300 ${brandRing} transition`}
                    value={form.caption}
                    onChange={(e) => setForm((prev) => ({ ...prev, caption: e.target.value }))}
                    placeholder="Deskripsi gambar"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Gambar</label>
                  <select
                    className={`w-full px-4 py-2 rounded-lg border border-gray-300 ${brandRing} transition`}
                    value={form.type}
                    onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as GalleryItem["type"] }))}
                  >
                    <option value="class">Kelas</option>
                    <option value="event">Event</option>
                    <option value="promo">Promo</option>
                    <option value="hero">Hero</option>
                  </select>
                </div>
              </div>

              {/* Upload Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Gambar (Landscape)</label>
                {previewUrl ? (
                  <div className="relative group">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width={600}
                      height={400}
                      className="rounded-lg w-full h-48 object-cover border border-gray-200"
                    />
                    <button
                      onClick={() => {
                        setPreviewUrl(null);
                        setForm(prev => ({ ...prev, imageFile: null }));
                      }}
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md transition"
                    >
                      <X className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Klik untuk upload</span> atau drag & drop
                      </p>
                      <p className="text-xs text-gray-500">Format landscape (lebar {'>'} tinggi)</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleUpload}
                disabled={uploading || !form.imageFile}
                className={`px-6 py-2.5 rounded-lg flex items-center gap-2 transition ${
                  uploading || !form.imageFile
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-[#97CCDD] hover:bg-[#86bccc] text-white shadow-md"
                }`}
              >
                {uploading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 
                         1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload ke Galeri
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Gallery Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={`skeleton-${idx}`} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <motion.div
                    key={`gallery-item-${item.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="relative group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={item.imageUrl || "/placeholder-image.jpg"}
                        alt={item.caption || "Gallery image"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder-image.jpg";
                        }}
                      />
                      <div
                        className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${
                          !item.isActive ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <EyeOff className="text-white w-8 h-8" />
                      </div>
                    </div>

                    <div className="p-4">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.caption || "Untitled"}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-[#97CCDD] text-white capitalize">
                          {item.type || "class"}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleVisibility(item.id, item.isActive)}
                            className={`p-1.5 rounded-full ${
                              item.isActive ? "bg-yellow-400 hover:bg-yellow-500" : "bg-gray-300 hover:bg-gray-400"
                            } text-white transition`}
                            title={item.isActive ? "Sembunyikan" : "Tampilkan"}
                          >
                            {item.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.imageUrl)}
                            className="p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredItems.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center py-12">
                  <div className="mx-auto max-w-md">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada gambar</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {filterType === "all"
                        ? "Belum ada gambar di galeri"
                        : `Tidak ada gambar dengan tipe ${filterType}`}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

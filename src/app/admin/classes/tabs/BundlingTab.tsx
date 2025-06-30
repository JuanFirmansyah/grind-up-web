// src\app\admin\classes\tabs\BundlingTab.tsx

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface BundlingPackage {
  id: string;
  packageName: string;
  description: string;
  price: string;
  includedClasses: string;
  imagePath?: string;
}

export default function BundlingTab() {
  const [loading, setLoading] = useState(true);
  const [bundlingPackages, setBundlingPackages] = useState<BundlingPackage[]>([]);
  const router = useRouter();

  const fetchBundlingPackages = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, "bundling_packages"));
    const data: BundlingPackage[] = [];
    querySnapshot.forEach((docSnap) => {
      data.push({ id: docSnap.id, ...docSnap.data() } as BundlingPackage);
    });
    setBundlingPackages(data);
    setLoading(false);
  };

  const handleDelete = async (id: string, imagePath?: string) => {
    if (!confirm("Yakin ingin menghapus paket bundling ini?")) return;
    setLoading(true);
    try {
      if (imagePath) {
        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef);
      }
      await deleteDoc(doc(db, "bundling_packages", id));
      await fetchBundlingPackages();
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus paket bundling.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBundlingPackages();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading
        ? Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-6 bg-gray-200 animate-pulse h-48 shadow-inner"
            ></div>
          ))
        : bundlingPackages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-2xl p-6 bg-white border border-gray-200 shadow-md hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-100 rounded-full blur-xl opacity-20"></div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1 group-hover:text-indigo-700 transition">
                {pkg.packageName}
              </h2>
              <p className="text-sm text-gray-600 mb-1">Harga: <span className="font-medium text-gray-800">Rp{pkg.price}</span></p>
              <p className="text-sm text-gray-600 mb-1">Kelas: {pkg.includedClasses}</p>
              <p className="text-sm text-gray-500 italic line-clamp-3">{pkg.description}</p>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => router.push(`/admin/classes/bundling-form?id=${pkg.id}`)}
                  className="p-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-full hover:scale-110 transition"
                  aria-label="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(pkg.id, pkg.imagePath)}
                  className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full hover:scale-110 transition"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
    </div>
  );
}

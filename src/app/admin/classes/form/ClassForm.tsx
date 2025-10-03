// src/app/admin/classes/form/ClassForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Calendar, Clock, UserRound,
  Type as TypeIcon, Signal, FileText, Timer, Flame, ImagePlus,
  ArrowLeft, Save, CheckCircle2, XCircle, AlertCircle,
  Package, Info, X, Tag, DollarSign, Clock4, Building,
  Users, Zap, Activity
} from "lucide-react";

import { signOut } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import {
  collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, type CollectionReference
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { AdminTopbar } from "@/components/AdminTopbar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";

/* ====================== Types ====================== */
type Coach = { id: string; name: string; email: string };

type ClassAccessRule = {
  tag: string;
  sessionsPerCycle: number | null;
};

type PackageLite = { 
  id: string; 
  name: string;
  description?: string;
  duration?: string;
  facilities?: string[];
  price?: number;
  classAccessRules?: ClassAccessRule[];
};

type FormState = {
  className: string;
  customClassName: string;
  date: string;
  time: string;
  coach: string;
  slots: string;
  description: string;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  calorieBurn: string;
  imageUrl: string;
  allowedPackageIds: string[];
  allowedPackages: PackageLite[];
  allowDropIn: boolean;
  dropInPrice: string;
};

type ClassDoc = {
  className: string;
  date: string;
  time: string;
  coach: string;
  slots: number;
  description: string;
  duration: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  calorieBurn: number | null;
  imageUrl: string;
  allowedPackageIds: string[];
  allowedPackageNames: string[];
  allowDropIn?: boolean;
  dropInPrice?: number | null;
  bookedCount?: number;
};

const CLASS_NAMES = ["Yoga", "Zumba", "Aerobik", "Pilates", "Poundfit", "Functional", "Lainnya"] as const;

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Absensi", href: "/admin/attendance" },
  { label: "Kelas", href: "/admin/classes" },
  { label: "Paket Membership", href: "/admin/packages" },
  { label: "Member", href: "/admin/members" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
  { label: "Galeri", href: "/admin/gallery" },
  { label: "Pengaturan", href: "/admin/settings" }
];

const BRAND = {
  primary: "#97CCDD",
  bg: "bg-gradient-to-b from-white to-slate-50",
  card: "rounded-2xl shadow-lg bg-white",
  ring: "focus:ring-2 focus:ring-[#97CCDD] focus:outline-none"
};

/* ====================== DROPDOWN OPTIONS ====================== */
// Kapasitas Slot - berdasarkan ukuran studio
const SLOT_OPTIONS = [
  { value: "10", label: "Kecil (10 orang)", description: "Studio kecil, intimate session" },
  { value: "15", label: "Standar (15 orang)", description: "Studio standar, nyaman" },
  { value: "20", label: "Medium (20 orang)", description: "Studio medium, cukup luas" },
  { value: "25", label: "Besar (25 orang)", description: "Studio besar, grup aktif" },
  { value: "30", label: "XL (30 orang)", description: "Studio extra large, kapasitas maksimal" }
];

// Durasi Kelas - berdasarkan jenis kelas umum
const DURATION_OPTIONS = [
  { value: "30", label: "30 menit", description: "Express class - Cepat & intensif" },
  { value: "45", label: "45 menit", description: "Short session - Efisien & efektif" },
  { value: "60", label: "60 menit", description: "Standard class - Durasi ideal" },
  { value: "75", label: "75 menit", description: "Extended class - Lebih mendalam" },
  { value: "90", label: "90 menit", description: "Long session - Komprehensif" },
  { value: "120", label: "120 menit", description: "Workshop - Masterclass lengkap" }
];

// Kalori Burn - berdasarkan intensitas
const CALORIE_OPTIONS = [
  { value: "150", label: "150 cal", description: "Low intensity - Pemula, recovery" },
  { value: "250", label: "250 cal", description: "Light moderate - Sehat & seimbang" },
  { value: "350", label: "350 cal", description: "Moderate - Pembakaran optimal" },
  { value: "450", label: "450 cal", description: "High moderate - Intensif & efektif" },
  { value: "550", label: "550 cal", description: "High intensity - Challenge & burn" },
  { value: "650", label: "650 cal", description: "Very high - Extreme workout" },
  { value: "800", label: "800 cal", description: "Ultimate - Maximum burn" }
];

// Harga Drop-In
const DROPIN_PRICE_OPTIONS = [
  { value: "50000", label: "Rp 50.000", description: "Harga ekonomis" },
  { value: "75000", label: "Rp 75.000", description: "Harga standar" },
  { value: "100000", label: "Rp 100.000", description: "Harga premium" },
  { value: "125000", label: "Rp 125.000", description: "Harga special class" },
  { value: "150000", label: "Rp 150.000", description: "Harga master class" },
  { value: "200000", label: "Rp 200.000", description: "Harga exclusive" }
];

/* Helpers */
const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));

// Format currency helper
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Custom Dropdown Component yang kreatif
function CreativeDropdown({ 
  value, 
  options, 
  onChange, 
  icon: Icon,
  placeholder,
  className 
}: {
  value: string;
  options: Array<{ value: string; label: string; description?: string }>;
  onChange: (value: string) => void;
  icon: React.ElementType;
  placeholder: string;
  required?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border border-gray-300 px-4 py-3 rounded-lg shadow-sm hover:border-[#97CCDD] transition-all duration-200 bg-white ${className} ${
          isOpen ? 'ring-2 ring-[#97CCDD] border-[#97CCDD]' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-slate-600 flex-shrink-0" />
          <div className="text-left">
            <div className="font-medium text-gray-900">
              {selectedOption ? selectedOption.label : placeholder}
            </div>
            {selectedOption?.description && (
              <div className="text-xs text-gray-500 mt-0.5">{selectedOption.description}</div>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left p-4 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                value === option.value ? 'bg-blue-50 border-l-4 border-l-[#97CCDD]' : ''
              }`}
            >
              <div className="font-medium text-gray-900">{option.label}</div>
              {option.description && (
                <div className="text-sm text-gray-600 mt-1">{option.description}</div>
              )}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// Component untuk Package Detail Modal
function PackageDetailModal({ 
  package: pkg, 
  isOpen, 
  onClose 
}: { 
  package: PackageLite; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Detail Paket</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{pkg.name}</h4>
            {pkg.description && (
              <p className="text-gray-600 text-sm mb-3">{pkg.description}</p>
            )}
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              {pkg.price && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{formatCurrency(pkg.price)}</span>
                </div>
              )}
              
              {pkg.duration && (
                <div className="flex items-center gap-2">
                  <Clock4 className="h-4 w-4 text-blue-600" />
                  <span>{pkg.duration}</span>
                </div>
              )}
            </div>
          </div>

          {pkg.facilities && pkg.facilities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-900">Fasilitas</span>
              </div>
              <div className="space-y-1">
                {pkg.facilities.map((facility, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    {facility}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pkg.classAccessRules && pkg.classAccessRules.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-900">Akses Kelas</span>
              </div>
              <div className="space-y-2">
                {pkg.classAccessRules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ 
                        backgroundColor: 
                          rule.tag === 'functional' ? '#10B981' : 
                          rule.tag === 'regular' ? '#3B82F6' : 
                          rule.tag === 'special' ? '#F59E0B' : '#6B7280'
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {rule.tag}
                        </span>
                        {rule.sessionsPerCycle && (
                          <span className="text-xs bg-white px-2 py-1 rounded border">
                            {rule.sessionsPerCycle} sesi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!pkg.classAccessRules || pkg.classAccessRules.length === 0) && (
            <div className="text-center py-4 text-gray-500">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Tidak ada akses kelas khusus</p>
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#97CCDD] text-gray-900 rounded-lg hover:opacity-90 transition-opacity"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// Component untuk Package Card
function PackageCard({ 
  pkg, 
  isSelected, 
  onToggle, 
  onShowDetail 
}: { 
  pkg: PackageLite; 
  isSelected: boolean; 
  onToggle: (selected: boolean) => void;
  onShowDetail: () => void;
}) {
  return (
    <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
      isSelected 
        ? 'border-[#97CCDD] bg-blue-50' 
        : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
    }`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 accent-green-600 flex-shrink-0"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0">
            <span className="font-medium text-gray-900 block truncate">{pkg.name}</span>
            {pkg.price && (
              <span className="text-sm text-green-600 font-medium block">
                {formatCurrency(pkg.price)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShowDetail();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
            title="Lihat detail paket"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        {pkg.classAccessRules && pkg.classAccessRules.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pkg.classAccessRules.slice(0, 3).map((rule, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border font-medium"
                style={{ 
                  backgroundColor: 
                    rule.tag === 'functional' ? '#10B98120' : 
                    rule.tag === 'regular' ? '#3B82F620' : 
                    rule.tag === 'special' ? '#F59E0B20' : '#6B728020',
                  borderColor: 
                    rule.tag === 'functional' ? '#10B98140' : 
                    rule.tag === 'regular' ? '#3B82F640' : 
                    rule.tag === 'special' ? '#F59E0B40' : '#6B728040',
                  color: 
                    rule.tag === 'functional' ? '#065F46' : 
                    rule.tag === 'regular' ? '#1E40AF' : 
                    rule.tag === 'special' ? '#92400E' : '#374151'
                }}
              >
                {rule.tag === 'functional' && '💪'}
                {rule.tag === 'regular' && '🔄'}
                {rule.tag === 'special' && '⭐'}
                {rule.tag}
              </span>
            ))}
            {pkg.classAccessRules.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">
                +{pkg.classAccessRules.length - 3} more
              </span>
            )}
          </div>
        )}

        {pkg.duration && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <Clock4 className="h-3 w-3" />
            <span>{pkg.duration}</span>
          </div>
        )}
      </div>
    </label>
  );
}

/* ====================== Component ====================== */
export default function ClassForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("id");

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [packages, setPackages] = useState<PackageLite[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(classId));
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageLite | null>(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    className: "",
    customClassName: "",
    date: "",
    time: "",
    coach: "",
    slots: "",
    description: "",
    duration: "",
    level: "Beginner",
    calorieBurn: "",
    imageUrl: "",
    allowedPackageIds: [],
    allowedPackages: [],
    allowDropIn: false,
    dropInPrice: "",
  });

  const headerTitle = useMemo(() => (classId ? "Edit Kelas" : "Tambah Kelas"), [classId]);

  const classesCol = useMemo(
    () => collection(db, "classes") as CollectionReference<ClassDoc>,
    []
  );

  /* ====================== Effects ====================== */
  useEffect(() => {
    // coach list
    (async () => {
      const q = query(collection(db, "users"), where("role", "==", "coach"));
      const snapshot = await getDocs(q);
      const data: Coach[] = snapshot.docs.map((d) => {
        const v = d.data();
        return {
          id: d.id,
          name: (v.name as string) || (v.fullName as string) || "No Name",
          email: (v.email as string) || ""
        };
      });
      setCoaches(data);
    })();

    // packages list
    (async () => {
      const ps = await getDocs(collection(db, "membership_packages"));
      const arr: PackageLite[] = ps.docs.map((d) => {
        const data = d.data();
        return { 
          id: d.id, 
          name: (data.name as string) || "-",
          description: data.description as string,
          duration: data.duration as string,
          facilities: data.facilities as string[],
          price: data.price as number,
          classAccessRules: data.classAccessRules as ClassAccessRule[] || []
        };
      });
      setPackages(arr);
    })();
  }, []);

  // Prefill data untuk edit
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    (async () => {
      if (!classId) {
        setInitialLoading(false);
        setNotice({ kind: "info", text: "Jam default menitnya 00. Pilih jam saja ya." });
        return;
      }
      if (prefilled) return;

      try {
        const docRef = doc(classesCol, classId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as ClassDoc;
          
          const selectedPackages = packages.filter(pkg => 
            data.allowedPackageIds?.includes(pkg.id)
          );

          setForm({
            className: data.className || "",
            customClassName: "",
            date: data.date || "",
            time: data.time || "",
            coach: data.coach || "",
            slots: String(data.slots ?? ""),
            description: data.description || "",
            duration: String(data.duration ?? ""),
            level: data.level || "Beginner",
            calorieBurn: data.calorieBurn != null ? String(data.calorieBurn) : "",
            imageUrl: data.imageUrl || "",
            allowedPackageIds: data.allowedPackageIds ?? [],
            allowedPackages: selectedPackages,
            allowDropIn: Boolean(data.allowDropIn),
            dropInPrice: data.dropInPrice != null ? String(data.dropInPrice) : "",
          });
          setImagePreview(data.imageUrl || null);

          const mm = (data.time?.split(":")[1] ?? "00");
          if (mm !== "00") {
            setNotice({ kind: "info", text: `Data lama punya menit ${mm}. Saat mengubah jam, menit akan dibuat 00.` });
          }
          setPrefilled(true);
        }
      } catch {
        setNotice({ kind: "error", text: "Gagal memuat data kelas." });
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [classId, classesCol, prefilled, packages]);

  /* ====================== Handlers ====================== */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClassNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      className: value,
      customClassName: value === "Lainnya" ? prev.customClassName : ""
    }));
  };

  const handlePackageSelection = (packageId: string, isSelected: boolean) => {
    setForm((prev) => {
      let newPackageIds: string[];
      let newPackages: PackageLite[];

      if (isSelected) {
        const selectedPackage = packages.find(p => p.id === packageId);
        newPackageIds = [...prev.allowedPackageIds, packageId];
        newPackages = selectedPackage 
          ? [...prev.allowedPackages, selectedPackage]
          : prev.allowedPackages;
      } else {
        newPackageIds = prev.allowedPackageIds.filter(id => id !== packageId);
        newPackages = prev.allowedPackages.filter(p => p.id !== packageId);
      }

      return {
        ...prev,
        allowedPackageIds: newPackageIds,
        allowedPackages: newPackages
      };
    });
  };

  const handleSelectAllPackages = () => {
    setForm((prev) => ({
      ...prev,
      allowedPackageIds: packages.map(p => p.id),
      allowedPackages: [...packages]
    }));
  };

  const handleClearAllPackages = () => {
    setForm((prev) => ({
      ...prev,
      allowedPackageIds: [],
      allowedPackages: []
    }));
  };

  const handleShowDetail = (pkg: PackageLite) => {
    setSelectedPackage(pkg);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedPackage(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      if (img.width <= img.height) {
        setImageError("Gambar harus landscape (width > height).");
        setImageFile(null);
        setImagePreview(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
        URL.revokeObjectURL(url);
        return;
      }
      setImageFile(file);
      setImagePreview(url);
    };
  };

  const toInt = (v: string) => parseInt(v || "0", 10);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);

    const realClassName = form.className === "Lainnya" ? form.customClassName.trim() : form.className;
    const slotsNum = toInt(form.slots);
    const durationNum = toInt(form.duration);
    const calorieNum = toInt(form.calorieBurn);

    if (!realClassName) return fail("Nama kelas wajib diisi.");
    if (!form.date) return fail("Tanggal wajib diisi.");
    if (!form.time) return fail("Jam wajib dipilih.");
    if (!form.coach) return fail("Coach wajib dipilih.");
    if (!Number.isFinite(slotsNum) || slotsNum < 1) return fail("Kapasitas harus angka >= 1.");
    if (!form.description.trim()) return fail("Deskripsi wajib diisi.");
    if (!Number.isFinite(durationNum) || durationNum < 1) return fail("Durasi harus angka >= 1.");
    if (!Number.isFinite(calorieNum) || calorieNum < 0) return fail("Kalori burn wajib angka (>= 0).");

    if (form.allowedPackageIds.length === 0) {
      return fail("Pilih minimal 1 paket member yang diizinkan.");
    }

    if (form.allowDropIn) {
      const price = Number(form.dropInPrice || 0);
      if (!Number.isFinite(price) || price <= 0) {
        return fail("Harga drop-in wajib diisi dan harus > 0.");
      }
    }

    if (!imageFile && !form.imageUrl) {
      return fail("Gambar kelas wajib diunggah (landscape).");
    }

    let uploadedImageUrl = form.imageUrl;
    if (imageFile) {
      try {
        const imagePath = `class-images/${Date.now()}_${imageFile.name}`;
        const storageRef = ref(storage, imagePath);
        await uploadBytes(storageRef, imageFile);
        uploadedImageUrl = await getDownloadURL(storageRef);
      } catch {
        return fail("Gagal mengunggah gambar.");
      }
    }

    const allowedPackageNames = form.allowedPackages.map(p => p.name);

    const payload: ClassDoc = {
      className: realClassName,
      date: form.date,
      time: form.time,
      coach: form.coach,
      slots: slotsNum,
      description: form.description,
      duration: durationNum,
      level: form.level,
      calorieBurn: calorieNum,
      imageUrl: uploadedImageUrl,
      allowedPackageIds: form.allowedPackageIds,
      allowedPackageNames: allowedPackageNames,
      allowDropIn: form.allowDropIn,
      dropInPrice: form.allowDropIn ? Number(form.dropInPrice) : null,
      bookedCount: classId ? undefined : 0,
    };

    try {
      if (classId) {
        await updateDoc(doc(classesCol, classId), payload);
      } else {
        await addDoc(classesCol, payload);
      }
      setNotice({ kind: "success", text: "Kelas berhasil disimpan." });
      setTimeout(() => router.push("/admin/classes"), 600);
    } catch {
      setNotice({ kind: "error", text: "Gagal menyimpan kelas. Coba lagi." });
    } finally {
      setLoading(false);
    }
  };

  function fail(msg: string) {
    setNotice({ kind: "error", text: msg });
    setLoading(false);
    return;
  }

  const inputBase =
    "w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm placeholder-gray-400 " +
    BRAND.ring;
  const labelBase = "block font-semibold mb-1 text-gray-700 flex items-center gap-2";

  function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode; }) {
    return (
      <div>
        <label className={labelBase}>{icon}<span>{label}</span></label>
        {children}
      </div>
    );
  }

  const hourVal = (form.time?.split(":")[0] ?? "");
  const minuteVal = (form.time?.split(":")[1] ?? "00");
  const setHour = (h: string) => {
    if (!h) {
      setForm((p) => ({ ...p, time: "" }));
    } else {
      setForm((p) => ({ ...p, time: `${h}:00` }));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className={`min-h-screen ${BRAND.bg}`}>
      <AdminTopbar onOpen={openMobile} showLogout onLogout={handleLogout} />
      <AdminMobileDrawer isOpen={mobileOpen} navItems={NAV_ITEMS} onClose={closeMobile} />
      <div className="flex">
        <AdminSidebar navItems={NAV_ITEMS} showLogout onLogout={handleLogout} />

        <main className="flex-1 p-4 sm:p-6 md:p-10">
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-black transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{headerTitle}</h1>
          </div>

          {notice && (
            <div
              role="status"
              className={`mb-4 flex items-start gap-3 rounded-xl p-3 ${
                notice.kind === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : notice.kind === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-sky-50 text-sky-700 border border-sky-200"
              }`}
            >
              {notice.kind === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5" />
              ) : notice.kind === "error" ? (
                <XCircle className="mt-0.5 h-5 w-5" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5" />
              )}
              <div className="flex-1 text-sm">{notice.text}</div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="ml-2 text-xs underline decoration-dotted"
                aria-label="Tutup notifikasi"
              >
                Tutup
              </button>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`max-w-4xl mx-auto ${BRAND.card} p-5 sm:p-8`}
          >
            {initialLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-40 rounded bg-slate-200" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="h-10 rounded bg-slate-200" />
                  <div className="h-10 rounded bg-slate-200" />
                  <div className="h-10 rounded bg-slate-200" />
                  <div className="h-10 rounded bg-slate-200" />
                  <div className="h-24 rounded bg-slate-200 md:col-span-2" />
                  <div className="h-28 rounded bg-slate-200 md:col-span-2" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nama/Jenis Kelas */}
                <div className="md:col-span-2">
                  <label className={labelBase}><TypeIcon className="h-5 w-5 text-slate-600" /><span>Nama/Jenis Kelas</span></label>
                  <select
                    name="className"
                    value={form.className}
                    onChange={handleClassNameChange}
                    required
                    className={inputBase}
                    aria-label="Pilih kelas"
                  >
                    <option value="">Pilih Kelas</option>
                    {CLASS_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  {form.className === "Lainnya" && (
                    <input
                      type="text"
                      name="customClassName"
                      placeholder="Nama kelas custom…"
                      value={form.customClassName}
                      onChange={(e) => setForm((prev) => ({ ...prev, customClassName: e.target.value }))}
                      className={`${inputBase} mt-2`}
                      required
                      aria-label="Nama kelas custom"
                    />
                  )}
                </div>

                {/* Tanggal, Jam */}
                <Field icon={<Calendar className="h-5 w-5 text-slate-600" />} label="Tanggal">
                  <input type="date" name="date" value={form.date} onChange={handleChange} required className={inputBase} />
                </Field>

                <Field icon={<Clock className="h-5 w-5 text-slate-600" />} label="Jam (menit terkunci 00)">
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Pilih jam (00-23)"
                      value={hourVal}
                      onChange={(e) => setHour(e.target.value)}
                      className={`${inputBase} w-32`}
                      required
                    >
                      <option value="">-- Jam --</option>
                      {hours.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="font-semibold">:</span>
                    <input
                      value={minuteVal || "00"}
                      readOnly
                      className={`${inputBase} w-24 bg-gray-50 cursor-not-allowed`}
                      aria-label="Menit terkunci 00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Saat mengganti jam, menit otomatis menjadi 00.</p>
                </Field>

                {/* Coach, Slot */}
                <Field icon={<UserRound className="h-5 w-5 text-slate-600" />} label="Coach">
                  <select name="coach" value={form.coach} onChange={handleChange} required className={inputBase} aria-label="Pilih coach">
                    <option value="">Pilih Coach</option>
                    {coaches.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </Field>

                {/* Kapasitas Slot - DROPDOWN BARU */}
                <Field icon={<Users className="h-5 w-5 text-slate-600" />} label="Kapasitas Slot">
                  <CreativeDropdown
                    value={form.slots}
                    options={SLOT_OPTIONS}
                    onChange={(value) => setForm(prev => ({ ...prev, slots: value }))}
                    icon={Users}
                    placeholder="Pilih kapasitas kelas..."
                    required
                  />
                </Field>

                {/* Level, Deskripsi */}
                <Field icon={<Signal className="h-5 w-5 text-slate-600" />} label="Level">
                  <select name="level" value={form.level} onChange={handleChange} className={inputBase} aria-label="Pilih level" required>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <label className={labelBase}><FileText className="h-5 w-5 text-slate-600" /><span>Deskripsi</span></label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={inputBase} placeholder="Deskripsi singkat kelas…" required />
                </div>

                {/* Durasi - DROPDOWN BARU */}
                <Field icon={<Timer className="h-5 w-5 text-slate-600" />} label="Durasi Kelas">
                  <CreativeDropdown
                    value={form.duration}
                    options={DURATION_OPTIONS}
                    onChange={(value) => setForm(prev => ({ ...prev, duration: value }))}
                    icon={Clock}
                    placeholder="Pilih durasi kelas..."
                    required
                  />
                </Field>

                {/* Kalori Burn - DROPDOWN BARU */}
                <Field icon={<Flame className="h-5 w-5 text-slate-600" />} label="Estimasi Kalori Burn">
                  <CreativeDropdown
                    value={form.calorieBurn}
                    options={CALORIE_OPTIONS}
                    onChange={(value) => setForm(prev => ({ ...prev, calorieBurn: value }))}
                    icon={Activity}
                    placeholder="Pilih estimasi kalori..."
                    required
                  />
                </Field>

                {/* Paket Member yang Diizinkan */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelBase}>
                      <Package className="h-5 w-5 text-slate-600" />
                      <span>Paket Member yang Diizinkan</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllPackages}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllPackages}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  </div>
                  
                  <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {packages.length === 0 ? (
                      <p className="text-gray-500 text-sm">Tidak ada paket member tersedia.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {packages.map((pkg) => (
                          <PackageCard
                            key={pkg.id}
                            pkg={pkg}
                            isSelected={form.allowedPackageIds.includes(pkg.id)}
                            onToggle={(selected) => handlePackageSelection(pkg.id, selected)}
                            onShowDetail={() => handleShowDetail(pkg)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {form.allowedPackageIds.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-800 mb-2">
                        Paket terpilih ({form.allowedPackageIds.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {form.allowedPackages.map((pkg) => (
                          <span 
                            key={pkg.id} 
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
                          >
                            {pkg.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    * Klik ikon <Info className="h-3 w-3 inline" /> untuk melihat detail akses kelas setiap paket.
                    Wajib pilih minimal 1 paket member.
                  </p>
                </div>

                {/* Drop-In (Visit) */}
                <div className="md:col-span-2">
                  <label className={labelBase}><Zap className="h-5 w-5 text-slate-600" /><span>Drop-In (Bayar per Kelas)</span></label>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={form.allowDropIn} 
                        onChange={(e) => setForm((p) => ({ ...p, allowDropIn: e.target.checked }))} 
                      />
                      <span className="font-medium">Izinkan Drop-In</span>
                    </label>
                  </div>
                  
                  {form.allowDropIn && (
                    <div className="pl-6 border-l-2 border-[#97CCDD]">
                      <label className="block font-medium mb-2 text-gray-700">Harga Drop-In</label>
                      <CreativeDropdown
                        value={form.dropInPrice}
                        options={DROPIN_PRICE_OPTIONS}
                        onChange={(value) => setForm(prev => ({ ...prev, dropInPrice: value }))}
                        icon={DollarSign}
                        placeholder="Pilih harga drop-in..."
                        required
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    * Member dengan paket yang diizinkan TIDAK perlu bayar drop-in. Drop-in hanya untuk member tanpa paket yang sesuai.
                  </p>
                </div>

                {/* Upload Gambar */}
                <div className="md:col-span-2">
                  <label className={labelBase}><ImagePlus className="h-5 w-5 text-slate-600" /><span>Upload Gambar (wajib landscape)</span></label>
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm" aria-label="Unggah gambar kelas" />
                  {imageError && <div className="text-red-600 text-xs mt-1">{imageError}</div>}
                  {(imagePreview || form.imageUrl) && (
                    <div className="mt-3">
                      <Image
                        src={imagePreview || form.imageUrl}
                        alt="Preview"
                        width={700}
                        height={260}
                        className="rounded-xl object-cover ring-1 ring-slate-200"
                        unoptimized
                        priority
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">* Gambar wajib ada dan harus landscape (width &gt; height).</p>
                </div>

                {/* Actions */}
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center gap-2 bg-[#97CCDD] text-slate-900 font-semibold py-3 rounded-xl shadow hover:opacity-90 transition disabled:opacity-60"
                    aria-busy={loading}
                  >
                    {loading ? (<><Save className="h-5 w-5 animate-spin" />Menyimpan…</>) : (<><CheckCircle2 className="h-5 w-5" />Simpan Kelas</>)}
                  </button>
                </div>
              </form>
            )}
          </motion.div>

          {/* Package Detail Modal */}
          {selectedPackage && (
            <PackageDetailModal
              package={selectedPackage}
              isOpen={detailModalOpen}
              onClose={handleCloseDetail}
            />
          )}
        </main>
      </div>
    </div>
  );
}
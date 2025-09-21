// src/app/admin/members/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  Timestamp,
  query,
  orderBy,
  type DocumentData,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminMobileDrawer } from "@/components/AdminMobileDrawer";
import { AdminTopbar } from "@/components/AdminTopbar";
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  X,
  QrCode,
  DollarSign,
  // Eye,
  UploadCloud,
  SortAsc,
  TimerReset,
  FileText,
  Download,
  Info,
  Calculator,
  Phone,
  IdCard,
  MoonStar,
  Sun,
  Tag,
  Calendar, // Icon baru untuk edit expiry
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";


const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

/* ================== Color Palette ================== */
const colors = {
  base: "#97CCDD",
  light: "#C1E3ED",
  dark: "#6FB5CC",
  darker: "#4A9EBB",
  complementary: "#DDC497",
  accent: "#DD97CC",
  text: "#2D3748",
  textLight: "#F8FAFC",
};

/* ================== Reusable Modal ================== */
function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  widthClass = "max-w-md",
}: {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal
        >
          <motion.div
            className={`relative bg-white rounded-2xl shadow-2xl w-full ${widthClass} flex flex-col max-h-[92vh]`}
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 px-5 py-3 border-b bg-white/95 backdrop-blur rounded-t-2xl flex items-center justify-between">
              <div className="font-bold text-lg">{title}</div>
              <button onClick={onClose} aria-label="Tutup" className="text-gray-500 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto">{children}</div>

            {footer && <div className="sticky bottom-0 px-5 py-3 border-t bg-white/95 backdrop-blur rounded-b-2xl">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============ Date helpers (tanpa any) ============ */
type DateLike =
  | Timestamp
  | { seconds: number; nanoseconds?: number }
  | string
  | number
  | Date
  | null
  | undefined;

function isTimestampLike(v: unknown): v is { seconds: number; nanoseconds?: number } {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.seconds === "number";
}
function hasToDate(v: unknown): v is { toDate: () => Date } {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.toDate === "function";
}
function toJSDate(v: DateLike): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (v instanceof Timestamp) return v.toDate();
  if (isTimestampLike(v)) {
    const ms = v.seconds * 1000 + ((v.nanoseconds ?? 0) / 1e6);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (hasToDate(v)) {
    const d = (v as { toDate: () => Date }).toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  return null;
}
function formatDate(v: DateLike, fmtStr = "dd MMM yyyy"): string {
  const d = toJSDate(v);
  try {
    return d ? format(d, fmtStr) : "-";
  } catch {
    return "-";
  }
}

/* ================== Types ================== */
interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "aktif" | "non-aktif";
  activityScore?: number;
  createdAt?: DateLike;
  lastLogin?: DateLike;
  lastCheckin?: DateLike;
  deleted?: boolean;
  photoURL?: string | null;
  qrData?: string | null;
  expiresAt?: DateLike;
  memberType?: string; // id paket
  gender?: string;
  address?: string;
  memberCode?: string | null; // <-- NEW
}

interface UserRaw {
  name: string;
  email: string;
  phone: string;
  status: "aktif" | "non-aktif";
  activityScore?: number;
  createdAt?: DateLike;
  lastLogin?: DateLike;
  deleted?: boolean;
  photoURL?: string | null;
  qrData?: string | null;
  expiresAt?: DateLike;
  expiredAt?: DateLike; // fallback lama
  memberType?: string;
  gender?: string;
  address?: string;
  memberCode?: string | null; // <-- NEW
}

type Duration = "Harian" | "Bulanan" | "Tahunan";

interface MembershipPackageDoc {
  name: string;
  price: number;
  duration: Duration;
}
type PackageMap = Record<
  string,
  {
    name: string;
    price: number;
    duration: Duration;
  }
>;

/* ================== Utils ================== */
function formatRupiahInput(raw: string): string {
  const digit = raw.replace(/\D/g, "");
  if (!digit) return "";
  return digit.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function parseRupiahToNumber(rp: string): number {
  return Number(rp.replace(/\./g, "")) || 0;
}
function phoneToWa(p?: string): string {
  if (!p) return "";
  const d = p.replace(/[^\d]/g, "");
  if (d.startsWith("62")) return d;
  if (d.startsWith("0")) return `62${d.slice(1)}`;
  return d;
}

/* ================== Member Card ================== */
type MemberLite = {
  id?: string;
  name: string;
  phone?: string;
  gender?: string;
  address?: string;
  email?: string;
  expiresAt?: DateLike;
  photoURL?: string | null;
  qrData?: string | null;
  memberCode?: string | null; // <-- NEW
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-gray-400">{label}</span>
      <span className="font-semibold break-words">{value}</span>
    </div>
  );
}

function MemberCard({
  data,
  cardRef,
  dark = true,
}: {
  data: MemberLite;
  cardRef: React.RefObject<HTMLDivElement | null>;
  dark?: boolean;
}) {
  const wa = phoneToWa(data.phone);

  const shellGradient = dark
    ? "linear-gradient(135deg,#0A0F14 0%,#0E1721 40%,#0B0F14 100%)"
    : `linear-gradient(90deg, ${colors.darker}, ${colors.base})`;

  return (
    <div
      ref={cardRef}
      className={`relative mx-auto w-full max-w-[760px] rounded-2xl shadow-2xl overflow-hidden ${
        dark ? "text-white" : "bg-white"
      }`}
      style={{
        ...(dark
          ? { background: "#0B0F14", border: "1px solid rgba(193,227,237,0.12)" }
          : { border: `1px solid ${colors.light}` }),
      }}
    >
      {/* Header */}
      <div
        className="relative px-6 py-4 flex items-center justify-between"
        style={{ background: shellGradient, color: dark ? "#E6F3F8" : colors.textLight }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
            backgroundSize: "140px 140px",
            opacity: 1,
            mixBlendMode: dark ? "soft-light" : "multiply",
          }}
        />
        <div className="relative flex items-center gap-3">
          <Image src={"/grindup-logo.png"} alt="Grind Up" width={44} height={44} className="rounded-md object-cover" />
          <div className="font-extrabold tracking-wide">GRIND UP FITNESS</div>
        </div>
        <div
          className="relative text-[11px] font-bold px-3 py-1 rounded-full border backdrop-blur"
          style={{
            borderColor: dark ? "rgba(151,204,221,0.35)" : colors.light,
            background: dark ? "rgada(255,255,255,0.06)" : "rgba(255,255,255,0.7)",
          }}
        >
          MEMBER CARD
        </div>
      </div>

      {/* Body */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Foto + QR */}
        <div className="md:col-span-1 flex flex-col items-center gap-3">
          <div
            className="rounded-2xl p-[4px] w-[188px]"
            style={{
              borderRadius: 18,
              border: "1px solid transparent",
              backgroundImage: dark
                ? "linear-gradient(#0e1520,#0e1520),linear-gradient(180deg, rgba(151,204,221,0.35), rgba(221,196,151,0.25))"
                : "linear-gradient(#ffffff,#ffffff),linear-gradient(180deg, rgba(151,204,221,0.35), rgba(221,196,151,0.25))",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }}
          >
            <div
              className={`rounded-xl overflow-hidden ${dark ? "bg-[#0e1520]" : "bg-white"}`}
              style={{
                border: dark ? "1px solid rgba(193,227,237,0.12)" : `1px solid ${colors.light}`,
              }}
            >
              <Image
                src={data.photoURL || "/default.jpg"}
                alt={data.name}
                width={186}
                height={186}
                className="w-[186px] h-[186px] object-cover"
              />
            </div>
          </div>

          <div
            className="p-3 rounded-2xl border backdrop-blur"
            style={{
              borderColor: dark ? "rgba(193,227,237,0.15)" : colors.base,
              background: dark ? "rgba(14,21,32,0.6)" : "rgba(255,255,255,0.9)",
            }}
          >
            <QRCode
              value={data.qrData || JSON.stringify({ type: "member", id: data.id ?? "", name: data.name })}
              size={148}
              bgColor={dark ? "transparent" : "#ffffff"}
              fgColor={dark ? "#E6F3F8" : "#000000"}
            />
          </div>

          <div
            className="w-[188px] h-2 rounded-full"
            style={{
              backgroundImage:
                "conic-gradient(from 180deg at 50% 50%, #80D0FF 0deg, #E9A7FF 90deg, #FFD1A1 180deg, #8CF3C7 270deg, #80D0FF 360deg)",
              filter: "saturate(120%) brightness(1.05)",
              opacity: 0.75,
            }}
          />
        </div>

        {/* Detail */}
        <div
          className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm rounded-2xl p-5 border"
          style={{
            borderColor: dark ? "rgba(193,227,237,0.12)" : colors.light,
            background: dark
              ? "linear-gradient(180deg, rgba(20,28,36,0.55), rgba(10,15,20,0.45))"
              : "rgba(255,255,255,0.75)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Field label="Nama" value={data.name} />
          <Field label="Member ID" value={data.id || "-"} />
          <Field label="Member Code" value={data.memberCode || "-"} />{/* NEW */}
          <Field
            label="Nomor Telepon"
            value={
              data.phone ? (
                <a
                  className={`underline ${dark ? "text-[#97CCDD]" : ""}`}
                  href={wa ? `https://wa.me/${wa}` : `tel:${data.phone}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {data.phone}
                </a>
              ) : (
                "-"
              )
            }
          />
          <Field label="Jenis Kelamin" value={data.gender || "-"} />
          <Field label="Email" value={data.email || "-"} />
          <Field label="Expired" value={data.expiresAt ? formatDate(data.expiresAt) : "-"} />
          <div className="sm:col-span-2">
            <Field label="Alamat" value={data.address || "-"} />
          </div>
          <div className="sm:col-span-2 mt-1 flex items-center justify-between text-[11px] opacity-80">
            <span>Issued by Grind Up Fitness</span>
            <span>Signature: ●●●● / Admin</span>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
          backgroundSize: "140px 140px",
          mixBlendMode: dark ? "soft-light" : "multiply",
        }}
      />
      <div className="h-1.5 w-full" style={{ backgroundColor: dark ? "#152635" : colors.base }} />
    </div>
  );
}

function MemberMiniCard({
  data,
  cardRef,
}: {
  data: MemberLite;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={cardRef}
      className="relative w-[780px] h-[300px] rounded-2xl overflow-hidden shadow-2xl text-white"
      style={{
        background:
          "linear-gradient(135deg,#0B0F14 0%,#0E1721 40%,#0B0F14 100%)",
        border: "1px solid rgba(193,227,237,0.12)",
      }}
    >
      <div className="absolute inset-0" style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
        backgroundSize: "140px 140px",
        mixBlendMode: "soft-light",
      }} />

      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src="/grindup-logo.png" alt="Grind Up" width={40} height={40} />
          <div className="font-extrabold tracking-wide">GRIND UP FITNESS</div>
        </div>
        <div className="text-[11px] px-3 py-1 rounded-full border backdrop-blur"
             style={{borderColor:"rgba(151,204,221,0.35)", background:"rgba(255,255,255,0.06)"}}>
          MEMBER
        </div>
      </div>

      <div className="px-6 pt-2 grid grid-cols-[160px_1fr_160px] gap-6 items-center">
        <div className="rounded-xl overflow-hidden border border-white/10 w-[160px] h-[160px]">
          <Image
            src={data.photoURL || "/default.jpg"}
            alt={data.name}
            width={160}
            height={160}
            className="object-cover w-[160px] h-[160px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Field label="Nama" value={data.name} />
          <Field label="ID" value={data.id || "-"} />
          <Field label="Member Code" value={data.memberCode || "-"} />{/* NEW */}
          <Field label="Telepon" value={data.phone || "-"} />
          <Field label="Expired" value={data.expiresAt ? formatDate(data.expiresAt) : "-"} />
          <div className="col-span-2">
            <Field label="Email" value={data.email || "-"} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="p-2 rounded-xl border border-white/10 bg-white/5">
            <QRCode value={data.qrData || JSON.stringify({ type: "member", id: data.id ?? "", name: data.name })} size={120} fgColor="#E6F3F8" bgColor="transparent" />
          </div>
          <div className="w-[140px] h-[6px] rounded-full"
               style={{backgroundImage:"conic-gradient(from 180deg at 50% 50%, #80D0FF 0deg, #E9A7FF 90deg, #FFD1A1 180deg, #8CF3C7 270deg, #80D0FF 360deg)", opacity:0.8}}/>
        </div>
      </div>
    </div>
  );
}

/* ================== Component ================== */
type PayMethod = "cash" | "qris" | "transfer" | "other";

export default function AdminMembersPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [lastCheckinFilter, setLastCheckinFilter] = useState("");

  // QR simple
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [qrMemberName, setQrMemberName] = useState<string>("");

  // Member Card
  const [cardOpen, setCardOpen] = useState(false);
  const [cardMember, setCardMember] = useState<MemberLite | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const miniCardRef = useRef<HTMLDivElement>(null);
  const [cardDark, setCardDark] = useState(true);
  const [exportingCard, setExportingCard] = useState<"png" | "pdf" | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [packageMap, setPackageMap] = useState<PackageMap>({});
  const [sortMode, setSortMode] = useState<"name_asc" | "expiry_asc">("name_asc");
  const [onlyExpiringSoon, setOnlyExpiringSoon] = useState(false);
  const pageSize = 10;

  // daftar paket
  const [packages, setPackages] = useState<Array<{ id: string } & MembershipPackageDoc>>([]);

  // State pembayaran
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payMonth, setPayMonth] = useState(1);
  const [payNominal, setPayNominal] = useState("");
  const [payFile, setPayFile] = useState<File | null>(null);
  const [payFilePreview, setPayFilePreview] = useState<string | null>(null);
  const [payFileError, setPayFileError] = useState<string>("");
  const [payNotes, setPayNotes] = useState<string>("");
  const [payPackageId, setPayPackageId] = useState<string>("");

  // NEW: metode pembayaran
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [payMethodCustom, setPayMethodCustom] = useState<string>("");

  // NEW: State untuk edit manual expiry
  const [showEditExpiryModal, setShowEditExpiryModal] = useState(false);
  const [editExpiryMember, setEditExpiryMember] = useState<Member | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState("");

  const router = useRouter();

  /* ========== Fetch package map & list ========== */
  useEffect(() => {
    const fetchPackages = async () => {
      const q = await getDocs(collection(db, "membership_packages"));
      const map: PackageMap = {};
      const list: Array<{ id: string } & MembershipPackageDoc> = [];
      q.forEach((docSnap) => {
        const d = docSnap.data() as MembershipPackageDoc;
        if (!d?.name) return;
        map[docSnap.id] = {
          name: d.name,
          price: Number(d.price ?? 0),
          duration: (d.duration as Duration) || "Bulanan",
        };
        list.push({
          id: docSnap.id,
          name: d.name,
          price: Number(d.price ?? 0),
          duration: (d.duration as Duration) || "Bulanan",
        });
      });
      setPackageMap(map);
      setPackages(list);
    };
    fetchPackages().catch(() => undefined);
  }, []);

  /* ========== Fetch members ========== */
  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "users"));
      
      // Dapatkan semua last checkins sekaligus untuk optimasi
      const lastCheckins = await getAllLastCheckins();
      
      const data: Member[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data() as UserRaw;
        data.push({
          id: docSnap.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          status: d.status,
          activityScore: d.activityScore,
          createdAt: d.createdAt ?? null,
          lastLogin: d.lastLogin ?? null,
          lastCheckin: lastCheckins[docSnap.id] ?? null, // TAMBAHKAN LAST CHECKIN
          deleted: d.deleted || false,
          photoURL: d.photoURL ?? null,
          qrData: d.qrData ?? null,
          expiresAt: d.expiresAt ?? d.expiredAt ?? null,
          memberType: d.memberType ?? "",
          gender: d.gender,
          address: d.address,
          memberCode: d.memberCode ?? null,
        });
      });
      setMembers(data);
      setLoading(false);
    };
    fetchMembers().catch(() => setLoading(false));
  }, []);

  // TAMBAHKAN FUNGSI UNTUK MENDAPATKAN SEMUA LAST CHECKIN
  async function getAllLastCheckins(): Promise<Record<string, DateLike>> {
    try {
      const checkinsRef = collection(db, "gyms", "mainGym", "checkins");
      const q = query(
        checkinsRef,
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const lastCheckins: Record<string, DateLike> = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId;
        
        // Hanya simpan checkin terakhir untuk setiap user
        if (userId && !lastCheckins[userId]) {
          lastCheckins[userId] = data.createdAt || null;
        }
      });
      
      return lastCheckins;
    } catch (error) {
      console.error("Error fetching all last checkins:", error);
      return {};
    }
  }

  /* ========== Helpers & derived ========== */
  const selectedPkg = useMemo(() => (payPackageId ? packageMap[payPackageId] ?? null : null), [payPackageId, packageMap]);

  const computedTotal = useMemo(() => {
    if (!selectedPkg) return 0;
    const price = selectedPkg.price || 0;
    if (selectedPkg.duration === "Harian") return price;
    const cycles = Math.max(1, Number(payMonth || 1));
    return price * cycles;
  }, [selectedPkg, payMonth]);


  /* ========== CRUD soft delete/restore ========== */
  const handleDelete = async (id: string) => {
    await updateDoc(doc(db, "users", id), { deleted: true });
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true } : m)));
  };

  const handleRestore = async (id: string) => {
    await updateDoc(doc(db, "users", id), { deleted: false });
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: false } : m)));
  };

  /* ========== Filters & Sorting ========== */
  const filteredSortedMembers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const now = new Date();

    const base = members.filter((m) => {
      const matchesSearch =
        (m.name || "").toLowerCase().includes(term) ||
        (m.email || "").toLowerCase().includes(term) ||
        (m.phone || "").toLowerCase().includes(term) ||
        (m.memberCode || "").toLowerCase().includes(term);
      const matchesStatus = statusFilter ? m.status === statusFilter : true;
      const matchesDeleted = showDeleted ? m.deleted : !m.deleted;

      const exp = toJSDate(m.expiresAt);
      const expiringSoon = exp ? Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 7 : false;
      const matchesSoon = onlyExpiringSoon ? expiringSoon : true;

      // TAMBAHKAN FILTER UNTUK LAST CHECKIN
      const matchesLastCheckin = () => {
        if (!lastCheckinFilter) return true;
        
        const checkinDate = toJSDate(m.lastCheckin);
        if (!checkinDate) return lastCheckinFilter === "never";
        
        const diffDays = Math.floor((now.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (lastCheckinFilter) {
          case "today": return diffDays === 0;
          case "week": return diffDays <= 7;
          case "month": return diffDays <= 30;
          case "3months": return diffDays <= 90;
          case "6months": return diffDays <= 180;
          case "year": return diffDays <= 365;
          case "never": return false;
          default: return true;
        }
      };

      return matchesSearch && matchesStatus && matchesDeleted && matchesSoon && matchesLastCheckin();
    });

    const sorted = [...base].sort((a, b) => {
      if (sortMode === "name_asc") {
        return (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" });
      }
      const ad = toJSDate(a.expiresAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bd = toJSDate(b.expiresAt)?.getTime() ?? Number.POSITIVE_INFINITY;
      return ad - bd;
    });

    return sorted;
  }, [members, searchTerm, statusFilter, showDeleted, sortMode, onlyExpiringSoon, lastCheckinFilter]);

  const totalPages = Math.ceil(filteredSortedMembers.length / pageSize);
  const paginatedMembers = filteredSortedMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  /* ========== QR Modal (simple) ========== */
  const qrCardRef = useRef<HTMLDivElement>(null);
  const [qrDownloading, setQrDownloading] = useState(false);

  const openQRModal = (value: string, memberName: string) => {
    setQrValue(value);
    setQrMemberName(memberName);
  };

  const handleDownloadQRPNG = async (): Promise<void> => {
    if (!qrCardRef.current) return;
    setQrDownloading(true);
    try {
      const dataUrl = await toPng(qrCardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${qrMemberName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "member"}-qr.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setQrDownloading(false);
    }
  };

  const handleDownloadQRPDF = async (): Promise<void> => {
    if (!qrCardRef.current) return;
    setQrDownloading(true);
    try {
      const el = qrCardRef.current;
      const w = el.offsetWidth || 360;
      const h = el.offsetHeight || 420;

      const dataUrl = await toPng(el, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: h >= w ? "portrait" : "landscape",
        unit: "px",
        format: [w, h],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      pdf.save(`${qrMemberName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "member"}-qr.pdf`);
    } finally {
      setQrDownloading(false);
    }
  };

  /* ========== Member Card Modal handlers ========== */
  const openCardModal = (m: Member) => {
    setCardMember({
      id: m.id,
      name: m.name,
      phone: m.phone,
      gender: m.gender,
      address: m.address,
      email: m.email,
      expiresAt: m.expiresAt,
      photoURL: m.photoURL,
      qrData: m.qrData || JSON.stringify({ type: "member", id: m.id, name: m.name }),
      memberCode: m.memberCode ?? null, // NEW
    });
    setCardOpen(true);
  };

  const downloadMemberCardPNG = async () => {
    if (!cardRef.current || !cardMember) return;
    setExportingCard("png");
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: cardDark ? "#0B0F14" : "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `member-card-${(cardMember.name || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      a.click();
    } finally {
      setExportingCard(null);
    }
  };
  const downloadMemberCardPDF = async () => {
    if (!cardRef.current || !cardMember) return;
    setExportingCard("pdf");
    try {
      const el = cardRef.current;
      const w = el.offsetWidth || 740;
      const h = el.offsetHeight || 440;
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: cardDark ? "#0B0F14" : "#ffffff",
      });
      const pdf = new jsPDF({ orientation: h >= w ? "portrait" : "landscape", unit: "px", format: [w, h] });
      pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      pdf.save(`member-card-${(cardMember.name || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
    } finally {
      setExportingCard(null);
    }
  };

  const downloadMiniCardPNG = async () => {
    if (!miniCardRef.current || !cardMember) return;
    const dataUrl = await toPng(miniCardRef.current, { pixelRatio: 3, cacheBust: true, backgroundColor: "#0B0F14" });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `member-mini-${(cardMember.name || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    a.click();
  };
  const downloadMiniCardPDF = async () => {
    if (!miniCardRef.current || !cardMember) return;
    const el = miniCardRef.current;
    const w = el.offsetWidth || 792;
    const h = el.offsetHeight || 500;
    const dataUrl = await toPng(el, { pixelRatio: 3, cacheBust: true, backgroundColor: "#0B0F14" });
    const pdf = new jsPDF({ orientation: h >= w ? "portrait" : "landscape", unit: "px", format: [w, h] });
    pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
    pdf.save(`member-mini-${(cardMember.name || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  };

  /* ========== Modal Pembayaran ========== */
  const openPayModal = (member: Member) => {
    setSelectedMember(member);
    setShowPayModal(true);

    if (member.memberType && packageMap[member.memberType]) {
      setPayPackageId(member.memberType);
    } else if (packages.length > 0) {
      setPayPackageId(packages[0].id);
    } else {
      setPayPackageId("");
    }

    setPayMonth(1);
    setPayNominal("");
    setPayFile(null);
    setPayFilePreview(null);
    setPayFileError("");
    setPayNotes("");
    setPayMethod("cash");
    setPayMethodCustom("");
  };

  useEffect(() => {
    if (showPayModal && !payPackageId && packages.length > 0) {
      setPayPackageId(
        selectedMember?.memberType && packageMap[selectedMember.memberType]
          ? (selectedMember.memberType as string)
          : packages[0].id
      );
    }
  }, [showPayModal, payPackageId, packages, selectedMember, packageMap]);

  const closePayModal = () => {
    setShowPayModal(false);
    setSelectedMember(null);
    setPayPackageId("");
    setPayMonth(1);
    setPayNominal("");
    setPayFile(null);
    setPayFilePreview(null);
    setPayFileError("");
    setPayNotes("");
    setPayMethod("cash");
    setPayMethodCustom("");
  };

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPayFileError("");
    if (!file) {
      setPayFile(null);
      setPayFilePreview(null);
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setPayFile(null);
      setPayFilePreview(null);
      setPayFileError("Hanya file JPG/PNG maksimal 3MB yang diizinkan.");
      return;
    }
    setPayFile(file);
    setPayFilePreview(URL.createObjectURL(file));
  };

  const handleUseAutoNominal = () => {
    setPayNominal(formatRupiahInput(String(computedTotal)));
  };

  /* ========== Fungsi Edit Expiry Manual ========== */
  const openEditExpiryModal = (member: Member) => {
    setEditExpiryMember(member);
    // Format tanggal untuk input type="date" (YYYY-MM-DD)
    const currentExpiry = toJSDate(member.expiresAt);
    setNewExpiryDate(
      currentExpiry 
        ? format(currentExpiry, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd")
    );
    setShowEditExpiryModal(true);
  };

  const handleSaveExpiry = async () => {
    if (!editExpiryMember || !newExpiryDate) return;
    
    try {
      const newDate = new Date(newExpiryDate);
      newDate.setHours(23, 59, 59, 999); // Set to end of day
      
      await updateDoc(doc(db, "users", editExpiryMember.id), {
        expiresAt: Timestamp.fromDate(newDate)
      });
      
      // Update local state
      setMembers(prev => prev.map(m => 
        m.id === editExpiryMember.id 
          ? { ...m, expiresAt: newDate } 
          : m
      ));
      
      setShowEditExpiryModal(false);
      alert("Tanggal expired berhasil diupdate!");
    } catch (error) {
      console.error("Error updating expiry:", error);
      alert("Gagal update tanggal expired!");
    }
  };

  /* ========== Perbaikan Logika Perpanjangan di handlePay ========== */
  const handlePay = async () => {
    if (!selectedMember) return;
    if (!payFile) {
      setPayFileError("Bukti pembayaran wajib diupload.");
      return;
    }
    if (!payPackageId || !selectedPkg) {
      alert("Pilih paket terlebih dahulu.");
      return;
    }

    setPayLoading(true);
    try {
      // PERBAIKAN: Hitung expiry baru berdasarkan 3 kondisi
      const now = new Date();
      let startDate = now;
      
      // Kondisi 1: Jika member sudah punya expiredAt dan masih valid
      if (selectedMember.expiresAt) {
        const currentExpiry = toJSDate(selectedMember.expiresAt);
        if (currentExpiry && currentExpiry > now) {
          // Kondisi 2: Perpanjang sebelum expired - mulai dari expiredAt terakhir
          startDate = currentExpiry;
        }
        // Kondisi 3: Jika sudah expired, tetap pakai now (hari ini)
      }
      // Kondisi 1: Jika belum ada expiredAt, pakai now (hari ini)

      const newExpiry = new Date(startDate);
      if (selectedPkg.duration === "Harian") {
        newExpiry.setDate(newExpiry.getDate() + 1);
        newExpiry.setHours(23, 59, 59, 999);
      } else if (selectedPkg.duration === "Bulanan") {
        newExpiry.setMonth(newExpiry.getMonth() + Math.max(1, payMonth));
      } else {
        newExpiry.setMonth(newExpiry.getMonth() + Math.max(1, payMonth) * 12);
      }

      // Upload bukti
      const fileName = `payments/${selectedMember.id}-${Date.now()}.jpg`;
      const fileRef = ref(storage, fileName);
      await uploadBytes(fileRef, payFile);
      const fileURL = await getDownloadURL(fileRef);

      // Update user
      const ts = Timestamp.fromDate(newExpiry);
      await updateDoc(doc(db, "users", selectedMember.id), {
        expiresAt: ts,
        status: "aktif",
        memberType: payPackageId,
      });

      const methodFinal: string = payMethod === "other" ? (payMethodCustom.trim() || "other") : payMethod;

      const priceNumber = parseRupiahToNumber(payNominal) || computedTotal || 0;
      const created = Timestamp.now();

      const paymentDoc: DocumentData = {
        userId: selectedMember.id,
        name: selectedMember.name,
        price: priceNumber,
        cycles: selectedPkg.duration === "Harian" ? 0 : Math.max(1, payMonth),
        duration: selectedPkg.duration,
        created,
        updatedAt: created,
        approvedAt: null,
        approvedBy: "",
        proofUrl: fileURL,
        method: methodFinal,
        status: "success",
        expiresAt: ts,
        packageId: payPackageId,
        packageName: selectedPkg.name,
        packagePrice: selectedPkg.price,
        notes: payNotes || "",
        admin: "admin",
        memberCode: selectedMember.memberCode ?? null,
      };

      await addDoc(collection(db, "payments"), paymentDoc);

      // Sync state
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, expiresAt: ts, status: "aktif", memberType: payPackageId } : m
        )
      );

      closePayModal();
      alert("Pembayaran berhasil disimpan!");
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Gagal menyimpan pembayaran!");
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-white relative">
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Absensi", href: "/admin/attendance" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Paket Membership", href: "/admin/packages" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
          { label: "Galeri", href: "/admin/gallery" },
        ]}
      />
      <AdminTopbar onOpen={() => setDrawerOpen(true)} />
      <AdminSidebar
        navItems={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Absensi", href: "/admin/attendance" },
          { label: "Kelas", href: "/admin/classes" },
          { label: "Paket Membership", href: "/admin/packages" },
          { label: "Member", href: "/admin/members" },
          { label: "Laporan", href: "/admin/reports" },
          { label: "Pelatih Pribadi", href: "/admin/personal-trainer" },
          { label: "Galeri", href: "/admin/gallery" },
        ]}
      />

      <div className="flex-1 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-3xl font-extrabold" style={{ color: colors.text }}>
            Manajemen Member
          </h1>
          <button
            onClick={() => router.push("/admin/members/form")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl shadow-md transition text-white"
            style={{ background: colors.darker }}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Tambah Member</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-6">
          <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
            <input
              type="text"
              placeholder="Cari nama, email, nomor telepon, atau member code"
              className="w-full sm:w-72 border rounded-xl px-4 py-2"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <select
              className="w-full sm:w-52 border rounded-xl px-4 py-2"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="non-aktif">Tidak Aktif</option>
            </select>

                      {/* TAMBAHKAN FILTER UNTUK LAST CHECKIN */}
            <select
              className="w-full sm:w-56 border rounded-xl px-4 py-2"
              value={lastCheckinFilter}
              onChange={(e) => {
                setLastCheckinFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Semua Absen</option>
              <option value="today">Absen Hari Ini</option>
              <option value="week">Absen Minggu Ini</option>
              <option value="month">Absen Bulan Ini</option>
              <option value="3months">Absen 3 Bulan Terakhir</option>
              <option value="6months">Absen 6 Bulan Terakhir</option>
              <option value="year">Absen Tahun Ini</option>
              <option value="never">Belum Pernah Absen</option>
            </select>

            <select
              className="w-full sm:w-56 border rounded-xl px-4 py-2"
              value={sortMode}
              onChange={(e) => {
                setSortMode(e.target.value as "name_asc" | "expiry_asc");
                setCurrentPage(1);
              }}
            >
              <option value="name_asc">Urut Nama (A → Z)</option>
              <option value="expiry_asc">Expired Paling Cepat</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyExpiringSoon}
              onChange={() => {
                setOnlyExpiringSoon((v) => !v);
                setCurrentPage(1);
              }}
            />
            <span className="inline-flex items-center gap-1">
              <TimerReset className="w-4 h-4" />
              Tampilkan yang segera expired (≤ 7 hari)
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={() => {
                setShowDeleted(!showDeleted);
                setCurrentPage(1);
              }}
            />
            Tampilkan yang dihapus
          </label>
        </div>

        {/* pagination summary */}
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm text-gray-600">
            Menampilkan {paginatedMembers.length} dari {filteredSortedMembers.length} member
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border disabled:opacity-50"
              style={{ borderColor: colors.light }}
            >
              Sebelumnya
            </button>
            <span className="text-sm text-gray-700 inline-flex items-center gap-1">
              <SortAsc className="w-4 h-4" /> Halaman {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages || 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 rounded border disabled:opacity-50"
              style={{ borderColor: colors.light }}
            >
              Selanjutnya
            </button>
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm mt-4" style={{ borderColor: colors.light }}>
          <table className="w-full table-auto">
            <thead style={{ background: `linear-gradient(90deg, ${colors.darker}, ${colors.dark})`, color: colors.textLight }}>
              <tr>
                <th className="p-4 text-left">Nama</th>
                <th className="p-4 text-left">Member Code</th>{/* NEW */}
                <th className="p-4 text-left">Nomor HP</th>
                <th className="p-4 text-left">Email</th>
                {/* <th className="p-4 text-left">Tipe Member</th> */}
                <th className="p-4 text-left">Status</th>
                {/* <th className="p-4 text-left">Terakhir Login</th> */}
                <th className="p-4 text-left">Terakhir Absen</th>
                <th className="p-4 text-left">Foto</th>
                <th className="p-4 text-left">Expired</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    {Array.from({ length: 11 }).map((__, j) => ( // 11 kolom sekarang
                      <td key={`sk-${i}-${j}`} className="p-4">
                        <div className="h-5 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                paginatedMembers.map((member, index) => {
                  const expDate = toJSDate(member.expiresAt);
                  const soon =
                    expDate ? Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 7 : false;

                  return (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.4, ease: "easeOut" }}
                      className={`border-b hover:bg-gray-50 ${member.deleted ? "opacity-50" : ""}`}
                      style={{ borderColor: colors.light }}
                    >
                      <td className="p-4 font-semibold" style={{ color: colors.text }}>{member.name}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 font-mono text-sm px-2 py-0.5 rounded bg-slate-100">
                          <Tag className="w-3.5 h-3.5" />
                          {member.memberCode || "-"}
                        </span>
                      </td>
                      <td className="p-4 text-gray-700">
                        {member.phone || "-"}
                        {member.phone && (
                          <a
                            href={`https://wa.me/${phoneToWa(member.phone)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs ml-2 underline"
                            title="Chat WhatsApp"
                          >
                            <Phone className="w-3 h-3" /> WA
                          </a>
                        )}
                      </td>
                      <td className="p-4 text-gray-700">{member.email}</td>
                      {/* <td className="p-4 font-semibold" style={{ color: colors.darker }}>
                        {member.memberType
                          ? packageMap[member.memberType]
                            ? packageMap[member.memberType].name
                            : <span className="text-amber-600">Paket tidak ditemukan</span>
                          : <span className="text-gray-400 italic">Belum dipilih</span>}
                      </td> */}
                      <td className={`p-4 font-medium capitalize ${member.status === "aktif" ? "text-green-600" : "text-red-500"}`}>
                        {member.status}{soon && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">≤ 7 hari</span>}
                      </td>
                      {/* <td className="p-4 text-sm">{formatDate(member.lastLogin)}</td> */}
                      <td className="p-4 text-sm">
                        {formatDate(member.lastCheckin) || "Belum pernah"}
                      </td> {/* DATA TERAKHIR ABSEN */}
                      <td className="p-4">
                        {member.photoURL ? (
                          <Image
                            src={member.photoURL}
                            alt={member.name}
                            width={40}
                            height={40}
                            onClick={() => setModalImage(member.photoURL as string)}
                            className="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-110 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-500">?</div>
                        )}
                      </td>
                      <td className="p-4 text-sm">{formatDate(member.expiresAt)}</td>
                      <td className="p-4 flex flex-wrap gap-2">
                        {/* <button
                          onClick={() => router.push(`/member/${member.id}`)}
                          className="p-2 rounded-full text-white hover:scale-110 transition"
                          style={{ background: colors.darker }}
                          aria-label="Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button> */}
                        <button
                          onClick={() => router.push(`/admin/members/form?id=${member.id}`)}
                          className="p-2 rounded-full text-white hover:scale-110 transition"
                          style={{ background: colors.complementary }}
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!member.deleted ? (
                          <>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="p-2 rounded-full text-white hover:scale-110 transition"
                              style={{ background: "#ef4444" }}
                              aria-label="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openPayModal(member)}
                              className="p-2 rounded-full text-white hover:scale-110 transition"
                              style={{ background: "#16a34a" }}
                              aria-label="Bayar/Perpanjang"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                            {/* NEW: Tombol Edit Expiry Manual */}
                            <button
                              onClick={() => openEditExpiryModal(member)}
                              className="p-2 rounded-full text-white hover:scale-110 transition"
                              style={{ background: "#f59e0b" }}
                              aria-label="Edit Expiry"
                              title="Edit Expiry Manual"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(member.id)}
                            className="p-2 rounded-full text-white hover:scale-110 transition"
                            style={{ background: "#9ca3af" }}
                            aria-label="Restore"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {member.qrData && (
                          <button
                            onClick={() => openQRModal(member.qrData as string, member.name)}
                            className="p-2 rounded-full text-white hover:scale-110 transition"
                            style={{ background: colors.base }}
                            aria-label="QR"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openCardModal(member)}
                          className="p-2 rounded-full text-white hover:scale-110 transition"
                          style={{ background: "#0ea5e9" }}
                          aria-label="Member Card"
                          title="Member Card"
                        >
                          <IdCard className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* MODAL: Pembayaran */}
      <Modal
        open={showPayModal && !!selectedMember}
        onClose={closePayModal}
        widthClass="max-w-md"
        title="Perpanjang / Pembayaran Member"
        footer={
          <button
            onClick={handlePay}
            className="w-full text-white py-3 rounded-lg font-bold flex items-center gap-2 justify-center"
            style={{ background: "#16a34a" }}
            disabled={payLoading || !payPackageId || !payFile || (!payNominal && computedTotal <= 0)}
          >
            {payLoading ? "Menyimpan..." : (<><DollarSign className="w-5 h-5" /> Simpan & Perpanjang</>)}
          </button>
        }
      >
        {selectedMember && (
          <>
            {/* Info member */}
            <div className="mb-4 text-sm">
              <div className="mb-1"><b>Nama:</b> {selectedMember.name}</div>
              <div className="mb-1"><b>Kode Member:</b> {selectedMember.memberCode || "-"}</div>{/* NEW */}
              <div className="mb-1"><b>Email:</b> {selectedMember.email}</div>
              <div className="mb-1">
                <b>Status:</b>{" "}
                <span className={selectedMember.status === "aktif" ? "text-green-600" : "text-red-500"}>
                  {selectedMember.status}
                </span>
              </div>
              <div className="mb-1"><b>Expired Saat Ini:</b> {formatDate(selectedMember.expiresAt)}</div>
            </div>

            {/* Paket */}
            <div className="mb-3">
              <label className="block mb-1 font-semibold">Tipe Member / Paket</label>
              <select
                value={payPackageId}
                onChange={(e) => setPayPackageId(e.target.value)}
                className="border px-3 py-2 rounded w-full"
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Rp {Number(p.price).toLocaleString("id-ID")} ({p.duration})
                  </option>
                ))}
              </select>

              {selectedPkg && (
                <div className="mt-2 text-xs text-gray-700 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5" />
                  <div>
                    Harga paket: <b>Rp {selectedPkg.price.toLocaleString("id-ID")}</b> per{" "}
                    <b>{selectedPkg.duration === "Tahunan" ? "tahun" : selectedPkg.duration === "Bulanan" ? "bulan" : "hari"}</b>.
                  </div>
                </div>
              )}
            </div>

            {/* Pilih siklus */}
            {selectedPkg?.duration !== "Harian" ? (
              <div className="mb-3">
                <label className="block mb-1 font-semibold">Perpanjang Berapa {selectedPkg?.duration === "Tahunan" ? "tahun" : "bulan"}?</label>
                <select
                  value={payMonth}
                  onChange={(e) => setPayMonth(Number(e.target.value))}
                  className="border px-3 py-2 rounded w-full"
                >
                  <option value={1}>1 {selectedPkg?.duration === "Tahunan" ? "tahun" : "bulan"}</option>
                  <option value={2}>2 {selectedPkg?.duration === "Tahunan" ? "tahun" : "bulan"}</option>
                  <option value={3}>3 {selectedPkg?.duration === "Tahunan" ? "tahun" : "bulan"}</option>
                  <option value={6}>6 {selectedPkg?.duration === "Tahunan" ? "tahun" : "bulan"}</option>
                  <option value={12}>12 {selectedPkg?.duration === "Tahunan" ? "tahun" : "bulan"}</option>
                </select>
              </div>
            ) : (
              <div
                className="mb-3 px-3 py-2 rounded border text-yellow-800 font-semibold text-center"
                style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}
              >
                Paket <b>Harian/Visit</b>: masa aktif 1 hari (habis jam 23:59).
              </div>
            )}

            {/* Metode Pembayaran */}
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <label className="block mb-1 font-semibold">Metode Pembayaran</label>
                <span className="text-[11px] text-gray-500">*disarankan: <b>Cash/Tunai</b></span>
              </div>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PayMethod)}
                className="border px-3 py-2 rounded w-full"
              >
                <option value="cash">Tunai</option>
                <option value="debit">Debit</option>
                <option value="qris">QRIS</option>
                {/* <option value="other">Lainnya (ketik sendiri)</option> */}
              </select>
              {/* {payMethod === "other" && (
                <input
                  type="text"
                  className="mt-2 border px-3 py-2 rounded w-full"
                  placeholder="Contoh: debit BCA, e-wallet X, dll."
                  value={payMethodCustom}
                  onChange={(e) => setPayMethodCustom(e.target.value)}
                />
              )} */}
            </div>

            {/* Nominal */}
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <label className="block mb-1 font-semibold">Nominal Pembayaran (Rp)</label>
                <button
                  type="button"
                  onClick={handleUseAutoNominal}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border"
                  style={{ borderColor: colors.light }}
                  title="Isi otomatis dari hasil perhitungan"
                >
                  <Calculator className="w-4 h-4" /> Gunakan nominal otomatis
                </button>
              </div>
              <input
                type="text"
                className="border px-3 py-2 rounded w-full"
                value={payNominal}
                onChange={(e) => setPayNominal(formatRupiahInput(e.target.value))}
                placeholder={`Contoh: ${computedTotal.toLocaleString("id-ID")}`}
                inputMode="numeric"
                autoComplete="off"
                required
              />
              {selectedPkg && (
                <div className="mt-1 text-xs text-gray-600">
                  Perhitungan otomatis: <b>Rp {computedTotal.toLocaleString("id-ID")}</b> (Rp {selectedPkg.price.toLocaleString("id-ID")} ×{" "}
                  {selectedPkg.duration === "Harian" ? 1 : Math.max(1, payMonth)} {selectedPkg.duration === "Tahunan" ? "tahun" : selectedPkg.duration === "Bulanan" ? "bulan" : "hari"})
                </div>
              )}
            </div>

            {/* Catatan */}
            <div className="mb-3">
              <label className="block mb-1 font-semibold">Catatan (opsional)</label>
              <textarea
                className="border px-3 py-2 rounded w-full"
                rows={2}
                placeholder="Contoh: bayar cash, promo, dsb."
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>

            {/* Bukti */}
            <div className="mb-1">
              <label className="mb-1 font-semibold flex items-center gap-2">
                <UploadCloud className="w-5 h-5" /> Bukti Pembayaran (jpg/png, max 3MB)
              </label>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleProofChange}
                className="w-full border rounded px-3 py-2"
              />
              {payFilePreview && (
                <div className="mt-2">
                  <Image
                    src={payFilePreview}
                    alt="Preview Bukti"
                    width={200}
                    height={120}
                    className="rounded-lg object-cover mx-auto"
                  />
                </div>
              )}
              {payFileError && <div className="mt-2 text-red-500 text-sm">{payFileError}</div>}
            </div>
          </>
        )}
      </Modal>

      {/* MODAL: Edit Expiry Manual */}
      <Modal
        open={showEditExpiryModal && !!editExpiryMember}
        onClose={() => setShowEditExpiryModal(false)}
        widthClass="max-w-md"
        title="Edit Tanggal Expiry Manual"
        footer={
          <button
            onClick={handleSaveExpiry}
            className="w-full text-white py-3 rounded-lg font-bold"
            style={{ background: "#f59e0b" }}
          >
            Simpan Perubahan
          </button>
        }
      >
        {editExpiryMember && (
          <div>
            <div className="mb-4">
              <div className="font-semibold">Member: {editExpiryMember.name}</div>
              <div className="text-sm text-gray-600">
                Expiry saat ini: {formatDate(editExpiryMember.expiresAt)}
              </div>
            </div>
            
            <div className="mb-3">
              <label className="block mb-1 font-semibold">Tanggal Expiry Baru</label>
              <input
                type="date"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                className="border px-3 py-2 rounded w-full"
                min={format(new Date(), "yyyy-MM-dd")} // Tidak boleh memilih tanggal kemarin
              />
            </div>
            
            <div className="text-xs text-gray-500">
              Catatan: Mengatur tanggal expiry manual akan mengabaikan perhitungan otomatis berdasarkan paket membership.
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Preview Foto */}
      <Modal open={!!modalImage} onClose={() => setModalImage(null)} widthClass="max-w-xl" title="Foto Member">
        {modalImage && (
          <Image
            src={modalImage}
            alt="Preview"
            width={800}
            height={800}
            className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
          />
        )}
      </Modal>

      {/* MODAL: QR */}
      <AnimatePresence>
        {qrValue && (
          <motion.div
            key="qr"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center px-4"
            onClick={() => setQrValue(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3 flex items-center justify-between" style={{ background: colors.base, color: colors.text }}>
                <div className="font-bold">{qrMemberName}</div>
                <button onClick={() => setQrValue(null)} className="p-1 rounded hover:bg-white/30" aria-label="Tutup">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div ref={qrCardRef} className="p-6">
                <div className="rounded-2xl border shadow-md p-5 bg-white relative overflow-hidden" style={{ borderColor: colors.light }}>
                  <div
                    className="absolute -right-10 -top-3 rotate-45 text-xs font-bold px-12 py-1"
                    style={{ background: colors.accent, color: colors.textLight }}
                  >
                    QR MEMBER
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="mb-3 font-extrabold text-xl" style={{ color: colors.text }}>
                      Grind Up Fitness
                    </div>
                    <div className="bg-white p-2 rounded-lg border mb-2" style={{ borderColor: colors.base }}>
                      <QRCode value={qrValue} size={180} />
                    </div>
                    <div className="text-xs text-gray-500">Scan untuk buka profil member</div>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 flex items-center justify-end gap-2">
                <button
                  onClick={handleDownloadQRPNG}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white"
                  style={{ background: colors.darker }}
                  disabled={qrDownloading}
                >
                  <Download className="w-4 h-4" />
                  {qrDownloading ? "Menyiapkan..." : "PNG"}
                </button>
                <button
                  onClick={handleDownloadQRPDF}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white"
                  style={{ background: colors.complementary }}
                  disabled={qrDownloading}
                >
                  <FileText className="w-4 h-4" />
                  {qrDownloading ? "Menyiapkan..." : "PDF"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Member Card */}
      <Modal
        open={cardOpen && !!cardMember}
        onClose={() => setCardOpen(false)}
        widthClass="max-w-2xl"
        title={
          <div className="flex items-center gap-2">
            <span>Member Card</span>
            <button
              type="button"
              onClick={() => setCardDark((v) => !v)}
              className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded border"
              title="Ganti Tema"
            >
              {cardDark ? <Sun className="w-4 h-4" /> : <MoonStar className="w-4 h-4" />}
              {cardDark ? "Terang" : "Gelap"}
            </button>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            {cardMember?.phone && (
              <a
                className="px-4 py-2 rounded-xl border"
                href={`https://wa.me/${phoneToWa(cardMember.phone)}`}
                target="_blank"
                rel="noreferrer"
                title="WhatsApp"
              >
                WhatsApp
              </a>
            )}
            <button onClick={() => setCardOpen(false)} className="px-4 py-2 rounded-xl border">Tutup</button>
            <button
              onClick={downloadMemberCardPNG}
              className="px-4 py-2 rounded-xl text-white disabled:opacity-60"
              style={{ background: colors.darker }}
              disabled={exportingCard !== null}
            >
              {exportingCard === "png" ? "Menyimpan…" : "Download PNG"}
            </button>
            <button
              onClick={downloadMemberCardPDF}
              className="px-4 py-2 rounded-xl text-white disabled:opacity-60"
              style={{ background: colors.complementary }}
              disabled={exportingCard !== null}
            >
              {exportingCard === "pdf" ? "Menyimpan…" : "Download PDF"}
            </button>
            <button onClick={downloadMiniCardPNG} className="px-4 py-2 rounded-xl border">Mini PNG</button>
            <button onClick={downloadMiniCardPDF} className="px-4 py-2 rounded-xl border">Mini PDF</button>
          </div>
        }
      >
        {cardMember && (
          <div className="space-y-6">
            <MemberCard data={cardMember} cardRef={cardRef} dark />
            <MemberMiniCard data={cardMember} cardRef={miniCardRef} />
          </div>
        )}
      </Modal>
    </main>
  );
}
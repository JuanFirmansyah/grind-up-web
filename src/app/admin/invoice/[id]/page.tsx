// src/app/admin/invoice/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import InvoicePage, { InvoiceProps } from "@/components/InvoicePage";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<InvoiceProps | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper untuk convert tanggal
  const toDateValue = (v: unknown): string => {
    if (!v) return "";
    if (v instanceof Date) return v.toISOString();
    if (v instanceof Timestamp) return v.toDate().toISOString();
    if (typeof v === "string") {
      const d = new Date(v);
      return isNaN(d.getTime()) ? "" : d.toISOString();
    }
    return "";
  };

  useEffect(() => {
    async function fetchInvoice() {
      if (typeof id === "string") {
        const snap = await getDoc(doc(db, "payments", id));
        if (snap.exists()) {
          const d = snap.data();
          setData({
            id: id,
            userId: d.userId || "-",
            status: d.status || "pending",
            memberName: d.name || "-",
            memberEmail: d.email || "-",
            memberType: d.packageName || "Member",
            payMonth: d.payMonth || 1,
            nominal: d.nominal || 0,
            paidAt: toDateValue(d.paidAt) || "",
            expiresAt: toDateValue(d.expiresAt) || "", // ✅ sudah diganti dari expiredAt
            admin: d.admin || "",
            buktiURL: d.imageURL || "",
            qrValue: d.qrValue || "",
          });
        }
      }
      setLoading(false);
    }
    fetchInvoice();
  }, [id]);

  if (loading)
    return <div className="min-h-screen flex items-center justify-center text-white">Memuat Invoice...</div>;
  if (!data)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 font-bold">
        Invoice tidak ditemukan.
      </div>
    );

  return <InvoicePage invoice={data} />;
}

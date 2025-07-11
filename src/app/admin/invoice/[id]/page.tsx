// src/app/admin/invoice/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import InvoicePage, { InvoiceProps } from "@/components/InvoicePage";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<InvoiceProps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoice() {
      if (typeof id === "string") {
        const snap = await getDoc(doc(db, "payments", id));
        if (snap.exists()) {
          const d = snap.data();
          setData({
            id: id,
            status: d.status || "pending",
            memberName: d.name || "-",
            memberEmail: d.email || "-",
            memberType: d.packageName || "Member",
            payMonth: d.payMonth || 1,
            nominal: d.nominal || 0,
            paidAt: d.paidAt?.toDate?.() ? d.paidAt.toDate().toISOString() : d.paidAt || "",
            expiredAt: d.expiredAt || "",
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Memuat Invoice...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-red-400 font-bold">Invoice tidak ditemukan.</div>;

  return <InvoicePage invoice={data} />;
}

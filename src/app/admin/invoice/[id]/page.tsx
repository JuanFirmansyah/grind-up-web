"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import InvoicePage, { InvoiceProps } from "@/components/InvoicePage";

type TSLike = Timestamp | string | Date | null | undefined;

interface PaymentDoc {
  userId?: string;
  packageName?: string;
  name?: string;
  email?: string;

  price?: number;     // baru
  nominal?: number;   // lama

  cycles?: number;    // baru
  payMonth?: number;  // lama

  status?: string;

  paidAt?: TSLike;
  createdAt?: TSLike;
  created?: TSLike;

  expiresAt?: TSLike;
  expiredAt?: TSLike;

  admin?: string;
  proofUrl?: string;
  imageURL?: string;
  qrValue?: string;
}

function toISO(v: TSLike): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString();
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }
  return "";
}

export default function InvoiceDetailPage() {
  // ketatkan tipe params → tidak “any”
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<InvoiceProps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoice(): Promise<void> {
      try {
        if (!id) return;
        const snap = await getDoc(doc(db, "payments", id));
        if (!snap.exists()) return;

        const d = snap.data() as PaymentDoc;

        // map price/cycles kompatibel data lama & baru
        const price =
          (typeof d.price === "number" ? d.price : undefined) ??
          (typeof d.nominal === "number" ? d.nominal : 0);

        const cyclesRaw =
          (typeof d.cycles === "number" ? d.cycles : undefined) ??
          (typeof d.payMonth === "number" ? d.payMonth : undefined) ??
          1;

        const status = (typeof d.status === "string" ? d.status : "pending") as InvoiceProps["status"];

        const paidIso = toISO(d.paidAt) || toISO(d.createdAt) || toISO(d.created);
        const expiresIso = toISO(d.expiresAt) || toISO(d.expiredAt);

        setData({
          id,
          userId: d.userId ?? "-",
          status,
          memberName: d.name ?? "-",
          memberEmail: d.email ?? "-",
          memberType: d.packageName ?? "Member",
          cycles: Math.max(1, Number(cyclesRaw || 1)),
          price: Number(price || 0),
          paidAt: paidIso,
          expiresAt: expiresIso,
          admin: d.admin ?? "",
          proofUrl: d.proofUrl ?? d.imageURL ?? "",
          qrValue: d.qrValue ?? "",
        });
      } finally {
        setLoading(false);
      }
    }
    void fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-white">
        Memuat Invoice...
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen grid place-items-center text-red-400 font-bold">
        Invoice tidak ditemukan.
      </div>
    );
  }

  return <InvoicePage invoice={data} />;
}

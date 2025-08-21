// src/components/InvoicePage.tsx
"use client";

import NextImage from "next/image";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { Download, ImageDown, Printer, ExternalLink } from "lucide-react";

// QR tanpa SSR
const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

export interface InvoiceProps {
  id: string;
  status: "verified" | "pending" | "rejected" | "success" | "failed";
  userId: string;
  memberName: string;
  memberEmail: string;
  memberType: string;
  cycles: number;     // jumlah bulan
  price: number;      // total harga
  paidAt: string;     // ISO string
  expiresAt?: string; // ISO string
  admin: string;
  proofUrl?: string;
  qrValue?: string;
}

function safeDate(s?: string) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// helper typed untuk import dinamis
async function loadImgAndPdfDeps() {
  const htmlToImageModule: typeof import("html-to-image") = await import("html-to-image");
  const jsPDFModule: typeof import("jspdf") = await import("jspdf");
  return {
    toPng: htmlToImageModule.toPng,
    toJpeg: htmlToImageModule.toJpeg,
    jsPDF: jsPDFModule.jsPDF,
  };
}

// batasi lebar render agar pas di kertas
const EXPORT_PDF_MAX_WIDTH_PX = 720;

export default function InvoicePage({ invoice }: { invoice: InvoiceProps }) {
  const dt = safeDate(invoice.paidAt);
  const exp = safeDate(invoice.expiresAt);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const toRupiah = (val: number) =>
    (val || 0).toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    });

  const statusClass: string =
    {
      verified: "bg-green-600",
      success: "bg-green-600",
      pending: "bg-yellow-500",
      failed: "bg-red-600",
      rejected: "bg-red-600",
    }[invoice.status] || "bg-gray-600";

  const qrURL =
    invoice.qrValue ||
    `${process.env.NEXT_PUBLIC_APP_URL || ""}/member/${invoice.userId}`;

  /** filter untuk html-to-image: sembunyikan node yang punya class 'no-export' */
  const excludeControls = (node: HTMLElement) =>
    !node.classList?.contains("no-export");

  /* ======================== Download PDF ======================== */
  const handleDownloadPDF = async (): Promise<void> => {
    if (!invoiceRef.current) return;

    const { toPng, jsPDF } = await loadImgAndPdfDeps();

    const dataUrl = await toPng(invoiceRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#000000",
      filter: excludeControls,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 48;

    // ukur PNG
    const img = new window.Image();
    img.src = dataUrl;
    await new Promise<void>((resolve) => { img.onload = () => resolve(); });

    const imgW = img.width;
    const imgH = img.height;

    const maxW = Math.min(pageW - margin * 2, EXPORT_PDF_MAX_WIDTH_PX);
    const maxH = pageH - margin * 2;
    const scale = Math.min(maxW / imgW, maxH / imgH);

    const renderW = imgW * scale;
    const renderH = imgH * scale;
    const x = (pageW - renderW) / 2;
    const y = (pageH - renderH) / 2;

    pdf.addImage(dataUrl, "PNG", x, y, renderW, renderH, undefined, "FAST");
    pdf.save(`invoice-${invoice.id}.pdf`);
  };

  /* ======================== Download JPG ======================== */
  const handleDownloadJPG = async (): Promise<void> => {
    if (!invoiceRef.current) return;

    const { toJpeg } = await loadImgAndPdfDeps();

    const dataUrl = await toJpeg(invoiceRef.current, {
      quality: 0.95,
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#000000",
      filter: excludeControls, // <-- tombol tidak ikut
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `invoice-${invoice.id}.jpg`;
    a.click();
  };

  const handlePrint = (): void => window.print();

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden print:bg-white print:text-black">
      {/* background untuk preview */}
      <NextImage
        src="/invoice-bg.jpg"
        alt=""
        fill
        className="object-cover object-center opacity-20 pointer-events-none print:hidden"
      />
      <div className="absolute inset-0 bg-black/20 pointer-events-none print:hidden" />

      <div
        ref={invoiceRef}
        className="relative z-10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border-2 border-[#97CCDD] bg-black/80 backdrop-blur-xl mx-4 print:shadow-none print:border-none print:bg-white print:text-black"
        style={{
          backgroundImage: "url('/invoice-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex flex-col md:flex-row gap-0 md:gap-8 bg-black/60">
          {/* kiri */}
          <div className="flex flex-col items-center py-8 px-7 md:w-1/3 bg-black/10 border-r border-[#97CCDD]/40 print:border-none">
            <NextImage
              src="/grindup-logo.png"
              alt="Logo Gym"
              width={85}
              height={85}
              className="mb-3 rounded-full bg-white shadow-lg"
            />
            <div className="text-[#97CCDD] text-xl font-black mb-5 text-center tracking-wider">
              GRIND UP FITNESS
            </div>

            <div className="relative bg-white p-2 rounded-lg border-2 border-[#97CCDD] shadow-lg mb-2">
              <QRCode value={qrURL} size={72} />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "url('/qr-watermark.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.2,
                }}
              />
            </div>
            <span className="text-xs text-[#97CCDD] mt-1 mb-1">Scan Member QR</span>

            <div className="flex flex-col gap-1 mt-5 text-sm text-white">
              <span className="font-semibold">Invoice ID:</span>
              <span className="text-[#97CCDD] font-bold break-all">{invoice.id}</span>
            </div>

            <div className="mt-5">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusClass} text-white`}>
                {invoice.status}
              </span>
            </div>
          </div>

          {/* kanan */}
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div>
              <div className="mb-1">
                <div className="text-lg font-semibold text-[#97CCDD]">INVOICE PEMBAYARAN</div>
                <div className="text-sm text-gray-400">
                  Tanggal:{" "}
                  {dt
                    ? dt.toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </div>
              </div>

              <hr className="my-3 border-[#97CCDD]/40" />

              <div className="mb-2">
                <div className="font-bold text-xl text-white">{invoice.memberName}</div>
                <div className="text-sm text-[#97CCDD] font-semibold">{invoice.memberType}</div>
                <div className="text-xs text-gray-400">{invoice.memberEmail}</div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm">
                <div>
                  <span className="text-gray-300">Paket</span>
                  <div className="font-semibold text-white">{invoice.memberType}</div>
                </div>
                <div>
                  <span className="text-gray-300">Jumlah Bulan</span>
                  <div className="font-semibold text-white">
                    {Math.max(1, Number(invoice.cycles || 1))} Bulan
                  </div>
                </div>
                <div>
                  <span className="text-gray-300">Expired Baru</span>
                  <div className="font-semibold text-white">
                    {exp
                      ? exp.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                      : "-"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-300">Price</span>
                  <div className="font-bold text-[#97CCDD] text-lg">{toRupiah(invoice.price)}</div>
                </div>
                <div>
                  <span className="text-gray-300">Admin</span>
                  <div className="font-semibold text-white">{invoice.admin || "-"}</div>
                </div>
                <div>
                  <span className="text-gray-300">Status</span>
                  <div className="font-semibold text-white capitalize">{invoice.status}</div>
                </div>
              </div>

              <div className="mt-7 mb-2">
                <span className="text-gray-400 text-xs">
                  * Invoice ini dibuat otomatis oleh sistem Grind Up Gym pada tanggal{" "}
                  {dt
                    ? dt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
                    : "-"}
                </span>
              </div>
            </div>

            {/* tombol aksi (disembunyikan saat print & tidak ikut export via filter) */}
            <div className="no-export flex flex-wrap gap-3 mt-4 print:hidden">
              {invoice.proofUrl && (
                <a
                  href={invoice.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-[#97CCDD] hover:bg-[#1CB5E0] transition shadow"
                >
                  <ExternalLink className="w-4 h-4" />
                  Lihat Bukti Pembayaran
                </a>
              )}
              <button
                type="button"
                onClick={() => void handleDownloadPDF()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-black/60 hover:bg-black/90 border border-[#97CCDD] transition shadow"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadJPG()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-black/60 hover:bg-black/90 border border-[#97CCDD] transition shadow"
              >
                <ImageDown className="w-4 h-4" />
                Download JPG
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-black/60 hover:bg-black/90 border border-[#97CCDD] transition shadow"
              >
                <Printer className="w-4 h-4" />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print helpers */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #fff !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

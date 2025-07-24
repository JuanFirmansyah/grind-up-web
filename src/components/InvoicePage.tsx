// src\components\InvoicePage.tsx
import Image from "next/image";
import QRCode from "react-qr-code";
import { useRef } from "react";
export interface InvoiceProps {
  id: string;
  status: "verified" | "pending" | "rejected";
  memberId: string; // <- PENTING: supaya QR mengarah ke profil!
  memberName: string;
  memberEmail: string;
  memberType: string;
  payMonth: number;
  nominal: number;
  paidAt: string;
  expiredAt: string;
  admin: string;
  buktiURL?: string;
  qrValue?: string; // boleh pakai value custom
}

export default function InvoicePage({ invoice }: { invoice: InvoiceProps }) {
  const tgl = new Date(invoice.paidAt);
  const expired = new Date(invoice.expiredAt);
  const toRupiah = (val: number) =>
    val.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
  const statusColor = {
    verified: "bg-green-600",
    pending: "bg-yellow-500",
    rejected: "bg-red-600",
  }[invoice.status] || "bg-gray-600";

  // Untuk html2pdf
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Download PDF function
  const handleDownload = async () => {
    if (!invoiceRef.current) return;
    const html2pdf = (await import("html2pdf.js")).default; // import dynamically!
    html2pdf()
      .set({
        margin: [0, 0],
        filename: `invoice-${invoice.id}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all"] },
      })
      .from(invoiceRef.current)
      .save();
  };

  // QR url mengarah ke detail member
  const qrURL = invoice.qrValue || `${process.env.NEXT_PUBLIC_APP_URL || "https://grindupfitness.com"}/member/${invoice.memberId}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden print:bg-white print:text-black">
      {/* Background image untuk preview */}
      <Image src="/invoice-bg.jpg" alt="" fill className="object-cover object-center opacity-20 pointer-events-none print:hidden" />
      <div className="absolute inset-0 bg-black/20 print:hidden" />
      {/* Invoice Card */}
      <div
        className="relative z-10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border-2 border-[#97CCDD] bg-black/80 backdrop-blur-xl mx-4 print:shadow-none print:border-none print:bg-white print:text-black"
        ref={invoiceRef}
        style={{
          backgroundImage: "url('/invoice-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex flex-col md:flex-row gap-0 md:gap-8 bg-black/60">
          {/* Kiri: Logo dan QR */}
          <div className="flex flex-col items-center py-8 px-7 md:w-1/3 bg-black/10 border-r border-[#97CCDD]/40 print:bg-auto print:border-none">
            <Image src="/grindup-logo.png" alt="Logo Gym" width={85} height={85} className="mb-3 rounded-full bg-white shadow-lg" />
            <div className="text-[#97CCDD] text-xl font-black mb-5 text-center select-none tracking-wider print:text-white">GRIND UP FITNESS</div>
            {/* QRCode, dengan watermark */}
            <div className="relative bg-white p-2 rounded-lg border-2 border-[#97CCDD] shadow-lg mb-2">
              <QRCode value={qrURL} size={72} />
              {/* Watermark transparan anti-screenshot */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "url('/qr-watermark.png') center/cover", opacity: 0.2 }} />
            </div>
            <span className="text-xs text-[#97CCDD] mt-1 mb-1">Scan Member QR</span>
            <div className="flex flex-col gap-1 mt-5 text-sm text-white print:text-white">
              <span className="font-semibold">Invoice ID:</span>
              <span className="text-[#97CCDD] font-bold">{invoice.id}</span>
            </div>
            <div className="mt-5">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor} text-white`}>
                {invoice.status === "verified" ? "Terverifikasi" : invoice.status === "pending" ? "Menunggu" : "Ditolak"}
              </span>
            </div>
          </div>
          {/* Kanan: Detail invoice */}
          <div className="flex-1 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-lg font-semibold text-[#97CCDD] print:text-white">INVOICE PEMBAYARAN</div>
                  <div className="text-sm text-gray-400 print:text-white">
                    Tanggal: {tgl.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
              <hr className="my-3 border-[#97CCDD]/40" />
              <div className="mb-2">
                <div className="font-bold text-xl text-white print:text-white">{invoice.memberName}</div>
                <div className="text-sm text-[#97CCDD] font-semibold">{invoice.memberType}</div>
                <div className="text-xs text-gray-400 print:text-white">{invoice.memberEmail}</div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4 text-sm">
                <div>
                  <span className="text-gray-300 print:text-white">Paket</span>
                  <div className="font-semibold text-white print:text-white">{invoice.memberType}</div>
                </div>
                <div>
                  <span className="text-gray-300 print:text-white">Jumlah Bulan</span>
                  <div className="font-semibold text-white print:text-white">{invoice.payMonth} Bulan</div>
                </div>
                <div>
                  <span className="text-gray-300 print:text-white">Expired Baru</span>
                  <div className="font-semibold text-white print:text-white">
                    {expired.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div>
                  <span className="text-gray-300 print:text-white">Nominal</span>
                  <div className="font-bold text-[#97CCDD] text-lg print:text-white">{toRupiah(invoice.nominal)}</div>
                </div>
                <div>
                  <span className="text-gray-300 print:text-white">Admin</span>
                  <div className="font-semibold text-white print:text-white">{invoice.admin}</div>
                </div>
                <div>
                  <span className="text-gray-300 print:text-white">Status</span>
                  <div className="font-semibold text-white print:text-white capitalize">{invoice.status}</div>
                </div>
              </div>
              <div className="mt-7 mb-2">
                <span className="text-gray-400 text-xs print:text-white">
                  * Invoice ini dibuat otomatis oleh sistem Grind Up Gym pada tanggal {tgl.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>
            <div className="flex gap-4 mt-4 print:hidden">
              {invoice.buktiURL && (
                <a href={invoice.buktiURL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-[#97CCDD] hover:bg-[#1CB5E0] transition shadow">
                  Lihat Bukti Pembayaran
                </a>
              )}
              <button
                className="inline-flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-black/60 hover:bg-black/90 border border-[#97CCDD] transition shadow"
                onClick={handleDownload}
                type="button"
              >
                Download Invoice PDF
              </button>
              <button
                className="inline-flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-black/60 hover:bg-black/90 border border-[#97CCDD] transition shadow"
                onClick={() => window.print()}
                type="button"
              >
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-5 right-6 z-10 text-xs text-[#97CCDD]/80 select-none print:hidden">© Grind Up Gym 2025</div>
      {/* Print Background Fix */}
      <style jsx global>{`
        @media print {
          body {
            background: #111 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:bg-white {
            background: #222 !important;
          }
          .print\\:text-black {
            color: #111 !important;
          }
        }
      `}</style>
    </div>
  );
}

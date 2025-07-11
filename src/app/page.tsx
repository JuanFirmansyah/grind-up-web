"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

// --- COUNTDOWN LOGIC ---
const LAUNCH_DATE = new Date("2025-07-15T00:00:00+08:00"); // 15 Juli 2025 WIB

type CountdownState = { d: number; h: number; m: number; s: number; };

function getCountdown(): CountdownState {
  const now = new Date();
  const diff = Math.max(0, LAUNCH_DATE.getTime() - now.getTime());
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return { d, h, m, s };
}

// NAVIGATION (clean responsive)
function Navbar() {
  return (
    <header className="w-full z-30 bg-white/70 border-b border-gray-100 sticky top-0 backdrop-blur-md shadow-sm">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Image src="/grindup-logo.jpeg" alt="Logo" width={40} height={40} className="rounded-full bg-white border" />
          <span className="font-black text-lg tracking-tight text-gray-800">Grind Up Gym</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="#fitur" className="text-gray-700 px-3 py-1 rounded-xl hover:bg-[#97CCDD]/10 transition font-medium hidden sm:block">Fitur</Link>
          <Link href="#demo" className="text-gray-700 px-3 py-1 rounded-xl hover:bg-[#97CCDD]/10 transition font-medium hidden sm:block">Demo</Link>
          <Link href="#kontak" className="text-gray-700 px-3 py-1 rounded-xl hover:bg-[#97CCDD]/10 transition font-medium hidden sm:block">Kontak</Link>
          <Link href="/login" className="ml-2 px-5 py-2 rounded-xl bg-white border border-gray-200 font-bold text-gray-800 hover:bg-[#97CCDD]/20 shadow-sm transition text-sm active:scale-95">
            Login Admin
          </Link>
        </div>
      </nav>
    </header>
  );
}

// MAIN HOME PAGE
export default function Home() {
  // State countdown
  const [countdown, setCountdown] = useState<CountdownState>(getCountdown());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#97CCDD]/50 via-white to-gray-50 flex flex-col">
      <Navbar />

      {/* HERO SECTION */}
      <section className="flex-1 flex flex-col justify-center items-center px-4 py-12 relative">
        {/* Animasi BG bulat */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1.08, opacity: 0.13 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute z-0 left-1/2 top-28 -translate-x-1/2 w-[340px] h-[340px] md:w-[480px] md:h-[480px] bg-[#97CCDD] rounded-full blur-[80px] shadow-xl"
        />
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.2 }}
          className="z-10 flex flex-col items-center"
        >
          <Image src="/grindup-logo.jpeg" alt="Logo" width={80} height={80} className="rounded-full mb-4 bg-white shadow-lg" />
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-800 mb-2 text-center drop-shadow-sm">
            Grind Up Fitness System
          </h1>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center mt-2">
            Jadi Lebih Profesional
          </h2>
          <p className="text-lg md:text-xl text-gray-700 mb-3 text-center max-w-2xl">
            Sistem booking, absensi, dan dashboard admin berbasis aplikasi mobile untuk gym masa kini.
          </p>
          <p className="mb-3 text-sm md:text-base text-gray-500 flex flex-col md:flex-row gap-1 justify-center items-center">
            <span>Ready for Launch</span>
            <span>
              <span className="mx-2 hidden md:inline">|</span>
              Launching <b className="text-accent">{formatDate(LAUNCH_DATE)}</b>
            </span>
          </p>

          {/* COUNTDOWN */}
          <div className="flex justify-center gap-2 md:gap-4 mt-4 mb-8">
            {(["d", "h", "m", "s"] as Array<keyof CountdownState>).map((unit, i) => (
              <motion.div
                key={unit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 + i * 0.08 }}
                className="flex flex-col items-center bg-white/90 backdrop-blur px-4 py-3 rounded-xl shadow border-2 border-[#97CCDD] min-w-[64px]"
              >
                <span className="font-extrabold text-2xl md:text-3xl text-[#156477] tabular-nums">
                  {countdown[unit]}
                </span>
                <span className="text-xs font-bold text-[#1CB5E0] uppercase tracking-wide mt-1">
                  {unit === "d" ? "HARI" : unit === "h" ? "JAM" : unit === "m" ? "MENIT" : "DETIK"}
                </span>
              </motion.div>
            ))}
          </div>

          <motion.a
            href="https://wa.me/6285654444777"
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.96 }}
            className="inline-block bg-[#1CB5E0] hover:bg-[#156477] text-white font-bold py-3 px-8 rounded-xl shadow-lg transition text-lg mb-2"
          >
            Hubungi Kami
          </motion.a>
          <div className="mt-2 text-sm text-gray-500">Admin?{" "}
            <Link href="/login" className="text-blue-700 hover:underline font-medium">
              Login Dashboard Admin
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FITUR SECTION */}
      <section id="fitur" className="py-20 px-6 max-w-6xl mx-auto w-full">
        <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12 text-gray-800">Fitur Unggulan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {[
            {
              icon: "/icons/booking.svg",
              title: "Booking Kelas Mudah",
              desc: "Member dapat booking kelas seperti Zumba, Yoga, Muaythai langsung dari aplikasi."
            },
            {
              icon: "/icons/gps.svg",
              title: "Absensi Otomatis",
              desc: "Check-in kelas menggunakan GPS atau QR Code untuk validasi kehadiran yang efisien."
            },
            {
              icon: "/icons/reminder.svg",
              title: "Penalti & Reminder",
              desc: "Hindari kelas kosong dengan fitur konfirmasi ulang dan penalti no-show otomatis."
            },
            {
              icon: "/icons/dashboard.svg",
              title: "Dashboard Admin",
              desc: "Lihat statistik, atur jadwal kelas, dan kelola member langsung dari web dashboard."
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 * idx }}
              viewport={{ once: true }}
              className="rounded-2xl border border-gray-100 bg-white shadow-md p-6 text-center hover:scale-105 transition-transform duration-300"
            >
              <Image src={item.icon} alt={item.title} width={50} height={50} className="mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* DEMO SECTION */}
      <section id="demo" className="bg-[#97CCDD]/20 py-20 px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-gray-800">Lihat Demo</h2>
        <p className="text-lg mb-8 text-gray-600">Demo aplikasi, UI dashboard, dan simulasi penggunaan.</p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <Image
            src="/demo-1.png"
            alt="Demo Dashboard"
            width={340}
            height={210}
            className="rounded-xl shadow-lg border"
          />
          <Image
            src="/demo-2.png"
            alt="Demo Mobile App"
            width={220}
            height={400}
            className="rounded-xl shadow-lg border"
          />
        </div>
      </section>

      {/* CTA KONTAK */}
      <section id="kontak" className="bg-[#1CB5E0] text-white py-20 px-4 text-center relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 0.15, scale: 1.1 }}
          transition={{ duration: 1.2 }}
          viewport={{ once: true }}
          className="absolute top-0 left-0 w-full h-full bg-black/40 skew-y-3"
        />
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Siap Mengubah Gym Anda?</h2>
          <p className="text-lg mb-7">Hubungi kami dan jadwalkan demo langsung untuk bisnis Anda.</p>
          <a
            href="https://wa.me/6285654444777"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-[#1CB5E0] px-8 py-3 rounded-xl hover:bg-gray-100 transition text-lg font-bold shadow-md"
          >
            Hubungi via WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}

// Helper for tanggal launching format
function formatDate(date: Date) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Makassar" };
  return date.toLocaleDateString("id-ID", opts);
}

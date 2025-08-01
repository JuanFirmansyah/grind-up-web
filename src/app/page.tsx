"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

// GANTI INI: URL APK dari Firebase Storage (pastikan bisa public download)
const ANDROID_APK_URL = "https://firebasestorage.googleapis.com/v0/b/grind-up.firebasestorage.app/o/apk%2Fgrindup-v1.apk?alt=media&token=1c0a4459-85ec-41dc-b315-859c727c365f";

// Banner baru, ganti sesuai branding kamu
const HERO_IMAGE_URL = "/hero-app.png"; // Upload file ini ke /public
const LOGO_URL = "/grindup-logo.png";

// ========== NAVBAR ==========
function Navbar() {
  return (
    <header className="w-full z-30 bg-white/70 border-b border-gray-100 sticky top-0 backdrop-blur-md shadow-sm">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Image src={LOGO_URL} alt="Logo" width={40} height={40} className="rounded-full bg-white border" />
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

// ========== HOMEPAGE ==========
export default function Home() {
  const [downloading, setDownloading] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#97CCDD]/50 via-white to-gray-50 flex flex-col">
      <Navbar />

      {/* HERO SECTION */}
      <section className="flex-1 flex flex-col md:flex-row justify-center items-center px-4 py-10 relative gap-8">
        {/* Animasi BG */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.1, opacity: 0.13 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute z-0 left-1/2 top-20 -translate-x-1/2 w-[350px] h-[350px] md:w-[500px] md:h-[500px] bg-[#97CCDD] rounded-full blur-[100px] shadow-2xl"
        />

        {/* Banner kiri */}
        <motion.div
          className="z-10 flex-1 flex justify-center"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.08 }}
        >
          <Image
            src={HERO_IMAGE_URL}
            alt="Hero Banner"
            width={370}
            height={460}
            className="rounded-2xl shadow-xl border border-[#97CCDD]/40 bg-white object-cover w-[300px] h-[380px] md:w-[370px] md:h-[460px]"
            priority
          />
        </motion.div>

        {/* Kanan: Judul dan tombol */}
        <motion.div
          className="flex-1 flex flex-col justify-center items-center md:items-start z-10 text-center md:text-left"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.25 }}
        >
          <Image src={LOGO_URL} alt="Logo" width={66} height={66} className="rounded-full mb-4 shadow-lg mx-auto md:mx-0" />
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-gray-800 mb-3 drop-shadow-sm">
            Grind Up Gym App<br />
            <span className="text-[#97CCDD] font-bold">Official Release!</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-5 max-w-xl">
            Download aplikasi Grind Up Gym versi Android.<br />
            Pantau jadwal, booking kelas, dan kelola keanggotaan lebih mudah dari genggamanmu!
          </p>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto justify-center md:justify-start items-center">
            {/* Download APK Android */}
            <motion.a
              href={ANDROID_APK_URL}
              download
              whileTap={{ scale: 0.97 }}
              onClick={() => setDownloading(true)}
              className="inline-flex items-center px-6 py-3 rounded-xl bg-[#1CB5E0] hover:bg-[#156477] text-white font-bold shadow-lg text-lg gap-3 transition active:scale-95 w-full md:w-auto justify-center"
            >
              <svg className="w-7 h-7 mr-2" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14" />
              </svg>
              Download Android
              {downloading && (
                <span className="ml-3 animate-spin rounded-full border-b-2 border-white w-5 h-5"></span>
              )}
            </motion.a>
            {/* iOS Coming Soon */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center px-6 py-3 rounded-xl bg-gray-200 text-gray-500 font-semibold shadow text-lg gap-3 cursor-not-allowed w-full md:w-auto justify-center"
              disabled
            >
              <svg className="w-7 h-7 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l-7 7-3-3" />
              </svg>
              iOS Coming Soon
            </motion.button>
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

      {/* KONTAK CTA */}
      <section id="kontak" className="bg-[#1CB5E0] text-white py-20 px-4 text-center relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 0.15, scale: 1.1 }}
          transition={{ duration: 1.2 }}
          viewport={{ once: true }}
          className="absolute top-0 left-0 w-full h-full bg-black/40 skew-y-3"
        />
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Kami adalah pilihan terbaik kamu</h2>
          <p className="text-lg mb-7">Hubungi kami dan konsultasikan badan kamu.</p>
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

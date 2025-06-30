// Home Page UI Components Inline
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white text-gray-900">
      {/* Hero Section */}
      <section className="py-20 px-6 text-center relative overflow-hidden">
        <div className="absolute -top-20 -left-32 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute -bottom-20 -right-32 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-40"></div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Transformasi Gym Anda <br className="hidden md:block" /> Jadi Lebih Profesional
        </h1>
        <p className="text-lg md:text-xl mb-6 max-w-xl mx-auto">
          Sistem booking & absensi otomatis berbasis aplikasi mobile dan dashboard admin. Solusi modern untuk gym masa kini.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <button className="bg-blue-600 text-white px-6 py-3 text-lg rounded-2xl shadow-md hover:bg-blue-700 transition">
            Lihat Demo
          </button>
          <button className="border border-blue-500 text-blue-600 px-6 py-3 text-lg rounded-2xl hover:bg-blue-50 transition">
            Hubungi Kami
          </button>
        </div>
        <div className="mt-6">
          <Link href="/login" className="text-sm text-blue-500 hover:underline">
            Login Admin
          </Link>
        </div>
      </section>

      {/* Fitur Utama */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-12">Fitur Unggulan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div key={idx} className="rounded-2xl border bg-white shadow-md p-6 text-center hover:scale-105 transition-transform duration-300">
              <Image src={item.icon} alt={item.title} width={50} height={50} className="mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-blue-800 opacity-20 skew-y-3"></div>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Siap Mengubah Gym Anda?</h2>
          <p className="text-lg mb-6">Hubungi kami dan jadwalkan demo langsung untuk bisnis Anda.</p>
          <a href="https://wa.me/628123456789" target="_blank" rel="noopener noreferrer" className="inline-block bg-white text-blue-700 px-8 py-3 rounded-xl hover:bg-gray-100 transition text-lg">
            Hubungi via WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}

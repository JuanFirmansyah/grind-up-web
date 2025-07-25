// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiLock, FiAlertCircle, FiCheckCircle } from "react-icons/fi";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 1500);
    } catch (err: unknown) {
      console.error("Login error:", err);

      if (typeof err === "object" && err !== null && "code" in err) {
        const code = (err as { code: string }).code;
        switch (code) {
          case "auth/user-not-found":
            setError("Email tidak ditemukan. Cek kembali alamat email Anda.");
            break;
          case "auth/wrong-password":
            setError("Password salah. Silakan coba lagi.");
            break;
          case "auth/invalid-email":
            setError("Format email tidak valid.");
            break;
          default:
            setError("Terjadi kesalahan saat login. Silakan coba lagi.");
        }
      } else {
        setError("Terjadi kesalahan saat login. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isInvalidEmail = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const showAlert = (type: "error" | "success", message: string) => {
    if (!isMounted) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed ${isMobile ? "bottom-4" : "top-4 right-4"} z-50 p-4 rounded-lg shadow-lg ${
          type === "error" ? "bg-red-100 border-l-4 border-red-500" : "bg-green-100 border-l-4 border-green-500"
        }`}
      >
        <div className="flex items-center">
          {type === "error" ? (
            <FiAlertCircle className="text-red-500 mr-2" size={24} />
          ) : (
            <FiCheckCircle className="text-green-500 mr-2" size={24} />
          )}
          <span className={`${type === "error" ? "text-red-800" : "text-green-800"}`}>
            {message}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4 sm:px-6">
      {/* Background elements */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 overflow-hidden"
      >
        <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full bg-blue-200 opacity-20 blur-xl animate-float1"></div>
        <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-purple-200 opacity-20 blur-xl animate-float2"></div>
        <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-cyan-200 opacity-20 blur-xl animate-float3"></div>
      </motion.div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="w-full max-w-md p-8 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl relative z-10 border border-white/20 overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-blue-100 opacity-30 blur-xl"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-cyan-100 opacity-30 blur-xl"></div>
        
        <div className="relative z-10">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center shadow-md">
              <FiMail className="text-white" size={28} />
            </div>
          </motion.div>

          <motion.h1
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-center text-gray-800 mb-2"
          >
            Selamat Datang
          </motion.h1>
          <motion.p
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-gray-500 mb-8"
          >
            Masuk untuk mengakses dashboard admin
          </motion.p>

          <form onSubmit={handleLogin} className="space-y-6">
            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 mt-1 w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    isInvalidEmail
                      ? "border-red-400 focus:ring-red-300"
                      : "border-gray-300 focus:border-blue-400 focus:ring-blue-300"
                  }`}
                  disabled={isLoading}
                  placeholder="email@contoh.com"
                />
              </div>
              {isInvalidEmail && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="text-sm text-red-500 mt-1 flex items-center"
                >
                  <FiAlertCircle className="mr-1" /> Format email tidak valid
                </motion.p>
              )}
            </motion.div>

            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 mt-1 w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-300 transition-all duration-200"
                  disabled={isLoading}
                  placeholder="••••••••"
                />
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-start">
                    <FiAlertCircle className="flex-shrink-0 mr-2 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <button
                type="submit"
                disabled={isLoading || !email || !password || !!isInvalidEmail}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] focus:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  isLoading ? "bg-blue-400" : "bg-gradient-to-r from-blue-400 to-cyan-400 hover:shadow-lg"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    ></motion.div>
                    <span>Memproses...</span>
                  </div>
                ) : (
                  "Masuk"
                )}
              </button>
            </motion.div>
          </form>
        </div>
      </motion.div>

      {/* Animated alerts - only render on client */}
      {isMounted && (
        <AnimatePresence>
          {error && showAlert("error", error)}
          {showSuccess && showAlert("success", "Login berhasil! Mengalihkan...")}
        </AnimatePresence>
      )}

      {/* Floating particles - only render on client */}
      {isMounted && [...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{
            duration: 3 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
          className={`absolute rounded-full bg-blue-200`}
          style={{
            width: `${5 + Math.random() * 10}px`,
            height: `${5 + Math.random() * 10}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </main>
  );
}
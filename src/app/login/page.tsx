// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase"; // pastikan kamu sudah buat file `lib/firebase.ts`


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/admin/dashboard");
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



  const isInvalidEmail = email && !email.includes("@");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-white px-6">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl relative animate-fade-in">
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">Login Admin</h1>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${isInvalidEmail ? "border-red-400 ring-red-300" : "focus:ring-blue-500"}`}
              disabled={isLoading}
            />
            {isInvalidEmail && (
              <p className="text-sm text-red-500 mt-1">Format email tidak valid</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center animate-pulse">{error}</p>}
          <button
            type="submit"
            disabled={isLoading || !email || !password || !!isInvalidEmail}
            className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Logging in...</span>
              </div>
            ) : (
              "Masuk"
            )}
          </button>
        </form>
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-300 rounded-full blur-2xl opacity-30"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-300 rounded-full blur-2xl opacity-30"></div>
      </div>
    </main>
  );
}
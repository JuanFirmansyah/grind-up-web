// src/components/admin/AdminMobileDrawer.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import {
  LayoutDashboard,
  Dumbbell,
  Package,
  Users,
  FileText,
  UserCog,
  LogOut,
  X,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
}

interface Props {
  navItems: NavItem[];
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
  showLogout?: boolean;
}

const iconMap: Record<string, ReactNode> = {
  Dashboard: <LayoutDashboard className="w-5 h-5" />,
  Kelas: <Dumbbell className="w-5 h-5" />,
  "Paket Membership": <Package className="w-5 h-5" />,
  Member: <Users className="w-5 h-5" />,
  Laporan: <FileText className="w-5 h-5" />,
  "Pelatih Pribadi": <UserCog className="w-5 h-5" />,
};

export function AdminMobileDrawer({
  isOpen,
  onClose,
  navItems,
  onLogout,
  showLogout = false,
}: Props) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="drawer"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 25 }}
          className="fixed top-0 left-0 w-64 h-full 
            bg-gradient-to-b from-[#6FB5CC] to-[#4A9EBB] 
            text-white z-50 shadow-2xl rounded-r-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/20 flex justify-between items-center bg-white/10 backdrop-blur-sm">
            <h2 className="text-lg font-bold tracking-wide">Menu</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-1 transition"
              aria-label="Tutup menu"
              title="Tutup"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                    active
                      ? "bg-white/25 font-semibold shadow-md"
                      : "hover:bg-white/10"
                  }`}
                >
                  <span>{iconMap[item.label] ?? <LayoutDashboard className="w-5 h-5" />}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {showLogout && (
              <button
                onClick={() => {
                  onLogout?.();
                  onClose();
                }}
                className="flex items-center gap-3 w-full text-left px-3 py-2 mt-6 rounded-lg transition bg-red-500 hover:bg-red-600 shadow-md"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            )}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// src/components/admin/AdminMobileDrawer.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function AdminMobileDrawer({ isOpen, onClose, navItems, onLogout, showLogout = false }: Props) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="drawer"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 w-64 h-full bg-blue-700 text-white z-50 shadow-lg"
        >
          <div className="p-4 border-b border-blue-600 flex justify-between items-center">
            <h2 className="text-xl font-bold">Menu</h2>
            <button onClick={onClose} className="text-white text-2xl">×</button>
          </div>
          <nav className="p-4 space-y-3">
            {navItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                onClick={onClose}
                className={`block px-3 py-2 rounded transition hover:bg-blue-600 ${pathname === item.href ? "bg-blue-600 font-semibold" : ""}`}
              >
                {item.label}
              </Link>
            ))}
            {showLogout && (
              <button
                onClick={() => {
                  onLogout?.();
                  onClose();
                }}
                className="block w-full text-left px-3 py-2 mt-4 bg-red-600 hover:bg-red-700 rounded transition"
              >
                Logout
              </button>
            )}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// src/components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  navItems: { label: string; href: string }[];
  showLogout?: boolean;
  onLogout?: () => void;
}

export function AdminSidebar({ navItems, showLogout = false, onLogout }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-blue-700 text-white min-h-screen py-6 px-4 hidden md:block">
      <h2 className="text-2xl font-bold mb-8">GrindUp Admin</h2>
      <nav className="space-y-3">
        {navItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className={cn(
              "block px-4 py-2 rounded transition hover:bg-blue-600",
              pathname === item.href && "bg-blue-600 font-semibold"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {showLogout && (
        <button
          onClick={onLogout}
          className="w-full mt-6 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
        >
          Logout
        </button>
      )}
    </aside>
  );
}

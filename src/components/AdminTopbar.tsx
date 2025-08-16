// src/components/admin/AdminTopbar.tsx
"use client";

import { Menu, LogOut, User } from "lucide-react";

interface Props {
  onOpen: () => void;
  onLogout?: () => void;
  showLogout?: boolean;
}

export function AdminTopbar({ onOpen, onLogout, showLogout = false }: Props) {
  return (
    <div className="md:hidden flex items-center justify-between 
      bg-gradient-to-r from-[#6FB5CC] to-[#4A9EBB] 
      text-white p-4 shadow-md">
      
      {/* Left - Menu Button */}
      <button
        onClick={onOpen}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {/* Center - Title */}
      <h1 className="text-lg font-bold tracking-wide drop-shadow-sm">
        GrindUp Admin
      </h1>

      {/* Right - User / Logout */}
      <div className="flex items-center gap-3">
        <User size={22} className="text-white opacity-90" />
        {showLogout && (
          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-red-500/80 transition-colors"
            aria-label="Logout"
          >
            <LogOut size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

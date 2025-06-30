// src/components/admin/AdminTopbar.tsx
"use client";

import { Menu } from "lucide-react";

export function AdminTopbar({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="md:hidden flex items-center justify-between bg-blue-700 text-white p-4">
      <button onClick={onOpen}>
        <Menu size={24} />
      </button>
      <h1 className="text-lg font-semibold">GrindUp Admin</h1>
      <div></div>
    </div>
  );
}


// src/app/admin/classes/form/page.tsx

"use client";
import { Suspense } from "react";
import ClassForm from "./ClassForm";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading Form...</div>}>
      <ClassForm />
    </Suspense>
  );
}

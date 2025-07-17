// src/app/admin/classes/form/page.tsx

"use client";
import { Suspense } from "react";
import FunctionalForm from "./FunctionalForm";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading Form...</div>}>
      <FunctionalForm />
    </Suspense>
  );
}

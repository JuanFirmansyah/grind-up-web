"use client";
import { Suspense } from "react";
import MemberFormInner from "./MemberFormInner";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading Form...</div>}>
      <MemberFormInner />
    </Suspense>
  );
}

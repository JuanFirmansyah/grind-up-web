// src/app/admin/members/form/page.tsx

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import { ClassForm } from "./ClassForm";

export default function ClassFormPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClassForm />
    </Suspense>
  );
}

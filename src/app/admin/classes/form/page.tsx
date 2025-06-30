import { Suspense } from "react";
import { ClassForm } from "./ClassForm";

export default function FormPage() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-500">Memuat form...</p>}>
      <ClassForm />
    </Suspense>
  );
}

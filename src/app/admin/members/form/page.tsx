"use client";

import dynamic from "next/dynamic";

const MemberForm = dynamic(() => import("./MemberForm"), { ssr: false });

export default function Page() {
  return <MemberForm />;
}

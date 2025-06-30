import dynamic from "next/dynamic";

const ClassForm = dynamic(() => import("./Classform"), { ssr: false });

export default function Page() {
  return <ClassForm />;
}

import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className={cn("w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500", className)}
      {...props}
    />
  );
};

export default Input;

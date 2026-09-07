import Link from "next/link";
import { ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[#171717] text-white shadow-lg hover:-translate-y-0.5",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  outline: "border border-black/10 bg-white hover:bg-gray-50",
};

const BASE = "inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-bold";

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

/** Matches the `rounded-xl bg-[#171717] px-6 py-3.5 text-sm font-bold text-white` pattern used across the demo. */
export default function Button({
  children,
  variant = "primary",
  className = "",
  href,
  onClick,
  type = "button",
  disabled,
}: ButtonProps) {
  const classes = `${BASE} ${VARIANT_CLASSES[variant]} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}

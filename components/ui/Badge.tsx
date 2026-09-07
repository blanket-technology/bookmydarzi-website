import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "light" | "dark";
  className?: string;
}

/** Small pill label - matches the "Most Popular"/category-tag pattern from app/services/page.tsx. */
export default function Badge({ children, variant = "light", className = "" }: BadgeProps) {
  const styles =
    variant === "dark"
      ? "bg-[#171717] text-white"
      : "bg-white/90 text-[#171717]";
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${styles} ${className}`}
    >
      {children}
    </span>
  );
}

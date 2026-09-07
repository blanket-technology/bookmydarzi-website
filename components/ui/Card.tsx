import Link from "next/link";
import { ReactNode } from "react";

const BASE = "overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl";

interface CardProps {
  children: ReactNode;
  className?: string;
  href?: string;
}

/** Matches the `rounded-3xl border border-black/5 bg-white shadow-sm hover:-translate-y-1 hover:shadow-xl` card pattern. */
export default function Card({ children, className = "", href }: CardProps) {
  if (href) {
    return (
      <Link href={href} className={`group block ${BASE} ${className}`}>
        {children}
      </Link>
    );
  }
  return <div className={`${BASE} ${className}`}>{children}</div>;
}

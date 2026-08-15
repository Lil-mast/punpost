import type { SVGProps } from "react";

export default function LogoIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M8 6h12c5.523 0 10 4.477 10 10s-4.477 10-10 10H8V6z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 12h6.5c2.485 0 4.5 2.015 4.5 4.5S20.985 21 18.5 21H12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="1.25" fill="currentColor" />
    </svg>
  );
}

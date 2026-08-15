import Link from "next/link";
import LogoIcon from "@/assets/logo/logo-icon";

export function PunPostLogo() {
  return (
    <Link href="/" className="group relative flex items-center justify-center gap-2">
      <LogoIcon className="relative z-10 h-7 w-7 text-foreground transition-transform group-hover:scale-105" />
      <span className="hidden text-sm font-bold tracking-tight text-foreground sm:inline">
        PunPost
      </span>
    </Link>
  );
}

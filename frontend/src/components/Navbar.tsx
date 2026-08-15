"use client";

import { usePathname } from "next/navigation";
import { NotchNavbar } from "@/components/notch-navbar";
import { PunPostLogo } from "@/components/landing/PunPostLogo";

const LANDING_NAV_PATHS = ["/login", "/register"];

export default function Navbar() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  const useLandingNav =
    LANDING_NAV_PATHS.includes(pathname) || pathname.startsWith("/auth/");

  return (
    <NotchNavbar
      variant={useLandingNav ? "landing" : "app"}
      logo={<PunPostLogo />}
    />
  );
}

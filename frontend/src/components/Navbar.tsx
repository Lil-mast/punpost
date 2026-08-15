"use client";

import { usePathname } from "next/navigation";
import { NotchNavbar } from "@/components/notch-navbar";
import { PunPostLogo } from "@/components/landing/PunPostLogo";

export default function Navbar() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return <NotchNavbar variant="app" logo={<PunPostLogo />} />;
}

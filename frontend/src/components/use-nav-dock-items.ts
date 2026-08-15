"use client";

import { Compass, PenLine, LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearTokens, isLoggedIn } from "@/lib/auth";
import type { DockItem } from "@/components/ui/glass-dock";

export function useNavDockItems(): DockItem[] {
  const router = useRouter();
  const loggedIn = isLoggedIn();

  const handleLogout = () => {
    clearTokens();
    router.push("/");
    router.refresh();
  };

  return [
    {
      title: "Home",
      icon: () => null,
      onClick: () => router.push("/"),
    },
    {
      title: "Explore",
      icon: Compass,
      onClick: () => router.push("/explore"),
    },
    ...(loggedIn
      ? [
          {
            title: "Write",
            icon: PenLine,
            onClick: () => router.push("/create"),
          } satisfies DockItem,
          {
            title: "Logout",
            icon: LogOut,
            onClick: handleLogout,
          } satisfies DockItem,
        ]
      : [
          {
            title: "Login",
            icon: LogIn,
            onClick: () => router.push("/login"),
          } satisfies DockItem,
        ]),
  ];
}

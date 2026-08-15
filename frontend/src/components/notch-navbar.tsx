"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  User,
  Compass,
  Users,
  CreditCard,
  PenLine,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import LogoIcon from "@/assets/logo/logo-icon";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { clearTokens, isLoggedIn } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NavLink = ({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) => (
  <Link
    href={href}
    className="group flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
  >
    <Icon className="h-4 w-4 opacity-70 group-hover:opacity-100" />
    <span>{label}</span>
  </Link>
);

const MobileThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-9 w-9" />;

  const isDark = theme === "dark" || resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};

const LANDING_ITEMS = {
  left: [
    { label: "Home", href: "/#home", icon: Home },
    { label: "About", href: "/#about", icon: User },
    { label: "Explore", href: "/#explore", icon: Compass },
  ] as NavItem[],
  right: [
    { label: "Community", href: "/#community", icon: Users },
    { label: "Pricing", href: "/#pricing", icon: CreditCard },
  ] as NavItem[],
};

const APP_ITEMS = {
  left: [
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Write", href: "/create", icon: PenLine },
    { label: "Dashboard", href: "/dashboard", icon: User },
  ] as NavItem[],
  right: [] as NavItem[],
};

export function NotchNavbar({
  className,
  logo,
  variant = "landing",
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  logo?: React.ReactNode;
  variant?: "landing" | "app";
}) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setAuthReady(true);
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Re-check after OAuth redirect / storage changes
    const syncAuth = () => setLoggedIn(isLoggedIn());
    window.addEventListener("storage", syncAuth);
    window.addEventListener("focus", syncAuth);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("focus", syncAuth);
    };
  }, []);

  const items = variant === "app" ? APP_ITEMS : LANDING_ITEMS;

  const handleLogout = () => {
    clearTokens();
    setLoggedIn(false);
    router.push("/");
    router.refresh();
  };

  const barBg = scrolled
    ? "bg-zinc-50/90 dark:bg-black/90 backdrop-blur-sm"
    : "bg-zinc-50 dark:bg-black";

  const authLinks = !authReady ? (
    <div className="h-9 w-16" aria-hidden />
  ) : loggedIn ? (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
    >
      <LogOut className="h-4 w-4" />
      Logout
    </button>
  ) : (
    <>
      <Link
        href="/login"
        className="whitespace-nowrap text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
      >
        Log in
      </Link>
      <Link
        href="/register"
        className="whitespace-nowrap rounded-2xl bg-foreground px-3 py-1.5 text-sm font-medium text-background shadow-sm shadow-foreground/10 transition-colors hover:bg-foreground/90"
      >
        Sign up
      </Link>
    </>
  );

  return (
    <>
      <header className={cn("fixed inset-x-0 top-0 z-50 flex h-16 px-0", className)} {...props}>
        <div className={cn("relative z-20 h-10 min-w-0 flex-1 transition-colors", barBg)}>
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
          </svg>
        </div>

        <div className="relative z-10 -ml-px flex h-16 shrink-0">
          <div className="relative h-full w-[50px] shrink-0">
            <div className={cn("absolute inset-0 transition-colors", barBg)} style={{ clipPath: "path('M0 0 H50 V64 C25 64 25 40 0 40 Z')" }} />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 50 64">
              <path d="M0 39.5 C25 39.5 25 63.5 50 63.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
              <path d="M0 36.5 C25 36.5 25 60.5 50 60.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            </svg>
          </div>

          <div className="relative -ml-px h-full min-w-0 flex-1">
            <div className={cn("absolute inset-0 transition-colors", barBg)}>
              <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
                <line x1="0" y1="63.5" x2="100%" y2="63.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
                <line x1="0" y1="60.5" x2="100%" y2="60.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
              </svg>
            </div>

            <div className="relative flex h-full w-full items-end justify-between px-4 pb-2 md:px-8">
              <nav className="mb-1 hidden shrink-0 gap-8 md:flex">
                {items.left.map((item) => (
                  <NavLink key={item.label} {...item} />
                ))}
              </nav>

              <button
                type="button"
                className="mb-1 p-1 text-foreground/70 transition-colors hover:text-foreground md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <div className="mx-2 mt-1 flex shrink-0 justify-center md:mx-4">
                {logo || (
                  <Link href="/" className="group relative flex items-center justify-center">
                    <LogoIcon className="relative z-10 h-7 w-7 rotate-180 text-foreground transition-transform group-hover:scale-105" />
                  </Link>
                )}
              </div>

              <nav className="hidden shrink-0 items-center gap-6 md:flex">
                {items.right.map((item) => (
                  <NavLink key={item.label} {...item} />
                ))}

                <div
                  className={cn(
                    "flex shrink-0 items-center gap-4",
                    items.right.length > 0 && "border-l border-foreground/10 pl-4"
                  )}
                >
                  <ThemeToggle />
                  {authLinks}
                </div>
              </nav>

              <div className="mb-1 flex items-center gap-2 md:hidden">
                <MobileThemeToggle />
              </div>
            </div>
          </div>

          <div className="relative -ml-px h-full w-[50px] shrink-0">
            <div className={cn("absolute inset-0 transition-colors", barBg)} style={{ clipPath: "path('M0 0 H50 V40 C25 40 25 64 0 64 Z')" }} />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 50 64">
              <path d="M0 63.5 C25 63.5 25 39.5 50 39.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
              <path d="M0 60.5 C25 60.5 25 36.5 50 36.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            </svg>
          </div>
        </div>

        <div className={cn("relative z-20 -ml-px h-10 min-w-0 flex-1 transition-colors", barBg)}>
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
          </svg>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 border-b border-foreground/5 bg-zinc-50 p-4 shadow-lg dark:bg-black md:hidden"
          >
            <nav className="flex flex-col gap-2">
              {[...items.left, ...items.right].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-foreground/5"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 opacity-70" />
                  <span className="font-medium text-foreground/90">{item.label}</span>
                </Link>
              ))}
              <div className="my-2 h-px bg-foreground/10" />
              <div className="flex flex-col gap-2">
                {authReady && loggedIn ? (
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-lg p-3 text-left font-medium text-foreground/90 transition-colors hover:bg-foreground/5"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="h-5 w-5 opacity-70" />
                    Logout
                  </button>
                ) : authReady ? (
                  <>
                    <Link
                      href="/login"
                      className="flex items-center gap-3 rounded-lg p-3 font-medium text-foreground/90 transition-colors hover:bg-foreground/5"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Log in
                    </Link>
                    <Link
                      href="/register"
                      className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-foreground p-3 font-medium text-background"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign up
                    </Link>
                  </>
                ) : null}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

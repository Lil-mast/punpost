import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MainContent from "@/components/MainContent";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "PunPost – A Bazaar of Witty Words",
  description: "Write, share and discover clever posts. Puns welcome.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Navbar />
          <MainContent>{children}</MainContent>
        </ThemeProvider>
      </body>
    </html>
  );
}

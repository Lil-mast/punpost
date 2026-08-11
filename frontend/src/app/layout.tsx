import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body
        className="min-h-screen bg-zinc-950 text-zinc-100 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
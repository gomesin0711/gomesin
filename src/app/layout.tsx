import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gomesin — Jual Beli Mesin Industri, Mesin Cetak & Pabrik",
  description:
    "Gomesin adalah marketplace mesin industri terlengkap di Indonesia. Beli & jual mesin cetak, CNC, laser, woodworking, food processing, kompressor, generator, dan sparepart mesin bekas & baru.",
  keywords: [
    "gomesin",
    "jual mesin industri",
    "mesin cetak",
    "mesin CNC",
    "mesin laser",
    "mesin bekas",
    "sparepart mesin",
    "marketplace mesin",
  ],
  authors: [{ name: "Gomesin" }],
  openGraph: {
    title: "Gomesin — Marketplace Mesin Industri",
    description: "Jual beli mesin industri, mesin cetak, CNC & sparepart mesin di Indonesia.",
    siteName: "Gomesin",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster richColors position="top-center" />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gomesin — Jual baru/bekas Mesin Cetak, Mesin Industri & Jasa Teknisi Berkualitas",
  description:
    "Gomesin adalah marketplace mesin industri terlengkap di Indonesia. Beli & jual mesin cetak, CNC, laser, woodworking, food processing, kompresor, generator, dan sparepart mesin bekas & baru.",
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
    images: [{ url: "/pwa-icon-512.png", width: 512, height: 512 }],
  },
  manifest: "/manifest.json",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Gomesin",
    "theme-color": "#F57C00",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F57C00" />
        <meta name="application-name" content="Gomesin" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Gomesin" />
        <link rel="apple-touch-icon" href="/pwa-icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/pwa-icon-152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/pwa-icon-120.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/pwa-icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/pwa-icon-512.png" />
        <link rel="preload" href="/logo-sm.jpeg" as="image" type="image/jpeg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function(reg) {
                    console.log('SW registered:', reg.scope);
                  }).catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${spaceGrotesk.variable} font-sans antialiased bg-background text-foreground overflow-x-hidden`}>
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster richColors position="top-center" />
      </body>
    </html>
  );
}

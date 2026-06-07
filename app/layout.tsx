import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerCleanup } from "@/components/shell/sw-cleanup";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meridian",
  description:
    "A private, two-person space to plan every trip together and keep every trip forever.",
  applicationName: "Meridian",
  appleWebApp: { capable: true, title: "Meridian", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} antialiased`}
    >
      <body className="min-h-dvh">
        <ServiceWorkerCleanup />
        <div className="paper-grain print:hidden" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

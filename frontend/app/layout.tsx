import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Sesyaz — Sesi metne dönüştür", template: "%s · Sesyaz" },
  description: "Ses ve video dosyalarınızı dakikalar içinde zaman damgalı metne dönüştürün.",
};

export const viewport: Viewport = { themeColor: "#16163f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

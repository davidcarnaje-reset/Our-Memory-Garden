import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Our Memory Garden",
  description: "A cozy botanical keepsake of our favorite moments together.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Memory Garden",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/pwa-icon/192",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF6F0",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF6F0] text-[#3F322B] selection:bg-[#E7C6B9] selection:text-[#3F322B]">
        {children}
      </body>
    </html>
  );
}

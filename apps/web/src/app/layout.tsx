import type { Metadata } from "next";
import { Baloo_Bhai_2, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const baloo = Baloo_Bhai_2({ subsets: ["latin"], weight: ["700"], variable: "--font-baloo" });

export const metadata: Metadata = {
  title: { default: "Jobify", template: "%s · Jobify" },
  description: "Find jobs, apply, take skill tests and interview, all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${baloo.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

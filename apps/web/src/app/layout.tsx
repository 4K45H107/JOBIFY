import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jobify",
  description: "Find jobs, apply, take skill tests and interview, all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

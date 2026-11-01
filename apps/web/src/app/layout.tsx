import type { Metadata } from "next";
import { Baloo_Bhai_2, Outfit } from "next/font/google";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE, themeAttribute } from "@/lib/theme";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const baloo = Baloo_Bhai_2({ subsets: ["latin"], weight: ["700"], variable: "--font-baloo" });

export const metadata: Metadata = {
  title: { default: "Jobify", template: "%s · Jobify" },
  description: "Find jobs, apply, take skill tests and interview, all in one place.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="en"
      data-theme={themeAttribute(theme)}
      className={`${outfit.variable} ${baloo.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

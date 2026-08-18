import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { Providers } from "@/components/providers";
import "@/styles/globals.css";
import { WebVitalsReporter } from "@/components/layout/web-vitals-reporter";
import { copy } from "@/lib/copy/catalog";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  title: {
    default: copy("brandName"),
    template: `%s | ${copy("brandName")}`,
  },
  description: copy("footerDescription"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${interTight.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <WebVitalsReporter />
      </body>
    </html>
  );
}

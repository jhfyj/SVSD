import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { DialKit } from "@/components/dialkit/DialKit";
import { SoundProvider } from "@/components/sound";
import { ThemeClock } from "@/components/theme/ThemeClock";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SVSD",
  description: "SVSD hackathon project",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full antialiased`}
      // The inline script sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ThemeClock />
        <SoundProvider />
        <Suspense>
          <DialKit />
        </Suspense>
      </body>
    </html>
  );
}

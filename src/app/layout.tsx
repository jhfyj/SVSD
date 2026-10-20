import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AboutPanel } from "@/components/AboutPanel";
import { DialKit } from "@/components/dialkit/DialKit";
import { DeviceFrame } from "@/components/DeviceFrame";
import { Guide } from "@/components/guide/Guide";
import { SoundProvider } from "@/components/sound";
import { ThemeClock } from "@/components/theme/ThemeClock";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Caravan",
  description: "Stories told by everyone on the road tonight. A storytelling app for the road, by Jennifer, Emily and Angelina.",
};

// Filmed on a phone: no pinch-zoom (a two-finger hold opens the flow picker, it shouldn't zoom the
// page), and the page runs under the notch and home bar like an app.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
        <AboutPanel />
        <DeviceFrame>{children}</DeviceFrame>
        <ThemeClock />
        <SoundProvider />
        <Suspense>
          <DialKit />
          <Guide />
        </Suspense>
      </body>
    </html>
  );
}

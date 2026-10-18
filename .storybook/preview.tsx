import type { Preview } from "@storybook/nextjs-vite";
import { Geist_Mono } from "next/font/google";
import { useEffect } from "react";
import { startSound } from "../src/lib/sound";
import { pickTheme, type ThemeChoice } from "../src/lib/theme";
import "../src/app/globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const preview: Preview = {
  // Toolbar switch for the day (light) and night (dark) themes; Auto follows this computer's clock.
  globalTypes: {
    theme: {
      description: "Day or night theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "dark", title: "Dark (night)", icon: "moon" },
          { value: "light", title: "Light (day)", icon: "sun" },
          { value: "auto", title: "Auto (time of day)", icon: "time" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "dark" },
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: "todo" },
  },
  decorators: [
    (Story, { globals }) => {
      const choice = (globals.theme ?? "dark") as ThemeChoice;
      // Stories play the same interaction sounds as the app.
      useEffect(() => startSound(), []);
      useEffect(() => {
        document.documentElement.dataset.theme = choice === "auto" ? pickTheme() : choice;
      }, [choice]);
      return (
        <div className={`${geistMono.variable} font-sans antialiased`}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;

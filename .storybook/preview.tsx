import type { Preview } from "@storybook/nextjs-vite";
import { Geist_Mono } from "next/font/google";
import "../src/app/globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: "todo" },
  },
  decorators: [
    (Story) => (
      <div className={`${geistMono.variable} font-sans antialiased`}>
        <Story />
      </div>
    ),
  ],
};

export default preview;

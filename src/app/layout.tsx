import type { Metadata, Viewport } from "next";
import {
  Fredoka,
  Geist_Mono,
  Inter_Tight,
  Nunito,
} from "next/font/google";
import "./globals.css";

/**
 * Four faces, four jobs.
 *
 * Inter Tight sets the UI controls. Geist Mono carries clock and numbers.
 * Fredoka sets bubbly headings, brands, and buttons. Nunito sets the article,
 * giving Wikipedia text a friendly, rounded bubbly personality while staying
 * crisp and easy to read.
 */
const sans = Inter_Tight({
  variable: "--font-sans-face",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
});

const reading = Nunito({
  variable: "--font-reading-face",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const display = Fredoka({
  variable: "--font-display-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "wikidash.io",
  description:
    "Race between two Wikipedia articles using only the links on the page.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Font variables go on <html>, not <body>: Tailwind emits the theme's font
  // stacks at `:root`, and a variable defined only on <body> would make those
  // declarations invalid there, silently falling back to system sans.
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${reading.variable} ${display.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

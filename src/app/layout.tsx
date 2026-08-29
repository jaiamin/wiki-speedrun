import type { Metadata, Viewport } from "next";
import {
  Fredoka,
  Geist_Mono,
  Inter_Tight,
  Source_Serif_4,
} from "next/font/google";
import "./globals.css";

/**
 * Four faces, four jobs.
 *
 * Inter Tight sets the interface: the tighter widths and spacing hold together
 * at large display sizes, where plain Inter goes loose and generic. Geist Mono
 * carries every number — clean geometric digits with no slab detailing, so the
 * clock reads as an instrument. Fredoka gives the home-screen brand a rounder,
 * more playful voice. Source Serif sets the article, because the encyclopedia
 * is quoted content rather than our own UI.
 */
const sans = Inter_Tight({
  variable: "--font-sans-face",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
});

const serif = Source_Serif_4({
  variable: "--font-serif-face",
  subsets: ["latin"],
  style: ["normal", "italic"],
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
      className={`${sans.variable} ${mono.variable} ${serif.variable} ${display.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

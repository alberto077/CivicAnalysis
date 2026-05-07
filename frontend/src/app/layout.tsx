import type { Metadata } from "next";
import { Limelight, Playfair_Display, Work_Sans } from "next/font/google";

import { FloatingChatBot } from "@/components/civiq/FloatingChatBot";
import { ThemeProvider } from "@/components/civiq/ThemeProvider";

import "./globals.css";

const playfairDisplay = Playfair_Display({
  weight: ["400", "500", "600"],
  variable: "--font-serif-display",
  subsets: ["latin"],
});

const workSans = Work_Sans({
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-body",
  subsets: ["latin"],
});

const limelight = Limelight({
  weight: ["400"],
  variable: "--font-limelight",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Civic Spiegel · Civic Research Assistant",
  description:
    "Location-aware, RAG-powered policy briefings and research assistance for New Yorkers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfairDisplay.variable} ${workSans.variable} ${limelight.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <FloatingChatBot />
        </ThemeProvider>
      </body>
    </html>
  );
}

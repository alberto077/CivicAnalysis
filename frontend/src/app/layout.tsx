import type { Metadata } from "next";
import { Inter, Khand, Atkinson_Hyperlegible } from "next/font/google";

import { FloatingChatBot } from "@/components/civiq/FloatingChatBot";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans-body",
  subsets: ["latin"],
});

const khand = Khand({
  weight: ["400", "600"],
  variable: "--font-condensed",
  subsets: ["latin"],
});

const atkinson = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  variable: "--font-mono",
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
      className={`${inter.variable} ${khand.variable} ${atkinson.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=tanker@400&f[]=erode@400,600&display=swap"
        />
      </head>

      <body suppressHydrationWarning className="flex min-h-full flex-col">
        {children}
        <FloatingChatBot />
      </body>
    </html>
  );
}

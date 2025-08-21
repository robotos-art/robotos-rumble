import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ROBOTO RUMBLE - Terminal Combat Protocol",
  description:
    "Ancient combat protocols activated. Battle your Robotos in the terminal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable}`}
    >
      <body className="font-sans bg-black text-green-500 min-h-screen">
        <Providers>
          <div className="crt-effect">
            <div className="scanlines" />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

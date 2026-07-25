import type { Metadata } from "next";
import { Orbitron, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ScrollProvider } from "@/components/providers/ScrollProvider";
import { getAuthUser } from "@/lib/auth";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "PROCRASTINATION DETECTOR | The End of 'I'll Do It Later.'",
  description: "A cinematic storytelling experience and high-performance psychological productivity platform designed to build ironclad discipline.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Synchronize authenticated user state with MongoDB
  await getAuthUser();
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-black text-white selection:bg-white selection:text-black">
        <AuthProvider>
          <ScrollProvider>
            {children}
          </ScrollProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

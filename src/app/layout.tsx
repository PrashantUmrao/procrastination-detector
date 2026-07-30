import type { Metadata } from "next";
import { Orbitron, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ScrollProvider } from "@/components/providers/ScrollProvider";
import { getAuthUser } from "@/lib/auth";
import { Suspense } from "react";

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

async function UserSync() {
  try {
    await getAuthUser();
  } catch (error) {
    console.error("Error in UserSync component:", error);
  }
  return null;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-black text-white selection:bg-white selection:text-black">
        <AuthProvider>
          <ScrollProvider>
            <Suspense fallback={null}>
              <UserSync />
            </Suspense>
            {children}
          </ScrollProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

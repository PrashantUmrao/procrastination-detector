import type { Metadata } from "next";
import { Orbitron, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ScrollProvider } from "@/components/providers/ScrollProvider";
import { getAuthUser, isDynamicError } from "@/lib/auth";
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
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: {
    default: "Procrastination Detector | Beat Procrastination by Prashant Umrao",
    template: "%s | Procrastination Detector by Prashant Umrao",
  },
  description:
    "Beat procrastination with Procrastination Detector by Prashant Umrao. A premium, cinematic productivity dashboard, habit tracker, and focus timer designed to overcome avoidance and track daily routines.",
  keywords: [
    "Procrastination Detector",
    "Procrasti",
    "Procrastination Detector by Prashant Umrao",
    "Beat Procrastination",
    "Productivity Tracker",
    "Productivity Dashboard",
    "Habit Tracker",
    "Focus Timer",
    "Pomodoro Timer",
    "Task Management",
    "Daily Habit Tracker",
    "Deep Work",
    "Productivity Analytics",
  ],
  authors: [{ name: "Prashant Umrao", url: "https://github.com/PrashantUmrao" }],
  creator: "Prashant Umrao",
  metadataBase: new URL("https://procrastination-detector.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Procrastination Detector | Beat Procrastination by Prashant Umrao",
    description:
      "Confront avoidances, establish focus, and master your timeline with the ultimate cinematic productivity system.",
    url: "https://procrastination-detector.vercel.app",
    siteName: "Procrastination Detector",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Procrastination Detector | Beat Procrastination by Prashant Umrao",
    description: "Beat procrastination, build habits, and master focus timelines.",
    creator: "@PrashantUmrao",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const globalSoftwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Procrastination Detector",
  "operatingSystem": "All",
  "applicationCategory": "ProductivityApplication",
  "browserRequirements": "Requires JavaScript. Requires HTML5.",
  "creator": {
    "@type": "Person",
    "name": "Prashant Umrao",
    "sameAs": "https://github.com/PrashantUmrao",
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
  },
  "description": "A cinematic psychological productivity platform designed to build ironclad discipline, defeat avoidance, and track focus timelines.",
};

const globalOrgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Procrastination Detector",
  "url": "https://procrastination-detector.vercel.app",
  "logo": "https://procrastination-detector.vercel.app/favicon.ico",
  "founder": {
    "@type": "Person",
    "name": "Prashant Umrao",
  },
};

async function UserSync() {
  try {
    await getAuthUser();
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalSoftwareSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalOrgSchema) }}
        />
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

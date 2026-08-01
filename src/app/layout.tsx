import type { Metadata } from "next";
import { Orbitron, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ScrollProvider } from "@/components/providers/ScrollProvider";
import { PWAProvider } from "@/components/providers/PWAProvider";
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
  applicationName: "Procrastination Detector",
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
  publisher: "Prashant Umrao",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://procrasti.prashantumrao.me"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Procrastination Detector | Beat Procrastination by Prashant Umrao",
    description:
      "Confront avoidances, establish focus, and master your timeline with the ultimate cinematic productivity system.",
    url: "https://procrasti.prashantumrao.me",
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Procrastination Detector",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
  "url": "https://procrasti.prashantumrao.me",
  "logo": "https://procrasti.prashantumrao.me/favicon.ico",
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
          <PWAProvider>
            <ScrollProvider>
              <Suspense fallback={null}>
                <UserSync />
              </Suspense>
              {children}
            </ScrollProvider>
          </PWAProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

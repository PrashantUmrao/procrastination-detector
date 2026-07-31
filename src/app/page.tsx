import HomeClient from "@/components/cinematic/HomeClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Procrastination Detector | Beat Procrastination by Prashant Umrao",
  description:
    "Beat procrastination with Procrastination Detector by Prashant Umrao. A premium, cinematic productivity dashboard, habit tracker, and focus timer designed to overcome avoidance and track daily routines.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Procrastination Detector | Beat Procrastination by Prashant Umrao",
    description:
      "Confront avoidances, establish focus, and master your timeline with the ultimate cinematic productivity system.",
    url: "https://procrastination-detector.vercel.app",
    type: "website",
  },
  twitter: {
    title: "Procrastination Detector | Beat Procrastination by Prashant Umrao",
    description:
      "Confront avoidances, establish focus, and master your timeline with the ultimate cinematic productivity system.",
  },
};

export default function Home() {
  return <HomeClient />;
}

import DashboardClient from "@/components/dashboard/DashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Sanctuary | Procrastination Detector by Prashant Umrao",
  description:
    "Manage your focus timeline, track your routine habits, analyze deep work, and conquer procrastination with the unified dashboard sanctuary.",
  alternates: {
    canonical: "/dashboard",
  },
  openGraph: {
    title: "Dashboard Sanctuary | Procrastination Detector by Prashant Umrao",
    description: "Manage focus timelines, track daily habits, and beat avoidance.",
    url: "https://procrasti.prashantumrao.me/dashboard",
    type: "website",
  },
  twitter: {
    title: "Dashboard Sanctuary | Procrastination Detector by Prashant Umrao",
    description: "Manage focus timelines, track daily habits, and beat avoidance.",
  },
};

export default function DashboardPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://procrasti.prashantumrao.me",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Dashboard",
        "item": "https://procrasti.prashantumrao.me/dashboard",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DashboardClient />
    </>
  );
}

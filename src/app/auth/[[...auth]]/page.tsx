import AuthClient from "@/components/auth/AuthClient";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Identity Sanctuary Gate | Procrastination Detector by Prashant Umrao",
  description:
    "Register or authenticate credentials to enter the Sanctuary. Manage focus timelines, unlock productivity metrics, and conquer avoidance.",
  alternates: {
    canonical: "/auth",
  },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthClient />
    </Suspense>
  );
}

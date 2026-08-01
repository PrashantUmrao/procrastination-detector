"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  installApp: () => Promise<boolean>;
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  isInstalled: false,
  installApp: async () => false,
});

export const usePWA = () => useContext(PWAContext);

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if already running as PWA
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
        || ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone)
        || document.referrer.includes("android-app://");
      
      Promise.resolve().then(() => {
        setIsInstalled(!!isStandalone);
      });

      // Capture beforeinstallprompt event
      const handleBeforeInstallPrompt = (e: Event) => {
        // Prevent default mini-infobar from showing automatically
        e.preventDefault();
        // Save the event to trigger later
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsInstallable(true);
      };

      // Track successful installation
      const handleAppInstalled = () => {
        setDeferredPrompt(null);
        setIsInstallable(false);
        setIsInstalled(true);
        console.log("PWA installed successfully.");
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      // Register the service worker
      if ("serviceWorker" in navigator) {
        const registerSW = () => {
          navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => {
              console.log("Service Worker registered successfully with scope:", reg.scope);

              // Auto update when new SW version is detected
              reg.addEventListener("updatefound", () => {
                const newWorker = reg.installing;
                if (newWorker) {
                  newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                      console.log("New Service Worker version installed and waiting.");
                    }
                  });
                }
              });
            })
            .catch((error) => {
              console.error("Service Worker registration failed:", error);
            });
        };

        // If page is already loaded, register immediately, else wait for load event
        if (document.readyState === "complete") {
          registerSW();
        } else {
          window.addEventListener("load", registerSW);
        }

        // Automatic page refresh on new service worker activation
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      }

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      console.warn("Install prompt is not deferred or available.");
      return false;
    }

    // Show the installation prompt
    await deferredPrompt.prompt();

    // Await user response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt outcome: ${outcome}`);

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstallable(false);
      return true;
    }

    return false;
  };

  return (
    <PWAContext.Provider value={{ isInstallable, isInstalled, installApp }}>
      {children}
    </PWAContext.Provider>
  );
}

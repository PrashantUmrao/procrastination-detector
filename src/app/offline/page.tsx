"use client";

import { WifiOff, RotateCw } from "lucide-react";

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      if (navigator.onLine) {
        window.location.href = "/";
      } else {
        // Simple reload to trigger service worker fetch check
        window.location.reload();
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 select-none overflow-hidden font-inter">
      {/* Noise background overlay */}
      <div className="absolute inset-0 noise-bg z-0 opacity-5" />

      {/* Decorative radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center space-y-8">
        {/* Glow indicator */}
        <div className="relative w-24 h-24 flex items-center justify-center rounded-full border border-white/10 bg-zinc-950 border-glow">
          <WifiOff className="w-10 h-10 text-white animate-pulse" />
          <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-30" />
        </div>

        {/* Text Area */}
        <div className="space-y-3">
          <h1 className="font-orbitron text-2xl md:text-3xl font-bold tracking-widest text-glow text-white">
            CONNECTION LOST
          </h1>
          <p className="text-zinc-500 text-sm md:text-base max-w-xs mx-auto leading-relaxed">
            The timeline is currently disconnected. Restore your network to beat procrastination.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="text-xs uppercase tracking-widest text-zinc-600 flex items-center gap-2 border border-zinc-800/80 bg-zinc-950/50 px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Offline Mode
        </div>

        {/* Action Button */}
        <button
          onClick={handleRetry}
          className="group relative flex items-center justify-center gap-3 px-8 py-3 rounded-md bg-white text-black font-semibold text-sm tracking-widest uppercase hover:bg-zinc-200 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
        >
          <RotateCw className="w-4 h-4 transition-transform duration-700 group-hover:rotate-180" />
          Retry Connection
        </button>
      </div>
    </div>
  );
}

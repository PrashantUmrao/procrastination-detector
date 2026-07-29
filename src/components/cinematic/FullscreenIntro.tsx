"use client";

import React, { useEffect, useState } from "react";

interface FullscreenIntroProps {
  onClose?: () => void;
  onComplete?: () => void;
}

export default function FullscreenIntro({ onClose, onComplete }: FullscreenIntroProps) {
  const [message, setMessage] = useState("Loading Focus Environment...");
  const [opacity, setOpacity] = useState(1);

  const onCompleteRef = React.useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let isMounted = true;

    const runSequence = async () => {
      // 1. Loading Focus Environment... (show for 600ms)
      await new Promise((r) => setTimeout(r, 600));
      if (!isMounted) return;

      // Transition to next message
      setOpacity(0);
      await new Promise((r) => setTimeout(r, 200));
      if (!isMounted) return;
      setMessage("Closing Outside World...");
      setOpacity(1);

      // 2. Closing Outside World... (show for 600ms)
      await new Promise((r) => setTimeout(r, 600));
      if (!isMounted) return;

      // Transition to next message
      setOpacity(0);
      await new Promise((r) => setTimeout(r, 200));
      if (!isMounted) return;
      setMessage("Entering Flow State...");
      setOpacity(1);

      // 3. Entering Flow State... (show for 600ms)
      await new Promise((r) => setTimeout(r, 600));
      if (!isMounted) return;

      // Fade out
      setOpacity(0);
      
      // Wait approximately 500ms after the last message transitions out
      await new Promise((r) => setTimeout(r, 500));
      if (!isMounted) return;

      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    };

    runSequence();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black z-50 flex flex-col items-center justify-center select-none overflow-hidden relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors cursor-pointer font-orbitron uppercase text-[9px] tracking-widest border border-white/10 px-3 py-1.5 hover:bg-white hover:text-black rounded"
        >
          Exit Focus Mode
        </button>
      )}

      {/* Loading message displayed with smooth opacity fading transition */}
      <div
        className="h-12 flex items-center justify-center transition-opacity duration-300 ease-in-out"
        style={{ opacity }}
      >
        <span className="font-orbitron uppercase text-[10px] md:text-xs tracking-[0.25em] text-white font-semibold">
          {message}
        </span>
      </div>
    </div>
  );
}

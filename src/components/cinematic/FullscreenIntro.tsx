"use client";

import React, { useEffect, useState } from "react";

interface FullscreenIntroProps {
  onClose?: () => void;
  onComplete?: () => void;
  messages?: string[];
}

export default function FullscreenIntro({ onClose, onComplete, messages }: FullscreenIntroProps) {
  const [message, setMessage] = useState(
    messages && messages.length > 0 ? messages[0] : "Loading Focus Environment..."
  );
  const [opacity, setOpacity] = useState(1);

  const onCompleteRef = React.useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const messagesRef = React.useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    let isMounted = true;

    const runSequence = async () => {
      const msgList = messagesRef.current || [
        "Loading Focus Environment...",
        "Closing Outside World...",
        "Entering Flow State..."
      ];

      for (let i = 0; i < msgList.length; i++) {
        if (!isMounted) return;
        setMessage(msgList[i]);
        setOpacity(1);

        // Show message for 600ms
        await new Promise((r) => setTimeout(r, 600));
        if (!isMounted) return;

        // Fade out transition (only if there are more messages)
        if (i < msgList.length - 1) {
          setOpacity(0);
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Final fade out
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

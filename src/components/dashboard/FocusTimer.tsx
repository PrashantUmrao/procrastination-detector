"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Square, Volume2, Maximize2, X } from "lucide-react";
import { audioSynthesizer } from "@/lib/audio";
import { gsap } from "gsap";

interface FullscreenElement extends HTMLDivElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

export default function FocusTimer() {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionDuration, setSessionDuration] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mission, setMission] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [distractions, setDistractions] = useState(0);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);

  // Full Focus Mode States
  const [isFullFocusActive, setIsFullFocusActive] = useState(false);
  const [isIntroCompleted, setIsIntroCompleted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [streak, setStreak] = useState(0);

  // Phase 4 Side Panel Stats States
  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Phase 3 & 4 Overlay States
  const [isEntering, setIsEntering] = useState(false);
  const [ritualText, setRitualText] = useState("");
  const [isMissionRevealed, setIsMissionRevealed] = useState(false);
  const [isTimerRevealed, setIsTimerRevealed] = useState(false);
  const [isExitTransitionActive, setIsExitTransitionActive] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sword and text animation refs
  const swordImgRef = useRef<HTMLDivElement | null>(null);
  const swordLightRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const missionRef = useRef<HTMLDivElement | null>(null);
  const timerRevealRef = useRef<HTMLDivElement | null>(null);
  const exitOverlayRef = useRef<HTMLDivElement | null>(null);

  const progress = (timeLeft / sessionDuration) * 100;

  // SVG parameters for the circular timer
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const volumeRef = useRef(volume);
  const prevVolumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Save session helper
  const saveFocusSession = async (
    missionText: string,
    dur: number,
    start: Date,
    end: Date,
    isCompleted: boolean,
    distCount: number
  ) => {
    try {
      const response = await fetch("/api/focus-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission: missionText,
          type: "focus",
          duration: dur,
          startedAt: start.toISOString(),
          endedAt: end.toISOString(),
          completed: isCompleted,
          distractions: distCount,
        }),
      });
      if (response.ok) {
        window.dispatchEvent(new Event("focusSessionSaved"));
      } else {
        console.error("Failed to save session:", await response.text());
      }
    } catch (err) {
      console.error("Error saving focus session:", err);
    }
  };

  // Load state on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedMode = localStorage.getItem("pd_timer_mode") as "focus" | "break" | null;
      const savedTimeLeft = localStorage.getItem("pd_timer_time_left");
      const savedDuration = localStorage.getItem("pd_timer_duration");
      const savedIsRunning = localStorage.getItem("pd_timer_is_running");
      const savedEndTime = localStorage.getItem("pd_timer_end_time");
      const savedMission = localStorage.getItem("pd_timer_mission");
      const savedLocked = localStorage.getItem("pd_timer_locked");
      const savedDistractions = localStorage.getItem("pd_timer_distractions");
      const savedSound = localStorage.getItem("pd_ambient_sound");
      const savedVol = localStorage.getItem("pd_ambient_volume");

      if (savedMode) setMode(savedMode);
      if (savedMission) setMission(savedMission);
      if (savedLocked === "true") setIsLocked(true);
      if (savedDistractions) setDistractions(parseInt(savedDistractions, 10));
      if (savedSound) setSelectedSound(savedSound === "none" ? null : savedSound);
      if (savedVol) setVolume(parseFloat(savedVol));

      const duration = savedDuration ? parseInt(savedDuration, 10) : (savedMode === "break" ? 5 * 60 : 25 * 60);
      setSessionDuration(duration);

      if (savedIsRunning === "true" && savedEndTime) {
        const endTime = parseInt(savedEndTime, 10);
        const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
        if (remaining > 0) {
          setTimeLeft(remaining);
          setIsRunning(true);
          setIsLocked(true);
        } else {
          // Completed while away
          const nextMode = savedMode === "focus" ? "break" : "focus";
          setMode(nextMode);
          const nextDur = nextMode === "break" ? 5 * 60 : 25 * 60;
          setSessionDuration(nextDur);
          setTimeLeft(nextDur);
          setIsRunning(true);
          setIsLocked(nextMode === "focus");

          if (savedMode === "focus" && savedMission) {
            saveFocusSession(
              savedMission,
              duration,
              new Date(endTime - duration * 1000),
              new Date(endTime),
              true,
              parseInt(savedDistractions || "0", 10)
            );
          }
        }
      } else {
        if (savedTimeLeft) setTimeLeft(parseInt(savedTimeLeft, 10));
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Save state updates to localStorage
  useEffect(() => {
    localStorage.setItem("pd_timer_mode", mode);
    localStorage.setItem("pd_timer_time_left", timeLeft.toString());
    localStorage.setItem("pd_timer_duration", sessionDuration.toString());
    localStorage.setItem("pd_timer_is_running", isRunning.toString());
    localStorage.setItem("pd_timer_mission", mission);
    localStorage.setItem("pd_timer_locked", isLocked.toString());
    localStorage.setItem("pd_timer_distractions", distractions.toString());

    if (isRunning) {
      const endTime = Date.now() + timeLeft * 1000;
      localStorage.setItem("pd_timer_end_time", endTime.toString());
    } else {
      localStorage.removeItem("pd_timer_end_time");
    }
  }, [mode, timeLeft, sessionDuration, isRunning, mission, isLocked, distractions]);

  // Sync ambient sound (Dashboard / Default mode)
  useEffect(() => {
    if (!isFullFocusActive) {
      if (isRunning && selectedSound) {
        audioSynthesizer.startAmbient(selectedSound, volumeRef.current);
      } else {
        audioSynthesizer.stopAmbient();
      }
    }

    return () => {
      if (!isFullFocusActive) {
        audioSynthesizer.stopAmbient();
      }
    };
  }, [isRunning, selectedSound, isFullFocusActive]);

  // Sync volume changes
  useEffect(() => {
    audioSynthesizer.setAmbientVolume(volume);
  }, [volume]);

  // Fetch streak & focus statistics
  const fetchStats = async () => {
    try {
      const res = await fetch("/api/focus-sessions/stats");
      if (res.ok) {
        const data = await res.json();
        setStreak(data.focusStreak);
        setTodayFocusMinutes(data.todayFocusTime);
        setCompletedSessions(data.completedSessions);
      }
    } catch {}
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStats();
    }, 0);
    window.addEventListener("focusSessionSaved", fetchStats);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focusSessionSaved", fetchStats);
    };
  }, []);

  // Timer Tick Engine
  useEffect(() => {
    if (isRunning) {
      if (!sessionStartRef.current) {
        sessionStartRef.current = new Date();
      }

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);

            if (mode === "focus") {
              audioSynthesizer.playFocusEnd();
              const start = sessionStartRef.current || new Date(Date.now() - sessionDuration * 1000);
              saveFocusSession(mission, sessionDuration, start, new Date(), true, distractions);

              // Switch to Break
              setMode("break");
              const nextDur = 5 * 60;
              setSessionDuration(nextDur);
              setTimeLeft(nextDur);
              setIsLocked(false);
              setDistractions(0);
              sessionStartRef.current = null;

              setTimeout(() => {
                setIsRunning(true);
              }, 100);
            } else {
              audioSynthesizer.playFocusStart();

              // Switch to Focus
              setMode("focus");
              const nextDur = 25 * 60;
              setSessionDuration(nextDur);
              setTimeLeft(nextDur);
              setIsLocked(true);
              setDistractions(0);
              sessionStartRef.current = null;

              setTimeout(() => {
                setIsRunning(true);
              }, 100);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      sessionStartRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, mission, sessionDuration, distractions]);

  const toggleTimer = () => {
    if (!mission.trim()) return;

    if (!isRunning) {
      if (isFullFocusActive) {
        if (selectedSound) {
          audioSynthesizer.fadeAmbientIn(selectedSound, volumeRef.current, 1.5);
        }
      } else {
        audioSynthesizer.playFocusStart();
      }
      setIsLocked(true);
      setIsRunning(true);
    } else {
      if (mode === "focus") {
        setDistractions((prev) => prev + 1);
      }
      if (isFullFocusActive) {
        audioSynthesizer.fadeAmbientOut(1.5);
      }
      setIsRunning(false);
    }
  };

  const stopTimer = () => {
    setIsRunning(false);
    if (isFullFocusActive) {
      audioSynthesizer.fadeAmbientOut(1.5);
    }

    if (mode === "focus" && timeLeft < sessionDuration) {
      const elapsed = sessionDuration - timeLeft;
      const start = sessionStartRef.current || new Date(Date.now() - elapsed * 1000);
      saveFocusSession(mission, elapsed, start, new Date(), false, distractions);
    }

    const defaultDur = mode === "focus" ? 25 * 60 : 5 * 60;
    setTimeLeft(defaultDur);
    setSessionDuration(defaultDur);
    setIsLocked(false);
    setDistractions(0);
    sessionStartRef.current = null;
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (isFullFocusActive) {
      audioSynthesizer.fadeAmbientOut(1.0);
    }
    const defaultDur = mode === "focus" ? 25 * 60 : 5 * 60;
    setTimeLeft(defaultDur);
    setSessionDuration(defaultDur);
    setIsLocked(false);
    setDistractions(0);
    sessionStartRef.current = null;
  };

  const adjustTime = (minutes: number) => {
    const change = minutes * 60;
    setTimeLeft((prev) => {
      const next = prev + change;
      return next < 300 ? 300 : next;
    });
    setSessionDuration((prev) => {
      const next = prev + change;
      return next < 300 ? 300 : next;
    });
  };

  const switchMode = (newMode: "focus" | "break") => {
    setIsRunning(false);
    setMode(newMode);
    const defaultDur = newMode === "focus" ? 25 * 60 : 5 * 60;
    setSessionDuration(defaultDur);
    setTimeLeft(defaultDur);
    setIsLocked(false);
    setDistractions(0);
    sessionStartRef.current = null;
  };

  const skipBreak = () => {
    switchMode("focus");
    setTimeout(() => {
      audioSynthesizer.playFocusStart();
      setIsLocked(true);
      setIsRunning(true);
    }, 100);
  };

  const handleSoundSelect = (soundName: string) => {
    let nextSound: string | null = soundName;
    if (selectedSound === soundName) {
      nextSound = null;
      localStorage.setItem("pd_ambient_sound", "none");
    } else {
      localStorage.setItem("pd_ambient_sound", soundName);
    }
    setSelectedSound(nextSound);

    if (isRunning) {
      if (nextSound) {
        if (isFullFocusActive) {
          audioSynthesizer.fadeAmbientIn(nextSound, volume, 1.5);
        } else {
          audioSynthesizer.startAmbient(nextSound, volume);
        }
      } else {
        if (isFullFocusActive) {
          audioSynthesizer.fadeAmbientOut(1.5);
        } else {
          audioSynthesizer.stopAmbient();
        }
      }
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
    localStorage.setItem("pd_ambient_volume", newVol.toString());
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (nextMuted) {
        prevVolumeRef.current = volume;
        setVolume(0);
        audioSynthesizer.setAmbientVolume(0);
      } else {
        const restored = prevVolumeRef.current === 0 ? 0.5 : prevVolumeRef.current;
        setVolume(restored);
        audioSynthesizer.setAmbientVolume(restored);
      }
      return nextMuted;
    });
  };

  // Skip Transition Interruption Logic
  const skipIntro = () => {
    if (isIntroCompleted) return;

    gsap.killTweensOf([swordImgRef.current, swordLightRef.current, textRef.current, missionRef.current, timerRevealRef.current]);

    setIsIntroCompleted(true);
    setIsEntering(false);
    setIsMissionRevealed(true);
    setIsTimerRevealed(true);

    if (selectedSound) {
      audioSynthesizer.fadeAmbientIn(selectedSound, volumeRef.current, 1.0);
    }
  };

  // Full Focus Entry / Exit Triggers
  const enterFullFocus = async () => {
    if (!mission.trim() || isEntering) return;

    setIsEntering(true);

    try {
      const container = fullscreenContainerRef.current as FullscreenElement;
      if (container) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          await container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          await container.msRequestFullscreen();
        }

        setIsFullFocusActive(true);
        setIsIntroCompleted(false);
        setIsMissionRevealed(false);
        setIsTimerRevealed(false);

        // Start timer in the background immediately!
        setIsRunning(true);

        // Fade in background sound immediately
        if (selectedSound) {
          audioSynthesizer.fadeAmbientIn(selectedSound, volumeRef.current, 4.0);
        }

        // Check skip logic (10-minute check)
        const lastExitTime = localStorage.getItem("pd_last_focus_exit_time");
        const exitDiff = lastExitTime ? Date.now() - parseInt(lastExitTime, 10) : Infinity;
        const useShortIntro = exitDiff < 10 * 60 * 1000;

        // Check prefers-reduced-motion
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReducedMotion) {
          // Skip all transitions
          setIsIntroCompleted(true);
          setIsMissionRevealed(true);
          setIsTimerRevealed(true);
          setIsEntering(false);
        } else if (useShortIntro) {
          // Shortened sequence (< 1s)
          setRitualText("Entering Deep Focus...");
          
          const shortTl = gsap.timeline({
            onComplete: () => {
              setIsIntroCompleted(true);
              setIsEntering(false);
            }
          });

          shortTl.fromTo(textRef.current,
            { opacity: 0, y: 5 },
            { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }
          )
          .to(textRef.current,
            { opacity: 0, y: -5, duration: 0.15, ease: "power2.in", delay: 0.25 }
          )
          .call(() => {
            setIsMissionRevealed(true);
          })
          .fromTo(missionRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.15 }
          )
          .delay(0.05)
          .call(() => {
            setIsTimerRevealed(true);
          })
          .fromTo(timerRevealRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.15 }
          );

        } else {
          // Play full 4.5s ritual sequence
          setRitualText("Loading Focus Environment...");
          
          // Animate sword light pulse loop
          gsap.killTweensOf(swordLightRef.current);
          gsap.fromTo(swordLightRef.current,
            { left: "0%", opacity: 0 },
            { left: "100%", opacity: 1, duration: 2.2, repeat: -1, ease: "power1.inOut" }
          );

          const messages = [
            "Loading Focus Environment...",
            "Closing Outside World...",
            "Silencing Distractions...",
            "Clearing Mental Noise...",
            "Locking Current Mission...",
            "Preparing Deep Work...",
            "Entering Flow State...",
            "Deep Focus Activated"
          ];

          const fullTl = gsap.timeline({
            onComplete: () => {
              gsap.to(textRef.current, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                  setRitualText("MISSION LOCKED");
                  
                  const missionLockTl = gsap.timeline({
                    onComplete: () => {
                      gsap.to(textRef.current, {
                        opacity: 0,
                        duration: 0.4,
                        onComplete: () => {
                          const revealTl = gsap.timeline({
                            onComplete: () => {
                              setIsIntroCompleted(true);
                              setIsEntering(false);
                            }
                          });

                          setIsMissionRevealed(true);
                          revealTl.fromTo(missionRef.current,
                            { opacity: 0, y: 12 },
                            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
                          )
                          .delay(1.0)
                          .to(swordImgRef.current, {
                            opacity: 0,
                            duration: 0.7,
                            ease: "power2.inOut"
                          })
                          .call(() => {
                            setIsTimerRevealed(true);
                          })
                          .fromTo(timerRevealRef.current,
                            { opacity: 0, scale: 0.96 },
                            { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.1)" },
                            "-=0.3"
                          );
                        }
                      });
                    }
                  });

                  missionLockTl.fromTo(textRef.current,
                    { opacity: 0, y: 5 },
                    { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
                  )
                  .delay(0.8);
                }
              });
            }
          });

          // Message cycles
          messages.forEach((msg, idx) => {
            fullTl.call(() => setRitualText(msg))
              .fromTo(textRef.current,
                { opacity: 0, filter: "blur(6px)", y: 8 },
                { opacity: 1, filter: "blur(0px)", y: 0, duration: 0.22, ease: "power2.out" }
              )
              .to(textRef.current,
                { opacity: 0, filter: "blur(6px)", y: -8, duration: 0.2, ease: "power2.in", delay: 0.16 }
              );

            if (idx === 7) {
              fullTl.call(() => audioSynthesizer.playRitualChime(), undefined, "-=0.2")
                .to(textRef.current, { delay: 0.7 });
            }
          });
        }
      }
    } catch (err) {
      console.error("Failed to enter fullscreen:", err);
      setIsEntering(false);
    }
  };

  const exitFullFocus = async () => {
    if (isExitTransitionActive) return;

    setIsExitTransitionActive(true);
    
    // Animate exit overlay
    const exitTl = gsap.timeline({
      onComplete: async () => {
        try {
          const doc = document as FullscreenDocument;
          if (doc.fullscreenElement) {
            if (doc.exitFullscreen) {
              await doc.exitFullscreen();
            } else if (doc.webkitExitFullscreen) {
              await doc.webkitExitFullscreen();
            } else if (doc.mozCancelFullScreen) {
              await doc.mozCancelFullScreen();
            } else if (doc.msExitFullscreen) {
              await doc.msExitFullscreen();
            }
          }
        } catch (err) {
          console.error("Failed to exit fullscreen:", err);
        } finally {
          setIsFullFocusActive(false);
          setIsExitTransitionActive(false);
          localStorage.setItem("pd_last_focus_exit_time", Date.now().toString());
        }
      }
    });

    exitTl.fromTo(exitOverlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: "power2.inOut" }
    )
    .delay(1.0);
  };

  // Sync Fullscreen browser changes (e.g. Esc key pressed)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement === fullscreenContainerRef.current;
      if (!isCurrentlyFullscreen && isFullFocusActive) {
        setIsFullFocusActive(false);
        localStorage.setItem("pd_last_focus_exit_time", Date.now().toString());
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [isFullFocusActive]);

  // Prevent scroll when in Full Focus
  useEffect(() => {
    if (isFullFocusActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullFocusActive]);

  // Floating Particles Canvas Loop
  useEffect(() => {
    if (!isFullFocusActive || !isIntroCompleted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = (canvas.width = window.innerWidth);
      height = (canvas.height = window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    const particlesCount = 45;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      maxOpacity: number;
    }> = [];

    for (let i = 0; i < particlesCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        speedY: -(Math.random() * 0.2 + 0.1),
        speedX: (Math.random() - 0.5) * 0.1,
        opacity: 0,
        maxOpacity: Math.random() * 0.3 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        if (p.opacity < p.maxOpacity) {
          p.opacity += 0.005;
        }

        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
          p.opacity = 0;
        }
        if (p.x < 0 || p.x > width) {
          p.speedX *= -1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isFullFocusActive, isIntroCompleted]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;

      if (key === "f") {
        e.preventDefault();
        if (isFullFocusActive) {
          exitFullFocus();
        } else {
          enterFullFocus();
        }
        return;
      }

      if (isFullFocusActive && isIntroCompleted) {
        if (code === "Space") {
          e.preventDefault();
          toggleTimer();
        } else if (key === "r") {
          e.preventDefault();
          resetTimer();
        } else if (key === "s") {
          e.preventDefault();
          if (mode === "break") {
            skipBreak();
          }
        } else if (key === "m") {
          e.preventDefault();
          toggleMute();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isFullFocusActive,
    isIntroCompleted,
    isRunning,
    mode,
    mission,
    selectedSound,
    volume,
    enterFullFocus,
    exitFullFocus,
    resetTimer,
    skipBreak,
    toggleTimer,
    isMuted,
    toggleMute,
  ]);

  // Auto-hiding Controls (4-Second mouse inactivity)
  useEffect(() => {
    if (!isFullFocusActive || !isIntroCompleted) return;

    const handleMouseMove = () => {
      setShowControls(true);

      if (mouseTimerRef.current) {
        clearTimeout(mouseTimerRef.current);
      }

      mouseTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    };

    handleMouseMove();

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (mouseTimerRef.current) {
        clearTimeout(mouseTimerRef.current);
      }
    };
  }, [isFullFocusActive, isIntroCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTodayFocus = (minutes: number) => {
    let totalMins = minutes;
    if (isRunning && mode === "focus") {
      const elapsed = Math.floor((sessionDuration - timeLeft) / 60);
      totalMins += elapsed;
    }
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatRemainingFocus = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatSoundName = (sound: string | null) => {
    if (!sound) return "None";
    return sound.charAt(0).toUpperCase() + sound.slice(1);
  };

  return (
    <div ref={fullscreenContainerRef} className="w-full h-full relative">
      {/* 1. STANDARD WIDGET VIEW (Normal Dashboard View) */}
      <div className="bg-card border border-border p-6 rounded flex flex-col items-center justify-center relative overflow-hidden group">
        {/* Mode Tabs */}
        <div className="absolute top-4 left-6 flex gap-3 z-10">
          <button
            onClick={() => switchMode("focus")}
            disabled={isLocked}
            className={`font-orbitron uppercase text-[9px] tracking-widest transition-all cursor-pointer ${
              mode === "focus"
                ? "text-glow text-white underline underline-offset-4 font-bold"
                : "text-white/40 hover:text-white/70"
            } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            Focus
          </button>
          <button
            onClick={() => switchMode("break")}
            disabled={isLocked}
            className={`font-orbitron uppercase text-[9px] tracking-widest transition-all cursor-pointer ${
              mode === "break"
                ? "text-glow text-white underline underline-offset-4 font-bold"
                : "text-white/40 hover:text-white/70"
            } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            Break
          </button>
        </div>

        {/* Skip Break */}
        {mode === "break" && (
          <button
            onClick={skipBreak}
            className="absolute top-4 right-6 font-orbitron uppercase text-[9px] tracking-widest text-white/50 hover:text-white transition-all underline underline-offset-4 cursor-pointer"
          >
            Skip Break
          </button>
        )}

        {/* Circular Progress Ring */}
        <div className="relative w-48 h-48 mt-4 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle cx="96" cy="96" r={radius} className="stroke-white/5 fill-none" strokeWidth="2" />
            <circle
              cx="96"
              cy="96"
              r={radius}
              className="stroke-white fill-none transition-all duration-300 ease-linear shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          {/* Time Readout */}
          <div className="flex flex-col items-center z-10">
            <span className="font-mono text-4xl tracking-widest text-white text-glow">{formatTime(timeLeft)}</span>
            <span className="font-orbitron uppercase text-[8px] tracking-[0.2em] text-white/30 mt-1">
              {mode === "focus" ? "Active Duel" : "Refueling"}
            </span>
          </div>
        </div>

        {/* Mission Input Field */}
        <div className="w-full mt-6 z-10 flex flex-col gap-2">
          <label className="font-orbitron uppercase text-[9px] tracking-widest text-white/40">Current Mission</label>
          <input
            type="text"
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            disabled={isLocked}
            placeholder="e.g. Build MongoDB Backend"
            className="w-full bg-black/40 border border-white/10 px-3 py-2 text-xs font-inter text-white placeholder-white/20 focus:outline-none focus:border-white/30 rounded disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          />
          <div className="flex justify-between items-center text-[9px] font-mono text-white/30 uppercase mt-0.5">
            <span>Estimated Time</span>
            <span className="text-white/60">{Math.ceil(sessionDuration / 60)} minutes</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-4 mt-6 z-10 w-full justify-center">
          {/* Decrease Time */}
          <button
            onClick={() => adjustTime(-5)}
            disabled={timeLeft <= 300}
            className="px-2 py-1.5 border border-white/5 hover:border-white/20 text-[9px] font-mono text-white/40 hover:text-white transition-all rounded disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
            title="Decrease 5 minutes"
          >
            -5M
          </button>

          {/* Reset */}
          <button
            onClick={resetTimer}
            className="p-2 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded-full cursor-pointer"
            title="Reset Timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Start/Pause */}
          <button
            onClick={toggleTimer}
            disabled={!mission.trim()}
            className="w-10 h-10 bg-white hover:bg-neutral-200 text-black flex items-center justify-center rounded-full transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={isRunning ? "Pause" : "Start"}
          >
            {isRunning ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
          </button>

          {/* Stop */}
          <button
            onClick={stopTimer}
            className="p-2 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded-full cursor-pointer"
            title="Stop Session"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Increase Time */}
          <button
            onClick={() => adjustTime(5)}
            className="px-2 py-1.5 border border-white/5 hover:border-white/20 text-[9px] font-mono text-white/40 hover:text-white transition-all rounded cursor-pointer"
            title="Increase 5 minutes"
          >
            +5M
          </button>
        </div>

        {/* Ambient Sounds */}
        <div className="w-full mt-6 pt-4 border-t border-white/5 z-10 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <label className="font-orbitron uppercase text-[9px] tracking-widest text-white/40">Ambient Sound</label>
            {selectedSound && <span className="font-mono text-[9px] text-white/60 uppercase">{selectedSound}</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["rain", "forest", "cafe", "brown", "white", "fireplace"].map((sound) => (
              <button
                key={sound}
                onClick={() => handleSoundSelect(sound)}
                className={`px-1 py-1.5 border text-[9px] font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                  selectedSound === sound
                    ? "bg-white text-black border-white font-bold"
                    : "border-white/5 text-white/40 hover:text-white/70 hover:border-white/20"
                }`}
              >
                {sound === "brown" ? "Brown N." : sound === "white" ? "White N." : sound}
              </button>
            ))}
          </div>

          {selectedSound && (
            <div className="flex items-center gap-3 mt-1.5">
              <Volume2 className="w-3.5 h-3.5 text-white/40 shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <span className="font-mono text-[9px] text-white/40 w-6 text-right">{Math.round(volume * 100)}%</span>
            </div>
          )}
        </div>

        {/* Enter Focus Mode Trigger Button */}
        <button
          onClick={enterFullFocus}
          disabled={!mission.trim() || isEntering}
          className="w-full mt-4 py-2.5 border border-white/10 hover:border-white/30 text-white font-orbitron text-[9px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all duration-300 rounded flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Maximize2 className="w-3 h-3" /> Enter Focus Mode
        </button>
      </div>

      {/* 2. FULL FOCUS MODE OVERLAY VIEW */}
      {isFullFocusActive && (
        <div className="fixed inset-0 w-screen h-screen bg-black z-50 flex flex-col items-center justify-center select-none overflow-hidden font-inter">
          {/* Subtle slow breathing background gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,15,15,0.85)_0%,#000000_100%)] pointer-events-none" />

          {/* Slow drifting fog elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-white/[0.015] blur-[100px] animate-pulse duration-[8000ms]" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-white/[0.015] blur-[120px] animate-pulse duration-[12000ms]" />
          </div>

          {/* Particle canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

          {!isIntroCompleted ? (
            // Cinematic Entry Sequence View
            <div
              onClick={skipIntro}
              className="flex flex-col items-center justify-center z-20 w-full h-full cursor-pointer relative"
              title="Click anywhere to skip transition"
            >
              {/* Vignette Overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.92)_100%)] pointer-events-none" />

              {/* Glowing vector sword centerpiece */}
              <div
                ref={swordImgRef}
                className="relative w-full max-w-[340px] md:max-w-[440px] h-[24px] overflow-hidden flex items-center justify-center mb-10 transition-opacity duration-500"
              >
                <div
                  ref={swordLightRef}
                  className="absolute top-0 bottom-0 w-[4px] -translate-x-1/2 z-20 pointer-events-none"
                  style={{
                    background: "linear-gradient(to bottom, transparent 10%, #ffffff 50%, transparent 90%)",
                    boxShadow: "0 0 15px 3px rgba(255, 255, 255, 0.95)",
                  }}
                />
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    maskImage: "linear-gradient(to right, #000 0%, #000 33%, transparent 66%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to right, #000 0%, #000 33%, transparent 66%, transparent 100%)",
                    maskSize: "300% 100%",
                    WebkitMaskSize: "300% 100%",
                    maskPosition: "100% 0%",
                    WebkitMaskPosition: "100% 0%",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                  }}
                >
                  {/* Inline Sword SVG */}
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 500 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-auto opacity-95"
                  >
                    <defs>
                      <linearGradient id="ff-blade-top-p4" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#b5b5b5" />
                      </linearGradient>
                      <linearGradient id="ff-blade-bottom-p4" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8c8c8c" />
                        <stop offset="100%" stopColor="#555555" />
                      </linearGradient>
                      <linearGradient id="ff-metal-bright-p4" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#7a7a7a" />
                        <stop offset="50%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#7a7a7a" />
                      </linearGradient>
                      <linearGradient id="ff-hilt-grad-p4" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#dcdcdc" />
                        <stop offset="50%" stopColor="#aaaaaa" />
                        <stop offset="100%" stopColor="#444444" />
                      </linearGradient>
                    </defs>
                    <circle cx="20" cy="12" r="3.5" fill="url(#ff-metal-bright-p4)" stroke="#3a3a3a" strokeWidth="0.5" />
                    <rect x="23.5" y="10.5" width="46.5" height="3" rx="1" fill="url(#ff-hilt-grad-p4)" />
                    <line x1="33" y1="10.5" x2="33" y2="13.5" stroke="#3a3a3a" strokeWidth="0.5" />
                    <line x1="43" y1="10.5" x2="43" y2="13.5" stroke="#3a3a3a" strokeWidth="0.5" />
                    <line x1="53" y1="10.5" x2="53" y2="13.5" stroke="#3a3a3a" strokeWidth="0.5" />
                    <line x1="63" y1="10.5" x2="63" y2="13.5" stroke="#3a3a3a" strokeWidth="0.5" />
                    <rect
                      x="70"
                      y="4"
                      width="5"
                      height="16"
                      rx="1"
                      fill="url(#ff-metal-bright-p4)"
                      stroke="#3a3a3a"
                      strokeWidth="0.5"
                    />
                    <rect x="71.5" y="10.5" width="2" height="3" fill="#ffffff" />
                    <rect x="75" y="9.5" width="8" height="5" fill="url(#ff-hilt-grad-p4)" />
                    <path d="M83 9.5 L460 9.5 L480 12 L83 12 Z" fill="url(#ff-blade-top-p4)" />
                    <path d="M83 12 L480 12 L460 14.5 L83 14.5 Z" fill="url(#ff-blade-bottom-p4)" />
                  </svg>
                </div>
              </div>

              {/* Protocol Messages */}
              <div className="h-12 flex items-center justify-center mb-6">
                <span
                  ref={textRef}
                  className={`font-orbitron uppercase text-[10px] md:text-xs tracking-[0.25em] ${
                    ritualText === "MISSION LOCKED"
                      ? "text-red-500 font-extrabold text-glow animate-pulse"
                      : "text-white/70 font-semibold"
                  }`}
                >
                  {ritualText}
                </span>
              </div>

              {/* Mission reveal during animation */}
              {isMissionRevealed && (
                <div ref={missionRef} className="flex flex-col items-center gap-2 mb-4">
                  <span className="font-orbitron uppercase text-[9px] tracking-[0.3em] text-white/30">MISSION</span>
                  <h2 className="font-orbitron uppercase text-xl md:text-2xl tracking-[0.1em] font-extrabold text-white text-glow">
                    {mission}
                  </h2>
                </div>
              )}

              {/* Timer reveal during animation */}
              {isTimerRevealed && (
                <div ref={timerRevealRef} className="flex flex-col items-center">
                  <h1 className="font-mono text-7xl md:text-8xl tracking-widest text-glow text-white">
                    {formatTime(timeLeft)}
                  </h1>
                </div>
              )}
            </div>
          ) : (
            // Full Focus Mode Main Layout
            <div className="flex flex-col items-center justify-center w-full h-full p-12 z-20 relative">
              {/* TOP CENTER: MISSION */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center flex flex-col items-center gap-1 z-20">
                <span className="font-orbitron uppercase text-[9px] tracking-[0.3em] text-white/30">MISSION</span>
                <h2 className="font-orbitron uppercase text-xl sm:text-2xl tracking-[0.1em] font-extrabold text-white text-glow max-w-lg leading-relaxed">
                  {mission}
                </h2>
              </div>

              {/* CENTER: TIMER */}
              <div className="flex flex-col items-center justify-center flex-1 max-w-xl text-center z-20">
                {/* Huge Countdown Timer */}
                <h1 className="font-mono text-8xl sm:text-9xl md:text-[11rem] tracking-widest text-white text-glow select-none leading-none">
                  {formatTime(timeLeft)}
                </h1>

                <span className="font-orbitron text-xs text-glow text-white font-bold tracking-widest uppercase mt-4 block">
                  {mode === "focus" ? "Deep Focus Active" : "Refueling Active"}
                </span>

                {/* Sleek Glowing Progress Bar */}
                <div className="w-64 sm:w-80 h-[2px] bg-white/10 rounded-full overflow-hidden mt-8 relative shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                  <div
                    className="h-full bg-white transition-all duration-300 ease-linear shadow-[0_0_8px_rgba(255,255,255,0.95)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* RIGHT SIDE PANEL: LIVE STATISTICS */}
              <div
                className={`absolute right-12 top-1/2 -translate-y-1/2 w-64 bg-black/40 border border-white/5 backdrop-blur-md p-6 rounded-lg flex flex-col gap-4 z-30 transition-opacity duration-700 shadow-[0_0_25px_rgba(0,0,0,0.6)] ${
                  showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <div className="pb-2 border-b border-white/5">
                  <span className="font-orbitron uppercase text-[9px] tracking-widest text-white/40">Live Statistics</span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-white/40 uppercase text-[9px] tracking-wider">Today&apos;s Focus</span>
                    <span className="font-mono text-white font-bold">{formatTodayFocus(todayFocusMinutes)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-white/40 uppercase text-[9px] tracking-wider">Completed Sessions</span>
                    <span className="font-mono text-white font-bold">{completedSessions}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-white/40 uppercase text-[9px] tracking-wider">Current Streak</span>
                    <span className="font-mono text-white font-bold">{streak} Sessions</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-white/40 uppercase text-[9px] tracking-wider">Distractions</span>
                    <span className="font-mono text-white font-bold text-red-400">{distractions}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-white/40 uppercase text-[9px] tracking-wider">Current Env</span>
                    <span className="font-mono text-white font-bold uppercase text-[10px]">
                      {formatSoundName(selectedSound)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-white/40 uppercase text-[9px] tracking-wider">Remaining Time</span>
                    <span className="font-mono text-white font-bold text-glow">{formatRemainingFocus(timeLeft)}</span>
                  </div>
                </div>
              </div>

              {/* BOTTOM CENTER: CONTROLS */}
              <div
                className={`absolute bottom-12 left-12 right-12 flex flex-col md:flex-row justify-between items-center gap-6 z-30 transition-opacity duration-700 ${
                  showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                {/* Ambient Sound Selection (Left) */}
                <div className="flex flex-col gap-2 items-start w-64">
                  <span className="font-mono text-[9px] tracking-widest text-white/30 uppercase">Ambient Sound</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["rain", "forest", "cafe", "brown", "white", "fireplace"].map((sound) => (
                      <button
                        key={sound}
                        onClick={() => handleSoundSelect(sound)}
                        className={`px-2 py-1 border text-[9px] font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                          selectedSound === sound
                            ? "bg-white text-black border-white font-bold"
                            : "border-white/5 text-white/40 hover:text-white/70 hover:border-white/20"
                        }`}
                      >
                        {sound === "brown" ? "Brown" : sound === "white" ? "White" : sound}
                      </button>
                    ))}
                  </div>
                  {selectedSound && (
                    <div className="flex items-center gap-2 mt-1 w-full">
                      <button
                        onClick={toggleMute}
                        className="text-white/40 hover:text-white shrink-0 cursor-pointer"
                        title={isMuted ? "Unmute Ambient" : "Mute Ambient"}
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${isMuted ? "opacity-30 line-through" : ""}`} />
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>
                  )}
                </div>

                {/* Central Controls */}
                <div className="flex items-center gap-4">
                  {/* Start / Pause */}
                  <button
                    onClick={toggleTimer}
                    className="w-12 h-12 bg-white hover:bg-neutral-200 text-black flex items-center justify-center rounded-full transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-95 cursor-pointer"
                    title={isRunning ? "Pause" : "Resume"}
                  >
                    {isRunning ? (
                      <Pause className="w-5 h-5 fill-black" />
                    ) : (
                      <Play className="w-5 h-5 fill-black ml-0.5" />
                    )}
                  </button>

                  {/* Reset */}
                  <button
                    onClick={resetTimer}
                    className="p-2.5 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded-full cursor-pointer"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* End Session (Stop) */}
                  <button
                    onClick={stopTimer}
                    className="p-2.5 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded-full cursor-pointer"
                    title="End Session"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>

                  {/* Skip Break */}
                  {mode === "break" && (
                    <button
                      onClick={skipBreak}
                      className="px-3 py-1.5 border border-white/10 text-white font-orbitron uppercase text-[9px] tracking-widest hover:bg-white hover:text-black transition-all rounded cursor-pointer"
                    >
                      Skip Break
                    </button>
                  )}
                </div>

                {/* Exit Focus Mode (Right) */}
                <div className="w-64 flex justify-end">
                  <button
                    onClick={exitFullFocus}
                    className="px-4 py-2 border border-white/10 text-white font-orbitron uppercase text-[9px] tracking-widest hover:bg-white hover:text-black hover:border-white transition-all duration-300 flex items-center gap-2 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Exit Focus Mode
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. EXIT SEQUENCE OVERLAY VIEW */}
      {isExitTransitionActive && (
        <div
          ref={exitOverlayRef}
          className="fixed inset-0 w-screen h-screen bg-black z-[100] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{ opacity: 0 }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="font-orbitron uppercase text-[9px] tracking-[0.4em] text-white/30 block animate-pulse">
              SESSION PRESERVED
            </span>
            <h2 className="font-orbitron uppercase text-lg sm:text-xl font-bold tracking-[0.2em] text-white/60">
              Returning to Dashboard...
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}

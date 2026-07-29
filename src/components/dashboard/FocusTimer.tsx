"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Square, Volume2, Maximize2, X } from "lucide-react";
import { audioSynthesizer } from "@/lib/audio";
import { gsap } from "gsap";
import FullscreenIntro from "@/components/cinematic/FullscreenIntro";

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

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface SessionSummary {
  mission: string;
  focusDuration: number;
  breakDuration: number;
  startedAt: Date;
  endedAt: Date;
  completed: boolean;
  focusScore: number;
  pauseCount: number;
  distractionCount: number;
  achievementIds: string[];
}

interface LockInSummary {
  mission: string;
  lockDuration: number;
  focusTime: number;
  breakTime: number;
  completed: boolean;
  focusScore: number;
  distractionCount: number;
  interruptionEvents: IInterruptionEvent[];
  fullscreenExits: number;
  tabSwitches: number;
  startedAt: Date;
  endedAt: Date;
}

interface IInterruptionEvent {
  timestamp: Date;
  type: "fullscreen-exit" | "visibility-hidden" | "window-blur";
  durationAway: number; // in seconds
}

interface ITimelineEvent {
  timestamp: Date;
  event: string;
  elapsed: number;
  remaining: number;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "first_session", icon: "🏆", title: "First Session", description: "Completed your first focus session." },
  { id: "three_sessions", icon: "🔥", title: "3 Sessions Today", description: "Completed three focus sessions today." },
  { id: "iron_discipline", icon: "⚔", title: "Iron Discipline", description: "Focused with zero pauses and distractions." },
  { id: "flow_starter", icon: "⚡", title: "Flow Starter", description: "Focused for 25 minutes or more." },
  { id: "deep_worker", icon: "🧠", title: "Deep Worker", description: "Focused for 50 minutes or more." },
  { id: "no_distractions", icon: "💎", title: "No Distractions", description: "Completed a session with zero distractions." },
  { id: "entered_flow", icon: "🌊", title: "Entered Flow", description: "Reached the ultimate state of concentration." },
  { id: "deep_worker_flow", icon: "🧠", title: "Deep Worker", description: "Maintained flow state for over 25 minutes." },
  { id: "mind_over_distraction", icon: "⚔", title: "Mind Over Distraction", description: "Completed a flow session with zero distractions." },
  { id: "flow_master", icon: "👑", title: "Flow Master", description: "Completed 3 or more focus sessions in Flow State." },
  { id: "peak_focus", icon: "∞", title: "Peak Focus", description: "Achieved a perfect 100 Focus Score in Flow State." },
  { id: "locked_in", icon: "🛡", title: "Locked In", description: "Successfully initiated an Emergency Lock session." },
  { id: "iron_focus", icon: "⚔", title: "Iron Focus", description: "Completed a Lock In session with zero distractions." },
  { id: "sixty_min_lock", icon: "🔥", title: "60 Minute Lock", description: "Completed a 60-minute Emergency Lock session." },
  { id: "zero_interruptions", icon: "💎", title: "Zero Interruptions", description: "Uninterrupted deep work committed under Lock In." },
  { id: "deep_commitment", icon: "🧠", title: "Deep Commitment", description: "Completed a 90-minute Emergency Lock session." },
];

const formatFlowTime = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

// Flow State Configuration Thresholds
const FLOW_CONSECUTIVE_SESSIONS_REQUIRED = 3;
const FLOW_MIN_FOCUS_SCORE = 90;
const FLOW_MAX_DISTRACTIONS_ALLOWED = 1;

export default function FocusTimer() {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionDuration, setSessionDuration] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mission, setMission] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [distractions, setDistractions] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);

  // Full Focus Mode States
  const [focusOverlayState, setFocusOverlayState] = useState<"inactive" | "loading" | "active">("inactive");
  const isFullFocusActive = focusOverlayState !== "inactive";
  const isIntroCompleted = focusOverlayState === "active";
  const [streak, setStreak] = useState(0);

  // Side Panel Stats States
  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Overlay States
  const [isEntering, setIsEntering] = useState(false);

  // Completion Overlay States
  const [isCompletionActive, setIsCompletionActive] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | LockInSummary | null>(null);
  const [earnedAchievements, setEarnedAchievements] = useState<Achievement[]>([]);
  const [saveStatus, setSaveStatus] = useState<"saving" | "success" | "error">("saving");
  const [completedSessionType, setCompletedSessionType] = useState<"normal" | "lock-in">("normal");

  // Flow State Mode States
  const [isFlowStateActive, setIsFlowStateActive] = useState(false);
  const [flowTime, setFlowTime] = useState(0);
  const [flowStartedAt, setFlowStartedAt] = useState<Date | null>(null);
  const [flowSessionsCompleted, setFlowSessionsCompleted] = useState(0);
  const [flowFocusScores, setFlowFocusScores] = useState<number[]>([]);
  const [flowReflectText, setFlowReflectText] = useState("");
  const [showFlowInterruptedMessage, setShowFlowInterruptedMessage] = useState(false);

  // Emergency Lock States
  const [showLockInModal, setShowLockInModal] = useState(false);
  const [lockInStep, setLockInStep] = useState(1);
  const [selectedLockDuration, setSelectedLockDuration] = useState(30);
  const [isLockInActive, setIsLockInActive] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [interruptionEvents, setInterruptionEvents] = useState<IInterruptionEvent[]>([]);

  // Anti-Procrastination States
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [interruptionTimeline, setInterruptionTimeline] = useState<ITimelineEvent[]>([]);
  const [windowBlurEvents, setWindowBlurEvents] = useState(0);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showReviewTimeline, setShowReviewTimeline] = useState(false);
  const [interruptedElapsed, setInterruptedElapsed] = useState(0);
  const [interruptedRemaining, setInterruptedRemaining] = useState(0);
  const [isStateInitialized, setIsStateInitialized] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const leftTimeRef = useRef<number | null>(null);

  const stateRef = useRef({
    mode,
    mission,
    sessionDuration,
    distractions,
    pauseCount,
    isLockInActive,
    isFlowStateActive,
    todayFocusMinutes,
    completedSessions,
    interruptionEvents,
    fullscreenExits,
    tabSwitches,
    currentSessionId,
    interruptionTimeline
  });

  useEffect(() => {
    stateRef.current = {
      mode,
      mission,
      sessionDuration,
      distractions,
      pauseCount,
      isLockInActive,
      isFlowStateActive,
      todayFocusMinutes,
      completedSessions,
      interruptionEvents,
      fullscreenExits,
      tabSwitches,
      currentSessionId,
      interruptionTimeline
    };
  }, [
    mode,
    mission,
    sessionDuration,
    distractions,
    pauseCount,
    isLockInActive,
    isFlowStateActive,
    todayFocusMinutes,
    completedSessions,
    interruptionEvents,
    fullscreenExits,
    tabSwitches,
    currentSessionId,
    interruptionTimeline
  ]);



  // Completion GSAP animation refs
  const compOverlayRef = useRef<HTMLDivElement | null>(null);
  const compTitleRef = useRef<HTMLDivElement | null>(null);
  const compCardsRef = useRef<HTMLDivElement | null>(null);
  const compActionsRef = useRef<HTMLDivElement | null>(null);

  const progress = (timeLeft / sessionDuration) * 100;

  // Circular timer parameters
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const volumeRef = useRef(volume);
  const prevVolumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Save session helper
  const saveFocusSession = useCallback(async (
    missionText: string,
    dur: number,
    start: Date,
    end: Date,
    isCompleted: boolean,
    distCount: number,
    fScore = 0,
    pCount = 0,
    achIds: string[] = []
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
          focusScore: fScore,
          pauseCount: pCount,
          distractionCount: distCount,
          achievementIds: achIds,
          environment: selectedSound || "None",
          volume,
          deviceType: "Desktop"
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
  }, [selectedSound, volume]);

  // Save Lock In Session to MongoDB
  const autoSaveLockInSession = useCallback(async (summary: SessionSummary | LockInSummary) => {
    setSaveStatus("saving");
    try {
      const lockDur = "lockDuration" in summary ? summary.lockDuration : summary.focusDuration;
      const focusT = "focusTime" in summary ? summary.focusTime : summary.focusDuration;
      const breakT = "breakTime" in summary ? summary.breakTime : 0;
      const events = "interruptionEvents" in summary ? summary.interruptionEvents : [];
      const fsExits = "fullscreenExits" in summary ? summary.fullscreenExits : 0;
      const tabSw = "tabSwitches" in summary ? summary.tabSwitches : 0;

      const response = await fetch("/api/lock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission: summary.mission,
          lockDuration: lockDur,
          focusTime: focusT,
          breakTime: breakT,
          completed: summary.completed,
          focusScore: summary.focusScore,
          distractionCount: summary.distractionCount,
          interruptionEvents: events,
          fullscreenExits: fsExits,
          tabSwitches: tabSw,
          startedAt: summary.startedAt.toISOString(),
          endedAt: summary.endedAt.toISOString()
        })
      });

      if (response.ok) {
        setSaveStatus("success");
        window.dispatchEvent(new Event("focusSessionSaved"));
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  }, []);

  // Load state on mount
  useEffect(() => {
    const load = async () => {
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
              parseInt(savedDistractions || "0", 10),
              100,
              0,
              ["first_session"]
            );
          }
        }
      } else {
        if (savedTimeLeft) setTimeLeft(parseInt(savedTimeLeft, 10));
      }
      setIsStateInitialized(true);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Focus Score Calculator
  const calculateFocusScore = useCallback((completed: boolean, pauses: number, interruptions: number): number => {
    if (!completed) return 40;
    let score = 100;
    score -= pauses * 5;
    score -= interruptions * 3;
    return Math.max(10, Math.min(100, score));
  }, []);

  // Check achievements triggered this session
  const checkAchievements = useCallback((todayMins: number, duration: number, pauses: number, interruptions: number) => {
    const list: Achievement[] = [];
    
    if (completedSessions === 0) {
      list.push(ACHIEVEMENTS[0]);
    }
    
    if (todayMins / 25 >= 2.0) {
      list.push(ACHIEVEMENTS[1]);
    }

    if (pauses === 0 && interruptions === 0) {
      list.push(ACHIEVEMENTS[2]);
    }

    if (duration >= 25 * 60) {
      list.push(ACHIEVEMENTS[3]);
    }

    if (duration >= 50 * 60) {
      list.push(ACHIEVEMENTS[4]);
    }

    if (interruptions === 0) {
      list.push(ACHIEVEMENTS[5]);
    }

    return list;
  }, [completedSessions]);

  // Check Flow State specific achievements
  const checkFlowAchievements = useCallback((score: number) => {
    const list: Achievement[] = [ACHIEVEMENTS[6]];

    if (flowTime >= 25 * 60) {
      list.push(ACHIEVEMENTS[7]);
    }

    if (distractions === 0) {
      list.push(ACHIEVEMENTS[8]);
    }

    if (flowSessionsCompleted + 1 >= 3) {
      list.push(ACHIEVEMENTS[9]);
    }

    if (score === 100) {
      list.push(ACHIEVEMENTS[10]);
    }

    return list;
  }, [flowTime, distractions, flowSessionsCompleted]);

  // Calculate Anti-Procrastination Score
  const calculateAntiScore = useCallback((completed: boolean, distractionCount: number, pauses: number) => {
    let score = 75;
    if (completed) score += 15;
    score -= distractionCount * 2;
    score -= pauses * 3;
    return Math.max(10, Math.min(100, score));
  }, []);

  // Save Anti-Procrastination Session state to MongoDB
  const saveAntiProcrastinationState = useCallback(async (
    statusOverride?: "active" | "completed" | "interrupted" | "cancelled",
    timelineOverride?: ITimelineEvent[]
  ) => {
    if (!currentSessionId) return;

    const currentStatus = statusOverride || (timeLeft === 0 ? "completed" : "active");
    const timeline = timelineOverride || interruptionTimeline;
    const score = calculateFocusScore(currentStatus === "completed", pauseCount, distractions);
    const antiScore = calculateAntiScore(currentStatus === "completed", distractions, pauseCount);

    try {
      await fetch("/api/anti-procrastination/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSessionId,
          mission,
          focusDuration: sessionDuration - timeLeft,
          remainingDuration: timeLeft,
          distractionCount: distractions,
          pauseCount,
          fullscreenExits,
          tabSwitches,
          windowBlurEvents,
          interruptionTimeline: timeline,
          sessionStatus: currentStatus,
          focusScore: score,
          antiProcrastinationScore: antiScore,
          startedAt: sessionStartRef.current?.toISOString() || new Date(Date.now() - (sessionDuration - timeLeft) * 1000).toISOString(),
          endedAt: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error("Failed to save anti-procrastination state:", e);
    }
  }, [currentSessionId, mission, sessionDuration, timeLeft, distractions, pauseCount, fullscreenExits, tabSwitches, windowBlurEvents, interruptionTimeline, calculateAntiScore, calculateFocusScore]);

  // Asynchronous auto save to MongoDB
  const autoSaveSession = useCallback(async (summary: SessionSummary | LockInSummary) => {
    setSaveStatus("saving");
    try {
      const focusDur = "focusDuration" in summary ? summary.focusDuration : summary.lockDuration;
      const pauses = "pauseCount" in summary ? summary.pauseCount : 0;
      const achievements = "achievementIds" in summary ? summary.achievementIds : [];

      const response = await fetch("/api/focus-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission: summary.mission,
          type: "focus",
          duration: focusDur,
          startedAt: summary.startedAt.toISOString(),
          endedAt: summary.endedAt.toISOString(),
          completed: summary.completed,
          distractions: summary.distractionCount,
          focusScore: summary.focusScore,
          pauseCount: pauses,
          distractionCount: summary.distractionCount,
          achievementIds: achievements,
          environment: selectedSound || "None",
          volume,
          deviceType: "Desktop"
        }),
      });

      if (response.ok) {
        setSaveStatus("success");
        window.dispatchEvent(new Event("focusSessionSaved"));
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  }, [selectedSound, volume]);

  // Live stopwatch loop for flow state duration
  useEffect(() => {
    let stopwatch: NodeJS.Timeout;
    if (isFlowStateActive && isRunning) {
      stopwatch = setInterval(() => {
        setFlowTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(stopwatch);
  }, [isFlowStateActive, isRunning]);

  const saveFlowHistory = useCallback(async (end: Date) => {
    if (!flowStartedAt) return;
    const duration = Math.round((end.getTime() - flowStartedAt.getTime()) / 1000);
    const sessionsCount = flowSessionsCompleted;
    const avgScore = flowFocusScores.length > 0 
      ? Math.round(flowFocusScores.reduce((a, b) => a + b, 0) / flowFocusScores.length)
      : 95;

    let reflection = "";
    if (sessionsCount >= 4) {
      reflection = `Legendary focus. You maintained a pure Flow State for ${formatFlowTime(duration)} across ${sessionsCount} consecutive sessions. This is one of your strongest focus streaks.`;
    } else if (sessionsCount >= 2) {
      reflection = `Outstanding consistency. You maintained uninterrupted focus across ${sessionsCount} consecutive sessions. Your mind was exceptionally stable.`;
    } else {
      reflection = `Excellent effort. You unlocked Flow State and sustained deep work for ${formatFlowTime(duration)}. Keep maintaining consistent rhythms to lock your flow even longer next time.`;
    }
    
    setFlowReflectText(reflection);

    try {
      await fetch("/api/flow-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startedAt: flowStartedAt.toISOString(),
          endedAt: end.toISOString(),
          duration,
          sessions: sessionsCount,
          averageFocusScore: avgScore,
          maxContinuousFlow: duration,
          reflection
        })
      });
    } catch (e) {
      console.error("Failed to save flow history:", e);
    }

    setFlowStartedAt(null);
  }, [flowStartedAt, flowSessionsCompleted, flowFocusScores]);

  // Break flow state and notify user
  const breakFlowState = useCallback(() => {
    setIsFlowStateActive(false);
    audioSynthesizer.disableFlowAudio();
    saveFlowHistory(new Date());

    audioSynthesizer.playFocusEnd();
    setShowFlowInterruptedMessage(true);
    setTimeout(() => {
      setShowFlowInterruptedMessage(false);
    }, 2500);

    localStorage.setItem("pd_recent_focus_sessions", "[]");
  }, [saveFlowHistory]);



  // Flow Entry Cinematic Ritual sequence
  const enterFlowStateRitual = useCallback((onCompleteRitual: () => void) => {
    onCompleteRitual();
  }, []);

  // Distraction Recorder
  const recordInterruption = useCallback((type: "fullscreen-exit" | "visibility-hidden" | "window-blur") => {
    if (leftTimeRef.current !== null) return;

    leftTimeRef.current = Date.now();
    setDistractions((p) => p + 1);

    const elapsed = sessionDuration - timeLeft;
    const remaining = timeLeft;

    let eventName = "Exited Fullscreen";
    if (type === "fullscreen-exit") {
      setFullscreenExits((p) => p + 1);
    } else if (type === "visibility-hidden") {
      setTabSwitches((p) => p + 1);
      eventName = "Tab Switched";
    } else if (type === "window-blur") {
      setWindowBlurEvents((p) => p + 1);
      eventName = "Window Blurred";
    }

    const timelineEvent: ITimelineEvent = {
      timestamp: new Date(),
      event: eventName,
      elapsed,
      remaining
    };

    const updatedTimeline = [...interruptionTimeline, timelineEvent];
    setInterruptionTimeline(updatedTimeline);

    // Save active state updates in MongoDB
    saveAntiProcrastinationState("active", updatedTimeline);

    if (isLockInActive) {
      const newEvent: IInterruptionEvent = {
        timestamp: new Date(),
        type,
        durationAway: 0
      };
      setInterruptionEvents((prev) => [...prev, newEvent]);
      setShowWelcomeBack(true);
    }
  }, [isLockInActive, sessionDuration, timeLeft, interruptionTimeline, saveAntiProcrastinationState]);

  // Return Handler
  const handleReturn = useCallback(() => {
    if (leftTimeRef.current === null) return;

    const elapsed = sessionDuration - timeLeft;
    const remaining = timeLeft;

    const returnEvent: ITimelineEvent = {
      timestamp: new Date(),
      event: "Returned",
      elapsed,
      remaining
    };

    const updatedTimeline = [...interruptionTimeline, returnEvent];
    setInterruptionTimeline(updatedTimeline);

    saveAntiProcrastinationState("active", updatedTimeline);

    if (isLockInActive) {
      // Let handleRefocusReturn handle resetting leftTimeRef for emergency locks
    } else {
      setIsRunning(false);
      setInterruptedElapsed(elapsed);
      setInterruptedRemaining(remaining);
      setShowRecoveryModal(true);
      leftTimeRef.current = null;
    }
  }, [isLockInActive, sessionDuration, timeLeft, interruptionTimeline, saveAntiProcrastinationState]);

  // Distraction and Return Detection Event Listeners
  useEffect(() => {
    if (!isFullFocusActive || !isIntroCompleted || isCompletionActive) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        recordInterruption("visibility-hidden");
      } else if (document.visibilityState === "visible") {
        handleReturn();
      }
    };

    const handleWindowBlur = () => {
      recordInterruption("window-blur");
    };

    const handleWindowFocus = () => {
      handleReturn();
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement === fullscreenContainerRef.current;
      if (!isCurrentlyFullscreen) {
        recordInterruption("fullscreen-exit");
      } else {
        handleReturn();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [isFullFocusActive, isIntroCompleted, isCompletionActive, recordInterruption, handleReturn]);

  const handleIntroComplete = useCallback(() => {
    setFocusOverlayState("active");
    setIsEntering(false);
  }, []);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);

    const {
      mode,
      mission,
      sessionDuration,
      distractions,
      pauseCount,
      isLockInActive,
      isFlowStateActive,
      todayFocusMinutes,
      interruptionEvents,
      fullscreenExits,
      tabSwitches
    } = stateRef.current;

    if (mode === "focus") {
      audioSynthesizer.playFocusEnd();

      const start = sessionStartRef.current || new Date(Date.now() - sessionDuration * 1000);
      const end = new Date();
      const score = calculateFocusScore(true, pauseCount, distractions);
      
      if (isLockInActive) {
        const achievements = [ACHIEVEMENTS[11]];
        if (distractions === 0) {
          achievements.push(ACHIEVEMENTS[12]);
          achievements.push(ACHIEVEMENTS[14]);
        }
        if (sessionDuration >= 60 * 60) {
          achievements.push(ACHIEVEMENTS[13]);
        }
        if (sessionDuration >= 90 * 60) {
          achievements.push(ACHIEVEMENTS[15]);
        }

        const summary = {
          mission,
          focusDuration: sessionDuration,
          breakDuration: 0,
          startedAt: start,
          endedAt: end,
          completed: true,
          focusScore: score,
          pauseCount,
          distractionCount: distractions,
          achievementIds: achievements.map((a) => a.id)
        };

        setSessionSummary(summary);
        setEarnedAchievements(achievements);
        setIsCompletionActive(true);

        autoSaveLockInSession({
          ...summary,
          lockDuration: sessionDuration,
          focusTime: sessionDuration,
          breakTime: 0,
          interruptionEvents,
          fullscreenExits,
          tabSwitches
        });

        // Complete state save
        saveAntiProcrastinationState("completed");
        setIsLockInActive(false);
        setIsLocked(false);
      } else {
        let consecutive = 0;
        try {
          const recentStr = localStorage.getItem("pd_recent_focus_sessions") || "[]";
          const recent = JSON.parse(recentStr);
          recent.push({ completed: true, score, distractions, timestamp: Date.now() });
          if (recent.length > 3) recent.shift();
          localStorage.setItem("pd_recent_focus_sessions", JSON.stringify(recent));

          consecutive = recent.filter(
            (s: { completed: boolean; score: number; distractions: number; timestamp: number }) => s.completed && s.score >= FLOW_MIN_FOCUS_SCORE && s.distractions <= FLOW_MAX_DISTRACTIONS_ALLOWED
          ).length;
        } catch {}

        const isFlowTriggered = !isFlowStateActive && consecutive >= FLOW_CONSECUTIVE_SESSIONS_REQUIRED;

        if (isFlowTriggered) {
          enterFlowStateRitual(() => {
            setIsFlowStateActive(true);
            setFlowStartedAt(new Date());
            setFlowTime(0);
            setFlowSessionsCompleted(0);
            setFlowFocusScores([]);
            audioSynthesizer.enableFlowAudio();

            setMode("focus");
            const nextDur = 25 * 60;
            setSessionDuration(nextDur);
            setTimeLeft(nextDur);
            setIsLocked(true);
            setDistractions(0);
            setPauseCount(0);
            
            const sId = "session_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
            setCurrentSessionId(sId);
            setWindowBlurEvents(0);
            setFullscreenExits(0);
            setTabSwitches(0);
            const flowInitTimeline = [{ timestamp: new Date(), event: "Focus Started", elapsed: 0, remaining: nextDur }];
            setInterruptionTimeline(flowInitTimeline);

            sessionStartRef.current = new Date();

            fetch("/api/anti-procrastination/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: sId,
                mission,
                focusDuration: 0,
                remainingDuration: nextDur,
                distractionCount: 0,
                pauseCount: 0,
                fullscreenExits: 0,
                tabSwitches: 0,
                windowBlurEvents: 0,
                interruptionTimeline: flowInitTimeline,
                sessionStatus: "active",
                focusScore: score,
                antiProcrastinationScore: calculateAntiScore(false, 0, 0),
                startedAt: new Date().toISOString(),
                endedAt: new Date().toISOString()
              })
            }).catch(() => {});

            setTimeout(() => {
              setIsRunning(true);
            }, 100);
          });
        } else if (isFlowStateActive) {
          setFlowSessionsCompleted((p) => p + 1);
          setFlowFocusScores((p) => [...p, score]);

          const achievements = checkFlowAchievements(score);
          const achievementIds = achievements.map((a) => a.id);

          const summary = {
            mission,
            focusDuration: sessionDuration,
            breakDuration: 5 * 60,
            startedAt: start,
            endedAt: end,
            completed: true,
            focusScore: score,
            pauseCount,
            distractionCount: distractions,
            achievementIds
          };

          setSessionSummary(summary);
          setEarnedAchievements(achievements);
          setIsCompletionActive(true);
          setIsLocked(false);

          autoSaveSession(summary);
          saveAntiProcrastinationState("completed");
        } else {
          const achievements = checkAchievements(todayFocusMinutes, sessionDuration, pauseCount, distractions);
          const achievementIds = achievements.map((a) => a.id);

          const summary = {
            mission,
            focusDuration: sessionDuration,
            breakDuration: 5 * 60,
            startedAt: start,
            endedAt: end,
            completed: true,
            focusScore: score,
            pauseCount,
            distractionCount: distractions,
            achievementIds
          };

          setSessionSummary(summary);
          setEarnedAchievements(achievements);
          setIsCompletionActive(true);
          setIsLocked(false);

          autoSaveSession(summary);
          saveAntiProcrastinationState("completed");
        }
      }

      sessionStartRef.current = null;
    } else {
      audioSynthesizer.playFocusStart();
      setMode("focus");
      const nextDur = 25 * 60;
      setSessionDuration(nextDur);
      setTimeLeft(nextDur);
      setIsLocked(true);
      setDistractions(0);
      setPauseCount(0);
      sessionStartRef.current = null;
      setTimeout(() => {
        setIsRunning(true);
      }, 100);
    }
  }, [
    calculateFocusScore,
    autoSaveLockInSession,
    saveAntiProcrastinationState,
    calculateAntiScore,
    enterFlowStateRitual,
    checkFlowAchievements,
    autoSaveSession,
    checkAchievements
  ]);

  // Timer Tick Engine
  useEffect(() => {
    if (isRunning) {
      if (!sessionStartRef.current) {
        sessionStartRef.current = new Date();
      }

      timerRef.current = setInterval(() => {
        const { isFlowStateActive, distractions, pauseCount } = stateRef.current;
        if (isFlowStateActive && (distractions > FLOW_MAX_DISTRACTIONS_ALLOWED || pauseCount > 2)) {
          clearInterval(timerRef.current!);
          setIsRunning(false);
          breakFlowState();
          return;
        }

        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimeout(() => {
              handleTimerComplete();
            }, 0);
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
  }, [isRunning, breakFlowState, handleTimerComplete]);

  const switchMode = useCallback((newMode: "focus" | "break") => {
    setIsRunning(false);
    setMode(newMode);
    const defaultDur = newMode === "focus" ? 25 * 60 : 5 * 60;
    setSessionDuration(defaultDur);
    setTimeLeft(defaultDur);
    setIsLocked(false);
    setDistractions(0);
    setPauseCount(0);
    sessionStartRef.current = null;
  }, []);

  const toggleTimer = useCallback(() => {
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
        setPauseCount((prev) => prev + 1);
        // Log timer pause in timeline
        const elapsed = sessionDuration - timeLeft;
        const remaining = timeLeft;
        const pauseEvent = { timestamp: new Date(), event: "Timer Paused", elapsed, remaining };
        setInterruptionTimeline((p) => [...p, pauseEvent]);
        saveAntiProcrastinationState("active", [...interruptionTimeline, pauseEvent]);
      }
      if (isFullFocusActive) {
        audioSynthesizer.fadeAmbientOut(1.5);
      }
      setIsRunning(false);
    }
  }, [mission, isRunning, isFullFocusActive, selectedSound, mode, sessionDuration, timeLeft, interruptionTimeline, saveAntiProcrastinationState]);

  const stopTimer = () => {
    setIsRunning(false);
    if (isFullFocusActive) {
      audioSynthesizer.fadeAmbientOut(1.0);
    }

    if (mode === "focus" && timeLeft < sessionDuration) {
      const elapsed = sessionDuration - timeLeft;
      const start = sessionStartRef.current || new Date(Date.now() - elapsed * 1000);
      const end = new Date();
      const score = calculateFocusScore(false, pauseCount, distractions);

      if (isFlowStateActive) {
        breakFlowState();
      }

      if (isLockInActive) {
        autoSaveLockInSession({
          mission,
          lockDuration: sessionDuration,
          focusTime: elapsed,
          breakTime: 0,
          completed: false,
          focusScore: score,
          distractionCount: distractions,
          interruptionEvents,
          fullscreenExits,
          tabSwitches,
          startedAt: start,
          endedAt: end
        });
        setIsLockInActive(false);
      } else {
        saveFocusSession(
          mission,
          elapsed,
          start,
          end,
          false,
          distractions,
          score,
          pauseCount,
          []
        );
      }

      // Complete Anti Procrastination exit log
      saveAntiProcrastinationState("interrupted");
    }

    const defaultDur = mode === "focus" ? 25 * 60 : 5 * 60;
    setTimeLeft(defaultDur);
    setSessionDuration(defaultDur);
    setIsLocked(false);
    setDistractions(0);
    setPauseCount(0);
    sessionStartRef.current = null;
  };

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    if (isFullFocusActive) {
      audioSynthesizer.fadeAmbientOut(1.0);
    }
    const defaultDur = mode === "focus" ? 25 * 60 : 5 * 60;
    setTimeLeft(defaultDur);
    setSessionDuration(defaultDur);
    setIsLocked(false);
    setDistractions(0);
    setPauseCount(0);
    sessionStartRef.current = null;
  }, [isFullFocusActive, mode]);

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

  const skipBreak = useCallback(() => {
    switchMode("focus");
    setTimeout(() => {
      audioSynthesizer.playFocusStart();
      setIsLocked(true);
      setIsRunning(true);
    }, 100);
  }, [switchMode]);

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

  const toggleMute = useCallback(() => {
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
  }, [volume]);



  // Full Focus Entry / Exit Triggers
  const enterFullFocus = useCallback(async () => {
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

        setFocusOverlayState("loading");

        // Start timer in the background immediately!
        setIsRunning(true);

        // Fade in background sound immediately
        if (selectedSound) {
          audioSynthesizer.fadeAmbientIn(selectedSound, volumeRef.current, 4.0);
        }

        // Initialize Anti-Procrastination tracking metrics
        const sId = "session_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        setCurrentSessionId(sId);
        setWindowBlurEvents(0);
        setFullscreenExits(0);
        setTabSwitches(0);
        
        const initialTimeline: ITimelineEvent[] = [{
          timestamp: new Date(),
          event: "Focus Started",
          elapsed: 0,
          remaining: sessionDuration
        }];
        setInterruptionTimeline(initialTimeline);

        // Log active session initially
        const score = calculateFocusScore(false, 0, 0);
        const antiScore = calculateAntiScore(false, 0, 0);
        fetch("/api/anti-procrastination/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sId,
            mission,
            focusDuration: 0,
            remainingDuration: sessionDuration,
            distractionCount: 0,
            pauseCount: 0,
            fullscreenExits: 0,
            tabSwitches: 0,
            windowBlurEvents: 0,
            interruptionTimeline: initialTimeline,
            sessionStatus: "active",
            focusScore: score,
            antiProcrastinationScore: antiScore,
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString()
          })
        }).catch(err => console.error("Initial anti-procrastination save error:", err));
      }
    } catch (err) {
      console.error("Failed to enter fullscreen:", err);
      setIsEntering(false);
    }
  }, [mission, isEntering, selectedSound, sessionDuration, calculateAntiScore, calculateFocusScore]);

  const exitFullFocus = useCallback(async () => {
    if (isFlowStateActive) {
      breakFlowState();
    }

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
      setFocusOverlayState("inactive");
      localStorage.setItem("pd_last_focus_exit_time", Date.now().toString());
    }
  }, [isFlowStateActive, breakFlowState]);

  // Sync Fullscreen browser changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement === fullscreenContainerRef.current;
      if (!isCurrentlyFullscreen && isFullFocusActive) {
        setFocusOverlayState("inactive");
        if (isFlowStateActive) {
          breakFlowState();
        }
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
  }, [isFullFocusActive, isFlowStateActive, breakFlowState]);

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

      const speedMultiplier = isFlowStateActive || isLockInActive ? 0.35 : 1.0;

      particles.forEach((p) => {
        if (p.opacity < p.maxOpacity) {
          p.opacity += 0.005;
        }

        p.y += p.speedY * speedMultiplier;
        p.x += p.speedX * speedMultiplier;

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
        ctx.fillStyle = isFlowStateActive 
          ? `rgba(224, 242, 254, ${p.opacity * 1.2})` 
          : isLockInActive
          ? `rgba(254, 226, 226, ${p.opacity * 1.2})`
          : `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isFullFocusActive, isIntroCompleted, isFlowStateActive, isLockInActive]);

  // Completion Screen Animations
  useEffect(() => {
    if (isCompletionActive) {
      audioSynthesizer.setAmbientVolume(volume * 0.4);

      gsap.set(compTitleRef.current, { opacity: 0, scale: 0.9, filter: "blur(6px)" });
      gsap.set(compCardsRef.current?.children || [], { opacity: 0, y: 15, filter: "blur(4px)" });
      gsap.set(compActionsRef.current, { opacity: 0, y: 10 });

      const tl = gsap.timeline();
      tl.to(compTitleRef.current, {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.8,
        ease: "back.out(1.1)",
      })
      .to(compCardsRef.current?.children || [], {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.4,
        stagger: 0.12,
        ease: "power2.out",
      }, "-=0.2")
      .to(compActionsRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
      }, "-=0.1");
    } else {
      audioSynthesizer.setAmbientVolume(volume);
    }
  }, [isCompletionActive, volume]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;

      if (key === "f" && !isLockInActive) {
        e.preventDefault();
        if (isFullFocusActive) {
          exitFullFocus();
        } else {
          enterFullFocus();
        }
        return;
      }

      if (isFullFocusActive && isIntroCompleted && !isCompletionActive) {
        if (code === "Space") {
          e.preventDefault();
          toggleTimer();
        } else if (key === "r" && !isFlowStateActive && !isLockInActive) {
          e.preventDefault();
          resetTimer();
        } else if (key === "s" && !isFlowStateActive && !isLockInActive) {
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
    isCompletionActive,
    isFlowStateActive,
    isLockInActive,
  ]);



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

  const getInterruptionReminder = () => {
    if (distractions === 1) return "Stay Focused";
    if (distractions === 2) return "Distractions Slow Progress";
    if (distractions === 3) return "Return To Deep Work";
    return "Lock In Again";
  };



  // Coaching guidance support messages
  const getCoachingMessage = (elapsedSecs: number, remainingSecs: number) => {
    if (elapsedSecs < 5 * 60) return "You were making progress. Ready to continue?";
    if (elapsedSecs < 15 * 60) return "Your mission is still waiting.";
    if (remainingSecs > 0) return `Only ${Math.round(remainingSecs / 60)} minutes remain.`;
    return "Small steps build consistency.";
  };

  // Action Handlers
  const handleStartNextSession = () => {
    setIsCompletionActive(false);
    setMode("focus");
    const nextDur = 25 * 60;
    setSessionDuration(nextDur);
    setTimeLeft(nextDur);
    setMission("");
    setIsLocked(false);
    setDistractions(0);
    setPauseCount(0);
    sessionStartRef.current = null;
    setFlowReflectText("");
    setCompletedSessionType("normal");
  };

  const handleTakeBreak = () => {
    setIsCompletionActive(false);
    setMode("break");
    const nextDur = 5 * 60;
    setSessionDuration(nextDur);
    setTimeLeft(nextDur);
    setIsLocked(false);
    setDistractions(0);
    setPauseCount(0);
    sessionStartRef.current = null;
    setFlowReflectText("");
    setCompletedSessionType("normal");

    setTimeout(() => {
      setIsRunning(true);
    }, 100);
  };

  const handleReturnToDashboard = () => {
    setIsCompletionActive(false);
    setFlowReflectText("");
    setCompletedSessionType("normal");
    exitFullFocus();
  };

  const handleRetrySave = () => {
    if (sessionSummary) {
      if (completedSessionType === "lock-in") {
        autoSaveLockInSession(sessionSummary);
      } else {
        autoSaveSession(sessionSummary);
      }
    }
  };

  // Emergency Lock Action Button Handlers
  const handleBeginLockIn = async () => {
    setShowLockInModal(false);
    setLockInStep(1);

    const durSeconds = selectedLockDuration * 60;
    setSessionDuration(durSeconds);
    setTimeLeft(durSeconds);
    setMode("focus");
    setIsLocked(true);
    setDistractions(0);
    setPauseCount(0);
    setFullscreenExits(0);
    setTabSwitches(0);
    setInterruptionEvents([]);

    setIsLockInActive(true);
    setCompletedSessionType("lock-in");

    // Initialize anti procrastination details
    const sId = "session_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    setCurrentSessionId(sId);
    setWindowBlurEvents(0);
    setFullscreenExits(0);
    setTabSwitches(0);
    
    const initialTimeline = [{
      timestamp: new Date(),
      event: "Focus Started",
      elapsed: 0,
      remaining: durSeconds
    }];
    setInterruptionTimeline(initialTimeline);

    // Save initial state record
    const score = calculateFocusScore(false, 0, 0);
    const antiScore = calculateAntiScore(false, 0, 0);
    fetch("/api/anti-procrastination/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sId,
        mission,
        focusDuration: 0,
        remainingDuration: durSeconds,
        distractionCount: 0,
        pauseCount: 0,
        fullscreenExits: 0,
        tabSwitches: 0,
        windowBlurEvents: 0,
        interruptionTimeline: initialTimeline,
        sessionStatus: "active",
        focusScore: score,
        antiProcrastinationScore: antiScore,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString()
      })
    }).catch(() => {});

    // Enter fullscreen commitment
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

        setFocusOverlayState("loading");

        setIsRunning(true);

        if (selectedSound) {
          audioSynthesizer.fadeAmbientIn(selectedSound, volumeRef.current, 4.0);
        }
      }
    } catch (e) {
      console.error("Failed to enter fullscreen on begin lock-in:", e);
      setIsEntering(false);
    }
  };

  const handleRefocusReturn = async () => {
    let durationAway = 0;
    if (leftTimeRef.current) {
      durationAway = Math.round((Date.now() - leftTimeRef.current) / 1000);
      leftTimeRef.current = null;
    }

    setInterruptionEvents((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      copy[copy.length - 1] = {
        ...copy[copy.length - 1],
        durationAway
      };
      return copy;
    });

    try {
      const container = fullscreenContainerRef.current as FullscreenElement;
      if (container && !document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          await container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          await container.msRequestFullscreen();
        }
      }
    } catch (e) {
      console.error("Failed to re-enter fullscreen on refocus:", e);
    }

    setShowWelcomeBack(false);
  };

  // Anti-Procrastination Actions handlers
  const handleContinueRecovery = async () => {
    setShowRecoveryModal(false);

    try {
      const container = fullscreenContainerRef.current as FullscreenElement;
      if (container && !document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          await container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          await container.msRequestFullscreen();
        }
      }
    } catch (e) {
      console.error("Failed to re-enter fullscreen on recovery continue:", e);
    }

    setIsRunning(true);
  };

  const handleEndRecovery = () => {
    setShowRecoveryModal(false);

    const start = sessionStartRef.current || new Date(Date.now() - (sessionDuration - timeLeft) * 1000);
    const end = new Date();
    const score = calculateFocusScore(false, pauseCount, distractions);

    const summary = {
      mission,
      focusDuration: sessionDuration - timeLeft,
      breakDuration: 0,
      startedAt: start,
      endedAt: end,
      completed: false,
      focusScore: score,
      pauseCount,
      distractionCount: distractions,
      achievementIds: []
    };

    setSessionSummary(summary);
    setEarnedAchievements([]);
    setIsCompletionActive(true);
    setCompletedSessionType("normal");

    saveAntiProcrastinationState("interrupted");
  };

  if (!isStateInitialized) {
    return (
      <div className="w-full h-48 bg-card border border-border rounded flex items-center justify-center">
        <div className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

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
          <button
            onClick={() => adjustTime(-5)}
            disabled={timeLeft <= 300}
            className="px-2 py-1.5 border border-white/5 hover:border-white/20 text-[9px] font-mono text-white/40 hover:text-white transition-all rounded disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
            title="Decrease 5 minutes"
          >
            -5M
          </button>

          <button
            onClick={resetTimer}
            className="p-2 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded-full cursor-pointer"
            title="Reset Timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleTimer}
            disabled={!mission.trim()}
            className="w-10 h-10 bg-white hover:bg-neutral-200 text-black flex items-center justify-center rounded-full transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={isRunning ? "Pause" : "Start"}
          >
            {isRunning ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
          </button>

          <button
            onClick={stopTimer}
            className="p-2 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded-full cursor-pointer"
            title="Stop Session"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

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

        {/* Actions Trigger Buttons */}
        <div className="w-full mt-4 flex flex-col gap-2">
          <button
            onClick={enterFullFocus}
            disabled={!mission.trim() || isEntering}
            className="w-full py-2.5 border border-white/10 hover:border-white/30 text-white font-orbitron text-[9px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all duration-300 rounded flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Maximize2 className="w-3 h-3" /> Enter Focus Mode
          </button>

          <button
            onClick={() => setShowLockInModal(true)}
            disabled={!mission.trim() || isEntering}
            className="w-full py-2.5 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 text-red-400 font-orbitron text-[9px] tracking-[0.2em] uppercase transition-all duration-300 rounded flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🛡 Lock In (Emergency Lock)
          </button>
        </div>
      </div>

      {/* 2. FULL FOCUS MODE OVERLAY VIEW */}
      {isFullFocusActive && (
        <div className={`fixed inset-0 w-screen h-screen bg-black z-50 flex flex-col items-center justify-center select-none overflow-hidden font-inter transition-all duration-1000 ${
          isFlowStateActive ? "border-t border-sky-400/20" : isLockInActive ? "border-t border-red-500/20" : ""
        }`}>
          {/* Subtle slow breathing background gradient */}
          <div className={`absolute inset-0 transition-opacity duration-1000 ${
            isFlowStateActive 
              ? "bg-[radial-gradient(circle_at_center,rgba(8,47,73,0.3)_0%,#000000_100%)]" 
              : isLockInActive
              ? "bg-[radial-gradient(circle_at_center,rgba(69,10,10,0.25)_0%,#000000_100%)]"
              : "bg-[radial-gradient(circle_at_center,rgba(15,15,15,0.85)_0%,#000000_100%)]"
          }`} />

          {/* Slow drifting fog elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-white/[0.015] blur-[100px] animate-pulse duration-[8000ms]" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-white/[0.015] blur-[120px] animate-pulse duration-[12000ms]" />
          </div>

          {/* Particle canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

          {focusOverlayState === "loading" ? (
            <FullscreenIntro 
              onClose={exitFullFocus} 
              onComplete={handleIntroComplete} 
            />
          ) : (
            // Full Focus Mode Temporary Layout
            <div className="flex flex-col items-center justify-center w-full h-full p-12 z-20 relative bg-black text-white">
              {/* TOP CENTER: MISSION */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center flex flex-col items-center gap-1 z-20">
                <span className="font-orbitron uppercase text-[9px] tracking-[0.3em] text-white/30">MISSION</span>
                <h2 className="font-orbitron uppercase text-xl sm:text-2xl tracking-[0.1em] font-extrabold text-white text-glow">
                  {mission}
                </h2>
              </div>

              {/* CENTER: TIMER */}
              <div className="flex flex-col items-center justify-center flex-1 max-w-xl text-center z-20">
                <h1 className="font-mono text-8xl sm:text-9xl md:text-[11rem] tracking-widest select-none leading-none text-white text-glow">
                  {formatTime(timeLeft)}
                </h1>
              </div>

              {/* RIGHT SIDE PANEL: LIVE STATISTICS */}
              <div
                className="absolute right-12 top-1/2 -translate-y-1/2 w-64 bg-black/40 border border-white/5 backdrop-blur-md p-6 rounded-lg flex flex-col gap-4 z-30 shadow-[0_0_25px_rgba(0,0,0,0.6)]"
              >
                <div className="pb-2 border-b border-white/5">
                  <span className="font-orbitron uppercase text-[9px] tracking-widest text-white/40">
                    Live Statistics
                  </span>
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
                    <span className="font-mono text-white/40 uppercase text-[9px] tracking-wider">Focus Score</span>
                    <span className="font-mono text-white font-bold">{calculateFocusScore(true, pauseCount, distractions)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-white/40 uppercase text-[9px] tracking-wider">Distractions</span>
                    <span className={`font-mono font-bold text-xs ${distractions > 0 ? "text-red-400" : "text-white"}`}>
                      {distractions}
                    </span>
                  </div>
                </div>
              </div>

              {/* LEFT BOTTOM: AMBIENT SOUNDS */}
              <div className="absolute bottom-12 left-12 z-30 flex flex-col gap-2 items-start w-64">
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

              {/* BOTTOM CENTER: CONTROLS */}
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
                <button
                  onClick={toggleTimer}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-white hover:bg-neutral-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all active:scale-95 cursor-pointer"
                  title={isRunning ? "Pause" : "Resume"}
                >
                  {isRunning ? (
                    <Pause className="w-5 h-5 fill-black" />
                  ) : (
                    <Play className="w-5 h-5 fill-black ml-0.5" />
                  )}
                </button>

                <button
                  onClick={resetTimer}
                  className="p-2.5 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded-full cursor-pointer"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={stopTimer}
                  className="p-2.5 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded-full cursor-pointer"
                  title="End Session"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>

                {mode === "break" && (
                  <button
                    onClick={skipBreak}
                    className="px-3 py-1.5 border border-white/10 text-white font-orbitron uppercase text-[9px] tracking-widest hover:bg-white hover:text-black transition-all rounded cursor-pointer"
                  >
                    Skip Break
                  </button>
                )}
              </div>

              {/* RIGHT BOTTOM: EXIT BUTTON */}
              <div className="absolute bottom-12 right-12 z-30">
                <button
                  onClick={exitFullFocus}
                  className="px-4 py-2 border border-white/10 text-white font-orbitron uppercase text-[9px] tracking-widest hover:bg-white hover:text-black hover:border-white transition-all duration-300 flex items-center gap-2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Exit Focus Mode
                </button>
              </div>
            </div>
          )}
        </div>
      )}



      {/* 4. COMPLETION OVERLAY VIEW */}
      {isCompletionActive && (
        <div
          ref={compOverlayRef}
          className="fixed inset-0 w-screen h-screen bg-black z-[90] flex flex-col items-center justify-center select-none overflow-y-auto p-8 font-inter"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,15,15,0.85)_0%,#000000_100%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.95)_100%)] pointer-events-none" />

          {/* Main Content */}
          <div className="w-full max-w-2xl flex flex-col items-center z-20 gap-8 mt-auto mb-auto">
            {/* Title Header */}
            <div ref={compTitleRef} className="text-center flex flex-col items-center gap-2">
              <span className={`font-orbitron uppercase text-[11px] tracking-[0.4em] block animate-pulse ${
                completedSessionType === "lock-in" ? "text-red-400/50" : isFlowStateActive ? "text-sky-400/50" : "text-white/30"
              }`}>
                {completedSessionType === "lock-in" ? "Commitment Fulfilled" : isFlowStateActive ? "Flow Mode Engaged" : "Operation Successful"}
              </span>
              <h1 className={`font-orbitron uppercase text-3xl sm:text-4xl font-extrabold tracking-[0.2em] ${
                completedSessionType === "lock-in" ? "text-red-400 text-glow animate-pulse" : isFlowStateActive ? "text-sky-100 text-sky-glow" : "text-white text-glow"
              }`}>
                {completedSessionType === "lock-in" ? "LOCK IN COMPLETE" : isFlowStateActive ? "FLOW MAINTAINED" : "MISSION COMPLETE"}
              </h1>
              <div className={`w-24 h-[1px] mt-3 ${
                completedSessionType === "lock-in" ? "bg-red-500/20" : isFlowStateActive ? "bg-sky-500/20" : "bg-white/20"
              }`} />
            </div>

            {/* Grid layout */}
            <div ref={compCardsRef} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Local AI Reflection Card */}
              {flowReflectText && (
                <div className="bg-white/[0.03] border border-sky-500/20 p-5 rounded-lg md:col-span-2 relative overflow-hidden group shadow-[0_0_20px_rgba(56,189,248,0.05)]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/[0.02] rounded-full blur-xl pointer-events-none" />
                  <span className="font-orbitron uppercase text-[9px] tracking-widest text-sky-400 block mb-1">
                    AI Focus Reflection
                  </span>
                  <p className="font-inter text-xs italic text-neutral-300 leading-relaxed mt-2">
                    &ldquo;{flowReflectText}&rdquo;
                  </p>
                </div>
              )}

              {/* Mission Card */}
              <div className="bg-white/[0.02] border border-white/5 p-5 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="font-orbitron uppercase text-[9px] tracking-wider text-white/40 block mb-1">Mission</span>
                  <h3 className="font-orbitron uppercase text-base sm:text-lg font-bold text-white tracking-wide">
                    {sessionSummary?.mission}
                  </h3>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                  <span className="font-mono text-white/40 uppercase text-[9px] tracking-wider">Device Type</span>
                  <span className="font-mono text-white/70">Desktop</span>
                </div>
              </div>

              {/* Focus Score Card */}
              <div className={`border p-5 rounded-lg flex flex-col justify-between relative overflow-hidden group shadow-[0_0_15px_rgba(255,255,255,0.02)] ${
                completedSessionType === "lock-in" ? "bg-red-950/10 border-red-500/20" : "bg-white/[0.03] border-white/10"
              }`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full blur-xl pointer-events-none" />
                <div>
                  <span className="font-orbitron uppercase text-[9px] tracking-wider text-white/40 block mb-1">Focus Score</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-mono text-4xl font-bold text-white text-glow">
                      {sessionSummary?.focusScore}
                    </span>
                    <span className="font-mono text-xs text-white/30">/ 100</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                  <span className="font-mono text-white/40 uppercase text-[9px] tracking-wider">Focus Quality</span>
                  <span
                    className={`font-mono font-bold uppercase text-[10px] ${
                      (sessionSummary?.focusScore || 0) >= 90
                        ? "text-green-400"
                        : (sessionSummary?.focusScore || 0) >= 70
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {(sessionSummary?.focusScore || 0) >= 90
                      ? "Excellent"
                      : (sessionSummary?.focusScore || 0) >= 70
                      ? "Good"
                      : "Needs Work"}
                  </span>
                </div>
              </div>

              {/* Stats Grid Card */}
              <div className="bg-white/[0.02] border border-white/5 p-5 rounded-lg md:col-span-2 flex flex-col gap-3">
                <span className="font-orbitron uppercase text-[9px] tracking-wider text-white/40 block mb-1">Session Analytics</span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="flex flex-col p-3 bg-white/[0.01] border border-white/[0.02] rounded">
                    <span className="font-mono text-white/30 uppercase text-[8px] tracking-wider mb-1">Focus Time</span>
                    <span className="font-mono text-sm text-white font-bold">
                      {Math.round((sessionSummary ? ("focusDuration" in sessionSummary ? sessionSummary.focusDuration : sessionSummary.focusTime) : 0) / 60)} min
                    </span>
                  </div>

                  <div className="flex flex-col p-3 bg-white/[0.01] border border-white/[0.02] rounded">
                    <span className="font-mono text-white/30 uppercase text-[8px] tracking-wider mb-1">Willpower Metric</span>
                    <span className="font-mono text-sm text-white font-bold">
                      {calculateAntiScore(sessionSummary?.completed || false, sessionSummary?.distractionCount || 0, sessionSummary ? ("pauseCount" in sessionSummary ? sessionSummary.pauseCount : 0) : 0)}/100
                    </span>
                  </div>

                  <div className="flex flex-col p-3 bg-white/[0.01] border border-white/[0.02] rounded">
                    <span className="font-mono text-white/30 uppercase text-[8px] tracking-wider mb-1">Pauses</span>
                    <span className="font-mono text-sm text-white font-bold">
                      {sessionSummary ? ("pauseCount" in sessionSummary ? sessionSummary.pauseCount : 0) : 0}
                    </span>
                  </div>

                  <div className="flex flex-col p-3 bg-white/[0.01] border border-white/[0.02] rounded">
                    <span className="font-mono text-white/30 uppercase text-[8px] tracking-wider mb-1">Distractions</span>
                    <span className="font-mono text-sm text-white font-bold">{sessionSummary?.distractionCount}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-white/5">
                  <span className="font-mono text-white/40 uppercase text-[9px] tracking-wider">Today&apos;s Focus Total</span>
                  <span className="font-mono text-white font-bold">{formatTodayFocus(todayFocusMinutes)}</span>
                </div>

                {completedSessionType === "lock-in" && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 text-[10px] font-mono text-white/55">
                    <div className="flex justify-between">
                      <span>Fullscreen Exits</span>
                      <span className="text-white font-bold">{fullscreenExits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tab Switches</span>
                      <span className="text-white font-bold">{tabSwitches}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Achievements Unlocked Card */}
              {earnedAchievements.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-lg md:col-span-2 flex flex-col gap-3">
                  <span className="font-orbitron uppercase text-[9px] tracking-wider text-white/40 block mb-1">Achievements Unlocked</span>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {earnedAchievements.map((ach) => (
                      <div
                        key={ach.id}
                        className={`border px-3 py-2 rounded flex items-center gap-2 hover:bg-white/[0.06] transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.01)] ${
                          ach.id.includes("lock") || ach.id === "locked_in"
                            ? "bg-red-950/15 border-red-500/20"
                            : ach.id.includes("flow") || ach.id === "entered_flow" 
                            ? "bg-sky-950/20 border-sky-500/20" 
                            : "bg-white/[0.03] border-white/10"
                        }`}
                        title={ach.description}
                      >
                        <span className="text-base shrink-0">{ach.icon}</span>
                        <div className="flex flex-col">
                          <span className={`font-orbitron text-[9px] tracking-wider font-bold uppercase ${
                            ach.id.includes("lock") || ach.id === "locked_in"
                              ? "text-red-300"
                              : ach.id.includes("flow") || ach.id === "entered_flow" 
                              ? "text-sky-300" 
                              : "text-white"
                          }`}>
                            {ach.title}
                          </span>
                          <span className="font-inter text-[8px] text-white/40 leading-none">{ach.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Asynchronous Autocomplete Save Status Banner */}
            <div className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/[0.01] border border-white/5 rounded-lg">
              {saveStatus === "saving" && (
                <>
                  <div className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin shrink-0" />
                  <span className="font-mono text-[10px] tracking-wider text-white/40 uppercase font-mono">
                    Saving Session Data to MongoDB...
                  </span>
                </>
              )}
              {saveStatus === "success" && (
                <>
                  <div className="w-4 h-4 bg-white text-black flex items-center justify-center rounded-full text-[9px] font-bold shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                    ✓
                  </div>
                  <span className="font-mono text-[10px] tracking-wider text-white/70 uppercase font-bold font-mono">
                    Session Saved Successfully
                  </span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <span className="font-mono text-[10px] tracking-wider text-red-400 uppercase shrink-0 font-mono">
                    Failed to Sync Session Stats
                  </span>
                  <button
                    onClick={handleRetrySave}
                    className="px-2.5 py-1 border border-red-500/20 hover:border-red-500 hover:bg-red-500/10 text-red-400 font-orbitron text-[9px] tracking-widest uppercase transition-all rounded cursor-pointer"
                  >
                    Retry Saving
                  </button>
                </>
              )}
            </div>

            {/* Next Actions */}
            <div ref={compActionsRef} className="flex flex-wrap gap-4 w-full justify-center">
              <button
                onClick={handleStartNextSession}
                className="px-6 py-2.5 bg-white text-black font-orbitron uppercase text-[10px] tracking-widest hover:bg-neutral-200 transition-all font-extrabold shadow-[0_0_15px_rgba(255,255,255,0.15)] cursor-pointer"
              >
                Start Next Focus Session
              </button>

              <button
                onClick={handleTakeBreak}
                className="px-6 py-2.5 border border-white/15 text-white font-orbitron uppercase text-[10px] tracking-widest hover:bg-white hover:text-black hover:border-white transition-all cursor-pointer"
              >
                Take a Break
              </button>

              <button
                onClick={handleReturnToDashboard}
                className="px-6 py-2.5 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded cursor-pointer font-mono text-[10px]"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}



      {/* 6. FLOW INTERRUPTED MESSAGE OVERLAY */}
      {showFlowInterruptedMessage && (
        <div className="fixed inset-0 w-screen h-screen bg-black/95 z-[120] flex flex-col items-center justify-center select-none overflow-hidden">
          <div className="flex flex-col items-center gap-2">
            <span className="font-orbitron uppercase text-[9px] tracking-[0.4em] text-red-500 block animate-pulse">
              WARNING
            </span>
            <h2 className="font-orbitron uppercase text-xl font-bold tracking-[0.2em] text-white text-glow">
              FLOW INTERRUPTED
            </h2>
            <p className="font-inter text-xs text-white/40 mt-1">
              Returning to Normal Focus Mode...
            </p>
          </div>
        </div>
      )}

      {/* 7. EMERGENCY LOCK WELCOME BACK OVERLAY VIEW */}
      {showWelcomeBack && (
        <div className="fixed inset-0 w-screen h-screen bg-black/95 z-[130] flex flex-col items-center justify-center select-none overflow-hidden font-inter">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,15,15,0.95)_0%,#000000_100%)] pointer-events-none" />
          <div className="w-full max-w-md flex flex-col items-center text-center gap-6 z-20">
            <span className="font-orbitron uppercase text-[9px] tracking-[0.4em] text-red-500 block animate-pulse">
              {getInterruptionReminder()}
            </span>
            <h2 className="font-orbitron uppercase text-3xl font-extrabold tracking-[0.1em] text-white text-glow">
              Welcome Back
            </h2>
            <p className="font-inter text-xs text-white/55 max-w-xs leading-relaxed">
              Let&apos;s continue your mission. Resisting distractions makes discipline permanent.
            </p>

            <div className="py-3 px-6 bg-white/[0.02] border border-white/5 rounded-lg flex flex-col gap-1 w-full max-w-[240px]">
              <span className="font-mono text-[9px] text-white/30 uppercase">Time Remaining</span>
              <span className="font-mono text-xl text-white font-bold tracking-widest">
                {formatTime(timeLeft)}
              </span>
            </div>

            <button
              onClick={handleRefocusReturn}
              className="mt-2 px-8 py-3 bg-white text-black font-orbitron uppercase text-[10px] tracking-widest hover:bg-neutral-200 transition-all font-extrabold shadow-[0_0_15px_rgba(255,255,255,0.15)] cursor-pointer"
            >
              Resume Focus
            </button>
          </div>
        </div>
      )}

      {/* 8. EMERGENCY LOCK IN SELECTOR MODAL */}
      {showLockInModal && (
        <div className="fixed inset-0 w-screen h-screen bg-black/80 z-[140] flex items-center justify-center p-4 backdrop-blur-sm select-none font-inter">
          <div className="w-full max-w-md bg-neutral-950 border border-white/10 p-6 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <button
              onClick={() => {
                setShowLockInModal(false);
                setLockInStep(1);
              }}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {lockInStep === 1 ? (
              <div className="flex flex-col gap-4">
                <div className="text-center pb-2 border-b border-white/5">
                  <span className="font-orbitron uppercase text-[9px] tracking-[0.3em] text-red-500 block animate-pulse mb-1">
                    Emergency Lock
                  </span>
                  <h3 className="font-orbitron uppercase text-lg font-extrabold text-white tracking-wide">
                    LOCK IN PROTOCOL
                  </h3>
                  <p className="font-inter text-xs text-white/40 mt-1">
                    Commit to uninterrupted deep work.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-orbitron uppercase text-[9px] tracking-widest text-white/40">Select Duration</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[30, 45, 60, 90].map((dur) => (
                      <button
                        key={dur}
                        onClick={() => {
                          setSelectedLockDuration(dur);
                          setLockInStep(2);
                        }}
                        className="py-3 border border-white/5 hover:border-white/20 hover:bg-white/[0.02] text-white font-mono text-sm rounded transition-all cursor-pointer"
                      >
                        {dur} Minutes
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="text-center pb-2 border-b border-white/5">
                  <span className="font-orbitron uppercase text-[9px] tracking-[0.3em] text-red-500 block animate-pulse mb-1">
                    Confirmation
                  </span>
                  <h3 className="font-orbitron uppercase text-base font-extrabold text-white tracking-wide">
                    REVIEW COMMITMENT
                  </h3>
                </div>

                <div className="flex flex-col gap-3 text-xs bg-white/[0.01] border border-white/5 p-4 rounded">
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-white/30 uppercase text-[9px] tracking-wider">Mission</span>
                    <span className="font-orbitron uppercase font-bold text-white max-w-[200px] text-right truncate">
                      {mission}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-white/30 uppercase text-[9px] tracking-wider">Duration</span>
                    <span className="font-mono text-white font-bold">{selectedLockDuration} Minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-white/30 uppercase text-[9px] tracking-wider">Ambient Loop</span>
                    <span className="font-mono text-white font-bold uppercase">{selectedSound || "None"}</span>
                  </div>
                </div>

                <p className="font-inter text-[11px] leading-relaxed text-white/50 text-center italic">
                  &ldquo;During this session your workspace will remain distraction-free. Leaving Full Focus Mode or switching tabs will be recorded as interruptions.&rdquo;
                </p>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    onClick={() => setLockInStep(1)}
                    className="py-2.5 border border-white/5 hover:border-white/20 text-white/60 font-orbitron uppercase text-[9px] tracking-widest rounded transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBeginLockIn}
                    className="py-2.5 bg-red-600 hover:bg-red-500 text-white font-orbitron uppercase text-[9px] tracking-widest font-extrabold shadow-[0_0_15px_rgba(255,255,255,0.2)] rounded transition-all cursor-pointer"
                  >
                    Begin Lock In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. ANTI-PROCRASTINATION RECOVERY MODAL */}
      {showRecoveryModal && (
        <div className="fixed inset-0 w-screen h-screen bg-black/95 z-[130] flex flex-col items-center justify-center select-none overflow-y-auto p-4 font-inter">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,20,20,0.95)_0%,#000000_100%)] pointer-events-none" />
          <div className="w-full max-w-md bg-neutral-950 border border-white/10 p-6 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col gap-5 z-20 animate-fade-in">
            <div className="text-center pb-2 border-b border-white/5">
              <span className="font-orbitron uppercase text-[9px] tracking-[0.3em] text-red-500 block animate-pulse mb-1">
                {getCoachingMessage(interruptedElapsed, interruptedRemaining)}
              </span>
              <h3 className="font-orbitron uppercase text-lg font-extrabold text-white tracking-wide">
                Focus Interrupted
              </h3>
            </div>

            <p className="font-inter text-xs text-white/60 text-center leading-relaxed">
              You left your focus session after <span className="text-white font-bold">{Math.round(interruptedElapsed / 60)} minutes</span>.
              You still have <span className="text-white font-bold">{Math.round(interruptedRemaining / 60)} minutes</span> remaining.
            </p>

            {/* Review Timeline drawer */}
            {showReviewTimeline && (
              <div className="w-full bg-white/[0.02] border border-white/5 p-4 rounded text-left flex flex-col gap-2 max-h-[160px] overflow-y-auto">
                <span className="font-orbitron uppercase text-[8px] tracking-widest text-white/40 block mb-1">
                  Interruption Timeline
                </span>
                <div className="flex flex-col gap-2.5">
                  {interruptionTimeline.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] font-mono">
                      <div className="flex gap-2 items-center">
                        <span className="text-white/30">
                          {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className={t.event.includes("Exited") || t.event.includes("Switched") || t.event.includes("Blurred") ? "text-red-400" : "text-white/70"}>
                          {t.event}
                        </span>
                      </div>
                      <span className="text-white/30">
                        {Math.round(t.elapsed / 60)}m elapsed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={handleContinueRecovery}
                className="w-full py-3 bg-white hover:bg-neutral-200 text-black font-orbitron uppercase text-[10px] tracking-widest font-extrabold shadow-[0_0_15px_rgba(255,255,255,0.15)] rounded transition-all cursor-pointer"
              >
                Continue Session
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowReviewTimeline(!showReviewTimeline)}
                  className="py-2.5 border border-white/5 hover:border-white/20 text-white/60 font-orbitron uppercase text-[9px] tracking-widest rounded transition-all cursor-pointer"
                >
                  {showReviewTimeline ? "Hide Timeline" : "Review Session"}
                </button>
                <button
                  onClick={handleEndRecovery}
                  className="py-2.5 border border-red-500/20 hover:border-red-500/40 text-red-400 font-orbitron uppercase text-[9px] tracking-widest rounded transition-all cursor-pointer"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

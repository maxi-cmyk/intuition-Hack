"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useSupabase } from "../../hooks/useSupabase";
import useAdaptationEngine from "../../hooks/useAdaptationEngine";

// Inline SVG Icons (avoiding lucide-react dependency)
const HeartIcon = ({
  filled,
  className,
}: {
  filled?: boolean;
  className?: string;
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

// Autorenew Icon (Google Material Design style for Recall)
const AutorenewIcon = ({
  filled,
  className,
}: {
  filled?: boolean;
  className?: string;
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path
      d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8z"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
    />
    <path
      d="M12 18c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
    />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

interface Memory {
  id: string;
  patient_id: string;
  script?: string;
  audio_url?: string;
  media_assets: {
    public_url: string;
    type: "photo" | "video";
    metadata: {
      summary?: string;
      date?: string;
      location?: string;
    };
  };
}

export default function PatientView() {
  const supabase = useSupabase();
  const { isLoaded, isSignedIn } = useUser();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [likedMemories, setLikedMemories] = useState<Set<string>>(new Set());
  const [recalledMemories, setRecalledMemories] = useState<Set<string>>(
    new Set(),
  );
  const [previouslyRecalledIds, setPreviouslyRecalledIds] = useState<
    Set<string>
  >(new Set());

  // Recall Prompt State
  const [showRecallPrompt, setShowRecallPrompt] = useState(false);

  // Narration State
  const [narrationScript, setNarrationScript] = useState<string | null>(null);
  const [narrationAudio, setNarrationAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isListening, setIsListening] = useState(false);

  const {
    state: adaptationState,
    registerTap,
    resetVoiceMode,
    activateVoiceMode,
  } = useAdaptationEngine({
    sundowningTime: "18:00",
    tapSensitivity: "medium",
    onModeChange: (s) => console.log("Mode:", s),
  });

  // TTS for Voice Mode
  useEffect(() => {
    if (adaptationState.isVoiceMode) {
      // Stop narration audio when voice mode starts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (!isListening) {
        const msg = new SpeechSynthesisUtterance("Tap the microphone to speak");
        window.speechSynthesis.speak(msg);
      }
    }
  }, [adaptationState.isVoiceMode]);

  // Speech Recognition
  useEffect(() => {
    if (!isListening) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.error("Speech recognition not supported");
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("Heard:", transcript);

      // Parse commands
      // Parse commands with looser matching
      if (transcript.includes("next") || transcript.includes("skip") || transcript.includes("forward")) {
        const nextIndex = Math.min(currentIndex + 1, memories.length - 1);

        // Only scroll if we are not at the end
        if (nextIndex !== currentIndex) {
          setCurrentIndex(nextIndex);
          // Standard scroll calculation
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: nextIndex * window.innerHeight,
              behavior: "smooth",
            });
          }
          window.speechSynthesis.speak(new SpeechSynthesisUtterance("Next memory"));
        } else {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance("No more memories"));
        }
      } else if (transcript.includes("like") || transcript.includes("love") || transcript.includes("heart")) {
        toggleLike();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance("Liked"));
      } else if (transcript.includes("recall") || transcript.includes("remember") || transcript.includes("save")) {
        toggleRecall();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance("Recalled"));
      } else {
        console.log("Command not recognized:", transcript);
        window.speechSynthesis.speak(
          new SpeechSynthesisUtterance(
            "I heard " + transcript + ". Try saying Next, Like, or Recall.",
          ),
        );
      }

      setIsListening(false);
      resetVoiceMode();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === "aborted") return; // Ignore expected abort errors
      console.error("Speech error:", event.error);
      if (event.error === "no-speech") {
        setIsListening(false);
      } else if (event.error === "not-allowed") {
        alert("Microphone access blocked. Please enable permissions.");
        setIsListening(false);
      } else {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();

    return () => {
      recognition.abort();
    };
  }, [isListening, memories, currentIndex, resetVoiceMode]);

  const currentMemory = memories[currentIndex];
  const isLiked = currentMemory ? likedMemories.has(currentMemory.id) : false;
  const isRecalled = currentMemory
    ? recalledMemories.has(currentMemory.id)
    : false;

  // Store all available memory IDs for infinite scroll
  const [allMemoryIds, setAllMemoryIds] = useState<string[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Shuffle array helper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fetch initial memories (randomized)
  useEffect(() => {
    if (!isSignedIn) return;

    const fetchMemories = async () => {
      try {
        // Fetch ALL approved memory IDs first
        const { data: allData, error: allError } = await supabase
          .from("memories")
          .select("id, cooldown_until")
          .eq("status", "approved");

        if (allError) throw allError;

        // Filter by cooldown and store IDs
        const availableIds = (allData || [])
          .filter((m: { id: string; cooldown_until?: string }) => {
            if (!m.cooldown_until) return true;
            return new Date(m.cooldown_until) < new Date();
          })
          .map((m: { id: string }) => m.id);

        setAllMemoryIds(shuffleArray(availableIds));

        // Fetch first batch of 10 random memories with full data
        const initialIds = shuffleArray(availableIds).slice(0, 10);

        if (initialIds.length > 0) {
          const { data, error } = await supabase
            .from("memories")
            .select("*, media_assets!inner(*)")
            .in("id", initialIds);

          if (error) throw error;

          // Shuffle the results again for display order
          setMemories(shuffleArray(data || []));
        }

        // Fetch previously recalled memory IDs
        const { data: recallData } = await supabase
          .from("interactions")
          .select("memory_id")
          .eq("interaction_type", "recall");

        if (recallData) {
          const recalledIds = new Set(
            recallData.map((r: { memory_id: string }) => r.memory_id),
          );
          setPreviouslyRecalledIds(recalledIds);
        }
      } catch (err) {
        console.error(
          "Fetch memories failed details:",
          JSON.stringify(err, Object.getOwnPropertyNames(err), 2),
        );
        console.error("Raw error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemories();
  }, [isSignedIn]);

  // Load more memories for infinite scroll
  const loadMoreMemories = useCallback(async () => {
    if (isLoadingMore || allMemoryIds.length === 0) return;

    setIsLoadingMore(true);
    try {
      // Get IDs not currently in the feed
      const currentIds = new Set(memories.map((m) => m.id));
      const availableIds = allMemoryIds.filter((id) => !currentIds.has(id));

      // If we've shown all, reshuffle and allow repeats
      const idsToFetch =
        availableIds.length > 0
          ? shuffleArray(availableIds).slice(0, 5)
          : shuffleArray(allMemoryIds).slice(0, 5);

      if (idsToFetch.length > 0) {
        const { data, error } = await supabase
          .from("memories")
          .select("*, media_assets!inner(*)")
          .in("id", idsToFetch);

        if (error) throw error;

        // Append shuffled new memories to the feed
        setMemories((prev) => [...prev, ...shuffleArray(data || [])]);
      }
    } catch (err) {
      console.error("Failed to load more memories", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, allMemoryIds, memories, supabase]);

  // Handle scroll snap + infinite scroll trigger
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const newIndex = Math.round(scrollTop / height);

    if (
      newIndex !== currentIndex &&
      newIndex >= 0 &&
      newIndex < memories.length
    ) {
      setCurrentIndex(newIndex);
    }

    // Trigger infinite scroll when 3 items from the end
    if (newIndex >= memories.length - 3 && memories.length > 0) {
      loadMoreMemories();
    }
  }, [currentIndex, memories.length, loadMoreMemories]);

  // Narration generation
  useEffect(() => {
    setNarrationScript(null);
    setNarrationAudio(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (!currentMemory) return;
    if (currentMemory.media_assets.type === "video") return;

    if (currentMemory.script && currentMemory.audio_url) {
      setNarrationScript(currentMemory.script);
      setNarrationAudio(currentMemory.audio_url);
      return;
    }

    const generate = async () => {
      const voiceId = localStorage.getItem("active_voice_id") || "default";
      let script = currentMemory.script || "";

      if (!script) {
        try {
          const response = await fetch("/api/generate-narrator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: currentMemory.media_assets.public_url,
              voiceId,
            }),
          });
          const data = await response.json();
          if (data.script && data.audioUrl) {
            setNarrationScript(data.script);
            setNarrationAudio(data.audioUrl);
            await supabase
              .from("memories")
              .update({ script: data.script, audio_url: data.audioUrl })
              .eq("id", currentMemory.id);
            return;
          }
        } catch (e) {
          console.error("Narration gen error", e);
        }
      } else {
        setNarrationScript(script);
        try {
          const response = await fetch("/api/voice-preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voiceId, text: script }),
          });
          if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            setNarrationAudio(audioUrl);
          }
        } catch (e) {
          console.error("TTS error", e);
        }
      }
    };

    const timer = setTimeout(generate, 500);
    return () => clearTimeout(timer);
  }, [currentIndex, currentMemory]);

  // Play audio when available
  useEffect(() => {
    if (narrationAudio && audioRef.current && !adaptationState.isVoiceMode) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Autoplay blocked (waiting for interaction):", error);
        });
      }
    }
  }, [narrationAudio, adaptationState.isVoiceMode]);

  // Detect if current memory was previously recalled -> show prompt
  useEffect(() => {
    if (!currentMemory) return;

    // Check if this memory was previously recalled AND not recalled in this session
    if (
      previouslyRecalledIds.has(currentMemory.id) &&
      !recalledMemories.has(currentMemory.id)
    ) {
      // Show the "Do you remember?" prompt with a slight delay
      const timer = setTimeout(() => {
        setShowRecallPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setShowRecallPrompt(false);
    }
  }, [currentMemory, previouslyRecalledIds, recalledMemories]);

  // Toggle Like - Sets cooldown to reduce frequency
  const toggleLike = async () => {
    if (!currentMemory) return;
    const newLiked = new Set(likedMemories);
    const wasLiked = newLiked.has(currentMemory.id);

    if (wasLiked) {
      newLiked.delete(currentMemory.id);
    } else {
      newLiked.add(currentMemory.id);
    }
    setLikedMemories(newLiked);

    try {
      // Update engagement count (standard update instead of RPC)
      const { data: currentData } = await supabase
        .from("memories")
        .select("engagement_count")
        .eq("id", currentMemory.id)
        .single();

      if (currentData) {
        await supabase
          .from("memories")
          .update({ engagement_count: (currentData.engagement_count || 0) + 1 })
          .eq("id", currentMemory.id);
      }

      // Set cooldown (24 hours) when liked to reduce frequency
      if (!wasLiked) {
        const cooldownUntil = new Date();
        cooldownUntil.setHours(cooldownUntil.getHours() + 24);

        await supabase
          .from("memories")
          .update({ cooldown_until: cooldownUntil.toISOString() })
          .eq("id", currentMemory.id);
      }
    } catch (e) {
      console.error("Failed to update engagement", e);
    }
  };

  const toggleRecall = async () => {
    if (!currentMemory) return;
    const newRecalled = new Set(recalledMemories);
    const wasRecalled = newRecalled.has(currentMemory.id);

    if (wasRecalled) {
      newRecalled.delete(currentMemory.id);
    } else {
      newRecalled.add(currentMemory.id);
    }
    setRecalledMemories(newRecalled);

    try {
      // Log recall interaction (for future "Do you remember?" prompts)
      if (!wasRecalled) {
        if (currentMemory.patient_id) {
          await supabase.from("interactions").insert({
            memory_id: currentMemory.id,
            patient_id: currentMemory.patient_id,
            interaction_type: "recall",
          });
        }

        // Add to previously recalled set
        setPreviouslyRecalledIds(
          (prev) => new Set([...prev, currentMemory.id]),
        );
      }

      // Update recall score (standard update instead of RPC)
      const { data: currentRecall } = await supabase
        .from("memories")
        .select("recall_score")
        .eq("id", currentMemory.id)
        .single();

      if (currentRecall) {
        await supabase
          .from("memories")
          .update({ recall_score: (currentRecall.recall_score || 0) + 1 })
          .eq("id", currentMemory.id);
      }
    } catch (e) {
      console.error("Failed to update recall", e);
    }
  };

  // Handle "Yes, I remember" response
  const handleRememberYes = () => {
    setShowRecallPrompt(false);
    // Just dismiss - they remembered!
  };

  // Handle "No, I don't remember" response - increase frequency
  const handleRememberNo = async () => {
    setShowRecallPrompt(false);
    if (!currentMemory) return;

    try {
      // Clear cooldown to increase frequency
      await supabase
        .from("memories")
        .update({ cooldown_until: null })
        .eq("id", currentMemory.id);
    } catch (e) {
      console.error("Failed to clear cooldown", e);
    }
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center text-white bg-black">
        Loading...
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <main className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">
          Loading memories...
        </div>
      </main>
    );
  }

  // Empty State
  if (memories.length === 0) {
    return (
      <main className="h-screen w-screen bg-black flex flex-col items-center justify-center px-10">
        <div className="text-6xl mb-6">📷</div>
        <h1 className="text-white text-3xl font-bold mb-4 text-center">
          No Memories Yet
        </h1>
        <p className="text-gray-400 text-xl text-center mb-8">
          Add photos and videos in Settings
        </p>
        <Link
          href="/settings"
          onClick={(e) => {
            e.stopPropagation();
            registerTap(true);
          }}
          className={`absolute top-4 right-4 z-40 p-4 bg-black/40 backdrop-blur-md rounded-full text-white/80 transition-all ${adaptationState.isVoiceMode ? "scale-150 ring-4 ring-yellow-500" : ""}`}
        >
          <SettingsIcon className="w-6 h-6 text-white" />
        </Link>
      </main>
    );
  }

  return (
    <main
      className={`h-screen w-screen bg-black overflow-hidden ${adaptationState.isSundowningMode ? "sundowning-mode" : ""}`}
    >
      {/* Voice Mode Overlay */}
      {adaptationState.isVoiceMode && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <h2 className="text-4xl font-bold text-white mb-4 animate-in slide-in-from-bottom-4 duration-500">
            {isListening ? "Listening..." : "Tap Microphone to Speak"}
          </h2>
          <p className="text-xl text-gray-400 mb-8 text-center animate-in slide-in-from-bottom-5 duration-700">
            {isListening
              ? "Say your command"
              : "Say 'Next', 'Like', or 'Recall'"}
          </p>

          {/* Interactive Mic Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newState = !isListening;
              setIsListening(newState);
              if (newState) {
                window.speechSynthesis.speak(
                  new SpeechSynthesisUtterance("I'm listening"),
                );
              }
            }}
            className={`w-32 h-32 rounded-full flex items-center justify-center my-8 transition-all cursor-pointer z-50 relative border-4 ${isListening ? "bg-red-500 border-red-400 animate-pulse scale-110 shadow-lg shadow-red-500/50" : "bg-red-500/40 border-red-500 hover:bg-red-500/60 hover:scale-105 active:scale-95"}`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-20 h-20 pointer-events-none ${isListening ? "text-white" : "text-red-500"}`}
              fill="currentColor"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsListening(false);
              resetVoiceMode();
            }}
            className="px-12 py-4 bg-gray-800 rounded-full text-white text-xl font-medium border-2 border-gray-500 hover:bg-gray-700 hover:border-gray-400 transition-colors z-50"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Container - Track Missed Taps */}
      <div
        ref={containerRef}
        onClick={() => {
          registerTap(false);
          // Unlock audio context on first interaction
          if (audioRef.current && audioRef.current.paused && narrationAudio) {
            audioRef.current.play().catch(e => console.log("Audio unlock failed", e));
          }
        }}
        className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide"
        onScroll={handleScroll}
      >
        {memories.map((memory, index) => (
          <div
            key={`${memory.id}-${index}`}
            className="h-screen w-screen snap-start snap-always relative flex items-center justify-center"
          >
            {/* Ken Burns Effect for Images */}
            {memory.media_assets.type === "photo" ? (
              <img
                src={memory.media_assets.public_url}
                alt="Memory"
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[12000ms] ease-linear ${
                  index === currentIndex ? "scale-110" : "scale-100"
                }`}
                draggable={false}
              />
            ) : (
              <video
                src={memory.media_assets.public_url}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            )}

            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Settings Gear - Top Right */}
      <Link
        href="/settings"
        className="absolute top-6 right-6 z-50 w-[48px] h-[48px] flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/20 transition-all hover:bg-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <SettingsIcon className="w-6 h-6 text-white" />
      </Link>

      {/* Top Left Info: Date and Location */}
      <div className="absolute top-6 left-6 z-50 flex flex-col gap-1 pointer-events-none">
        {/* Date - Top */}
        <p
          className="text-white text-xl font-bold"
          style={{ textShadow: "1px 1px 4px rgba(0,0,0,0.8)" }}
        >
          {currentMemory?.media_assets.metadata?.date || ""}
        </p>
        {/* Location - Below Date */}
        <p
          className="text-white/90 text-lg font-medium"
          style={{ textShadow: "1px 1px 4px rgba(0,0,0,0.8)" }}
        >
          {currentMemory?.media_assets.metadata?.location || ""}
        </p>
      </div>

      {/* Caption - Bottom Left (Centered between left edge and buttons) */}
      <div className="absolute bottom-10 left-6 right-24 z-50 flex items-center justify-center pointer-events-none">
        {narrationScript && (
          <div className="animate-fade-in max-w-lg">
            <p
              className="text-white text-sm font-medium leading-relaxed text-center"
              style={{ textShadow: "1px 1px 4px rgba(0,0,0,0.8)" }}
            >
              {narrationScript}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons - Bottom Right, Vertical Stack */}
      <div
        className={`absolute bottom-10 right-6 z-50 flex flex-col items-center gap-6 transition-all duration-300 ${adaptationState.isVoiceMode ? "scale-125" : ""}`}
      >
        {/* Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            registerTap(true);
            toggleLike();
          }}
          className={`flex flex-col items-center gap-1 active:scale-90 transition-transform ${adaptationState.isVoiceMode ? "ring-4 ring-red-500 rounded-2xl p-2" : ""}`}
        >
          <div
            className={`w-[56px] h-[56px] rounded-full flex items-center justify-center ${
              isLiked ? "bg-red-500/30" : "bg-black/40"
            } backdrop-blur-sm border border-white/20 transition-all`}
          >
            <HeartIcon
              filled={isLiked}
              className={`w-7 h-7 ${isLiked ? "text-red-500" : "text-white"}`}
            />
          </div>
          <span
            className="text-white text-sm font-semibold"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
          >
            Like
          </span>
        </button>

        {/* Recall Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            registerTap(true);
            toggleRecall();
          }}
          className={`flex flex-col items-center gap-1 active:scale-90 transition-transform ${adaptationState.isVoiceMode ? "ring-4 ring-amber-400 rounded-2xl p-2" : ""}`}
        >
          <div
            className={`w-[56px] h-[56px] rounded-full flex items-center justify-center ${
              isRecalled ? "bg-amber-400/30" : "bg-black/40"
            } backdrop-blur-sm border border-white/20 transition-all`}
          >
            <AutorenewIcon
              filled={isRecalled}
              className={`w-7 h-7 ${isRecalled ? "text-amber-400" : "text-white"}`}
            />
          </div>
          <span
            className="text-white text-sm font-semibold"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
          >
            Recall
          </span>
        </button>
      </div>

      {/* Recall Prompt - Non-intrusive, bottom 1/3 of screen */}
      {showRecallPrompt && (
        <div className="absolute bottom-0 left-0 right-0 z-[60] flex items-end justify-center pb-32 animate-slide-up">
          <div className="bg-black/80 backdrop-blur-md rounded-2xl p-6 mx-6 border border-white/20 max-w-md">
            <p className="text-white text-lg font-medium text-center mb-4">
              Do you remember seeing this?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRememberYes}
                className="px-6 py-3 rounded-full bg-green-500/80 text-white font-semibold text-base hover:bg-green-500 transition-colors"
              >
                Yes, I remember
              </button>
              <button
                onClick={handleRememberNo}
                className="px-6 py-3 rounded-full bg-gray-600/80 text-white font-semibold text-base hover:bg-gray-600 transition-colors"
              >
                No, I don&apos;t
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Element */}
      {narrationAudio && <audio ref={audioRef} src={narrationAudio} autoPlay />}

      {/* Hide scrollbar and custom animations */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        @keyframes pulse-once {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-pulse-once {
          animation: pulse-once 0.3s ease-out;
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </main>
  );
}

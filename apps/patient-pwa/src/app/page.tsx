"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { videoCache } from "../services/videoCache";

interface Memory {
  id: string;
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
  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);

  // Interaction State
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<{
    y: number;
    time: number;
  } | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Local interaction tracking
  const [likedMemories, setLikedMemories] = useState<Set<string>>(new Set());
  const [recalledMemories, setRecalledMemories] = useState<Set<string>>(
    new Set(),
  );

  // Narration State
  const [narrationScript, setNarrationScript] = useState<string | null>(null);
  const [narrationAudio, setNarrationAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Fetch Patient ID
  useEffect(() => {
    const getPatient = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          let { data } = await supabase
            .from("patients")
            .select("id")
            .eq("clerk_id", user.id)
            .single();

          if (!data) {
            const { data: newPatient } = await supabase
              .from("patients")
              .insert({
                clerk_id: user.id,
                display_name: user.email?.split("@")[0] || "Patient",
                pin_hash: "1234",
              })
              .select("id")
              .single();
            if (newPatient) data = newPatient;
          }

          if (data) setPatientId(data.id);
          else setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Auth check failed", e);
        setIsLoading(false);
      }
    };
    getPatient();
  }, []);

  // 2. Fetch Memories (run immediately, don't wait for patientId)
  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const { data, error } = await supabase
          .from("memories")
          .select("*, media_assets!inner(*)")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        const filtered = (data || []).filter((m: any) => {
          if (!m.cooldown_until) return true;
          return new Date(m.cooldown_until) < new Date();
        });

        setMemories(filtered);
      } catch (err) {
        console.error("Fetch memories failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemories();
  }, []);

  // 2a. Buffered Pre-fetch (Sora 2 Videos)
  useEffect(() => {
    if (memories.length === 0) return;

    const prefetch = async () => {
      // Buffer next 3 items
      for (let i = 0; i < 3; i++) {
        const index = (currentIndex + i) % memories.length;
        const memory = memories[index];

        if (memory.media_assets.type === "photo") {
          try {
            const cached = await videoCache.get(memory.id);
            if (!cached) {
              // Generate URL
              const res = await fetch("/api/generate-video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  imageUrl: memory.media_assets.public_url,
                }),
              });
              const data = await res.json();

              if (data.videoUrl) {
                // Fetch Blob
                const vidRes = await fetch(data.videoUrl);
                const blob = await vidRes.blob();
                // Store in Cache
                await videoCache.put(memory.id, blob);
                console.log(`Pre-fetched video for ${memory.id}`);
              }
            }
          } catch (e) {
            console.error("Pre-fetch failed", e);
          }
        }
      }
    };

    // Low Priority Execution
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(prefetch);
    } else {
      setTimeout(prefetch, 2000);
    }
  }, [memories, currentIndex]);

  const currentMemory = memories[currentIndex];
  // Determine if Liked/Recalled (Local State checks)
  const isLiked = currentMemory ? likedMemories.has(currentMemory.id) : false;
  const isRecalled = currentMemory
    ? recalledMemories.has(currentMemory.id)
    : false;

  // 3. Narration Logic
  useEffect(() => {
    setNarrationScript(null);
    setNarrationAudio(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (!currentMemory) return;
    if (currentMemory.media_assets.type === "video") return;

    // If script and audio already exist, use them directly
    if (currentMemory.script && currentMemory.audio_url) {
      setNarrationScript(currentMemory.script);
      setNarrationAudio(currentMemory.audio_url);
      return;
    }

    const generate = async () => {
      const voiceId = localStorage.getItem("active_voice_id") || "default";

      // Use existing script if provided by user, otherwise generate from image
      let script = currentMemory.script || "";

      if (!script) {
        // No user-provided script, generate from image analysis
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
          if (data.script) {
            script = data.script;
          }
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
        // User provided script, just generate audio for it
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

  useEffect(() => {
    if (narrationAudio && audioRef.current) {
      audioRef.current.play().catch((e) => console.log("Autoplay blocked", e));
    }
  }, [narrationAudio]);

  // 4. Interactions
  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentMemory || !patientId) return;

    setLikedMemories((prev) => {
      const next = new Set(prev);
      next.add(currentMemory.id);
      return next;
    });

    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    await supabase
      .from("memories")
      .update({
        cooldown_until: tomorrow.toISOString(),
        engagement_count: (currentMemory as any).engagement_count + 1,
      })
      .eq("id", currentMemory.id);

    await supabase.from("interactions").insert({
      patient_id: patientId,
      memory_id: currentMemory.id,
      interaction_type: "like",
    });
  };

  const toggleRecall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentMemory || !patientId) return;

    setRecalledMemories((prev) => {
      const next = new Set(prev);
      next.add(currentMemory.id);
      return next;
    });

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    await supabase
      .from("memories")
      .update({
        cooldown_until: nextWeek.toISOString(),
        engagement_count: (currentMemory as any).engagement_count + 1,
      })
      .eq("id", currentMemory.id);

    await supabase.from("interactions").insert({
      patient_id: patientId,
      memory_id: currentMemory.id,
      interaction_type: "recall",
    });
  };

  // 5. Navigation & Instant Playback
  const nextMemory = () => {
    setGeneratedVideo(null);
    if (!memories.length) return;
    setCurrentIndex((prev) => (prev + 1) % memories.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ y: e.touches[0].clientY, time: Date.now() });

    // Gate: 500ms Long Press for Instant Playback
    holdTimerRef.current = setTimeout(async () => {
      if (!currentMemory) return;

      // 1. Check Cache
      const blob = await videoCache.get(currentMemory.id);

      if (blob) {
        // Instant Play
        const url = URL.createObjectURL(blob);
        setGeneratedVideo(url);

        // Tactile confirmation
        if (navigator.vibrate) navigator.vibrate(50);

        if (patientId) {
          await supabase.from("interactions").insert({
            patient_id: patientId,
            memory_id: currentMemory.id,
            interaction_type: "video_generated",
          });
        }
      } else {
        // Fallback: Generate on demand
        handleGenerateVideo();
      }
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // Stop Video on Release (Revert to Image)
    if (generatedVideo) {
      setGeneratedVideo(null); // Instant revert
    }

    if (!touchStart) return;

    const diff = touchStart.y - e.changedTouches[0].clientY;
    if (diff > 50 && Date.now() - touchStart.time < 300) nextMemory();
    setTouchStart(null);
  };

  const handleTouchMove = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleGenerateVideo = async () => {
    if (isGeneratingVideo || generatedVideo || !currentMemory) return;
    if (currentMemory.media_assets.type === "video") return;

    setIsGeneratingVideo(true);
    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentMemory.media_assets.public_url,
        }),
      });
      const data = await response.json();
      if (data.videoUrl) setGeneratedVideo(data.videoUrl);

      if (patientId) {
        await supabase.from("interactions").insert({
          patient_id: patientId,
          memory_id: currentMemory.id,
          interaction_type: "video_generated",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // UI
  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center text-white">
        Loading Memories...
      </div>
    );
  if (memories.length === 0)
    return (
      <div className="flex flex-col h-screen items-center justify-center text-white p-6 text-center">
        <p className="text-xl mb-4">No memories available yet.</p>
        <Link
          href="/settings"
          className="px-4 py-2 bg-text-muted rounded-full text-black"
        >
          Go to Settings to Upload
        </Link>
      </div>
    );

  return (
    <main
      className="memory-card"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Media Type Handling */}
      {generatedVideo ? (
        <video
          src={generatedVideo}
          className="memory-image"
          autoPlay
          loop
          muted
          playsInline
        />
      ) : currentMemory.media_assets.type === "video" ? (
        <video
          src={currentMemory.media_assets.public_url}
          className="memory-image"
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        <img
          src={currentMemory.media_assets.public_url}
          alt="Memory"
          className="memory-image"
          draggable={false}
        />
      )}

      <Link href="/settings" className="settings-button">
        ⚙️
      </Link>

      <div className="interaction-sidebar">
        <div className="interaction-item">
          <button
            className={`interaction-btn ${isLiked ? "active" : ""}`}
            onClick={toggleLike}
          >
            <svg viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
        <div className="interaction-item">
          <button
            className={`interaction-btn recall ${isRecalled ? "active" : ""}`}
            onClick={toggleRecall}
          >
            <svg viewBox="0 0 24 24">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="memory-info">
        {currentMemory.media_assets.metadata.date && (
          <span className="pill">
            {currentMemory.media_assets.metadata.date}
          </span>
        )}
        {currentMemory.media_assets.metadata.location && (
          <span className="pill">
            {currentMemory.media_assets.metadata.location}
          </span>
        )}
      </div>

      {isGeneratingVideo && (
        <div className="video-overlay">
          <div className="text-4xl mb-4 loading">🎬</div>
          <p className="text-lg font-medium">Downloading Video...</p>
        </div>
      )}

      <audio ref={audioRef} src={narrationAudio || ""} />
      {narrationScript && (
        <div className="caption-overlay">{narrationScript}</div>
      )}

      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-text-muted text-sm opacity-50">
        ↑ Swipe up
      </div>
    </main>
  );
}

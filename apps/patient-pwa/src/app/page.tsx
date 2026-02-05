"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Memory {
  id: string;
  imageUrl: string;
  date: string;
  location: string;
}

// Demo memories
const demoMemories: Memory[] = [
  {
    id: "1",
    imageUrl:
      "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800",
    date: "12-15-2023",
    location: "Paris, France",
  },
  {
    id: "2",
    imageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
    date: "06-20-1985",
    location: "Central Park, NY",
  },
  {
    id: "3",
    imageUrl:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800",
    date: "08-14-1992",
    location: "Beach House",
  },
];

export default function PatientView() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<{
    y: number;
    time: number;
  } | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Interaction State
  const [likedMemories, setLikedMemories] = useState<Set<string>>(new Set());
  const [recalledMemories, setRecalledMemories] = useState<Set<string>>(
    new Set(),
  );

  // Narration State
  const [narrationScript, setNarrationScript] = useState<string | null>(null);
  const [narrationAudio, setNarrationAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentMemory = demoMemories[currentIndex];
  const isLiked = likedMemories.has(currentMemory.id);
  const isRecalled = recalledMemories.has(currentMemory.id);

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedMemories((prev) => {
      const next = new Set(prev);
      if (next.has(currentMemory.id)) {
        next.delete(currentMemory.id);
        console.log(`Memory ${currentMemory.id} unliked.`);
      } else {
        next.add(currentMemory.id);
        console.log(
          `Memory ${currentMemory.id} liked. Cooldown increased (Reverse TikTok logic).`,
        );
      }
      return next;
    });
  };

  const toggleRecall = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecalledMemories((prev) => {
      const next = new Set(prev);
      if (next.has(currentMemory.id)) {
        next.delete(currentMemory.id);
      } else {
        next.add(currentMemory.id);
        console.log(
          `Memory ${currentMemory.id} marked for recall. Scheduled for future resurfacing.`,
        );
      }
      return next;
    });
  };

  // Handle swipe up to next memory
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      y: e.touches[0].clientY,
      time: Date.now(),
    });

    // Start hold timer for video generation
    holdTimerRef.current = setTimeout(() => {
      handleGenerateVideo();
    }, 2000);
  };

  const handleTouchMove = () => {
    // Cancel hold if user moves
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Cancel hold timer
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (!touchStart) return;

    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart.y - touchEnd;
    const timeDiff = Date.now() - touchStart.time;

    // Swipe up detection (minimum 50px, within 300ms)
    if (diff > 50 && timeDiff < 300) {
      nextMemory();
    }

    setTouchStart(null);
  };

  const nextMemory = () => {
    setGeneratedVideo(null); // Reset video for next memory
    setCurrentIndex((prev) => (prev + 1) % demoMemories.length);
  };

  const handleGenerateVideo = async () => {
    if (isGeneratingVideo || generatedVideo) return;

    setIsGeneratingVideo(true);
    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: demoMemories[currentIndex].imageUrl,
        }),
      });
      const data = await response.json();
      if (data.videoUrl) {
        setGeneratedVideo(data.videoUrl);
      }
    } catch (error) {
      console.error("Failed to generate video", error);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Narration Effect
  useEffect(() => {
    // Reset narration on memory change
    setNarrationScript(null);
    setNarrationAudio(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const fetchNarration = async () => {
      const voiceId = localStorage.getItem("active_voice_id") || "1";
      try {
        const response = await fetch("/api/generate-narrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: demoMemories[currentIndex].imageUrl,
            voiceId,
          }),
        });
        const data = await response.json();
        if (data.script && data.audioUrl) {
          setNarrationScript(data.script);
          setNarrationAudio(data.audioUrl);
        }
      } catch (error) {
        console.error("Narration fetch failed", error);
      }
    };

    // Small delay to allow transition
    const timer = setTimeout(() => {
      fetchNarration();
    }, 500);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Auto-play audio when ready
  useEffect(() => {
    if (narrationAudio && audioRef.current) {
      audioRef.current.volume = 1.0;
      audioRef.current
        .play()
        .catch((e) => console.log("Autoplay blocked/failed", e));
    }
  }, [narrationAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  return (
    <main
      className="memory-card"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Memory Image or Video */}
      {generatedVideo ? (
        <video
          src={generatedVideo}
          className="memory-image"
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        <img
          src={currentMemory.imageUrl}
          alt="Memory"
          className="memory-image"
          draggable={false}
        />
      )}

      {/* Settings Button */}
      <Link href="/settings" className="settings-button">
        ⚙️
      </Link>

      {/* Interaction Sidebar */}
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

      {/* Bottom Info with Date/Location Pills */}
      <div className="memory-info">
        <span className="pill">{currentMemory.date}</span>
        <span className="pill">{currentMemory.location}</span>
      </div>

      {/* Video Generation Overlay */}
      {isGeneratingVideo && (
        <div className="video-overlay">
          <div className="text-4xl mb-4 loading">🎬</div>
          <p className="text-lg font-medium">Generating Video...</p>
          <p className="text-sm text-text-muted mt-2">Hold to cancel</p>
        </div>
      )}

      {/* Swipe Indicator (shown briefly) */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-text-muted text-sm opacity-50">
        ↑ Swipe up for next
      </div>

      {/* Narration Audio & Captions */}
      <audio ref={audioRef} src={narrationAudio || ""} />
      {narrationScript && (
        <div className="caption-overlay">{narrationScript}</div>
      )}
    </main>
  );
}

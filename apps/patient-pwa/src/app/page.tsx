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
  const [touchStart, setTouchStart] = useState<{
    y: number;
    time: number;
  } | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentMemory = demoMemories[currentIndex];

  // Handle swipe up to next memory
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      y: e.touches[0].clientY,
      time: Date.now(),
    });

    // Start hold timer for video generation
    holdTimerRef.current = setTimeout(() => {
      handleGenerateVideo();
    }, 1500);
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
    setCurrentIndex((prev) => (prev + 1) % demoMemories.length);
  };

  const handleGenerateVideo = () => {
    if (isGeneratingVideo) return;

    setIsGeneratingVideo(true);
    // Simulate video generation
    setTimeout(() => {
      setIsGeneratingVideo(false);
      // In real app, this would trigger OpenAI video generation
    }, 3000);
  };

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
      {/* Memory Image */}
      <img
        src={currentMemory.imageUrl}
        alt="Memory"
        className="memory-image"
        draggable={false}
      />

      {/* Settings Button */}
      <Link href="/settings" className="settings-button">
        ⚙️
      </Link>

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
    </main>
  );
}

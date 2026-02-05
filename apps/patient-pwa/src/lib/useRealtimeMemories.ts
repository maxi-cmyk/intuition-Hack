"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";

interface Memory {
  id: string;
  imageUrl: string;
  audioUrl?: string;
  date: string;
  location: string;
  script: string;
}

interface UseRealtimeMemoriesOptions {
  patientId: string;
  onNewMemory?: (memory: Memory) => void;
}

export function useRealtimeMemories({
  patientId,
  onNewMemory,
}: UseRealtimeMemoriesOptions) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial memories
  const fetchMemories = useCallback(async () => {
    const { data, error } = await supabase
      .from("memories")
      .select(
        `
        id,
        script,
        audio_url,
        media_assets (
          storage_path,
          metadata
        )
      `,
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch memories:", error);
      return;
    }

    const formattedMemories: Memory[] = (data ?? []).map((m) => {
      const mediaAsset = m.media_assets as unknown as {
        storage_path: string;
        metadata: { date?: string; location?: string };
      };
      return {
        id: m.id,
        imageUrl: mediaAsset?.storage_path ?? "",
        audioUrl: m.audio_url ?? undefined,
        date: mediaAsset?.metadata?.date ?? "",
        location: mediaAsset?.metadata?.location ?? "",
        script: m.script ?? "",
      };
    });

    setMemories(formattedMemories);
    setIsLoading(false);
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchMemories();

    const channel = supabase
      .channel("memories-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "memories",
          filter: `status=eq.approved`,
        },
        async (payload) => {
          // Fetch the complete memory with media asset
          const { data } = await supabase
            .from("memories")
            .select(
              `
              id,
              script,
              audio_url,
              media_assets (
                storage_path,
                metadata
              )
            `,
            )
            .eq("id", payload.new.id)
            .single();

          if (data) {
            const mediaAsset = data.media_assets as unknown as {
              storage_path: string;
              metadata: { date?: string; location?: string };
            };
            const newMemory: Memory = {
              id: data.id,
              imageUrl: mediaAsset?.storage_path ?? "",
              audioUrl: data.audio_url ?? undefined,
              date: mediaAsset?.metadata?.date ?? "",
              location: mediaAsset?.metadata?.location ?? "",
              script: data.script ?? "",
            };

            setMemories((prev) => [newMemory, ...prev]);
            onNewMemory?.(newMemory);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "memories",
        },
        (payload) => {
          // Update memory status changes
          if (payload.new.status === "approved") {
            fetchMemories(); // Refresh to get newly approved items
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMemories, patientId, onNewMemory]);

  return {
    memories,
    isLoading,
    refresh: fetchMemories,
  };
}

export default useRealtimeMemories;

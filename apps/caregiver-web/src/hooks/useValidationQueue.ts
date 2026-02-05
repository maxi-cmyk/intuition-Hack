"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface QueueItem {
  id: string;
  mediaAssetId: string;
  filename: string;
  script: string;
  status: "processing" | "needs_review" | "approved";
  createdAt: string;
}

interface UseValidationQueueOptions {
  patientId: string;
}

export function useValidationQueue({ patientId }: UseValidationQueueOptions) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    const { data, error } = await supabase
      .from("memories")
      .select(
        `
        id,
        media_asset_id,
        script,
        status,
        created_at,
        media_assets!inner (
          patient_id,
          storage_path
        )
      `,
      )
      .eq("media_assets.patient_id", patientId)
      .in("status", ["processing", "needs_review"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch queue:", error);
      return;
    }

    const formattedQueue: QueueItem[] = (data ?? []).map((item) => {
      const mediaAsset = item.media_assets as unknown as {
        patient_id: string;
        storage_path: string;
      };
      return {
        id: item.id,
        mediaAssetId: item.media_asset_id,
        filename: mediaAsset?.storage_path?.split("/").pop() ?? "Unknown",
        script: item.script ?? "",
        status: item.status as QueueItem["status"],
        createdAt: item.created_at,
      };
    });

    setQueue(formattedQueue);
    setIsLoading(false);
  }, [patientId]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchQueue();

    const channel = supabase
      .channel("validation-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memories",
        },
        () => {
          fetchQueue();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQueue]);

  const approveMemory = useCallback(
    async (memoryId: string) => {
      const { error } = await supabase
        .from("memories")
        .update({ status: "approved" })
        .eq("id", memoryId);

      if (error) throw error;
      await fetchQueue();
    },
    [fetchQueue],
  );

  const updateScript = useCallback(
    async (memoryId: string, newScript: string) => {
      const { error } = await supabase
        .from("memories")
        .update({ script: newScript })
        .eq("id", memoryId);

      if (error) throw error;
      await fetchQueue();
    },
    [fetchQueue],
  );

  const rejectMemory = useCallback(
    async (memoryId: string) => {
      const { error } = await supabase
        .from("memories")
        .delete()
        .eq("id", memoryId);

      if (error) throw error;
      await fetchQueue();
    },
    [fetchQueue],
  );

  return {
    queue,
    isLoading,
    approveMemory,
    updateScript,
    rejectMemory,
    refresh: fetchQueue,
  };
}

export default useValidationQueue;

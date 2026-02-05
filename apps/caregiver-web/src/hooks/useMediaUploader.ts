"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface UploadProgress {
  filename: string;
  progress: number;
  status: "uploading" | "processing" | "complete" | "error";
}

interface UseMediaUploaderOptions {
  patientId: string;
  onUploadComplete?: (assetId: string) => void;
}

export function useMediaUploader({
  patientId,
  onUploadComplete,
}: UseMediaUploaderOptions) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setIsUploading(true);

      for (const file of files) {
        const filename = file.name;

        // Add to progress tracking
        setUploads((prev) => [
          ...prev,
          { filename, progress: 0, status: "uploading" },
        ]);

        try {
          // Upload to Supabase Storage
          const filePath = `${patientId}/${Date.now()}-${filename}`;
          const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // Update progress
          setUploads((prev) =>
            prev.map((u) =>
              u.filename === filename
                ? { ...u, progress: 50, status: "processing" }
                : u,
            ),
          );

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("media")
            .getPublicUrl(filePath);

          // Create media asset record
          const { data: asset, error: assetError } = await supabase
            .from("media_assets")
            .insert({
              patient_id: patientId,
              storage_path: urlData.publicUrl,
              type: file.type.startsWith("video") ? "video" : "photo",
              metadata: {},
            })
            .select()
            .single();

          if (assetError) throw assetError;

          // Trigger memory synthesis Edge Function
          await fetch("/api/synthesize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media_asset_id: asset.id,
              image_url: urlData.publicUrl,
            }),
          });

          // Update progress to complete
          setUploads((prev) =>
            prev.map((u) =>
              u.filename === filename
                ? { ...u, progress: 100, status: "complete" }
                : u,
            ),
          );

          onUploadComplete?.(asset.id);
        } catch (error) {
          console.error("Upload failed:", error);
          setUploads((prev) =>
            prev.map((u) =>
              u.filename === filename ? { ...u, status: "error" } : u,
            ),
          );
        }
      }

      setIsUploading(false);
    },
    [patientId, onUploadComplete],
  );

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== "complete"));
  }, []);

  return {
    uploads,
    isUploading,
    uploadFiles,
    clearCompleted,
  };
}

export default useMediaUploader;

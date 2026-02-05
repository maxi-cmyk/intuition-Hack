"use client";

import { useState, useRef } from "react";

interface MediaItem {
  id: string;
  filename: string;
  status: "processing" | "needs_review" | "approved";
  script?: string;
}

interface MediaManagementProps {
  onBack: () => void;
}

export default function MediaManagement({ onBack }: MediaManagementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<MediaItem[]>([
    {
      id: "1",
      filename: "grandkids_birthday.mp4",
      status: "needs_review",
      script:
        "This is a joyful birthday celebration with your grandchildren at Central Park on March 18, 2024. Everyone is smiling and having a wonderful time.",
    },
    { id: "2", filename: "paris_vacation.jpg", status: "processing" },
    { id: "3", filename: "beach_family.jpg", status: "processing" },
  ]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const newItems: MediaItem[] = files.map((file, index) => ({
      id: Date.now().toString() + index,
      filename: file.name,
      status: "processing" as const,
    }));
    setQueue([...newItems, ...queue]);
  };

  const handleGreenlight = (id: string) => {
    setQueue(
      queue.map((item) =>
        item.id === id ? { ...item, status: "approved" as const } : item,
      ),
    );
  };

  const getStatusBadge = (status: MediaItem["status"]) => {
    switch (status) {
      case "needs_review":
        return <span className="badge badge-needs-review">Needs Review</span>;
      case "processing":
        return <span className="badge badge-processing">Analyzing...</span>;
      case "approved":
        return <span className="badge badge-approved">Approved</span>;
    }
  };

  const getStatusIcon = (status: MediaItem["status"]) => {
    switch (status) {
      case "needs_review":
        return "⚠";
      case "processing":
        return "◐";
      case "approved":
        return "✓";
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-text-muted hover:text-text-primary"
            >
              ←
            </button>
            <div className="w-10 h-10 rounded-lg bg-accent/20 border border-border flex items-center justify-center">
              <span className="text-accent text-sm font-bold">e</span>
            </div>
            <h2 className="text-xl font-semibold">Media Management</h2>
          </div>
          <button
            onClick={onBack}
            className="text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-accent bg-accent/10"
              : "border-border hover:border-accent"
          }`}
        >
          <div className="text-3xl mb-3">↑</div>
          <p className="text-text-muted mb-3">
            Drop photos/videos here or click to upload
          </p>
          <button className="btn btn-outline text-sm">Choose Files</button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) =>
              e.target.files && handleFiles(Array.from(e.target.files))
            }
          />
        </div>

        {/* Processing Queue */}
        <h3 className="text-accent font-medium mb-4">Processing Queue</h3>
        <div className="space-y-3">
          {queue.map((item) => (
            <div key={item.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-accent">
                    {getStatusIcon(item.status)}
                  </span>
                  <span className="font-medium">{item.filename}</span>
                </div>
                {getStatusBadge(item.status)}
              </div>

              {item.script && (
                <p className="text-sm text-text-muted mb-3 pl-6">
                  {item.script}
                </p>
              )}

              {item.status === "needs_review" && (
                <div className="flex gap-2 pl-6">
                  <button
                    onClick={() => handleGreenlight(item.id)}
                    className="btn btn-outline text-sm py-2"
                  >
                    Greenlight
                  </button>
                  <button className="btn btn-outline text-sm py-2">
                    Edit Script
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

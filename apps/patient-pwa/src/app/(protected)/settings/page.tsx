"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton, useUser } from "@clerk/nextjs";

const DEFAULT_PIN = "1234";
const PIN_STORAGE_KEY = "echo_settings_pin";
const ALGORITHM_SETTINGS_KEY = "echo_algorithm_settings";

type SettingsView = "menu" | "media" | "algorithm" | "voice";

import { useSupabase } from "../../../hooks/useSupabase";

interface QueueItem {
  id: string;
  name: string;
  status: "analyzing" | "synthesizing" | "needs_review" | "ready" | "failed";
  description?: string;
  people?: string;
  date?: string;
  url?: string;
}

// Voice profiles (narrator voices)
interface VoiceProfile {
  id: string;
  name: string;
  status: "pending" | "processing" | "ready" | "failed";
  samples: { filename: string; date: string }[];
}

export default function SettingsPage() {
  const supabase = useSupabase();
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [currentView, setCurrentView] = useState<SettingsView>("menu");
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useUser();
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const getPatient = async () => {
      try {
        let { data } = await supabase
          .from("patients")
          .select("id")
          .eq("clerk_id", user.id)
          .single();

        if (!data) {
          const { data: newPatient, error: createError } = await supabase
            .from("patients")
            .insert({
              clerk_id: user.id,
              display_name:
                user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
                "Patient",
              pin_hash: "1234",
            })
            .select("id")
            .single();
          if (newPatient) data = newPatient;
          if (createError)
            console.error("Failed to create patient", createError);
        }

        if (data) setPatientId(data.id);
      } catch (e) {
        console.error("Patient fetch failed", e);
      }
    };
    getPatient();
  }, [user, supabase]);

  // Add Detail modal state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");

  // Algorithm settings
  const [fixationCooldown, setFixationCooldown] = useState(24);
  const [noveltyWeight, setNoveltyWeight] = useState(50);
  const [sundowningTime, setSundowningTime] = useState("18:00");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Voice settings
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voices, setVoices] = useState<VoiceProfile[]>([
    { id: "default", name: "Default Narrator", status: "ready", samples: [] },
  ]);
  const [activeVoice, setActiveVoice] = useState("default");
  const [isNamingVoice, setIsNamingVoice] = useState(false);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(
    null,
  );

  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeRef = useRef(0);

  // Load algorithm settings from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(ALGORITHM_SETTINGS_KEY);
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          setFixationCooldown(settings.fixationCooldown ?? 24);
          setNoveltyWeight(settings.noveltyWeight ?? 50);
          setSundowningTime(settings.sundowningTime ?? "18:00");
        } catch (e) {
          console.error("Failed to load settings", e);
        }
      }
    }
  }, []);

  const getStoredPin = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
    }
    return DEFAULT_PIN;
  };

  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      setPinError(false);

      if (newPin.length === 4) {
        if (newPin === getStoredPin()) {
          setIsUnlocked(true);
        } else {
          setPinError(true);
          setTimeout(() => setPinInput(""), 300);
        }
      }
    }
  };

  const handlePinClear = () => {
    setPinInput("");
    setPinError(false);
  };

  const handlePinBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  const handleBack = () => {
    if (currentView === "menu") {
      router.push("/");
    } else {
      setCurrentView("menu");
    }
  };

  const handleClose = () => {
    router.push("/");
  };

  // Real audio recording with MediaRecorder API
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingTimeRef.current = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());

        // Check if we reached 60 seconds
        if (recordingTimeRef.current >= 60) {
          setIsNamingVoice(true);
        } else {
          alert("Recording must be at least 1 minute. Please try again.");
          setAudioBlob(null);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingInterval.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);

        if (recordingTimeRef.current >= 60) {
          stopRecording();
        }
      }, 1000);
    } catch (error) {
      console.error("Failed to access microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
    }
  };

  // Submit voice to ElevenLabs for cloning
  const saveNewVoice = async () => {
    if (!newVoiceName.trim() || !audioBlob) return;

    setIsProcessing(true);
    setIsNamingVoice(false);

    // Add optimistic entry
    const tempId = `temp-${Date.now()}`;
    const newVoice: VoiceProfile = {
      id: tempId,
      name: newVoiceName.trim(),
      status: "processing",
      samples: [
        { filename: "Recording", date: new Date().toLocaleDateString() },
      ],
    };
    setVoices((prev) => [...prev, newVoice]);

    try {
      const formData = new FormData();
      formData.append("name", newVoiceName.trim());
      formData.append("audio", audioBlob);

      const response = await fetch("/api/voice-clone", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create voice");
      }

      // Update with real voice ID
      setVoices((prev) =>
        prev.map((v) =>
          v.id === tempId ? { ...v, id: data.voice_id, status: "ready" } : v,
        ),
      );
      setActiveVoice(data.voice_id);
    } catch (error) {
      console.error("Voice clone failed:", error);
      alert(
        `Voice cloning failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setVoices((prev) =>
        prev.map((v) => (v.id === tempId ? { ...v, status: "failed" } : v)),
      );
    } finally {
      setIsProcessing(false);
      setNewVoiceName("");
      setAudioBlob(null);
      setRecordingTime(0);
    }
  };

  const cancelRecording = () => {
    setIsNamingVoice(false);
    setNewVoiceName("");
    setRecordingTime(0);
    setAudioBlob(null);
  };

  // Preview voice with TTS
  const previewVoice = async (voiceId: string) => {
    if (voiceId === "default") {
      alert("Default narrator cannot be previewed.");
      return;
    }

    setPreviewingVoiceId(voiceId);
    try {
      const response = await fetch("/api/voice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: voiceId,
          text: "Hello, this is a preview of your cloned voice.",
        }),
      });

      if (!response.ok) throw new Error("Preview failed");

      const audioBlob = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onended = () => setPreviewingVoiceId(null);
      audio.play();
    } catch (error) {
      console.error("Preview failed:", error);
      alert("Failed to preview voice.");
      setPreviewingVoiceId(null);
    }
  };

  // Delete voice
  const deleteVoice = async (voiceId: string) => {
    if (voiceId === "default") return;
    if (!confirm("Are you sure you want to delete this voice?")) return;

    try {
      const response = await fetch("/api/voice-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: voiceId }),
      });

      if (response.ok) {
        setVoices((prev) => prev.filter((v) => v.id !== voiceId));
        if (activeVoice === voiceId) {
          setActiveVoice("default");
        }
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  // Save algorithm settings
  const handleSaveAlgorithmSettings = () => {
    const settings = { fixationCooldown, noveltyWeight, sundowningTime };
    localStorage.setItem(ALGORITHM_SETTINGS_KEY, JSON.stringify(settings));
    setSaveMessage("Settings saved!");
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const handleRemoveItem = (id: string) => {
    setQueueItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleGreenlight = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Optimistic Update
    setQueueItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "ready" } : item,
      ),
    );

    // DB Update
    try {
      const { error } = await supabase
        .from("memories")
        .update({ status: "approved" })
        .eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to approve memory", err);
      // Revert if needed, but for MVP just log
      setQueueItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "needs_review" } : item,
        ),
      );
    }
  };

  const handleSaveDetail = async () => {
    if (!editingItemId) return;

    // Update local state
    setQueueItems((prev) =>
      prev.map((item) =>
        item.id === editingItemId
          ? {
            ...item,
            description: editDescription,
            date: editDate,
            people: editLocation,
          }
          : item,
      ),
    );

    // Update Supabase - memories for script, media_assets for metadata
    try {
      // Update script in memories
      const { error: memError } = await supabase
        .from("memories")
        .update({ script: editDescription })
        .eq("id", editingItemId);
      if (memError) throw memError;

      // Get the media_asset_id for this memory
      const { data: memory } = await supabase
        .from("memories")
        .select("media_asset_id")
        .eq("id", editingItemId)
        .single();

      if (memory?.media_asset_id) {
        // Update metadata in media_assets
        const { error: assetError } = await supabase
          .from("media_assets")
          .update({
            metadata: {
              summary: editDescription,
              date: editDate,
              location: editLocation,
            },
          })
          .eq("id", memory.media_asset_id);
        if (assetError) throw assetError;
      }
    } catch (err) {
      console.error("Failed to save detail", err);
    }

    setEditingItemId(null);
    setEditDescription("");
    setEditDate("");
    setEditLocation("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - expanded support
    const validImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    const validVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
    const validAudioTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/x-wav",
    ];

    const isImage = validImageTypes.includes(file.type);
    const isVideo = validVideoTypes.includes(file.type);
    const isAudio = validAudioTypes.includes(file.type);

    if (!isImage && !isVideo && !isAudio) {
      alert(
        "Unsupported file format. Please upload JPG, PNG, MP4, MOV, MP3, or WAV.",
      );
      return;
    }

    // Create optimistic item
    const tempId = Date.now().toString();
    const newItem: QueueItem = {
      id: tempId,
      name: file.name,
      status: "analyzing",
      description: "Uploading and analyzing...",
    };

    setQueueItems((prev) => [newItem, ...prev]);

    try {
      // 1. Upload to Supabase
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("media-assets")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("media-assets").getPublicUrl(fileName);

      // 3. Analyze (Skip for video, partial for image)
      let analysis = { summary: "", people: "", date: "" };

      if (isImage) {
        try {
          const response = await fetch("/api/analyze-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileUrl: publicUrl,
              mediaType: "image",
            }),
          });
          const data = await response.json();
          if (!data.error) {
            analysis = data;
          }
        } catch (err) {
          console.error("Analysis failed", err);
        }
      }

      // 4. Insert into Database
      if (!patientId) throw new Error("Patient ID not found. Please wait...");

      const { data: assetData, error: assetError } = await supabase
        .from("media_assets")
        .insert({
          patient_id: patientId,
          storage_path: fileName,
          public_url: publicUrl,
          type: isImage ? "photo" : isVideo ? "video" : "audio",
          metadata: analysis,
        })
        .select()
        .single();

      if (assetError) throw assetError;

      // 5. Create Memory Record
      const { data: memoryData, error: memoryError } = await supabase
        .from("memories")
        .insert({
          patient_id: patientId,
          media_asset_id: assetData.id,
          status: "needs_review",
          script: analysis.summary,
        })
        .select()
        .single();

      if (memoryError) throw memoryError;

      // 6. Update Local Queue Item
      setQueueItems((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
              ...item,
              id: memoryData.id,
              status: "needs_review",
              description:
                analysis.summary ||
                (isVideo
                  ? "Video uploaded"
                  : isAudio
                    ? "Audio uploaded"
                    : "No description"),
              people: analysis.people,
              date: analysis.date,
              url: publicUrl,
            }
            : item,
        ),
      );
    } catch (error) {
      console.error(error);
      setQueueItems((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
              ...item,
              status: "failed",
              description: "Failed to process file.",
            }
            : item,
        ),
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // PIN Entry Modal
  if (!isUnlocked) {
    return (
      <div className="settings-overlay scrollbar-hide">
        <div className="pin-modal-new">
          <h2 className="pin-title-new">Enter PIN</h2>

          <div className="pin-display">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`pin-box ${pinInput.length > i ? "filled" : ""} ${pinError ? "error" : ""}`}
              >
                {pinInput.length > i ? "•" : ""}
              </div>
            ))}
          </div>

          <div className="numpad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                className="numpad-btn"
                onClick={() => handlePinDigit(digit.toString())}
              >
                {digit}
              </button>
            ))}
            <button className="numpad-btn" onClick={handlePinClear}>
              Clear
            </button>
            <button className="numpad-btn" onClick={() => handlePinDigit("0")}>
              0
            </button>
            <button className="numpad-btn" onClick={handlePinBackspace}>
              ⌫
            </button>
          </div>

          <button className="cancel-btn" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Settings Menu
  if (currentView === "menu") {
    return (
      <div className="settings-overlay scrollbar-hide">
        <div className="settings-modal">
          <div className="modal-header">
            <h1>Settings</h1>
            <button className="close-btn" onClick={handleClose}>
              ×
            </button>
          </div>

          <div className="menu-cards">
            <button
              className="menu-card"
              onClick={() => setCurrentView("media")}
            >
              <h3>Media Management</h3>
              <p>Upload photos/videos and manage processing queue</p>
            </button>

            <button
              className="menu-card"
              onClick={() => setCurrentView("algorithm")}
            >
              <h3>Algorithm Calibration</h3>
              <p>Tune the Dynamic Impedance Matcher settings</p>
            </button>

            <button
              className="menu-card"
              onClick={() => setCurrentView("voice")}
            >
              <h3>Neural Proxy</h3>
              <p>Configure voice enrollment and selection</p>
            </button>

            <SignOutButton>
              <button
                className="menu-card"
                style={{ border: "1px solid rgba(255,100,100,0.2)" }}
              >
                <h3 style={{ color: "#fca5a5" }}>Sign Out</h3>
                <p style={{ color: "#fca5a5" }}>Sign out of the application</p>
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    );
  }

  // Media Management
  if (currentView === "media") {
    return (
      <div className="settings-overlay scrollbar-hide">
        <div className="settings-modal">
          <div className="modal-header">
            <button className="back-btn" onClick={handleBack}>
              ←
            </button>
            <h1>Media Management</h1>
            <button className="close-btn" onClick={handleClose}>
              ×
            </button>
          </div>

          <div className="modal-content">
            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: "pointer" }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav"
                hidden
              />
              <div className="upload-icon">↑</div>
              <p>Drop photos/videos/audio here or click to upload</p>
              <button className="choose-files-btn">Choose Files</button>
            </div>

            <h2 className="section-title">Processing Queue</h2>

            <div className="queue-list">
              {queueItems.length === 0 && (
                <p className="no-items text-center text-gray-500 py-8">
                  No items in queue. Upload a photo or video to get started.
                </p>
              )}
              {queueItems.map((item) => (
                <div key={item.id} className="queue-item">
                  <div className="queue-item-header">
                    <span className="queue-icon">
                      {item.status === "needs_review" ? "⚠" : "◔"}
                    </span>
                    <span className="queue-name">{item.name}</span>
                    <span className={`queue-status ${item.status}`}>
                      {item.status === "needs_review"
                        ? "Needs Review"
                        : item.status === "analyzing"
                          ? "Analyzing..."
                          : item.status === "failed"
                            ? "Failed"
                            : item.status === "ready"
                              ? "Ready"
                              : "Synthesizing..."}
                    </span>
                    <button
                      className="queue-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveItem(item.id);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: "1.25rem",
                        lineHeight: "1",
                        padding: "0 0.5rem",
                        cursor: "pointer",
                        marginLeft: "0.5rem",
                      }}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                  {(item.description || item.status === "analyzing") && (
                    <div className="queue-details mt-2">
                      {item.date && item.date !== "Unknown" && (
                        <div className="text-xs text-muted-foreground mb-1">
                          📅 {item.date}
                        </div>
                      )}
                      {item.people && item.people !== "Unknown" && (
                        <div className="text-xs text-muted-foreground mb-1">
                          👥 {item.people}
                        </div>
                      )}
                      <p className="queue-description">{item.description}</p>
                    </div>
                  )}
                  {item.status === "needs_review" && (
                    <div className="queue-actions">
                      <button
                        className="action-btn greenlight"
                        onClick={(e) => handleGreenlight(item.id, e)}
                      >
                        Greenlight
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItemId(item.id);
                          setEditDescription(item.description || "");
                          setEditDate(item.date || "");
                          setEditLocation(item.people || "");
                        }}
                      >
                        Add Detail
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add Detail Modal */}
        {editingItemId && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-surface-dark rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add Detail</h2>
              <p className="text-text-muted text-sm mb-4">
                Add details that the narrator will read aloud for this memory.
              </p>

              <label className="block text-sm text-text-muted mb-1">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe this memory..."
                className="w-full h-24 p-3 rounded-lg bg-surface-darker border border-white/10 text-white resize-none mb-4"
              />

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-3 rounded-lg bg-surface-darker border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Beach, Home"
                    className="w-full p-3 rounded-lg bg-surface-darker border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingItemId(null);
                    setEditDescription("");
                    setEditDate("");
                    setEditLocation("");
                  }}
                  className="flex-1 py-3 rounded-lg bg-surface-darker text-text-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDetail}
                  className="flex-1 py-3 rounded-lg bg-accent text-black font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Algorithm Calibration
  if (currentView === "algorithm") {
    return (
      <div className="settings-overlay scrollbar-hide">
        <div className="settings-modal">
          <div className="modal-header">
            <button className="back-btn" onClick={handleBack}>
              ←
            </button>
            <h1>Algorithm Calibration</h1>
            <button className="close-btn" onClick={handleClose}>
              ×
            </button>
          </div>

          <div className="modal-content">
            <div className="setting-group">
              <div className="setting-label-row">
                <span className="setting-label">Like Cooldown</span>
                <span className="setting-value">{fixationCooldown} Hours</span>
              </div>
              <p className="setting-hint">
                How long a &quot;Liked&quot; memory is hidden from the queue
              </p>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max="48"
                  value={fixationCooldown}
                  onChange={(e) => setFixationCooldown(Number(e.target.value))}
                  className="slider"
                />
                <div className="slider-labels">
                  <span>1hr</span>
                  <span>48hrs</span>
                </div>
              </div>
            </div>

            <div className="setting-group">
              <div className="setting-label-row">
                <span className="setting-label">New Nostalgia</span>
                <span className="setting-value">
                  {noveltyWeight < 33
                    ? "Low"
                    : noveltyWeight < 66
                      ? "Medium"
                      : "High"}
                </span>
              </div>
              <p className="setting-hint">
                How aggressively the system pushes unseen/old photos over
                familiar ones
              </p>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={noveltyWeight}
                  onChange={(e) => setNoveltyWeight(Number(e.target.value))}
                  className="slider"
                />
                <div className="slider-labels">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            </div>

            <div className="setting-group">
              <span className="setting-label">Sundowning Trigger</span>
              <p className="setting-hint">
                Time when the app shifts to &quot;Low-pass Filter&quot; mode
                (calming assets only)
              </p>
              <div className="time-input-container">
                <input
                  type="time"
                  value={sundowningTime}
                  onChange={(e) => setSundowningTime(e.target.value)}
                  className="time-input"
                />
                <span className="time-icon">⏰</span>
              </div>
            </div>

            {saveMessage && (
              <div
                className="save-message"
                style={{
                  color: "var(--accent)",
                  textAlign: "center",
                  marginBottom: "0.5rem",
                }}
              >
                ✓ {saveMessage}
              </div>
            )}

            <button className="save-btn" onClick={handleSaveAlgorithmSettings}>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Neural Proxy (Voice)
  if (currentView === "voice") {
    return (
      <div className="settings-overlay scrollbar-hide">
        <div className="settings-modal">
          <div className="modal-header">
            <button className="back-btn" onClick={handleBack}>
              ←
            </button>
            <h1>Neural Proxy</h1>
            <button className="close-btn" onClick={handleClose}>
              ×
            </button>
          </div>

          <div className="modal-content">
            <div className="voice-selection-dropdown-section">
              <label className="section-title block mb-2">
                Active Narrator Voice
              </label>
              <select
                className="voice-select-dropdown"
                value={activeVoice}
                onChange={(e) => setActiveVoice(e.target.value)}
                disabled={isRecording || isNamingVoice || isProcessing}
              >
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}{" "}
                    {voice.status === "ready"
                      ? "(Ready)"
                      : voice.status === "processing"
                        ? "(Processing...)"
                        : voice.status === "failed"
                          ? "(Failed)"
                          : "(Pending)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice List with Preview/Delete */}
            <div className="voice-list" style={{ marginTop: "1rem" }}>
              {voices
                .filter((v) => v.id !== "default")
                .map((voice) => (
                  <div
                    key={voice.id}
                    className={`voice-item ${activeVoice === voice.id ? "active" : ""}`}
                  >
                    <div style={{ flex: 1 }}>
                      <span className="voice-name">{voice.name}</span>
                      <span
                        className={`voice-status ${voice.status}`}
                        style={{ marginLeft: "0.5rem" }}
                      >
                        {voice.status === "ready"
                          ? "✓ Ready"
                          : voice.status === "processing"
                            ? "⏳ Processing..."
                            : "✗ Failed"}
                      </span>
                    </div>
                    {voice.status === "ready" && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className="action-btn edit"
                          onClick={() => previewVoice(voice.id)}
                          disabled={previewingVoiceId === voice.id}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.375rem 0.75rem",
                          }}
                        >
                          {previewingVoiceId === voice.id
                            ? "Playing..."
                            : "▶ Preview"}
                        </button>
                        <button
                          className="action-btn edit"
                          onClick={() => deleteVoice(voice.id)}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.375rem 0.75rem",
                            color: "#e57373",
                          }}
                        >
                          ✗ Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <hr
              className="divider"
              style={{ margin: "1.5rem 0", borderColor: "var(--border)" }}
            />

            <h3 className="section-title" style={{ marginBottom: "0.5rem" }}>
              Add New Voice
            </h3>
            <p className="setting-hint">
              Record exactly 1 minute of clear speech. Recording will auto-stop
              at 1:00.
            </p>

            <div className="recording-section">
              {!isNamingVoice ? (
                <>
                  <button
                    className={`recording-circle ${isRecording ? "recording" : ""}`}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                  >
                    {isRecording ? "■" : "🎤"}
                  </button>
                  <p className="recording-time">
                    {formatTime(recordingTime)} / 1:00
                  </p>
                  <p className="recording-hint">
                    {isRecording
                      ? "Recording... Must reach 1:00 to save"
                      : isProcessing
                        ? "Processing voice..."
                        : "Tap microphone to start recording"}
                  </p>
                </>
              ) : (
                <div className="naming-form">
                  <h3
                    className="section-title"
                    style={{ marginBottom: "1rem" }}
                  >
                    Name Your New Voice
                  </h3>
                  <input
                    type="text"
                    className="voice-name-input"
                    placeholder="E.g., Grandma's Voice"
                    value={newVoiceName}
                    onChange={(e) => setNewVoiceName(e.target.value)}
                    autoFocus
                  />
                  <div className="naming-actions">
                    <button className="cancel-btn" onClick={cancelRecording}>
                      Discard
                    </button>
                    <button
                      className="save-btn"
                      onClick={saveNewVoice}
                      style={{ marginTop: 0 }}
                      disabled={!newVoiceName.trim()}
                    >
                      Clone Voice
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_PIN = "1234";
const PIN_STORAGE_KEY = "echo_settings_pin";

type SettingsView = "menu" | "media" | "algorithm" | "voice";

import { supabase } from "../../lib/supabase";

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
  status: "pending" | "processing" | "ready";
}

export default function SettingsPage() {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [currentView, setCurrentView] = useState<SettingsView>("menu");
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Algorithm settings
  const [fixationCooldown, setFixationCooldown] = useState(24);
  const [noveltyWeight, setNoveltyWeight] = useState(50);

  const [sundowningTime, setSundowningTime] = useState("18:00");

  // Voice settings
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voices, setVoices] = useState<VoiceProfile[]>([
    { id: "1", name: "Narrator", status: "ready" },
  ]);
  const [activeVoice, setActiveVoice] = useState("1");
  const [isNamingVoice, setIsNamingVoice] = useState(false);
  const [newVoiceName, setNewVoiceName] = useState("");

  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

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

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    recordingInterval.current = setInterval(() => {
      setRecordingTime((t) => {
        if (t >= 60) {
          stopRecording();
          return 60;
        }
        return t + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
    }
    setIsNamingVoice(true);
  };

  const saveNewVoice = () => {
    if (newVoiceName.trim()) {
      const newId = Date.now().toString();
      const newVoice: VoiceProfile = {
        id: newId,
        name: newVoiceName.trim(),
        status: "processing",
      };
      setVoices((prev) => [...prev, newVoice]);
      setActiveVoice(newId);
      setNewVoiceName("");
      setIsNamingVoice(false);
      setRecordingTime(0);
    }
  };

  const cancelRecording = () => {
    setIsNamingVoice(false);
    setNewVoiceName("");
    setRecordingTime(0);
  };

  const handleRemoveItem = (id: string) => {
    setQueueItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    const validVideoTypes = ["video/mp4", "video/webm"];

    const isImage = validImageTypes.includes(file.type);
    const isVideo = validVideoTypes.includes(file.type);

    if (!isImage && !isVideo) {
      alert("Unsupported file format. Please upload JPG, PNG, WEBP, or MP4.");
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

      // 3. Analyze
      const response = await fetch("/api/analyze-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: publicUrl,
          mediaType: isImage ? "image" : "video",
        }),
      });

      const analysis = await response.json();

      // 4. Update Item
      setQueueItems((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                status: "needs_review",
                description: analysis.summary || "No description available",
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
                description:
                  "Failed to process file. Note: Raw formats like DNG are not supported.",
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
      <div className="settings-overlay">
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
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="modal-header">
            <div className="logo-placeholder">e</div>
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
          </div>
        </div>
      </div>
    );
  }

  // Media Management
  if (currentView === "media") {
    return (
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="modal-header">
            <button className="back-btn" onClick={handleBack}>
              ←
            </button>
            <div className="logo-placeholder">e</div>
            <h1>Media Management</h1>
            <button className="close-btn" onClick={handleClose}>
              ×
            </button>
          </div>

          <div className="modal-content">
            <h2 className="section-title">Media Management</h2>

            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: "pointer" }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                hidden
              />
              <div className="upload-icon">↑</div>
              <p>Drop photos/videos here or click to upload</p>
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
                      <button className="action-btn greenlight">
                        Greenlight
                      </button>
                      <button className="action-btn edit">Edit Script</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Algorithm Calibration
  if (currentView === "algorithm") {
    return (
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="modal-header">
            <button className="back-btn" onClick={handleBack}>
              ←
            </button>
            <div className="logo-placeholder">e</div>
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

            <button className="save-btn">Save Settings</button>
          </div>
        </div>
      </div>
    );
  }

  // Neural Proxy (Voice)
  if (currentView === "voice") {
    return (
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="modal-header">
            <button className="back-btn" onClick={handleBack}>
              ←
            </button>
            <div className="logo-placeholder">e</div>
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
                onChange={(e) => {
                  const newVoiceId = e.target.value;
                  setActiveVoice(newVoiceId);
                  localStorage.setItem("active_voice_id", newVoiceId);
                }}
                disabled={isRecording || isNamingVoice}
              >
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}{" "}
                    {voice.status === "ready" ? "(Ready)" : "(Processing...)"}
                  </option>
                ))}
              </select>
            </div>

            <hr
              className="divider"
              style={{ margin: "1.5rem 0", borderColor: "var(--border)" }}
            />

            <div className="recording-section">
              {!isNamingVoice ? (
                <>
                  <button
                    className={`recording-circle ${isRecording ? "recording" : ""}`}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? "■" : "🎤"}
                  </button>
                  <p className="recording-time">
                    {formatTime(recordingTime)} / 1:00
                  </p>
                  <p className="recording-hint">
                    {isRecording
                      ? "Recording... Tap to stop"
                      : "Tap microphone to record a new voice"}
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
                      Save Voice
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

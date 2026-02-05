"use client";

import { useState, useRef, useEffect } from "react";

interface VoiceProfile {
  id: string;
  name: string;
  status: "pending" | "ready";
}

interface FolderVoice {
  folder: string;
  voiceId: string;
}

interface NeuralProxyProps {
  onBack: () => void;
}

export default function NeuralProxy({ onBack }: NeuralProxyProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [voiceProfiles] = useState<VoiceProfile[]>([
    { id: "1", name: "Caretaker Voice", status: "ready" },
    { id: "2", name: "Sibling's Voice", status: "pending" },
  ]);

  const [folderVoices, setFolderVoices] = useState<FolderVoice[]>([
    { folder: "Grandkids", voiceId: "1" },
    { folder: "Youth", voiceId: "2" },
    { folder: "Vacations", voiceId: "1" },
  ]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getVoiceLabel = (voiceId: string) => {
    const voice = voiceProfiles.find((v) => v.id === voiceId);
    if (!voice) return "Select voice";
    return voice.status === "pending"
      ? `${voice.name} (Pending)`
      : `${voice.name} ✓`;
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
            <h2 className="text-xl font-semibold">Neural Proxy</h2>
          </div>
          <button
            onClick={onBack}
            className="text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        {/* Voice Enrollment */}
        <div className="mb-8">
          <h3 className="text-accent font-medium mb-2">Voice Enrollment</h3>
          <p className="text-sm text-text-muted mb-4">
            Record a 60-second sample for voice cloning
          </p>

          <div className="card flex flex-col items-center py-6">
            <button
              onClick={toggleRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all ${
                isRecording
                  ? "bg-accent text-bg-primary animate-pulse"
                  : "bg-accent/20 text-accent hover:bg-accent/30"
              }`}
            >
              <span className="text-3xl">🎤</span>
            </button>

            <div className="text-2xl font-mono mb-2">
              {formatTime(recordingTime)} / 1:00
            </div>

            <p className="text-sm text-text-muted">
              {isRecording
                ? "Recording..."
                : "Click microphone to start recording"}
            </p>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Voice Selection</h3>
          <p className="text-sm text-text-muted mb-4">
            Assign voice identities to specific folders
          </p>

          <div className="space-y-3">
            {folderVoices.map((fv) => (
              <div key={fv.folder} className="card">
                <label className="block text-sm font-medium mb-2">
                  {fv.folder}
                </label>
                <select
                  value={fv.voiceId}
                  onChange={(e) => {
                    setFolderVoices(
                      folderVoices.map((item) =>
                        item.folder === fv.folder
                          ? { ...item, voiceId: e.target.value }
                          : item,
                      ),
                    );
                  }}
                  className="input"
                >
                  {voiceProfiles.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {getVoiceLabel(voice.id)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button onClick={onBack} className="w-full btn btn-primary">
          Save Voice Settings
        </button>
      </div>
    </div>
  );
}

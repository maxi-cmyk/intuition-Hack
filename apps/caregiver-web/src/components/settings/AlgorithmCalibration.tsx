"use client";

import { useState } from "react";

interface AlgorithmSettings {
  fixationCooldown: number;
  noveltyWeight: number;
  sensitivity: "low" | "medium" | "high";
  sundowningTime: string;
}

interface AlgorithmCalibrationProps {
  onBack: () => void;
  onSave?: (settings: AlgorithmSettings) => void;
}

export default function AlgorithmCalibration({
  onBack,
  onSave,
}: AlgorithmCalibrationProps) {
  const [settings, setSettings] = useState<AlgorithmSettings>({
    fixationCooldown: 24,
    noveltyWeight: 50,
    sensitivity: "medium",
    sundowningTime: "18:00",
  });

  const getNoveltyLabel = (value: number) => {
    if (value < 33) return "Low";
    if (value < 66) return "Medium";
    return "High";
  };

  const handleSave = () => {
    onSave?.(settings);
    onBack();
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
            <h2 className="text-xl font-semibold">Algorithm Calibration</h2>
          </div>
          <button
            onClick={onBack}
            className="text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        {/* Fixation Cooldown */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <h3 className="font-medium">Fixation Cooldown</h3>
            <span className="text-accent">
              {settings.fixationCooldown} hours
            </span>
          </div>
          <p className="text-sm text-text-muted mb-3">
            How long a &quot;Liked&quot; memory is hidden from the queue
          </p>
          <input
            type="range"
            min="1"
            max="48"
            value={settings.fixationCooldown}
            onChange={(e) =>
              setSettings({
                ...settings,
                fixationCooldown: Number(e.target.value),
              })
            }
            className="w-full"
          />
          <div className="flex justify-between text-sm text-text-muted mt-1">
            <span>1hr</span>
            <span>48hrs</span>
          </div>
        </div>

        {/* Novelty Weight */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <h3 className="font-medium">Novelty Weight</h3>
            <span className="text-accent">
              {getNoveltyLabel(settings.noveltyWeight)}
            </span>
          </div>
          <p className="text-sm text-text-muted mb-3">
            How aggressively the system pushes unseen/old photos over familiar
            ones
          </p>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.noveltyWeight}
            onChange={(e) =>
              setSettings({
                ...settings,
                noveltyWeight: Number(e.target.value),
              })
            }
            className="w-full"
          />
          <div className="flex justify-between text-sm text-text-muted mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Sensitivity */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Sensitivity</h3>
          <p className="text-sm text-text-muted mb-3">
            Threshold for &quot;3+ Missed Taps&quot; trigger to switch to Voice
            Mode
          </p>
          <div className="flex gap-3">
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setSettings({ ...settings, sensitivity: level })}
                className={`flex-1 py-3 rounded-lg border capitalize transition-colors ${
                  settings.sensitivity === level
                    ? "border-accent bg-accent/20 text-accent"
                    : "border-border text-text-muted hover:border-accent"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Sundowning Trigger */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Sundowning Trigger</h3>
          <p className="text-sm text-text-muted mb-3">
            Time when the app shifts to &quot;Low-pass Filter&quot; mode
            (calming assets only)
          </p>
          <div className="relative">
            <input
              type="time"
              value={settings.sundowningTime}
              onChange={(e) =>
                setSettings({ ...settings, sundowningTime: e.target.value })
              }
              className="input pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              ⏰
            </span>
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave} className="w-full btn btn-primary">
          Save Settings
        </button>
      </div>
    </div>
  );
}

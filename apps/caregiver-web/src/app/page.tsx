"use client";

import { useState } from "react";
import {
  PinEntry,
  SettingsMenu,
  MediaManagement,
  AlgorithmCalibration,
  NeuralProxy,
} from "@/components/settings";

type SettingsView = "pin" | "menu" | "media" | "algorithm" | "voice" | null;

export default function Home() {
  const [settingsView, setSettingsView] = useState<SettingsView>(null);

  const handlePinSuccess = () => {
    setSettingsView("menu");
  };

  const handleNavigate = (section: "media" | "algorithm" | "voice") => {
    setSettingsView(section);
  };

  const handleClose = () => {
    setSettingsView(null);
  };

  const handleBack = () => {
    setSettingsView("menu");
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Echo Adaptive</h1>
        <p className="text-text-muted mb-8">Caregiver Portal</p>

        {/* Demo Controls */}
        <div className="card mb-8">
          <h2 className="font-medium mb-4">Settings Demo</h2>
          <p className="text-sm text-text-muted mb-4">
            Click to test the settings flow (PIN: 1234)
          </p>
          <button
            onClick={() => setSettingsView("pin")}
            className="btn btn-primary"
          >
            Open Settings
          </button>
        </div>

        {/* Component Preview */}
        <div className="card">
          <h2 className="font-medium mb-4">Design System Preview</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button className="btn btn-primary">Primary</button>
              <button className="btn btn-outline">Outline</button>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-processing">Processing</span>
              <span className="badge badge-needs-review">Needs Review</span>
              <span className="badge badge-approved">Approved</span>
            </div>
            <div className="flex gap-2">
              <span className="pill">12-15-2023</span>
              <span className="pill">Paris, France</span>
            </div>
            <input className="input" placeholder="Input field..." />
          </div>
        </div>
      </div>

      {/* Settings Modals */}
      {settingsView === "pin" && (
        <PinEntry onSuccess={handlePinSuccess} onCancel={handleClose} />
      )}
      {settingsView === "menu" && (
        <SettingsMenu onClose={handleClose} onNavigate={handleNavigate} />
      )}
      {settingsView === "media" && <MediaManagement onBack={handleBack} />}
      {settingsView === "algorithm" && (
        <AlgorithmCalibration onBack={handleBack} />
      )}
      {settingsView === "voice" && <NeuralProxy onBack={handleBack} />}
    </main>
  );
}

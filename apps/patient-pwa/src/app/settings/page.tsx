"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_PIN = "1234";
const PIN_STORAGE_KEY = "echo_settings_pin";

export default function SettingsPage() {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // Change password state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changeError, setChangeError] = useState("");
  const [changeSuccess, setChangeSuccess] = useState(false);

  // Settings state
  const [noveltyWeight, setNoveltyWeight] = useState<"low" | "medium" | "high">(
    "medium",
  );
  const [tapSensitivity, setTapSensitivity] = useState<
    "low" | "medium" | "high"
  >("medium");

  const getStoredPin = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
    }
    return DEFAULT_PIN;
  };

  const handlePinSubmit = () => {
    if (pinInput === getStoredPin()) {
      setIsUnlocked(true);
      setPinError("");
    } else {
      setPinError("Incorrect PIN");
      setPinInput("");
    }
  };

  const handleChangePassword = () => {
    setChangeError("");
    setChangeSuccess(false);

    if (currentPin !== getStoredPin()) {
      setChangeError("Current PIN is incorrect");
      return;
    }

    if (newPin.length < 4) {
      setChangeError("PIN must be at least 4 digits");
      return;
    }

    if (newPin !== confirmPin) {
      setChangeError("New PINs do not match");
      return;
    }

    localStorage.setItem(PIN_STORAGE_KEY, newPin);
    setChangeSuccess(true);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  };

  const handleBack = () => {
    router.push("/");
  };

  // PIN Entry Modal
  if (!isUnlocked) {
    return (
      <div className="pin-modal">
        <div className="pin-container">
          <h2 className="pin-title">Enter PIN</h2>
          <p className="pin-subtitle">Enter your PIN to access settings</p>

          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
            className="pin-input"
            placeholder="••••"
            autoFocus
          />

          {pinError && <p className="pin-error">{pinError}</p>}

          <div className="pin-buttons">
            <button onClick={handleBack} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handlePinSubmit} className="btn-primary">
              Unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Settings Page
  return (
    <main className="settings-page">
      <header className="settings-header">
        <button onClick={handleBack} className="back-button">
          ← Back
        </button>
        <h1>Settings</h1>
      </header>

      <div className="settings-content">
        {/* Preferences Section */}
        <section className="settings-section">
          <h2>Preferences</h2>

          <div className="setting-row">
            <label>Novelty Weight</label>
            <select
              value={noveltyWeight}
              onChange={(e) =>
                setNoveltyWeight(e.target.value as "low" | "medium" | "high")
              }
              className="setting-select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="setting-row">
            <label>Tap Sensitivity</label>
            <select
              value={tapSensitivity}
              onChange={(e) =>
                setTapSensitivity(e.target.value as "low" | "medium" | "high")
              }
              className="setting-select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </section>

        {/* Change Password Section */}
        <section className="settings-section">
          <h2>Change PIN</h2>

          <div className="setting-row">
            <label>Current PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              className="setting-input"
              placeholder="••••"
            />
          </div>

          <div className="setting-row">
            <label>New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              className="setting-input"
              placeholder="••••"
            />
          </div>

          <div className="setting-row">
            <label>Confirm New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              className="setting-input"
              placeholder="••••"
            />
          </div>

          {changeError && <p className="change-error">{changeError}</p>}
          {changeSuccess && (
            <p className="change-success">PIN changed successfully!</p>
          )}

          <button
            onClick={handleChangePassword}
            className="btn-primary full-width"
          >
            Update PIN
          </button>
        </section>
      </div>
    </main>
  );
}

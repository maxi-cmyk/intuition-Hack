"use client";

import { useState } from "react";

interface PinEntryProps {
  onSuccess: () => void;
  onCancel: () => void;
  correctPin?: string;
}

export default function PinEntry({
  onSuccess,
  onCancel,
  correctPin = "1234",
}: PinEntryProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => {
            setPin("");
            setError(false);
          }, 500);
        }
      }
    }
  };

  const handleClear = () => {
    setPin("");
    setError(false);
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="text-xl font-semibold text-center mb-6">Enter PIN</h2>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-14 h-14 border-2 rounded-lg flex items-center justify-center text-2xl font-bold transition-colors ${
                error
                  ? "border-red-500 bg-red-500/10"
                  : pin.length > i
                    ? "border-accent bg-accent/10"
                    : "border-border"
              }`}
            >
              {pin.length > i ? "•" : ""}
            </div>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(String(digit))}
              className="h-14 rounded-lg border border-border text-xl font-medium hover:border-accent hover:text-accent transition-colors"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-lg border border-border text-sm font-medium hover:border-accent hover:text-accent transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit("0")}
            className="h-14 rounded-lg border border-border text-xl font-medium hover:border-accent hover:text-accent transition-colors"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-lg border border-border text-xl font-medium hover:border-accent hover:text-accent transition-colors"
          >
            ⌫
          </button>
        </div>

        {/* Cancel Button */}
        <button onClick={onCancel} className="w-full btn btn-outline mt-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

"use client";

interface SettingsMenuProps {
  onClose: () => void;
  onNavigate: (section: "media" | "algorithm" | "voice") => void;
}

const menuItems = [
  {
    id: "media" as const,
    title: "Media Management",
    description: "Upload photos/videos and manage processing queue",
  },
  {
    id: "algorithm" as const,
    title: "Algorithm Calibration",
    description: "Tune the Dynamic Impedance Matcher settings",
  },
  {
    id: "voice" as const,
    title: "Neural Proxy",
    description: "Configure voice enrollment and selection",
  },
];

export default function SettingsMenu({
  onClose,
  onNavigate,
}: SettingsMenuProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 border border-border flex items-center justify-center">
              <span className="text-accent text-sm font-bold">e</span>
            </div>
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full card hover:border-accent transition-colors text-left"
            >
              <h3 className="text-accent font-medium mb-1">{item.title}</h3>
              <p className="text-sm text-text-muted">{item.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

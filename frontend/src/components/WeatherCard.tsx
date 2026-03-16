import { Cloud } from "lucide-react";
import type { Weather } from "../lib/types";

export function WeatherCard({ weather }: { weather: Weather | null }) {
  if (!weather) {
    return (
      <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-strong)] rounded-xl p-4 shadow-[var(--shadow-card)]">
        <h3 className="text-[9px] uppercase tracking-[1.5px] text-[var(--accent-muted)] mb-3">Weather</h3>
        <p className="text-[var(--text-muted)] text-xs">No weather data</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-strong)] rounded-xl p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-[9px] uppercase tracking-[1.5px] text-[var(--accent-muted)] mb-3">Weather</h3>
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Track</span>
          <span className="text-[var(--text-primary)] font-mono">{weather.track_temp}°C</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Air</span>
          <span className="text-[var(--text-primary)] font-mono">{weather.air_temp}°C</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">Rain</span>
          <div className="flex items-center gap-1.5">
            <Cloud size={12} className="text-[var(--text-muted)]" />
            <span className="text-[var(--text-primary)] font-mono">{weather.rain_risk}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

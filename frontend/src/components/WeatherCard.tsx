import { Cloud } from "lucide-react";
import type { Weather } from "../lib/types";

export function WeatherCard({ weather }: { weather: Weather | null }) {
  if (!weather) {
    return (
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <h3 className="text-[9px] uppercase tracking-[1.5px] text-violet-400/50 mb-3">Weather</h3>
        <p className="text-white/20 text-xs">No weather data</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <h3 className="text-[9px] uppercase tracking-[1.5px] text-violet-400/50 mb-3">Weather</h3>
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-white/40">Track</span>
          <span className="text-white font-mono">{weather.track_temp}°C</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Air</span>
          <span className="text-white font-mono">{weather.air_temp}°C</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/40">Rain</span>
          <div className="flex items-center gap-1.5">
            <Cloud size={12} className="text-white/30" />
            <span className="text-white font-mono">{weather.rain_risk}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

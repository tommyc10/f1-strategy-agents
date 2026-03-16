import type { Session } from "./types";

const BASE_URL = "/api";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchDrivers(sessionKey?: string) {
  const params = sessionKey ? `?session_key=${sessionKey}` : "";
  return fetchJSON<unknown[]>(`${BASE_URL}/data/drivers${params}`);
}

export async function fetchHealth() {
  return fetchJSON<{ status: string }>(`${BASE_URL}/health`);
}

export async function fetchSessions(year?: number): Promise<Session[]> {
  const params = year ? `?year=${year}` : "";
  return fetchJSON<Session[]>(`${BASE_URL}/data/sessions${params}`);
}

export type RaceSummary = {
  session_key: string;
  positions: { driver: string; position: number; gap_to_leader: number }[];
  strategy_map: Record<string, { stint_number: number; compound: string; tyre_age: number }[]>;
  weather: { track_temp: number; air_temp: number; rain_risk: number } | null;
  sectors: { driver: string; lap_number: number; sector_number: number; sector_time: number }[];
  total_drivers: number;
};

export async function fetchRaceSummary(sessionKey: string): Promise<RaceSummary> {
  return fetchJSON<RaceSummary>(`${BASE_URL}/data/race-summary?session_key=${sessionKey}`);
}

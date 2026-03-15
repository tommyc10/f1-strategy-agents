import type { Session } from "./types";

const BASE_URL = "/api";

export async function fetchDrivers(sessionKey?: string) {
  const params = sessionKey ? `?session_key=${sessionKey}` : "";
  const res = await fetch(`${BASE_URL}/data/drivers${params}`);
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

export async function fetchSessions(year?: number): Promise<Session[]> {
  const params = year ? `?year=${year}` : "";
  const res = await fetch(`${BASE_URL}/data/sessions${params}`);
  return res.json();
}

export type RaceSummary = {
  session_key: string;
  positions: { driver: string; position: number; gap_to_leader: number }[];
  strategy_map: Record<string, { stint_number: number; compound: string; tyre_age: number }[]>;
  weather: { track_temp: number; air_temp: number; rain_risk: number } | null;
  total_drivers: number;
};

export async function fetchRaceSummary(sessionKey: string): Promise<RaceSummary> {
  const res = await fetch(`${BASE_URL}/data/race-summary?session_key=${sessionKey}`);
  return res.json();
}

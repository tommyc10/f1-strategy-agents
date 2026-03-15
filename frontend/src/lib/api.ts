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

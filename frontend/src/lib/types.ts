export type DriverPosition = {
  driver: string;
  position: number;
  gap_to_leader: number;
};

export type TyreStint = {
  driver: string;
  compound: "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET";
  tyre_age: number;
  stint_number: number;
};

export type LapTime = {
  driver: string;
  lap_number: number;
  lap_time: number;
};

export type SectorTime = {
  driver: string;
  lap_number: number;
  sector_number: number;
  sector_time: number;
};

export type Weather = {
  track_temp: number;
  air_temp: number;
  rain_risk: number;
};

export type RaceContext = {
  session_key: string;
  positions: DriverPosition[];
  stints: TyreStint[];
  laps: LapTime[];
  sectors: SectorTime[];
  weather: Weather | null;
};

export type StrategyOutput = {
  reasoning: string;
  recommendation: "PIT" | "STAY_OUT" | "OPPOSITE" | "FLEXIBLE";
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

export type WsMessage =
  | { type: "query"; question: string; session_key?: string; is_historical?: boolean }
  | { type: "status"; agent: string; state: "pending" | "running" | "complete" }
  | { type: "result"; briefing: string; strategy_reasoning: string; race_context: RaceContext }
  | { type: "error"; message: string };

export type ChatMessage = {
  id: string;
  role: "user" | "engineer";
  content: string;
  timestamp: number;
};

export type Session = {
  session_key: string;
  date: string;
  location: string;
  country: string;
  year: number;
};

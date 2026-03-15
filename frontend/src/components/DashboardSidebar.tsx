import { motion } from "framer-motion";
import { PositionsCard } from "./PositionsCard";
import { TyresCard } from "./TyresCard";
import { WeatherCard } from "./WeatherCard";
import type { RaceContext } from "../lib/types";

export function DashboardSidebar({ context }: { context: RaceContext | null }) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="w-72 flex flex-col gap-3 p-4 overflow-y-auto"
    >
      <PositionsCard positions={context?.positions ?? []} />
      <TyresCard stints={context?.stints ?? []} />
      <WeatherCard weather={context?.weather ?? null} />
    </motion.aside>
  );
}
